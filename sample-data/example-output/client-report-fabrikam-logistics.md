# Support review: Fabrikam Logistics (fictional)

Period: 2026-09-01 to 2026-10-01  
Growth/risk index: **32 (Moderate)**, confidence: low (fewer than 10 tickets)

## Summary

Ticket volume is roughly stable (7 vs 6). VPN instability is the main recurring issue and affects remote and sales users. Two slow-laptop tickets point to low storage and limited RAM. Other tickets are routine.

## Ticket statistics

| Metric | Value |
|---|---|
| Tickets this period | 7 |
| Tickets previous period | 6 |
| High/critical priority | 1 |
| Open longer than 14 days | 0 |

## Recurring issues

### VPN disconnects for remote users (3 tickets, network)

Tickets: T20260903.0016, T20260911.0017, T20260919.0018  
Likely root cause: Probably firewall firmware two versions behind, combined with an hourly re-key or session timeout; confirm in the firewall VPN logs.

Remediation:

- Review VPN logs for the disconnect reason and timing.
- Schedule a firewall firmware update in a maintenance window.
- Check the VPN session and re-key timers.

### Slow laptops due to low disk space and RAM (2 tickets, endpoint)

Tickets: T20260906.0019, T20260921.0020  
Likely root cause: Disks nearly full (sync client cache) on 8 GB RAM devices.

Remediation:

- Enable on-demand file sync to reduce the local cache.
- Add disk-space monitoring to the RMM policy.
- Plan RAM upgrades or replacement for 8 GB devices.

## Vulnerabilities and risks

| Severity | Finding | Evidence | Recommendation |
|---|---|---|---|
| medium | Firewall firmware out of date | T20260911.0017 | Update firewall firmware and add firmware version checks to routine maintenance. |

## Proactive opportunities

- Firewall lifecycle and firmware maintenance plan
- Endpoint hardware refresh review

## Documentation notes

- Sales and warehouse staff depend on VPN for remote work.
- Several laptops have 8 GB RAM.

## Risk index breakdown

| Component | Score (0-1) |
|---|---|
| volumeTrend | 0.17 |
| recurrence | 0.71 |
| severity | 0.14 |
| security | 0.33 |
| backlog | 0 |

_Generated automatically from PSA ticket data. Review before sharing with the client._
