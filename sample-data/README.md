# Sample data (fictional)

Everything in this folder is **made up** for demonstration and testing. The companies
are fictional names (Contoso, Fabrikam, Northwind, Tailspin). The ticket numbers,
email addresses (`example.com`), phone numbers (`555` range) and IP addresses
(`203.0.113.0/24`, reserved for documentation) are not real. None of it comes from a
real client or PSA instance.

| File | What it is |
|---|---|
| `autotask-tickets-response.json` | Fake response in the shape returned by Autotask `POST /Tickets/query` (37 tickets, 4 companies, two 30-day periods) |
| `autotask-companies-response.json` | Fake response in the shape returned by `POST /Companies/query` |
| `example-claude-responses.json` | Hand-written example Claude Messages API responses, one per client, following `prompts/output-schema.json` |
| `example-output/` | Output from `node scripts/run-sample.mjs`, which runs the real Code node logic on the files above |

In `example-output/claude-request-example.json` you can see the redaction at work: the
email address and phone number in a ticket description are replaced with `[email]` and
`[phone]` before anything is sent to the LLM. Tailspin Toys has only one ticket in the
period, so it is left out by `minTicketsPerClient`.
