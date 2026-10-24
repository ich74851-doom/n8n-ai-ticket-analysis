# Contributing

Thanks for your interest in improving this project. Bug reports, ideas and pull requests
are all welcome. This is a small project with one maintainer, so please allow a few days
for a response.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Never share real data

This is a public repository. **Do not include real ticket data, client names,
credentials, API keys or screenshots that show them** in issues, pull requests,
sample data or test fixtures. Use fictional data like the files in
[`sample-data/`](sample-data/). If you find a security problem, follow
[SECURITY.md](SECURITY.md) instead of opening a public issue.

## Reporting bugs and requesting features

Use the [issue templates](https://github.com/ich74851-doom/n8n-ai-ticket-analysis/issues/new/choose).
For bugs, include your n8n version, the failing node and the error message, with
any sensitive values removed.

## Development workflow

Requirements: Node.js 18 or later and Git. There are no npm dependencies.

1. Fork the repository and create a branch: `git checkout -b feat/short-description`.
2. Make your changes:
   - Code node logic goes in `src/code-nodes/*.js`.
   - Prompt changes go in `prompts/`.
   - **Do not edit `workflow/ticket-analysis.json` by hand.** It is generated.
3. Rebuild and check:

   ```bash
   node scripts/build-workflow.mjs
   node scripts/validate-workflow.mjs
   node scripts/run-sample.mjs
   npx markdownlint-cli2 "**/*.md"
   ```

4. If your change affects the output, commit the regenerated `workflow/` and
   `sample-data/example-output/` files too. CI fails if they are out of date.
5. Add an entry under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).
6. Open a pull request using the template.

## Style

- JavaScript: modern ES2020+. Code nodes must run inside the n8n Code node sandbox,
  so do not use `require`/`import` in `src/code-nodes/`.
- Keep the deterministic statistics in code and use the LLM only for judgement.
  If you change the risk-index formula, update [docs/risk-index.md](docs/risk-index.md)
  in the same pull request.
- Commit messages: short imperative summary (for example "Add HaloPSA ticket mapping").

## Testing with n8n

To test the workflow in a real n8n instance, import the rebuilt JSON, attach your own
credentials, and run it against a test PSA tenant or a narrow `referenceDate` window.
Never commit exported workflows that contain credential IDs or execution data.
