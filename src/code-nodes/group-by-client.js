// n8n Code node: "Clean & group by client" (mode: Run Once for All Items)
// 1. Cleans ticket text (strips HTML, redacts emails / phone numbers / IPs, truncates).
// 2. Groups tickets by client and splits them into the current and previous period.
// 3. Computes deterministic statistics used by the prompt and the risk index.
// Outputs one item per client that has at least Config.minTicketsPerClient tickets.

const config = $('Config').first().json;
const windowInfo = $('Build ticket query').first().json;
const tickets = $('Autotask: query tickets').first().json.items || [];
const companies = $('Autotask: query companies').first().json.items || [];

const minTickets = Number(config.minTicketsPerClient) || 3;
const agingDays = Number(config.agingDays) || 14;
const highPriorityValues = String(config.highPriorityValues || '1,4')
  .split(',').map((v) => Number(v.trim())).filter((v) => !Number.isNaN(v));
const DAY_MS = 24 * 60 * 60 * 1000;

const now = new Date(windowInfo.now);
const currentStart = new Date(windowInfo.currentStart);

const companyNames = new Map(companies.map((c) => [c.id, c.companyName]));

function cleanText(value, maxLength) {
  if (!value) return '';
  return String(value)
    .replace(/<[^>]*>/g, ' ')                                   // HTML tags
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, ' ')        // common entities
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]') // email addresses
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone]')                // phone-like numbers
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '[ip]')             // IPv4 addresses
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

const byClient = new Map();
for (const t of tickets) {
  const key = t.companyID;
  if (!byClient.has(key)) byClient.set(key, []);
  byClient.get(key).push(t);
}

const results = [];
for (const [companyId, clientTickets] of byClient) {
  const current = clientTickets.filter((t) => new Date(t.createDate) >= currentStart);
  const previous = clientTickets.filter((t) => new Date(t.createDate) < currentStart);
  if (current.length < minTickets) continue;

  // Category = issueType/subIssueType pair. Picklist IDs differ per Autotask
  // instance, so IDs are used as-is; map them to labels if you need readable output.
  const categoryCounts = {};
  for (const t of current) {
    const category = `${t.issueType ?? 'none'}/${t.subIssueType ?? 'none'}`;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  }
  const recurringCategoryTickets = Object.values(categoryCounts)
    .filter((n) => n >= 3)
    .reduce((sum, n) => sum + n, 0);

  const highPriority = current.filter((t) => highPriorityValues.includes(Number(t.priority))).length;
  const agingOpen = current.filter((t) => !t.completedDate
    && (now.getTime() - new Date(t.createDate).getTime()) / DAY_MS > agingDays).length;

  results.push({
    json: {
      companyId,
      clientName: companyNames.get(companyId) || `Company ${companyId}`,
      periodStart: windowInfo.currentStart.slice(0, 10),
      periodEnd: windowInfo.now.slice(0, 10),
      stats: {
        currentTickets: current.length,
        previousTickets: previous.length,
        highPriorityTickets: highPriority,
        openOlderThanAgingDays: agingOpen,
        agingDays,
        recurringCategoryTickets,
        categoryCounts,
      },
      tickets: current.map((t) => ({
        ticketNumber: t.ticketNumber,
        created: t.createDate,
        completed: t.completedDate || null,
        priority: t.priority,
        category: `${t.issueType ?? 'none'}/${t.subIssueType ?? 'none'}`,
        title: cleanText(t.title, 200),
        description: cleanText(t.description, 1000),
      })),
    },
  });
}

return results;
