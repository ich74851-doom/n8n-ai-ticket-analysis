# Growth/risk index

The growth/risk index is a score from **0 to 100** for each client and each analysis
period. It helps a service team decide where proactive work is needed first: which
clients have growing ticket volume, repeating problems or security weaknesses that
would benefit from remediation projects or extra services.

It is a **prioritisation aid, not a security rating**. It summarises ticket trends
only, and a person should review it before acting on it or sharing it.

The scoring is implemented in
[`src/code-nodes/score-risk-index.js`](../src/code-nodes/score-risk-index.js) (the
"Parse analysis & score risk index" node). The weights and thresholds below are the
defaults in this template. Tune them to your own ticket data.

## Inputs

| Input | Source | Deterministic? |
|---|---|---|
| Tickets in current and previous period | Autotask ticket query | Yes |
| High/critical priority tickets | Ticket `priority` matched against `Config.highPriorityValues` | Yes |
| Open tickets older than `Config.agingDays` | `createDate` / `completedDate` | Yes |
| Tickets in repeating categories (3+ tickets with the same issue/sub-issue type) | Ticket categories | Yes |
| Recurring issue clusters | Claude `recurring_issues[].ticket_count` | No (LLM) |
| Vulnerabilities and their severity | Claude `vulnerabilities[].severity` | No (LLM) |

The LLM is used only where judgement is needed: spotting that differently worded tickets
describe the same problem, and recognising security weaknesses in the ticket text.
Everything that can be counted is counted in code.

## Components

Each component is normalised to a value between 0 and 1.

| Component | Weight | Formula | Full score when |
|---|---:|---|---|
| Volume trend | 20 | `clamp(current / max(previous, 1) - 1)` | volume has doubled (or more) |
| Recurrence | 25 | `clamp(max(aiRecurringTickets, categoryRecurringTickets) / current)` | every ticket belongs to a recurring problem |
| Severity | 20 | `clamp(highPriority / current)` | every ticket is high or critical |
| Security | 25 | `clamp(sum(severityPoints) / 6)`, where low = 1, medium = 2, high = 3 | e.g. two high, or three medium findings |
| Backlog | 10 | `clamp(2 * agingOpen / current)` | half of the tickets are still open after the aging threshold |

`clamp(x)` limits the value to the range 0 to 1. `aiRecurringTickets` is capped at the
ticket count.

```text
riskIndex = round( 20 * volumeTrend + 25 * recurrence + 20 * severity + 25 * security + 10 * backlog )
```

## Bands

| Index | Band | Suggested action |
|---:|---|---|
| 75-100 | High | Review this week; plan remediation with the client |
| 50-74 | Elevated | Raise at the next client review; schedule fixes for recurring issues |
| 25-49 | Moderate | Monitor; fix quick wins |
| 0-24 | Low | No action beyond routine service |

**Confidence.** If a client has fewer than 10 tickets in the period, the result is
marked `low` confidence, because a single ticket moves the percentages a lot. Clients
below `Config.minTicketsPerClient` (default 3) are not analysed.

## Worked example (fictional sample data)

From [`sample-data/example-output/scored-analysis.json`](../sample-data/example-output/scored-analysis.json):

| Client | Current / previous | Trend | Recurrence | Severity | Security | Backlog | Index |
|---|---|---:|---:|---:|---:|---:|---:|
| Contoso Dental (fictional) | 10 / 5 | 1.00 | 0.70 | 0.40 | 0.83 | 0.20 | **68** Elevated |
| Fabrikam Logistics (fictional) | 7 / 6 | 0.17 | 0.71 | 0.14 | 0.33 | 0.00 | **32** Moderate |
| Northwind Traders (fictional) | 4 / 4 | 0.00 | 0.50 | 0.00 | 0.33 | 0.00 | **21** Low |

For Contoso: `20 * 1.00 + 25 * 0.70 + 20 * 0.40 + 25 * 0.83 + 10 * 0.20 = 68.3`, which
rounds to **68 (Elevated)**. This is driven by doubled volume, a repeating backup failure,
and a high-severity phishing compromise on an account without MFA.

## Growth signals

The same inputs also point to proactive work. A rising volume trend together with
recurring issues usually means a project would remove the cause (for example
a firmware update, a hardware refresh or an MFA rollout). Claude's
`proactive_opportunities` list is shown next to the index in each client report. It is
deliberately **not** part of the score, so the number stays explainable.

## Limitations and tuning

- Priority picklist values differ between Autotask instances. Set
  `Config.highPriorityValues` to match yours (the default `1,4` matches the standard
  High/Critical values).
- Issue and sub-issue type IDs are instance-specific. The deterministic recurrence check
  only needs them to be consistent, not readable.
- LLM output varies between runs. Keep `temperature` low, and treat the deterministic
  components as the stable baseline.
- Weights are a starting point. Compare the index with your service team's own view
  of clients over a few periods, then adjust.
