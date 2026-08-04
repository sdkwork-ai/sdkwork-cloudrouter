import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const filePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../docs/schema-registry/frontend-route-classification.yaml',
);
const text = readFileSync(filePath, 'utf8');
const fixed = text.replace(
  /^(\s*package:\s*)sdkwork-cloudrouter-pc-([^\n]+)$/gm,
  '$1"@sdkwork/cloudrouter-pc-$2"',
);
writeFileSync(filePath, fixed, 'utf8');
console.log('scoped route classification packages');
