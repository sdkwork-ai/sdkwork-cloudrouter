import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'check-github-workflow-integration.mjs');

const WORKFLOW_CONFIG = [
  '{',
  '  "schemaVersion": "2026-06-06.sdkwork.workflow.v1",',
  '  "app": { "id": "demo-app", "repository": "sdkwork-ai/demo-app" },',
  '  "release": { "artifactPrefix": "demo", "defaultVersion": "0.4.1" },',
  '  "dependencies": [',
  '    { "id": "sdkwork-core", "repository": "sdkwork-ai/sdkwork-core", "refInput": "SDKWORK_CORE_REF" },',
  '    { "id": "sdkwork-ui", "repository": "sdkwork-ai/sdkwork-ui", "refInput": "SDKWORK_UI_REF" }',
  '  ],',
  '  "targets": [{ "id": "linux-x64-standalone-server-tar-gz" }]',
  '}',
].join('\n');

const APP_CONFIG = [
  '{',
  '  "release": { "currentVersion": "0.4.1" }',
  '}',
].join('\n');

function packageWorkflow({ refsJson, extraInputRef = null, tagDefault = 'v0.4.1', fillerInputs = 0 }) {
  const filler = Array.from({ length: fillerInputs }, (_unused, index) => [
    '      filler_' + index + ':',
    '        required: false',
    '        default: all',
  ]).join('\n');
  return [
    'name: Package Application',
    'on:',
    '  workflow_dispatch:',
    '    inputs:',
    '      tag:',
    '        required: true',
    '        default: ' + tagDefault,
    '      package_version:',
    '        required: true',
    '        default: 0.4.1',
    '      sdkwork_core_ref:',
    '        required: false',
    '        default: main',
    ...(filler ? [filler] : []),
    '      sdkwork_ui_ref:',
    '        required: false',
    '        default: main',
    'permissions:',
    '  contents: write',
    'jobs:',
    '  package:',
    '    uses: sdkwork-ai/sdkwork-github-workflow/.github/workflows/sdkwork-package.yml@2121cc5f1385e8e561171d01fbb71f11adbda187',
    '    with:',
    '      config_path: sdkwork.workflow.json',
    '      tag: ${{ github.event.inputs.tag || github.ref_name }}',
    '      package_version: ${{ github.event.inputs.package_version || \'\' }}',
    ...(extraInputRef ? ['      note: ${{ github.event.inputs.' + extraInputRef + ' }}'] : []),
    '      dependency_refs_json: >-',
    '        ' + refsJson,
    '    secrets: inherit',
    '',
  ].join('\n');
}

const VALID_REFS = '{ "SDKWORK_CORE_REF": "${{ github.event.inputs.sdkwork_core_ref || vars.SDKWORK_CORE_REF }}", "SDKWORK_UI_REF": "${{ github.event.inputs.sdkwork_ui_ref || vars.SDKWORK_UI_REF }}" }';

function withFixture(packageYml, run) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sdkwork-workflow-guard-'));
  try {
    mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
    writeFileSync(path.join(root, 'sdkwork.workflow.json'), WORKFLOW_CONFIG);
    writeFileSync(path.join(root, 'agent.app.config.json'), APP_CONFIG);
    writeFileSync(path.join(root, '.github', 'workflows', 'package.yml'), packageYml);
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runGuard(root) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
    return { status: 0, output: stdout };
  } catch (error) {
    return { status: error.status ?? 1, output: String(error.stdout ?? '') + String(error.stderr ?? '') };
  }
}

test('accepts a compliant thin packaging workflow', () => {
  const result = withFixture(packageWorkflow({ refsJson: VALID_REFS }), runGuard);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /workflow-integration\] ok/u);
});

test('rejects dependency_refs_json that is not valid JSON after folding', () => {
  const broken = VALID_REFS.replace('\", \"SDKWORK_UI_REF', '\" \"SDKWORK_UI_REF');
  const result = withFixture(packageWorkflow({ refsJson: broken }), runGuard);
  assert.equal(result.status, 1);
  assert.match(result.output, /not valid JSON after YAML folding/u);
});

test('rejects an event input that has no workflow_dispatch declaration', () => {
  const result = withFixture(
    packageWorkflow({ refsJson: VALID_REFS, extraInputRef: 'sdkwork_missing_ref' }),
    runGuard,
  );
  assert.equal(result.status, 1);
  assert.match(result.output, /without declaring that workflow_dispatch input/u);
});

// The defect that silently stopped every release: the file grew past GitHub's
// 25 workflow_dispatch input cap, so GitHub rejected it and no run was ever
// created, not even for a tag push.
test('rejects a workflow_dispatch input budget above the GitHub cap', () => {
  const nl = String.fromCharCode(10);
  const filler = Array.from({ length: 30 }, (_unused, index) => [
    '      filler_' + index + ':',
    '        required: false',
    '        default: all',
  ].join(nl)).join(nl);
  const yml = packageWorkflow({ refsJson: VALID_REFS }).replace(
    '      sdkwork_ui_ref:',
    filler + nl + '      sdkwork_ui_ref:',
  );
  const result = withFixture(yml, runGuard);
  assert.equal(result.status, 1);
  assert.match(result.output, /GitHub rejects the file above 25/u);
});

test('rejects a workflow_dispatch tag default that drifts from the release version', () => {
  const result = withFixture(packageWorkflow({ refsJson: VALID_REFS, tagDefault: 'v0.3.0' }), runGuard);
  assert.equal(result.status, 1);
  assert.match(result.output, /tag default v0\.3\.0 must be v0\.4\.1/u);
});

test('rejects a dependency ref key that sdkwork.workflow.json does not declare', () => {
  const withExtra = '{ "SDKWORK_CORE_REF": "${{ github.event.inputs.sdkwork_core_ref || vars.SDKWORK_CORE_REF }}", "SDKWORK_UI_REF": "${{ github.event.inputs.sdkwork_ui_ref || vars.SDKWORK_UI_REF }}", "SDKWORK_GHOST_REF": "${{ vars.SDKWORK_GHOST_REF }}" }';
  const result = withFixture(packageWorkflow({ refsJson: withExtra }), runGuard);
  assert.equal(result.status, 1);
  assert.match(result.output, /does not declare as a refInput/u);
});
