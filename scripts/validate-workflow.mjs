#!/usr/bin/env node
// Static checks for n8n workflow JSON files (default: workflow/*.json).
//   node scripts/validate-workflow.mjs [file ...]
//
// Checks: valid JSON, required workflow/node fields, unique node names and IDs,
// connections pointing at existing nodes, every non-note node reachable from a
// trigger, Code node JavaScript that compiles, no unfilled build placeholders,
// credentials that are placeholders, and nothing that looks like a real secret.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(join(root, 'workflow')).filter((f) => f.endsWith('.json')).map((f) => join(root, 'workflow', f));

const SECRET_PATTERNS = [
  /sk-ant-[A-Za-z0-9_-]{10,}/, // Anthropic API key
  /sk-[A-Za-z0-9]{20,}/, // OpenAI-style key
  /"Secret"\s*:\s*"[^"]+"/, // Autotask secret header value
  /"ApiIntegrationCode"\s*:\s*"[^"]+"/, // Autotask integration code value
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

let failures = 0;
const fail = (file, message) => { failures += 1; console.error(`✗ ${file}: ${message}`); };

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  let wf;
  try {
    wf = JSON.parse(raw);
  } catch (error) {
    fail(file, `invalid JSON: ${error.message}`);
    continue;
  }

  for (const key of ['name', 'nodes', 'connections']) {
    if (!(key in wf)) fail(file, `missing top-level "${key}"`);
  }
  if (!Array.isArray(wf.nodes) || wf.nodes.length === 0) { fail(file, '"nodes" must be a non-empty array'); continue; }

  const names = new Set();
  const ids = new Set();
  for (const node of wf.nodes) {
    for (const key of ['id', 'name', 'type', 'typeVersion', 'position', 'parameters']) {
      if (!(key in node)) fail(file, `node "${node.name ?? '?'}" is missing "${key}"`);
    }
    if (names.has(node.name)) fail(file, `duplicate node name "${node.name}"`);
    if (ids.has(node.id)) fail(file, `duplicate node id "${node.id}"`);
    names.add(node.name);
    ids.add(node.id);
    if (!Array.isArray(node.position) || node.position.length !== 2) fail(file, `node "${node.name}" has an invalid position`);

    if (node.type === 'n8n-nodes-base.code') {
      const js = node.parameters?.jsCode ?? '';
      if (/__[A-Z_]+__/.test(js)) fail(file, `node "${node.name}" still contains a build placeholder`);
      try {
        // Code nodes run as an async function body, so top-level return/await are allowed.
        new vm.Script(`(async function () {\n${js}\n})`, { filename: node.name });
      } catch (error) {
        fail(file, `node "${node.name}" JavaScript does not compile: ${error.message}`);
      }
    }

    for (const [type, cred] of Object.entries(node.credentials ?? {})) {
      if (!/placeholder/i.test(cred.name ?? '') || !/^REPLACE_ME/.test(cred.id ?? '')) {
        fail(file, `node "${node.name}" credential "${type}" should be a placeholder in a template`);
      }
    }
  }

  // Connections
  const adjacency = new Map();
  for (const [source, outputs] of Object.entries(wf.connections ?? {})) {
    if (!names.has(source)) fail(file, `connection from unknown node "${source}"`);
    for (const branch of Object.values(outputs)) {
      for (const targets of branch) {
        for (const target of targets ?? []) {
          if (!names.has(target.node)) fail(file, `connection from "${source}" to unknown node "${target.node}"`);
          if (!adjacency.has(source)) adjacency.set(source, []);
          adjacency.get(source).push(target.node);
        }
      }
    }
  }

  // Reachability from triggers
  const triggers = wf.nodes.filter((n) => /trigger/i.test(n.type)).map((n) => n.name);
  if (triggers.length === 0) fail(file, 'no trigger node found');
  const seen = new Set(triggers);
  const queue = [...triggers];
  while (queue.length) {
    for (const next of adjacency.get(queue.shift()) ?? []) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  for (const node of wf.nodes) {
    if (node.type !== 'n8n-nodes-base.stickyNote' && !seen.has(node.name)) {
      fail(file, `node "${node.name}" is not reachable from a trigger`);
    }
  }

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(raw)) fail(file, `possible secret found (pattern ${pattern})`);
  }

  if (failures === 0) console.log(`✓ ${file}: ${wf.nodes.length} nodes, ${triggers.length} trigger(s), all checks passed`);
}

process.exit(failures ? 1 : 0);
