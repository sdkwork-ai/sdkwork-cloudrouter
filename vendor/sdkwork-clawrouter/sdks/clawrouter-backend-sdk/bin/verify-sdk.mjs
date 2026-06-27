#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(__filename), '..');
const required = [
  '.sdkwork-assembly.json',
  'openapi/clawrouter-backend-sdk.openapi.json',
  'openapi/clawrouter-backend-sdk.sdkgen.json',
  'clawrouter-backend-sdk-typescript/generated/server-openapi/package.json',
  'clawrouter-backend-sdk-typescript/generated/server-openapi/sdkwork-sdk.json',
  'clawrouter-backend-sdk-typescript/generated/server-openapi/src/index.ts',
];
const missing = required.filter((entry) => !existsSync(path.join(workspaceRoot, entry)));
if (missing.length > 0) {
  throw new Error('clawrouter-backend-sdk SDK family is incomplete: ' + missing.join(', '));
}
const assembly = JSON.parse(readFileSync(path.join(workspaceRoot, '.sdkwork-assembly.json'), 'utf8'));
if (assembly.workspace !== 'clawrouter-backend-sdk') {
  throw new Error('SDK assembly workspace drifted');
}
const expectedGenerationInputSpec = 'openapi/clawrouter-backend-sdk.openapi.json';
const expectedDerivedSpecs = {};
if (Object.prototype.hasOwnProperty.call(assembly, 'derivedSpec')) {
  throw new Error('SDK assembly must not declare legacy derivedSpec; use derivedSpecs');
}
if (assembly.generationInputSpec !== expectedGenerationInputSpec) {
  throw new Error(`SDK assembly generationInputSpec must be ${expectedGenerationInputSpec}`);
}
if (JSON.stringify(assembly.derivedSpecs ?? null) !== JSON.stringify(expectedDerivedSpecs)) {
  throw new Error('SDK assembly derivedSpecs drifted');
}
if (!Array.isArray(assembly.languages) || !assembly.languages.some((item) => item.language === 'typescript')) {
  throw new Error('SDK assembly must include the TypeScript workspace');
}
console.log('Verified clawrouter-backend-sdk SDK family.');
