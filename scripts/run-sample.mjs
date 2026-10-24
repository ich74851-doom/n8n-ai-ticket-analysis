#!/usr/bin/env node
// Runs the workflow's Code nodes offline against the fictional data in
// sample-data/, with the HTTP nodes replaced by the saved sample responses.
// No network calls are made and no credentials are needed.
//
//   node scripts/run-sample.mjs            # regenerate sample-data/example-output/
//   node scripts/run-sample.mjs --check    # fail if the committed output differs (used in CI)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const workflow = readJson('workflow/ticket-analysis.json');
const node = (name) => workflow.nodes.find((n) => n.name === name);

// Fixed date so the sample output is reproducible.
const SAMPLE_REFERENCE_DATE = '2026-10-01T00:00:00.000Z';
const SAMPLE_GENERATED_AT = '2026-10-01T07:00:00.000Z';

const outputs = {};
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

async function runCodeNode(name, inputItems) {
  const $ = (other) => {
    if (!outputs[other]) throw new Error(`Node "${other}" has no output yet`);
    return { first: () => outputs[other][0], all: () => outputs[other] };
  };
  const $input = { first: () => inputItems[0], all: () => inputItems };
  const fn = new AsyncFunction('$', '$input', 'console', node(name).parameters.jsCode);
  const quietConsole = { log: () => {} };
  outputs[name] = await fn($, $input, quietConsole);
  return outputs[name];
}

// Config node -> plain object (with the sample reference date).
const config = Object.fromEntries(
  node('Config').parameters.assignments.assignments.map((a) => [a.name, a.value]),
);
config.referenceDate = SAMPLE_REFERENCE_DATE;
outputs.Config = [{ json: config }];

let items = await runCodeNode('Build ticket query', outputs.Config);
outputs['Autotask: query tickets'] = [{ json: readJson('sample-data/autotask-tickets-response.json') }];
items = await runCodeNode('Build company query', outputs['Autotask: query tickets']);
outputs['Autotask: query companies'] = [{ json: readJson('sample-data/autotask-companies-response.json') }];
const clients = await runCodeNode('Clean & group by client', outputs['Autotask: query companies']);
const requests = await runCodeNode('Build Claude request', clients);

const responses = readJson('sample-data/example-claude-responses.json');
outputs['Claude: analyse client tickets'] = requests.map((r) => {
  const response = responses[r.json.clientName];
  if (!response) throw new Error(`No sample Claude response for "${r.json.clientName}"`);
  return { json: response };
});
const scored = await runCodeNode('Parse analysis & score risk index', outputs['Claude: analyse client tickets']);
const docs = await runCodeNode('Build client documentation', scored);

// Make the summary timestamp reproducible.
const summary = docs.find((d) => d.json.type === 'portfolio-summary').json;
summary.generatedAt = SAMPLE_GENERATED_AT;

const files = {};
const slug = (s) => s.toLowerCase().replace(/\(fictional\)/, '').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
for (const d of docs.filter((x) => x.json.type === 'client-report')) {
  files[`client-report-${slug(d.json.clientName)}.md`] = d.json.markdown;
}
files['portfolio-summary.json'] = `${JSON.stringify(summary, null, 2)}\n`;
files['scored-analysis.json'] = `${JSON.stringify(scored.map((s) => s.json), null, 2)}\n`;
files['claude-request-example.json'] = `${JSON.stringify(requests[0].json.requestBody, null, 2)}\n`;

const outDir = join(root, 'sample-data', 'example-output');
if (process.argv.includes('--check')) {
  let stale = 0;
  for (const [name, content] of Object.entries(files)) {
    const path = join(outDir, name);
    if (!existsSync(path) || readFileSync(path, 'utf8') !== content) {
      console.error(`Out of date: sample-data/example-output/${name}`);
      stale += 1;
    }
  }
  if (stale) {
    console.error('Run: node scripts/run-sample.mjs');
    process.exit(1);
  }
  console.log('Sample output is up to date.');
} else {
  mkdirSync(outDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) writeFileSync(join(outDir, name), content);
  console.log(`Clients analysed: ${clients.length} (of ${items[0].json.companyIds.length} with tickets)`);
  for (const c of summary.clients) console.log(`  ${c.riskIndex.toString().padStart(3)}  ${c.riskBand.padEnd(8)}  ${c.clientName}`);
  console.log(`Wrote ${Object.keys(files).length} files to sample-data/example-output/`);
}
