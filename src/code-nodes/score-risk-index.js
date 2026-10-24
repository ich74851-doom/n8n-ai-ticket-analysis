// n8n Code node: "Parse analysis & score risk index" (mode: Run Once for All Items)
// Parses Claude's JSON answer for each client and calculates the growth/risk
// index described in docs/risk-index.md. Items arrive in the same order as the
// "Clean & group by client" output (one Claude call per client).

const clients = $('Clean & group by client').all();

// Weights must add up to 100. See docs/risk-index.md before changing them.
const WEIGHTS = { volumeTrend: 20, recurrence: 25, severity: 20, security: 25, backlog: 10 };
const SEVERITY_POINTS = { low: 1, medium: 2, high: 3 };

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const round2 = (n) => Math.round(n * 100) / 100;

function parseClaudeResponse(body) {
  const text = (body.content || [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')   // tolerate accidental code fences
    .replace(/\s*```$/, '');
  try {
    return { analysis: JSON.parse(text), parseError: null };
  } catch (error) {
    return { analysis: null, parseError: `Could not parse model output as JSON: ${error.message}` };
  }
}

function band(score) {
  if (score >= 75) return 'High';
  if (score >= 50) return 'Elevated';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

return $input.all().map((item, index) => {
  const client = clients[index].json;
  const s = client.stats;
  const { analysis, parseError } = parseClaudeResponse(item.json);

  const recurringIssues = analysis?.recurring_issues || [];
  const vulnerabilities = analysis?.vulnerabilities || [];

  // 1. Volume trend: full score when volume doubles versus the previous period.
  const trendRatio = s.currentTickets / Math.max(s.previousTickets, 1);
  const volumeTrend = clamp01(trendRatio - 1);

  // 2. Recurrence: share of tickets in recurring clusters (AI clusters or
  //    deterministic category repeats, whichever is higher).
  const aiRecurring = Math.min(
    recurringIssues.reduce((sum, r) => sum + (Number(r.ticket_count) || 0), 0),
    s.currentTickets,
  );
  const recurrence = clamp01(Math.max(aiRecurring, s.recurringCategoryTickets) / s.currentTickets);

  // 3. Severity: share of high/critical priority tickets.
  const severity = clamp01(s.highPriorityTickets / s.currentTickets);

  // 4. Security: weighted vulnerability points; 6 points (e.g. two high) = full score.
  const securityPoints = vulnerabilities.reduce(
    (sum, v) => sum + (SEVERITY_POINTS[String(v.severity).toLowerCase()] || 0), 0);
  const security = clamp01(securityPoints / 6);

  // 5. Backlog: share of tickets still open after the aging threshold; 50% = full score.
  const backlog = clamp01((s.openOlderThanAgingDays / s.currentTickets) * 2);

  const components = { volumeTrend, recurrence, severity, security, backlog };
  const riskIndex = Math.round(
    Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + weight * components[key], 0),
  );

  return {
    json: {
      companyId: client.companyId,
      clientName: client.clientName,
      periodStart: client.periodStart,
      periodEnd: client.periodEnd,
      stats: s,
      riskIndex,
      riskBand: band(riskIndex),
      confidence: s.currentTickets >= 10 ? 'normal' : 'low (fewer than 10 tickets)',
      components: Object.fromEntries(Object.entries(components).map(([k, v]) => [k, round2(v)])),
      analysis,
      parseError,
    },
  };
});
