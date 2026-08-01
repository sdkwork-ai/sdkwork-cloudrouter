import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testDir, '..', '..');
const sdkFamilies = [
  'clawrouter-app-sdk',
  'clawrouter-backend-sdk',
  'clawrouter-open-sdk',
];
const composedIndex = "export * from '../generated/server-openapi/src/index';\n";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

test('Claw Router TypeScript SDK facades remain thin and owner-only', () => {
  for (const sdkFamily of sdkFamilies) {
    const familyRoot = path.join(appRoot, 'sdks', sdkFamily);
    const packageRoot = path.join(familyRoot, `${sdkFamily}-typescript`);
    const packageJson = readJson(path.join(packageRoot, 'package.json'));
    const manifest = readJson(path.join(familyRoot, 'sdk-manifest.json'));
    const component = readJson(path.join(familyRoot, 'specs', 'component.spec.json'));

    assert.deepEqual(readdirSync(path.join(packageRoot, 'src')), ['index.ts']);
    assert.equal(readFileSync(path.join(packageRoot, 'src', 'index.ts'), 'utf8'), composedIndex);
    assert.equal(packageJson.sdkworkRole, 'composed-facade');
    assert.deepEqual(packageJson.dependencies, { '@sdkwork/sdk-common': 'workspace:*' });
    assert.deepEqual(manifest.dependencyApiExports, []);
    assert.deepEqual(component.contracts?.dependencyApiExports, []);
    assert.equal(packageJson.exports?.['./domains'], undefined);

    for (const controlFile of [
      'sdkwork-generator-changes.json',
      'sdkwork-generator-manifest.json',
      'sdkwork-generator-report.json',
    ]) {
      assert.equal(existsSync(path.join(packageRoot, '.sdkwork', controlFile)), false);
    }
    assert.equal(
      existsSync(path.join(packageRoot, 'generated', 'server-openapi', 'src', 'sdk.ts')),
      true,
    );
  }
});
