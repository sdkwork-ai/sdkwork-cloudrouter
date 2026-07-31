import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('models page keeps the catalog request effect stable when response data changes', () => {
  const modelsPageSource = readFileSync(
    new URL('./packages/sdkwork-clawrouter-pc-models/src/pages/Models.tsx', import.meta.url),
    'utf8',
  );

  assert.match(modelsPageSource, /const catalogRequest = useMemo\(\(\) => \(\{/u);
  assert.match(
    modelsPageSource,
    /const selectedProviderCodesKey = serializeModelCatalogFilterValues\(selectedProviderCodes\);/u,
  );
  assert.match(modelsPageSource, /ModelService\.fetchModelCatalog\(catalogRequest\)/u);
  assert.match(modelsPageSource, /\}, \[catalogRequest, modelLoadErrorMessage\]\);/u);
  assert.doesNotMatch(
    modelsPageSource,
    /ModelService\.fetchModelCatalog\(\{[\s\S]*?vendorCodes: selectedProviderCodes/u,
  );
  assert.doesNotMatch(
    modelsPageSource,
    /catalogPageSize,\s*selectedProviderCodes,\s*filters\.selectedModalities/u,
  );
  assert.doesNotMatch(
    modelsPageSource,
    /useEffect\(\(\) => \{\s*setCatalogPage\(1\);/u,
  );
  assert.match(
    modelsPageSource,
    /if \(updates\.searchQuery !== undefined\) \{\s*setCatalogPage\(1\);/u,
  );
  assert.match(
    modelsPageSource,
    /const toggleStringFilter = \([\s\S]*?\) => \{\s*setCatalogPage\(1\);/u,
  );
  assert.match(
    modelsPageSource,
    /const toggleGroupFilter = \(value: ModelGroupKey\) => \{\s*setCatalogPage\(1\);/u,
  );
  assert.match(modelsPageSource, /const clearFilters = \(\) => \{\s*setCatalogPage\(1\);/u);
  assert.match(
    modelsPageSource,
    /onPageSizeChange=\{\(nextPageSize\) => \{\s*setCatalogPageSize\(nextPageSize\);\s*setCatalogPage\(1\);/u,
  );
});
