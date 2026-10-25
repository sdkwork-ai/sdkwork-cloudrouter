#!/usr/bin/env node
// check-github-workflow-integration.mjs
//
// Read-only guard for the application-side GitHub packaging entrypoint
// (GITHUB_WORKFLOW_SPEC.md sections 2, 3, 6, and 10). It verifies the facts the
// shared standard validator cannot see, because they only exist after the YAML
// block scalar has been folded and the GitHub expressions have been resolved:
//
//   1. .github/workflows/package.yml stays a thin reusable workflow call.
//   2. dependency_refs_json is valid JSON after YAML folding.
//   3. dependency_refs_json covers exactly the agent.workflow.json
//      dependencies[].refInput set, and every entry keeps the
//      github.event.inputs.<input> || vars.<REF> fallback pair.
//   4. Every github.event.inputs.<name> reference has a matching
//      workflow_dispatch input declaration.
//   5. workflow_dispatch tag/package_version defaults match the declared
//      release version, so a manual dispatch cannot package a stale version.
//
// Usage: node scripts/check-github-workflow-integration.mjs [--root <dir>]

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = resolveRoot(process.argv.slice(2));
const PACKAGE_WORKFLOW = path.join(REPO_ROOT, '.github', 'workflows', 'package.yml');
const WORKFLOW_CONFIG = path.join(REPO_ROOT, 'agent.workflow.json');
const APP_CONFIG = path.join(REPO_ROOT, 'agent.app.config.json');

const REUSABLE_WORKFLOW =
  /uses:\s*sdkwork-ai\/sdkwork-github-workflow\/\.github\/workflows\/sdkwork-package\.yml@([^\s]+)/u;
const PINNED_REF = /^(?:[0-9a-f]{40}|v\d+(?:\.\d+)*)$/u;
// GitHub rejects the entire workflow file above 25 workflow_dispatch inputs
// (raised from 10 in December 2025). An over-budget file never runs at all, not
// even for a tag push, so the packaging release silently stops happening.
const MAX_DISPATCH_INPUTS = 25;
const FORBIDDEN_LOCAL_LOGIC =
  /^\s*(?:runs-on|steps|environment|strategy):|uses:\s*actions\/checkout|gh\s+release\s+upload|softprops\/action-gh-release/imu;

function resolveRoot(argv) {
  const index = argv.indexOf('--root');
  const value = index >= 0 ? argv[index + 1] : null;
  return path.resolve(value && !value.startsWith('--') ? value : process.cwd());
}

function fail(message) {
  console.error('[workflow-integration] FAIL: ' + message);
  process.exitCode = 1;
}

function readText(file, label) {
  if (!existsSync(file)) {
    fail(label + ' is missing: ' + path.relative(REPO_ROOT, file));
    return null;
  }
  return readFileSync(file, 'utf8');
}

function readJson(file, label) {
  const text = readText(file, label);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(label + ' is not valid JSON: ' + error.message);
    return null;
  }
}

