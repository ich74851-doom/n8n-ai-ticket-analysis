# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 1.x (latest release) | Yes |
| Older | No |

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report them privately through GitHub:
[**Report a vulnerability**](https://github.com/ich74851-doom/n8n-ai-ticket-analysis/security/advisories/new)
(Security tab → Advisories → Report a vulnerability).

Please include:

- a description of the problem and its impact
- steps to reproduce, or a proof of concept that uses **fictional data only**
- the affected file or workflow node

You should get an acknowledgement within 7 days. Confirmed issues are fixed in a new
release and credited in the changelog unless you prefer otherwise.

## Scope

In scope:

- secrets or real data accidentally committed to this repository
- weaknesses in the redaction and data minimisation in `src/code-nodes/group-by-client.js`
- workflow behaviour that could leak ticket data to unintended destinations
- prompt-injection paths where ticket text could change workflow behaviour beyond the
  analysis output

Out of scope: vulnerabilities in n8n, Autotask or the Claude API themselves. Report
those to the respective vendors.

## Guidance for users

- Store API keys only in n8n credentials, never in the Config or Code nodes.
- Use a dedicated Autotask API-only user with the minimum permissions needed.
- Treat model output as untrusted text, and review reports before they are shared.
- Set n8n execution data retention to match your data policy.
