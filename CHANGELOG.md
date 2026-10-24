# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-10-24

First public release: a sanitized template of an Autotask + Claude ticket analysis
workflow.

### Added

- Importable n8n workflow (`workflow/ticket-analysis.json`) using core nodes only:
  triggers, Config, Autotask ticket and company queries, cleaning and grouping,
  Claude analysis, risk scoring, and report generation.
- Code node sources in `src/code-nodes/` and a build script that generates the
  workflow JSON with the prompts embedded.
- Prompt templates and a strict JSON output schema in `prompts/`.
- Data minimisation: HTML stripping, redaction of email addresses, phone numbers and
  IPv4 addresses, and truncation before text is sent to the LLM.
- Growth/risk index (0-100) with five weighted components, documented in
  `docs/risk-index.md`.
- Fictional sample data, example Claude responses and reproducible example output.
- Workflow validator, offline sample runner, and CI for workflow validation and
  Markdown linting.
- Setup guide, contributing guide, code of conduct, security policy, and issue and
  pull request templates.

[Unreleased]: https://github.com/ich74851-doom/n8n-ai-ticket-analysis/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ich74851-doom/n8n-ai-ticket-analysis/releases/tag/v1.0.0
