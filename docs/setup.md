# Setup guide

## Prerequisites

- n8n (self-hosted or cloud). The template uses only core nodes: Manual Trigger,
  Schedule Trigger, Set, Code and HTTP Request. Import was tested with the n8n 2.x CLI.
- An Autotask PSA **API-only user** with read access to Tickets and Companies.
- An Anthropic API key for Claude.

## 1. Import the workflow

In n8n, open **Workflows → Import from file** and choose
[`workflow/ticket-analysis.json`](../workflow/ticket-analysis.json). With the n8n CLI:

```bash
n8n import:workflow --input=workflow/ticket-analysis.json
```

## 2. Create the credentials

The template refers to two placeholder credentials. Create them, then select them in
the HTTP Request nodes.

**Autotask API (Custom Auth).** Use an API-only user and put this JSON in the credential:

```json
{
  "headers": {
    "ApiIntegrationCode": "<your tracking identifier>",
    "UserName": "<api-user@yourdomain>",
    "Secret": "<api user secret>"
  }
}
```

**Claude API (Header Auth).** Name: `x-api-key`. Value: your Anthropic API key.

Never put secrets in the Config node, in Code nodes, or in files you commit.

## 3. Edit the Config node

| Field | Default | Meaning |
|---|---|---|
| `autotaskBaseUrl` | `https://webservicesN.autotask.net/ATServicesRest/V1.0` | Your zone URL. Find it with the Autotask zone information endpoint. |
| `lookbackDays` | `30` | Length of the analysis period. The previous period of the same length is fetched for trends. |
| `maxTickets` | `500` | Maximum number of tickets read (one Autotask page). |
| `minTicketsPerClient` | `3` | Clients with fewer tickets in the period are skipped. |
| `agingDays` | `14` | Open tickets older than this count towards the backlog component. |
| `highPriorityValues` | `1,4` | Priority picklist values treated as high/critical. |
| `claudeModel` | `claude-sonnet-4-5` | Any current Claude model ID. |
| `maxTokens` | `4000` | Response token limit for each client. |
| `referenceDate` | empty | Leave empty to use "now". Set an ISO date to re-run a past period. |

## 4. Test, then schedule

1. Click **Test workflow** and check the output of **Clean & group by client** first.
   Confirm the redaction and that only the fields you expect are sent to the LLM.
2. Check that **Parse analysis & score risk index** shows no `parseError` values.
3. Configure or replace **Deliver reports (configure me)**, then enable it.
4. Activate the workflow. The schedule runs weekly on Monday at 07:00 in the
   instance timezone.

## Data protection checklist

- [ ] The API user has read-only access to the entities used, and nothing more.
- [ ] Ticket text sent to the LLM is limited to title and description, truncated and redacted.
- [ ] Your LLM provider's data-retention terms are acceptable for your clients' data.
- [ ] Generated reports are reviewed by a person before they are shared with a client.
- [ ] n8n execution data retention is set to match your data policy (execution data contains ticket text).
