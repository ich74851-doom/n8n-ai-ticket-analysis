#!/usr/bin/env node
// Builds workflow/ticket-analysis.json from the Code node sources in
// src/code-nodes/ and the prompt templates in prompts/.
//
// Edit the .js / prompt files, not the JSON, then run:
//   node scripts/build-workflow.mjs          # write the workflow
//   node scripts/build-workflow.mjs --check  # fail if the committed JSON is out of date (used in CI)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const code = (name) => read(`src/code-nodes/${name}.js`);
const outputPath = join(root, 'workflow', 'ticket-analysis.json');

// Prompts are embedded into the "Build Claude request" Code node at build time.
const claudeRequestCode = code('build-claude-request')
  .replace('__SYSTEM_PROMPT__', () => JSON.stringify(read('prompts/system.txt').trim()))
  .replace('__USER_PROMPT_TEMPLATE__', () => JSON.stringify(read('prompts/client-analysis.txt').trim()))
  .replace('__OUTPUT_SCHEMA__', () => JSON.stringify(JSON.parse(read('prompts/output-schema.json'))));
// (Function replacements avoid special `$` patterns in String.prototype.replace.)

// Non-secret settings. Secrets live only in n8n credentials.
const config = [
  ['autotaskBaseUrl', 'https://webservicesN.autotask.net/ATServicesRest/V1.0', 'string'],
  ['lookbackDays', 30, 'number'],
  ['maxTickets', 500, 'number'],
  ['minTicketsPerClient', 3, 'number'],
  ['agingDays', 14, 'number'],
  ['highPriorityValues', '1,4', 'string'],
  ['claudeModel', 'claude-sonnet-4-5', 'string'],
  ['maxTokens', 4000, 'number'],
  ['referenceDate', '', 'string'],
];

const codeNode = (id, name, x, jsCode) => ({
  id, name, type: 'n8n-nodes-base.code', typeVersion: 2, position: [x, 300], parameters: { jsCode },
});

const autotaskRequest = (id, name, x, entity) => ({
  id,
  name,
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [x, 300],
  parameters: {
    method: 'POST',
    url: `={{ $('Config').first().json.autotaskBaseUrl }}/${entity}/query`,
    authentication: 'genericCredentialType',
    genericAuthType: 'httpCustomAuth',
    sendBody: true,
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify($json.queryBody) }}',
    options: { timeout: 60000 },
  },
  credentials: { httpCustomAuth: { id: 'REPLACE_ME_AUTOTASK', name: 'Autotask API (placeholder)' } },
});

const nodes = [
  {
    id: 'a1f0c001-0000-4000-8000-000000000001',
    name: 'Setup notes',
    type: 'n8n-nodes-base.stickyNote',
    typeVersion: 1,
    position: [-260, -40],
    parameters: {
      width: 520,
      height: 260,
      content: [
        '## AI ticket analysis (sanitized template)',
        '1. Create an **Autotask API** credential (Custom Auth) with the JSON headers `ApiIntegrationCode`, `UserName` and `Secret` from an API-only Autotask user.',
        '2. Create a **Claude API** credential (Header Auth): name `x-api-key`, value = your Anthropic API key.',
        '3. Edit the **Config** node: your Autotask zone URL, look-back window and model.',
        '4. Run manually first, check the output, then enable the schedule.',
        '',
        'No credentials or client data are included in this template.',
      ].join('\n'),
    },
  },
  {
    id: 'a1f0c001-0000-4000-8000-000000000002',
    name: 'Manual run',
    type: 'n8n-nodes-base.manualTrigger',
    typeVersion: 1,
    position: [-260, 240],
    parameters: {},
  },
  {
    id: 'a1f0c001-0000-4000-8000-000000000003',
    name: 'Weekly schedule',
    type: 'n8n-nodes-base.scheduleTrigger',
    typeVersion: 1.2,
    position: [-260, 420],
    parameters: {
      rule: { interval: [{ field: 'weeks', weeksInterval: 1, triggerAtDay: [1], triggerAtHour: 7 }] },
    },
  },
  {
    id: 'a1f0c001-0000-4000-8000-000000000004',
    name: 'Config',
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [0, 300],
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: config.map(([name, value, type], i) => ({
          id: `c0f19000-0000-4000-8000-00000000000${i + 1}`, name, value, type,
        })),
      },
      options: {},
    },
  },
  codeNode('a1f0c001-0000-4000-8000-000000000005', 'Build ticket query', 220, code('build-ticket-query')),
  autotaskRequest('a1f0c001-0000-4000-8000-000000000006', 'Autotask: query tickets', 440, 'Tickets'),
  codeNode('a1f0c001-0000-4000-8000-000000000007', 'Build company query', 660, code('build-company-query')),
  autotaskRequest('a1f0c001-0000-4000-8000-000000000008', 'Autotask: query companies', 880, 'Companies'),
  codeNode('a1f0c001-0000-4000-8000-000000000009', 'Clean & group by client', 1100, code('group-by-client')),
  codeNode('a1f0c001-0000-4000-8000-000000000010', 'Build Claude request', 1320, claudeRequestCode),
  {
    id: 'a1f0c001-0000-4000-8000-000000000011',
    name: 'Claude: analyse client tickets',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [1540, 300],
    parameters: {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json.requestBody) }}',
      options: {
        batching: { batch: { batchSize: 1, batchInterval: 2000 } },
        timeout: 120000,
      },
    },
    credentials: { httpHeaderAuth: { id: 'REPLACE_ME_CLAUDE', name: 'Claude API (placeholder)' } },
  },
  codeNode('a1f0c001-0000-4000-8000-000000000012', 'Parse analysis & score risk index', 1760, code('score-risk-index')),
  codeNode('a1f0c001-0000-4000-8000-000000000013', 'Build client documentation', 1980, code('build-documentation')),
  {
    id: 'a1f0c001-0000-4000-8000-000000000014',
    name: 'Deliver reports (configure me)',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [2200, 300],
    disabled: true,
    notes: 'Disabled by default. Point it at your documentation system, Teams/Slack webhook or file storage, or replace it with a native n8n node.',
    parameters: {
      method: 'POST',
      url: 'https://example.com/replace-with-your-endpoint',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json) }}',
      options: {},
    },
  },
];

const chain = [
  'Config', 'Build ticket query', 'Autotask: query tickets', 'Build company query',
  'Autotask: query companies', 'Clean & group by client', 'Build Claude request',
  'Claude: analyse client tickets', 'Parse analysis & score risk index',
  'Build client documentation', 'Deliver reports (configure me)',
];
const link = (to) => ({ main: [[{ node: to, type: 'main', index: 0 }]] });
const connections = { 'Manual run': link('Config'), 'Weekly schedule': link('Config') };
for (let i = 0; i < chain.length - 1; i += 1) connections[chain[i]] = link(chain[i + 1]);

const workflow = {
  name: 'AI ticket analysis: Autotask + Claude (sanitized template)',
  nodes,
  connections,
  active: false,
  settings: { executionOrder: 'v1' },
  pinData: {},
  meta: { templateCredsSetupCompleted: false },
  tags: [],
};

const output = `${JSON.stringify(workflow, null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = readFileSync(outputPath, 'utf8');
  if (current !== output) {
    console.error('workflow/ticket-analysis.json is out of date. Run: node scripts/build-workflow.mjs');
    process.exit(1);
  }
  console.log('workflow/ticket-analysis.json is up to date.');
} else {
  writeFileSync(outputPath, output);
  console.log(`Wrote ${outputPath}`);
}
