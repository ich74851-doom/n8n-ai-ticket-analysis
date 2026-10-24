// n8n Code node: "Build company query" (mode: Run Once for All Items)
// Collects the distinct company IDs from the ticket query so their names
// can be looked up in one request.

const response = $input.first().json;
const tickets = Array.isArray(response.items) ? response.items : [];

if (response.pageDetails && response.pageDetails.nextPageUrl) {
  // The template reads one page (Config.maxTickets, max 500 per Autotask page).
  // See the README roadmap for pagination support.
  console.log('Autotask returned more tickets than one page; only the first page is analysed.');
}

const companyIds = [...new Set(tickets.map((t) => t.companyID).filter((id) => id !== null && id !== undefined))];

return [{
  json: {
    ticketCount: tickets.length,
    companyIds,
    queryBody: {
      IncludeFields: ['id', 'companyName'],
      filter: [{ op: 'in', field: 'id', value: companyIds.length ? companyIds : [0] }],
    },
  },
}];
