// n8n Code node: "Build ticket query" (mode: Run Once for All Items)
// Works out the analysis window and builds the Autotask REST query body.
// Two windows are fetched (current + previous period of the same length)
// so that ticket volume trends can be compared.

const config = $('Config').first().json;

const lookbackDays = Number(config.lookbackDays) || 30;
const now = config.referenceDate ? new Date(config.referenceDate) : new Date();
if (Number.isNaN(now.getTime())) {
  throw new Error(`Config.referenceDate is not a valid date: ${config.referenceDate}`);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const currentStart = new Date(now.getTime() - lookbackDays * DAY_MS);
const previousStart = new Date(now.getTime() - 2 * lookbackDays * DAY_MS);

// Autotask REST API query: POST /Tickets/query
// Only the fields the analysis needs are requested (data minimisation).
const queryBody = {
  MaxRecords: Number(config.maxTickets) || 500,
  IncludeFields: [
    'id', 'ticketNumber', 'title', 'description', 'companyID',
    'createDate', 'completedDate', 'status', 'priority',
    'issueType', 'subIssueType', 'queueID',
  ],
  filter: [
    { op: 'gte', field: 'createDate', value: previousStart.toISOString() },
  ],
};

return [{
  json: {
    queryBody,
    now: now.toISOString(),
    currentStart: currentStart.toISOString(),
    previousStart: previousStart.toISOString(),
    lookbackDays,
  },
}];
