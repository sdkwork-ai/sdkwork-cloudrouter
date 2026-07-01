#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const TARGETS = [
  'sdks/clawrouter-backend-sdk/openapi/clawrouter-backend-domain-transport.openapi.json',
  'sdks/clawrouter-app-sdk/openapi/clawrouter-app-domain-transport.openapi.json',
  'sdks/clawrouter-backend-sdk/clawrouter-backend-domain-transport-typescript/generated/server-openapi/source-openapi.json',
  'sdks/clawrouter-app-sdk/clawrouter-app-domain-transport-typescript/generated/server-openapi/source-openapi.json',
];

const REPLACEMENTS = [
  ['SDKWork Commerce Backend API', 'SDKWork Claw Router Backend Domain Transport API'],
  ['SDKWork Commerce App API', 'SDKWork Claw Router App Domain Transport API'],
  [
    'Backend/admin contract for SDKWork Commerce catalog, order, payment, inventory, wallet, promotion, invoice, membership, and reporting modules.',
    'Claw Router backend domain transport for wallet, membership, promotion, catalog, order, payment, inventory, and finance modules.',
  ],
  [
    'App/client contract for SDKWork Commerce product, order, payment, wallet, promotion, invoice, and membership modules.',
    'Claw Router app domain transport for wallet, membership, promotion, catalog, order, and payment modules.',
  ],
  ['sdkwork-commerce-backend-api', 'sdkwork-clawrouter.backend'],
  ['sdkwork-commerce-app-api', 'sdkwork-clawrouter.app'],
  ['sdkwork-commerce-backend-sdk', 'clawrouter-backend-domain-transport'],
  ['sdkwork-commerce-app-sdk', 'clawrouter-app-domain-transport'],
  ['"x-sdkwork-owner": "sdkwork-commerce"', '"x-sdkwork-owner": "sdkwork-clawrouter"'],
  ['Local sdkwork-commerce runtime', 'Local Claw Router runtime'],
];

function patchFile(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  if (!existsSync(absolutePath)) {
    console.log(`skip missing ${relativePath}`);
    return false;
  }

  let source = readFileSync(absolutePath, 'utf8');
  const before = source;
  for (const [from, to] of REPLACEMENTS) {
    source = source.split(from).join(to);
  }
  if (source === before) {
    console.log(`unchanged ${relativePath}`);
    return false;
  }
  writeFileSync(absolutePath, source);
  console.log(`patched ${relativePath}`);
  return true;
}

let patched = 0;
for (const target of TARGETS) {
  if (patchFile(target)) {
    patched += 1;
  }
}

if (patched === 0) {
  console.log('[patch-domain-transport-openapi-metadata] no files changed');
} else {
  console.log(`[patch-domain-transport-openapi-metadata] updated ${patched} file(s)`);
}
