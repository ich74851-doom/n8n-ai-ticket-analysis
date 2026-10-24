// n8n Code node: "Build client documentation" (mode: Run Once for All Items)
// Turns each scored analysis into client-ready Markdown, and adds one portfolio
// summary item sorted by risk index.

const list = (values) => (values && values.length ? values.map((v) => `- ${v}`).join('\n') : '- None identified');

const reports = $input.all().map((item) => {
  const r = item.json;
  const a = r.analysis || {};
  const lines = [];

  lines.push(`# Support review: ${r.clientName}`);
  lines.push('');
  lines.push(`Period: ${r.periodStart} to ${r.periodEnd}  `);
  lines.push(`Growth/risk index: **${r.riskIndex} (${r.riskBand})**, confidence: ${r.confidence}`);
  lines.push('');

  if (r.parseError) {
    lines.push(`> Analysis unavailable: ${r.parseError}`);
    lines.push('');
  }

  lines.push('## Summary', '', a.client_summary || 'No summary available.', '');

  lines.push('## Ticket statistics', '');
  lines.push('| Metric | Value |', '|---|---|');
  lines.push(`| Tickets this period | ${r.stats.currentTickets} |`);
  lines.push(`| Tickets previous period | ${r.stats.previousTickets} |`);
  lines.push(`| High/critical priority | ${r.stats.highPriorityTickets} |`);
  lines.push(`| Open longer than ${r.stats.agingDays} days | ${r.stats.openOlderThanAgingDays} |`);
  lines.push('');

  lines.push('## Recurring issues', '');
  const issues = a.recurring_issues || [];
  if (!issues.length) lines.push('No recurring issues identified.', '');
  for (const issue of issues) {
    lines.push(`### ${issue.title} (${issue.ticket_count} tickets, ${issue.category})`, '');
    lines.push(`Tickets: ${(issue.ticket_numbers || []).join(', ')}  `);
    lines.push(`Likely root cause: ${issue.likely_root_cause}`, '');
    lines.push('Remediation:', '', list(issue.remediation), '');
  }

  lines.push('## Vulnerabilities and risks', '');
  const vulns = a.vulnerabilities || [];
  if (!vulns.length) {
    lines.push('None identified from ticket evidence.', '');
  } else {
    lines.push('| Severity | Finding | Evidence | Recommendation |', '|---|---|---|---|');
    for (const v of vulns) {
      lines.push(`| ${v.severity} | ${v.title} | ${(v.evidence_ticket_numbers || []).join(', ')} | ${v.recommendation} |`);
    }
    lines.push('');
  }

  lines.push('## Proactive opportunities', '', list(a.proactive_opportunities), '');
  lines.push('## Documentation notes', '', list(a.documentation_notes), '');

  lines.push('## Risk index breakdown', '');
  lines.push('| Component | Score (0-1) |', '|---|---|');
  for (const [k, v] of Object.entries(r.components)) lines.push(`| ${k} | ${v} |`);
  lines.push('');
  lines.push('_Generated automatically from PSA ticket data. Review before sharing with the client._');

  return {
    json: {
      type: 'client-report',
      companyId: r.companyId,
      clientName: r.clientName,
      riskIndex: r.riskIndex,
      riskBand: r.riskBand,
      recurringIssueCount: issues.length,
      vulnerabilityCount: vulns.length,
      markdown: `${lines.join('\n')}\n`,
    },
  };
});

const summary = {
  json: {
    type: 'portfolio-summary',
    generatedAt: new Date().toISOString(),
    clients: reports
      .map((r) => ({
        clientName: r.json.clientName,
        riskIndex: r.json.riskIndex,
        riskBand: r.json.riskBand,
        recurringIssues: r.json.recurringIssueCount,
        vulnerabilities: r.json.vulnerabilityCount,
      }))
      .sort((x, y) => y.riskIndex - x.riskIndex),
  },
};

return [...reports, summary];
