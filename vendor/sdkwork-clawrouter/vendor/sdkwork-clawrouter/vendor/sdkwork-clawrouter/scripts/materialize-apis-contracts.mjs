#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');

const CONTRACTS = [
  {
    surface: 'open-api',
    domain: 'clawrouter',
    target: 'apis/open-api/clawrouter/clawrouter-open-api.openapi.json',
    source: 'sdks/clawrouter-open-sdk/openapi/clawrouter-open-sdk.openapi.json',
    apiAuthority: 'sdkwork-clawrouter-open-api',
    sdkFamily: 'clawrouter-open-sdk',
  },
  {
    surface: 'app-api',
    domain: 'clawrouter',
    target: 'apis/app-api/clawrouter/clawrouter-app-api.openapi.json',
    source: 'generated/openapi/clawrouter-app-openapi.json',
    apiAuthority: 'sdkwork-clawrouter-app-api',
    sdkFamily: 'clawrouter-app-sdk',
  },
  {
    surface: 'backend-api',
    domain: 'clawrouter',
    target: 'apis/backend-api/clawrouter/clawrouter-backend-api.openapi.json',
    source: 'generated/openapi/clawrouter-backend-openapi.json',
    apiAuthority: 'sdkwork-clawrouter-backend-api',
    sdkFamily: 'clawrouter-backend-sdk',
  },
];

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function ensureParent(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const check = argv.includes('--check') || !apply;
  return { apply, check };
}

function buildManifest(entries) {
  return {
    schemaVersion: 1,
    kind: 'sdkwork.api-contract-manifest',
    application: 'sdkwork-clawrouter',
    description:
      'Author-owned HTTP API contract materialization inputs for SDKWork Claw Router. Generated SDK output remains under sdks/.',
    contracts: entries,
    materializeScript: 'scripts/materialize-apis-contracts.mjs',
    relatedSpecs: [
      '../sdkwork-specs/API_SPEC.md',
      '../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md',
    ],
  };
}

function main() {
  const { apply, check } = parseArgs(process.argv.slice(2));
  const messages = [];
  const manifestEntries = [];

  for (const contract of CONTRACTS) {
    const sourcePath = join(ROOT, contract.source);
    const targetPath = join(ROOT, contract.target);

    if (!existsSync(sourcePath)) {
      messages.push(`missing source contract: ${contract.source}`);
      continue;
    }

    const sourceHash = sha256(sourcePath);
    manifestEntries.push({
      surface: contract.surface,
      domain: contract.domain,
      path: contract.target,
      source: contract.source,
      apiAuthority: contract.apiAuthority,
      sdkFamily: contract.sdkFamily,
      sha256: sourceHash,
    });

    if (!existsSync(targetPath)) {
      if (check) {
        messages.push(`apis contract not materialized: ${contract.target}`);
      }
      if (apply) {
        ensureParent(targetPath);
        copyFileSync(sourcePath, targetPath);
      }
      continue;
    }

    const targetHash = sha256(targetPath);
    if (targetHash !== sourceHash) {
      if (check) {
        messages.push(`apis contract stale: ${contract.target} (run pnpm api:materialize:write)`);
      }
      if (apply) {
        ensureParent(targetPath);
        copyFileSync(sourcePath, targetPath);
      }
    }
  }

  const manifestPath = join(ROOT, 'apis/manifest.json');
  const manifest = buildManifest(manifestEntries);
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  const existingManifest = existsSync(manifestPath) ? readFileSync(manifestPath, 'utf8') : null;

  if (existingManifest !== manifestText) {
    if (check) {
      messages.push('apis/manifest.json is stale (run pnpm api:materialize:write)');
    }
    if (apply) {
      writeFileSync(manifestPath, manifestText, 'utf8');
    }
  }

  if (messages.length > 0) {
    for (const message of messages) {
      console.error(message);
    }
    process.exit(1);
  }

  console.log(check ? 'apis contract materialization check passed' : 'apis contracts materialized');
}

main();
