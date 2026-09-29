#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');

const CONTRACTS = [
  {
    surface: 'open-api',
    domain: 'cloudrouter',
    target: 'apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json',
    source: 'sdks/cloudrouter-open-sdk/openapi/cloudrouter-open-sdk.openapi.json',
    apiAuthority: 'sdkwork-cloudrouter-open-api',
    sdkFamily: 'cloudrouter-open-sdk',
  },
  {
    surface: 'app-api',
    domain: 'cloudrouter',
    target: 'apis/app-api/cloudrouter/cloudrouter-app-api.openapi.json',
    source: 'generated/openapi/cloudrouter-app-openapi.json',
    apiAuthority: 'sdkwork-cloudrouter-app-api',
    sdkFamily: 'cloudrouter-app-sdk',
  },
  {
    surface: 'backend-api',
    domain: 'cloudrouter',
    target: 'apis/backend-api/cloudrouter/cloudrouter-backend-api.openapi.json',
    source: 'generated/openapi/cloudrouter-backend-openapi.json',
    apiAuthority: 'sdkwork-cloudrouter-backend-api',
    sdkFamily: 'cloudrouter-backend-sdk',
  },
];

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function contractBodyHash(contract, filePath) {
  // Raw-byte hashing on purpose: document-root governance extensions such as
  // `x-sdkwork-int64-openai-compat` and `x-sdkwork-query-parameter-vendor-compat`
  // are contractual (API_SPEC §13: the marker must be present on the API
  // authority and every derived mirror), so an extension-only source change
  // must still propagate to the materialized authority copy.
  return sha256(filePath);
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
    application: 'sdkwork-cloudrouter',
    description:
      'Author-owned HTTP API contract materialization inputs for SDKWork Cloud Router. Generated SDK output remains under sdks/.',
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

    const sourceHash = contractBodyHash(contract, sourcePath);
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

    const targetHash = contractBodyHash(contract, targetPath);
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
