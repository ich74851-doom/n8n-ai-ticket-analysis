# Support review: Contoso Dental (fictional)

Period: 2026-09-01 to 2026-10-01  
Growth/risk index: **68 (Elevated)**, confidence: normal

## Summary

Ticket volume doubled compared with the previous period (10 vs 5). The main driver is a repeating backup failure on FS01 caused by the SQL Server VSS writer timing out, plus a cluster of phishing reports including one credential compromise on an account without MFA. Identity and printer tickets are routine. One printer ticket has been open for more than 14 days.

## Ticket statistics

| Metric | Value |
|---|---|
| Tickets this period | 10 |
| Tickets previous period | 5 |
| High/critical priority | 4 |
| Open longer than 14 days | 1 |

## Recurring issues

### FS01 nightly backup failing on SQL VSS writer timeout (4 tickets, backup)

Tickets: T20260902.0001, T20260909.0002, T20260916.0003, T20260923.0004  
Likely root cause: SqlServerWriter times out during snapshot because the backup window overlaps an antivirus full scan, causing high disk queue length on FS01.

Remediation:

- Move the antivirus full scan out of the backup window or exclude the backup and SQL data paths.
- Check SqlServerWriter state with 'vssadmin list writers' before and after the job; restart the SQL Writer service if it is failed.
- Review disk latency on FS01 during the backup window.
- Run a test restore of the SQL databases once the job is stable to confirm recoverability.

### Phishing emails reaching users (3 tickets, security)

Tickets: T20260904.0005, T20260912.0006, T20260920.0007  
Likely root cause: The same external sender domain is not blocked and mail filtering does not catch the invoice/shared-document lures.

Remediation:

- Block the sender domain and review mail filtering policies.
- Search mailboxes for the same message and remove remaining copies.
- Run a short phishing-awareness reminder for staff.

## Vulnerabilities and risks

| Severity | Finding | Evidence | Recommendation |
|---|---|---|---|
| high | Account compromised via phishing without MFA | T20260912.0006 | Enforce MFA for all users, review sign-in logs for the affected account and check for mailbox rules created by an attacker. |
| medium | Repeated backup failures on a server holding SQL data | T20260902.0001, T20260909.0002, T20260923.0004 | Treat as a recoverability risk until four consecutive successful backups and a test restore are confirmed. |

## Proactive opportunities

- MFA rollout for all accounts
- Daily backup health check with VSS writer monitoring
- Security awareness training

## Documentation notes

- FS01 hosts SQL Server data; backup depends on SqlServerWriter.
- Antivirus full scan schedule conflicts with the nightly backup window.

## Risk index breakdown

| Component | Score (0-1) |
|---|---|
| volumeTrend | 1 |
| recurrence | 0.7 |
| severity | 0.4 |
| security | 0.83 |
| backlog | 0.2 |

_Generated automatically from PSA ticket data. Review before sharing with the client._