function parseWorkflowInputs(text) {
  const inputs = new Map();
  const block = text.match(/^ {2}workflow_dispatch:\s*$/mu);
  if (!block) return inputs;
  const tail = text.slice(block.index + block[0].length);
  const end = tail.search(/^\S/mu);
  const section = end >= 0 ? tail.slice(0, end) : tail;
  const header = section.match(/^ {4}inputs:\s*$/mu);
  if (!header) return inputs;
  const body = section.slice(header.index + header[0].length);
  const matcher = /^ {6}([A-Za-z0-9_-]+):\s*$\n([\s\S]*?)(?=^ {6}[A-Za-z0-9_-]+:\s*$|(?![\s\S]))/gmu;
  for (const match of body.matchAll(matcher)) {
    const detail = match[2];
    const defaultValue = detail.match(/^ {8}default:\s*(.*)$/mu);
    inputs.set(match[1], {
      default: defaultValue ? defaultValue[1].trim().replace(/^['"]|['"]$/gu, '') : null,
      required: /^ {8}required:\s*true\s*$/mu.test(detail),
    });
  }
  return inputs;
}

// Fold a YAML block scalar exactly as GitHub folds '>-': trim each line, join
// with single spaces, and drop the trailing newline.
function foldBlockScalar(block) {
  return block.split('\n').map((line) => line.trim()).join(' ').trim();
}

// Resolve GitHub expressions the way the runner does before the reusable
// workflow receives the value. An unset repository variable or dispatch input
// resolves to the empty string.
function resolveExpressions(text, values = {}) {
  return text.replace(/\$\{\{([\s\S]*?)\}\}/gu, (_match, expression) => {
    for (const candidate of String(expression).split('||').map((part) => part.trim())) {
      if (Object.hasOwn(values, candidate)) return String(values[candidate]);
    }
    return '';
  });
}

const packageWorkflow = readText(PACKAGE_WORKFLOW, '.github/workflows/package.yml');
const workflow = readJson(WORKFLOW_CONFIG, 'agent.workflow.json');
const appConfig = readJson(APP_CONFIG, 'agent.app.config.json');

if (packageWorkflow !== null && workflow !== null && appConfig !== null) {
  const reusableMatch = packageWorkflow.match(REUSABLE_WORKFLOW);
  if (!reusableMatch) {
    fail('package.yml must call sdkwork-ai/sdkwork-github-workflow/.github/workflows/sdkwork-package.yml');
  } else if (!PINNED_REF.test(reusableMatch[1])) {
    fail('reusable workflow ref must be pinned to a commit or version tag, got ' + reusableMatch[1]);
  }
  if (!/config_path:\s*sdkwork\.workflow\.json\s*$/mu.test(packageWorkflow)) {
    fail('package.yml must pass config_path: agent.workflow.json');
  }
  const jobsIndex = packageWorkflow.search(/^jobs:\s*$/mu);
  const jobsSection = jobsIndex >= 0 ? packageWorkflow.slice(jobsIndex) : '';
  const jobCount = [...jobsSection.matchAll(/^ {2}[A-Za-z0-9_-]+:\s*$/gmu)].length;
  if (jobCount !== 1) {
    fail('package.yml must stay a single thin reusable workflow call job, found ' + jobCount + ' job entries');
  }
  if (FORBIDDEN_LOCAL_LOGIC.test(packageWorkflow)) {
    fail('package.yml must not carry local runner, checkout, or release-upload logic');
  }

  const declaredInputs = parseWorkflowInputs(packageWorkflow);
  if (declaredInputs.size > MAX_DISPATCH_INPUTS) {
    fail('package.yml declares ' + declaredInputs.size + ' workflow_dispatch inputs; GitHub rejects the file above ' + MAX_DISPATCH_INPUTS + ', which stops every release including tag pushes');
  }
  const referencedInputs = new Set(
    [...packageWorkflow.matchAll(/github\.event\.inputs\.([A-Za-z0-9_-]+)/gu)].map((match) => match[1]),
  );
  for (const name of referencedInputs) {
    if (!declaredInputs.has(name)) {
      fail('package.yml references github.event.inputs.' + name + ' without declaring that workflow_dispatch input');
    }
  }

  const block = packageWorkflow.match(/dependency_refs_json:\s*>?-?\s*\n([\s\S]*?)\n\s*secrets:\s*inherit/u);
  if (!block) {
    fail('package.yml must pass dependency_refs_json before secrets: inherit');
  } else {
    const folded = foldBlockScalar(block[1]);
    const resolved = resolveExpressions(folded);
    let refs = null;
    try {
      refs = JSON.parse(resolved);
    } catch (error) {
      fail('dependency_refs_json is not valid JSON after YAML folding: ' + error.message);
    }
    if (refs !== null) {
      const declared = new Map();
      const pinnedRefInputs = new Set();
      for (const entry of workflow.dependencies ?? []) {
        if (typeof entry?.refInput === 'string' && entry.refInput.trim() !== '') {
          declared.set(entry.refInput, entry.id ?? entry.repository ?? entry.refInput);
          if (typeof entry.ref === 'string' && entry.ref.trim() !== '') pinnedRefInputs.add(entry.refInput);
        }
      }
      for (const [refInput, id] of declared) {
        if (!Object.hasOwn(refs, refInput)) {
          fail('dependency_refs_json must pass ' + refInput + ' for dependency ' + id);
          continue;
        }
        // Assert the fallback pair on the raw folded text: the resolved value
        // has already replaced every ${{ ... }} expression with a literal ref.
        const rawEntry = new RegExp('"' + refInput + '"\\s*:\\s*"([^"]*)"', 'u').exec(folded);
        const entry = rawEntry ? rawEntry[1] : '';
        const inputName = refInput.toLowerCase();
        // The dispatch-input budget is shared across every dependency, so only a
        // dependency the repository pins to a fixed ref gets an override input;
        // the rest resolve through their repository variable.
        if (pinnedRefInputs.has(refInput)) {
          if (!declaredInputs.has(inputName)) {
            fail('package.yml must expose workflow_dispatch input ' + inputName + ' for pinned dependency ' + refInput);
          }
          if (!entry.includes('github.event.inputs.' + inputName)) {
            fail('dependency_refs_json entry ' + refInput + ' must read github.event.inputs.' + inputName);
          }
        }
        if (!entry.includes('vars.' + refInput)) {
          fail('dependency_refs_json entry ' + refInput + ' must fall back to vars.' + refInput);
        }
      }
      for (const key of Object.keys(refs)) {
        if (!declared.has(key)) {
          fail('dependency_refs_json passes ' + key + ', which agent.workflow.json does not declare as a refInput');
        }
      }
    }
  }

  const currentVersion = appConfig.release?.currentVersion;
  const defaultVersion = workflow.release?.defaultVersion;
  if (typeof currentVersion === 'string' && typeof defaultVersion === 'string' && currentVersion !== defaultVersion) {
    fail('agent.app.config.json release.currentVersion (' + currentVersion + ') must match agent.workflow.json release.defaultVersion (' + defaultVersion + ')');
  }
  if (typeof currentVersion === 'string') {
    const tagInput = declaredInputs.get('tag');
    const versionInput = declaredInputs.get('package_version');
    if (tagInput && tagInput.default && tagInput.default !== 'v' + currentVersion) {
      fail('package.yml workflow_dispatch tag default ' + tagInput.default + ' must be v' + currentVersion);
    }
    if (versionInput && versionInput.default && versionInput.default !== currentVersion) {
      fail('package.yml workflow_dispatch package_version default ' + versionInput.default + ' must be ' + currentVersion);
    }
  }
}

if (process.exitCode === 1) {
  console.error('[workflow-integration] GitHub packaging workflow integration is not compliant');
} else {
  console.log('[workflow-integration] ok: ' + path.relative(process.cwd(), PACKAGE_WORKFLOW));
}
