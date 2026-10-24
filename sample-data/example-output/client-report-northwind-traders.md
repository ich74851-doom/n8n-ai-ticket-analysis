# Support review: Northwind Traders (fictional)

Period: 2026-09-01 to 2026-10-01  
Growth/risk index: **21 (Low)**, confidence: low (fewer than 10 tickets)

## Summary

Low and stable ticket volume (4 vs 4). The only repeat is Outlook password prompts after the mailbox migration. One PC remains on Windows 10 because of a line-of-business application.

## Ticket statistics

| Metric | Value |
|---|---|
| Tickets this period | 4 |
| Tickets previous period | 4 |
| High/critical priority | 0 |
| Open longer than 14 days | 0 |

## Recurring issues

### Outlook credential prompts after mailbox migration (2 tickets, email)

Tickets: T20260905.0029, T20260913.0030  
Likely root cause: Modern authentication not enabled on some clients after the migration.

Remediation:

- Push the modern authentication setting to all clients through RMM.
- Clear cached credentials on affected devices.

## Vulnerabilities and risks

| Severity | Finding | Evidence | Recommendation |
|---|---|---|---|
| medium | Windows 10 device past end of support | T20260926.0032 | Ask the software vendor for a Windows 11 timeline; until then, isolate the device and consider extended security updates. |

## Proactive opportunities

- Operating system lifecycle review

## Documentation notes

- Accounts PC runs vendor software not yet certified for Windows 11.

## Risk index breakdown

| Component | Score (0-1) |
|---|---|
| volumeTrend | 0 |
| recurrence | 0.5 |
| severity | 0 |
| security | 0.33 |
| backlog | 0 |

_Generated automatically from PSA ticket data. Review before sharing with the client._
