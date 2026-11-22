import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageRoot = join(appRoot, 'packages', 'sdkwork-cloudrouter-h5-orders', 'src');

function read(name) {
  return readFileSync(join(packageRoot, name), 'utf8');
}

test('the cashier never parses integer money through a JS number', () => {
  // API_SPEC §13.6 forbids round-tripping minor units through Number, and
  // §13.2.3 forbids a literal / 100: both break zero-decimal currencies and
  // integers above Number.MAX_SAFE_INTEGER.
  const page = read('AnonymousCashierPage.tsx');
  assert.doesNotMatch(page, /Number\(minor\)/u, 'must not parse the minor string');
  assert.doesNotMatch(page, /\/\s*100\b/u, 'must not divide by a literal 100');
  assert.match(page, /formatMinorUnits\(minor, currency\)/u, 'must use the shared formatter');
});

test('the shared formatter renders every ISO exponent without floats', () => {
  const source = read('minorUnits.ts');
  // The exponent table is the single source of truth for the render scale.
  for (const code of ['JPY', 'KRW', 'KWD', 'BHD']) {
    assert.match(source, new RegExp(`${code}:\\s*[03]`, 'u'), `${code} must be in the table`);
  }
  assert.match(source, /DEFAULT_EXPONENT = 2/u);
  // Digit-string slicing, not arithmetic on a parsed number.
  assert.match(source, /padStart\(exponent \+ 1, '0'\)/u);
  assert.match(source, /slice\(0, -exponent\)/u);
  assert.doesNotMatch(source, /Number\(/u, 'the formatter must not convert to Number');
});
