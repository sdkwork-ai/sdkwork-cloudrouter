# sdkwork-models Install Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the standalone `sdkwork-models` catalog standard and migrate ClawRouter installation so model, pricing, meter, and ranking initialization comes from the new vendor-scoped JSON catalog.

**Architecture:** `data/sdkwork-models` becomes the portable catalog project and owns JSON model facts, prices, schemas, validators, and language SDKs. ClawRouter depends on the Rust catalog loader and imports catalog data into canonical `ai_*` tables during `DatabaseInstaller::ensure_installed`; ClawRouter-specific providers, channels, routes, secrets, and tenant policies remain in overlays or existing runtime config.

**Tech Stack:** JSON Schema, Node.js ESM tooling, Python unittest contract guards, TypeScript SDK package, Python/Java/Rust/Flutter SDK skeletons, Rust 2021, serde, serde_json, sqlx, SQLite, PostgreSQL, ClawRouter installer tests.

---

## Scope

This plan implements the standard described in `docs/32-sdkwork-models-standard.md` and optimizes the installation flow to use it.

In scope:

- catalog directory and schema files under `data/sdkwork-models`
- vendor-scoped model and pricing JSON
- catalog validation and index generation tools
- continuous catalog update workflow, freshness policy, diff reports, and
  release governance
- multi-language SDK public package skeletons and standards
- Rust catalog loader required by ClawRouter
- SQL import layer for SQLite and PostgreSQL
- `DatabaseInstaller` migration away from hard-coded model seed arrays
- post-install catalog refresh path for ongoing model and pricing updates
- tests that prevent new hard-coded model seed data from returning

Out of scope for this plan:

- fetching current public prices from external sites
- publishing packages to npm, PyPI, Maven Central, crates.io, or pub.dev
- pushing the independent GitHub repository
- replacing ClawRouter tenant-specific pricing plans or private provider secrets
- UI changes in the portal

## File Structure

### Catalog Project

- Create `data/sdkwork-models/sdkwork-models.json`
  Project manifest: schema version, catalog version, generated time, roots, locales.

- Create `data/sdkwork-models/package.json`
  Local scripts for validation, index generation, and catalog checks.

- Create `data/sdkwork-models/CHANGELOG.md`
  Data release history.

- Create `data/sdkwork-models/LICENSE`
  License placeholder for the standalone repository.

- Create `data/sdkwork-models/schemas/*.schema.json`
  JSON contracts for catalog, meter, vendor, family, model, pricing, ranking, and provider overlay files.

- Create `data/sdkwork-models/models/index.json`
  Generated catalog index with vendor counts and hashes.

- Create `data/sdkwork-models/models/meters.json`
  Global canonical billing meter definitions.

- Create `data/sdkwork-models/models/vendors.json`
  Lightweight vendor list for application filters.

- Create `data/sdkwork-models/models/<vendorCode>/...`
  Vendor-specific `vendor.json`, `families.json`, `models/<modelId>.json`, `pricing/<modelId>.json`, and `rankings.json`.

- Create `data/sdkwork-models/overlays/clawrouter/*.json`
  ClawRouter provider/channel/route/ranking overlay data. Public model facts must not be defined here.

### Catalog Tooling

- Create `data/sdkwork-models/tools/catalog-lib.mjs`
  Shared filesystem, JSON parsing, decimal, enum, reference, and hash helpers.

- Create `data/sdkwork-models/tools/validate-catalog.mjs`
  CLI validator that returns all catalog issues and exits non-zero on errors.

- Create `data/sdkwork-models/tools/build-index.mjs`
  Deterministically rebuilds `models/index.json` and `models/vendors.json`.

- Create `data/sdkwork-models/tools/export-clawrouter-seed.mjs`
  Optional development tool that summarizes the catalog rows ClawRouter will import. It must not become the runtime importer.

- Create `data/sdkwork-models/tools/catalog-diff.mjs`
  Compares two catalog versions and emits added, changed, deprecated, retired,
  and price-changed models per vendor.

- Create `data/sdkwork-models/tools/freshness-report.mjs`
  Reports stale model and pricing sources based on per-source and per-vendor
  freshness policy.

- Create `data/sdkwork-models/tools/release-catalog.mjs`
  Local release helper that validates, rebuilds index, writes release metadata,
  and refuses to publish when sources are stale or hashes drift.

### Language SDKs

- Create `data/sdkwork-models/sdkwork-models-typescript/package.json`
- Create `data/sdkwork-models/sdkwork-models-typescript/tsconfig.json`
- Create `data/sdkwork-models/sdkwork-models-typescript/src/{index.ts,types.ts,loaders.ts,query.ts,validation.ts,catalog.ts}`
- Create `data/sdkwork-models/sdkwork-models-typescript/test/catalog.test.ts`

- Create `data/sdkwork-models/sdkwork-models-python/pyproject.toml`
- Create `data/sdkwork-models/sdkwork-models-python/sdkwork_models/{__init__.py,types.py,loaders.py,query.py,validation.py}`
- Create `data/sdkwork-models/sdkwork-models-python/tests/test_catalog.py`

- Create `data/sdkwork-models/sdkwork-models-java/pom.xml`
- Create `data/sdkwork-models/sdkwork-models-java/src/main/java/com/sdkwork/models/*.java`
- Create `data/sdkwork-models/sdkwork-models-java/src/test/java/com/sdkwork/models/ModelCatalogTest.java`

- Create `data/sdkwork-models/sdkwork-models-rust/Cargo.toml`
- Create `data/sdkwork-models/sdkwork-models-rust/build.rs`
- Create `data/sdkwork-models/sdkwork-models-rust/src/{lib.rs,types.rs,loader.rs,query.rs,validation.rs,bundled.rs}`
- Create `data/sdkwork-models/sdkwork-models-rust/tests/catalog.rs`

- Create `data/sdkwork-models/sdkwork-models-flutter/pubspec.yaml`
- Create `data/sdkwork-models/sdkwork-models-flutter/lib/sdkwork_models.dart`
- Create `data/sdkwork-models/sdkwork-models-flutter/lib/src/{types.dart,loaders.dart,query.dart,validation.dart}`
- Create `data/sdkwork-models/sdkwork-models-flutter/test/catalog_test.dart`

### ClawRouter Runtime

- Modify `services/sdkwork-clawrouter-router-service/Cargo.toml`
  Add path dependency on `sdkwork-models`.

- Modify `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/mod.rs`
  Export catalog import modules.

- Create `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/model_catalog_import.rs`
  Backend-agnostic mapping from `sdkwork_models::ModelCatalog` to canonical SQL rows.

- Create `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/model_catalog_import.rs`
  SQLite importer using sqlx bind parameters.

- Create `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/model_catalog_import.rs`
  PostgreSQL importer using sqlx bind parameters.

- Create `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/model_catalog_overlay_import.rs`
  ClawRouter overlay importer for providers, channels, and routes.

- Modify `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/installer.rs`
  Replace hard-coded model catalog, meter, pricing, and ranking seed arrays with catalog loading and importer calls. Keep non-catalog schema setup and product-specific seed paths until their overlays are implemented.

- Modify `services/sdkwork-clawrouter-router-service/tests/database_installer.rs`
  Assert the installer imports from `sdkwork-models`, records the new catalog version, remains idempotent, and repairs missing rows.

- Create `services/sdkwork-clawrouter-router-service/tests/sdkwork_models_catalog_import.rs`
  Focused importer tests for SQLite.

- Modify `services/sdkwork-claw-installer/src/main.rs`
  Show catalog root and catalog version in status/install output. Add an
  explicit catalog refresh command.

- Modify `services/sdkwork-clawrouter-cloud-gateway/src/runtime.rs`
- Modify `services/sdkwork-clawrouter-admin-gateway/src/lib.rs`
- Modify `services/sdkwork-clawrouter-standalone-gateway/src/lib.rs`
  Ensure startup install can receive catalog options from environment.

- Modify `services/sdkwork-clawrouter-router-service/src/api/admin_system.rs`
  Expose catalog version, catalog source, and last refresh status in admin
  installation/status APIs.

### Contract Tests

- Create `tests/test_sdkwork_models_standard.py`
  Python contract guard for catalog layout, SDK standard files, JSON schemas, validator scripts, and no hard-coded catalog regressions.

- Create `tests/test_sdkwork_models_update_workflow.py`
  Python contract guard for catalog diff, freshness, release metadata, and
  update workflow.

- Modify `tests/test_model_catalog_standard_contract.py`
  Move environment seed expectations from legacy `spring-ai-plus-server-application/src/main/resources/data/model-catalog` to `apps/sdkwork-clawrouter/data/sdkwork-models`.

- Modify `scripts/verify-claw-router-application.mjs`
  Add `sdkwork-models` validation to the standard verification sequence.

---

### Task 1: Contract Guard for the New Standard

**Files:**
- Create: `tests/test_sdkwork_models_standard.py`
- Modify: `tests/test_model_catalog_standard_contract.py`

- [ ] **Step 1: Write failing layout tests**

Add tests that require:

```python
SDKWORK_MODELS = ROOT / "data" / "sdkwork-models"

def test_sdkwork_models_standard_files_exist(self):
    required = [
        "README.md",
        "sdkwork-models.json",
        "schemas/catalog.schema.json",
        "schemas/model.schema.json",
        "schemas/pricing.schema.json",
        "models/index.json",
        "models/meters.json",
        "models/vendors.json",
        "tools/validate-catalog.mjs",
        "tools/build-index.mjs",
    ]
    for rel in required:
        self.assertTrue((SDKWORK_MODELS / rel).exists(), rel)
```

- [ ] **Step 2: Write failing SDK standard tests**

Require README and package entry files for each language:

```python
def test_language_sdk_directories_have_standard_entrypoints(self):
    expected = {
        "sdkwork-models-typescript": ["README.md", "package.json", "src/index.ts"],
        "sdkwork-models-python": ["README.md", "pyproject.toml", "sdkwork_models/__init__.py"],
        "sdkwork-models-java": ["README.md", "pom.xml"],
        "sdkwork-models-rust": ["README.md", "Cargo.toml", "src/lib.rs"],
        "sdkwork-models-flutter": ["README.md", "pubspec.yaml", "lib/sdkwork_models.dart"],
    }
    for package, files in expected.items():
        for rel in files:
            self.assertTrue((SDKWORK_MODELS / package / rel).exists(), f"{package}/{rel}")
```

- [ ] **Step 3: Write failing no-hard-coded-catalog guard**

Add a test that flags new model seed arrays in `installer.rs` after migration:

```python
def test_installer_no_longer_owns_model_catalog_seed_arrays(self):
    source = read_text(RUST_INSTALLER_PATH)
    forbidden = [
        "OPENAI_ACTIVE_MODEL_SEEDS",
        "GLOBAL_MODEL_SEEDS",
        "GLOBAL_PROVIDER_SEEDS",
        "global_model_pricing_seed_sql",
        "global_model_catalog_seed_sql",
    ]
    for symbol in forbidden:
        self.assertNotIn(symbol, source)
    self.assertIn("sdkwork_models", source)
```

Keep this test skipped or marked expected-failure until Task 9 removes the hard-coded seed arrays. Use a clear TODO comment with the plan task number.

- [ ] **Step 4: Run failing tests**

Run:

```powershell
python -B -m unittest tests.test_sdkwork_models_standard
python -B -m unittest tests.test_model_catalog_standard_contract
```

Expected: new standard tests fail because schemas, manifests, tools, and SDK entrypoints do not exist yet. Existing model catalog tests may still pass or fail depending on current workspace state.

- [ ] **Step 5: Commit**

```powershell
git add tests/test_sdkwork_models_standard.py tests/test_model_catalog_standard_contract.py
git commit -m "add sdkwork-models standard guards"
```

### Task 2: Catalog Project Metadata and JSON Schemas

**Files:**
- Create: `data/sdkwork-models/sdkwork-models.json`
- Create: `data/sdkwork-models/package.json`
- Create: `data/sdkwork-models/CHANGELOG.md`
- Create: `data/sdkwork-models/LICENSE`
- Create: `data/sdkwork-models/schemas/catalog.schema.json`
- Create: `data/sdkwork-models/schemas/meter.schema.json`
- Create: `data/sdkwork-models/schemas/vendor.schema.json`
- Create: `data/sdkwork-models/schemas/family.schema.json`
- Create: `data/sdkwork-models/schemas/model.schema.json`
- Create: `data/sdkwork-models/schemas/pricing.schema.json`
- Create: `data/sdkwork-models/schemas/ranking.schema.json`
- Create: `data/sdkwork-models/schemas/provider-overlay.schema.json`

- [ ] **Step 1: Add the project manifest**

Use catalog version `2026.05.07.1` for the first standards-based catalog.

```json
{
  "name": "sdkwork-models",
  "schemaVersion": "1.0.0",
  "catalogVersion": "2026.05.07.1",
  "generatedAt": "2026-05-07T00:00:00Z",
  "defaultLocale": "en-US",
  "supportedLocales": ["en-US", "zh-CN"],
  "modelsRoot": "models",
  "schemasRoot": "schemas",
  "license": "MIT"
}
```

- [ ] **Step 2: Add package scripts**

`data/sdkwork-models/package.json`:

```json
{
  "name": "@sdkwork/models-catalog",
  "private": true,
  "type": "module",
  "scripts": {
    "validate": "node tools/validate-catalog.mjs",
    "build:index": "node tools/build-index.mjs",
    "check": "node tools/build-index.mjs --check && node tools/validate-catalog.mjs"
  }
}
```

- [ ] **Step 3: Add schema enums**

Define shared enum sets exactly as documented in `docs/32-sdkwork-models-standard.md`:

- capabilities
- modalities
- API formats
- lifecycle states
- shelf states
- routing states
- price types
- billing scopes
- vendor types
- family types

- [ ] **Step 4: Add decimal string schema**

Every schema field representing price or quantity must use:

```json
{
  "type": "string",
  "pattern": "^(0|[1-9][0-9]*)(\\.[0-9]+)?$"
}
```

- [ ] **Step 5: Run layout tests**

Run:

```powershell
python -B -m unittest tests.test_sdkwork_models_standard
```

Expected: schema and metadata existence checks pass; catalog data checks still fail.

- [ ] **Step 6: Commit**

```powershell
git add data/sdkwork-models tests/test_sdkwork_models_standard.py
git commit -m "add sdkwork-models catalog schema"
```

### Task 3: Validator and Index Builder

**Files:**
- Create: `data/sdkwork-models/tools/catalog-lib.mjs`
- Create: `data/sdkwork-models/tools/validate-catalog.mjs`
- Create: `data/sdkwork-models/tools/build-index.mjs`
- Create: `data/sdkwork-models/tools/export-clawrouter-seed.mjs`
- Modify: `tests/test_sdkwork_models_standard.py`
- Modify: `package.json`
- Modify: `scripts/verify-claw-router-application.mjs`

- [ ] **Step 1: Write failing validator tests**

In `tests/test_sdkwork_models_standard.py`, add subprocess tests:

```python
def test_sdkwork_models_validator_passes(self):
    result = subprocess.run(
        ["node", "tools/validate-catalog.mjs"],
        cwd=SDKWORK_MODELS,
        text=True,
        capture_output=True,
    )
    self.assertEqual(0, result.returncode, result.stdout + result.stderr)
```

Add an index check:

```python
def test_sdkwork_models_index_is_current(self):
    result = subprocess.run(
        ["node", "tools/build-index.mjs", "--check"],
        cwd=SDKWORK_MODELS,
        text=True,
        capture_output=True,
    )
    self.assertEqual(0, result.returncode, result.stdout + result.stderr)
```

- [ ] **Step 2: Implement JSON and filesystem helpers**

`catalog-lib.mjs` must expose:

```js
export function readJsonFile(path) {}
export function writeJsonFile(path, value) {}
export function stableJson(value) {}
export function sha256Text(text) {}
export function isDecimalString(value) {}
export function collectVendorDirectories(modelsRoot) {}
export function issue(code, path, message, severity = "error") {}
```

- [ ] **Step 3: Implement validation**

`validate-catalog.mjs` must check:

- required top-level files
- vendor directory name equals `vendorCode`
- no duplicate vendors
- no duplicate models
- model references existing vendor and family
- pricing references existing model and meter
- price decimal fields are strings
- source URL, observed time, and effective time exist for every price
- overlays reference known models
- generated index hash matches actual vendor directory hash

Output format:

```json
{
  "ok": false,
  "issues": [
    {
      "code": "price.meter.missing",
      "path": "models/openai/pricing/gpt-5.2.json#/prices/0/meterCode",
      "message": "meterCode llm_input_token is not defined in models/meters.json",
      "severity": "error"
    }
  ]
}
```

- [ ] **Step 4: Implement index builder**

`build-index.mjs` must:

- scan `models/<vendorCode>`
- count model and pricing files
- compute a stable vendor hash
- rebuild `models/index.json`
- rebuild `models/vendors.json`
- support `--check`

Expected success output:

```text
sdkwork-models index is current
```

- [ ] **Step 5: Wire root verification**

Add a root script:

```json
"models:check": "node data/sdkwork-models/tools/build-index.mjs --check && node data/sdkwork-models/tools/validate-catalog.mjs"
```

Update `scripts/verify-claw-router-application.mjs` to run this check in normal verification.

- [ ] **Step 6: Run tests**

Run:

```powershell
node data/sdkwork-models/tools/build-index.mjs --check
node data/sdkwork-models/tools/validate-catalog.mjs
python -B -m unittest tests.test_sdkwork_models_standard
```

Expected: fails until Task 4 adds valid catalog data.

- [ ] **Step 7: Commit**

```powershell
git add data/sdkwork-models/tools package.json scripts/verify-claw-router-application.mjs tests/test_sdkwork_models_standard.py
git commit -m "add sdkwork-models validation tooling"
```

### Task 4: Build the First Vendor-Scoped Catalog

**Files:**
- Create: `data/sdkwork-models/models/meters.json`
- Create: `data/sdkwork-models/models/vendors.json`
- Create: `data/sdkwork-models/models/index.json`
- Create: `data/sdkwork-models/models/openai/*`
- Create: `data/sdkwork-models/models/anthropic/*`
- Create: `data/sdkwork-models/models/google/*`
- Create: `data/sdkwork-models/models/xai/*`
- Create: `data/sdkwork-models/models/alibaba/cn/*`
- Create: `data/sdkwork-models/models/deepseek/*`
- Create: `data/sdkwork-models/models/moonshot/*`
- Create: `data/sdkwork-models/models/zhipu/*`
- Create: `data/sdkwork-models/models/baidu/*`
- Create: `data/sdkwork-models/models/tencent/*`
- Create: `data/sdkwork-models/models/bytedance/*`
- Create: `data/sdkwork-models/models/minimax/*`
- Create: `data/sdkwork-models/models/kuaishou/*`
- Create: `data/sdkwork-models/models/stability_ai/*`
- Create: `data/sdkwork-models/models/black_forest_labs/*`
- Create: `data/sdkwork-models/models/suno/*`
- Create: `data/sdkwork-models/models/elevenlabs/*`
- Create: `data/sdkwork-models/overlays/clawrouter/*.json`

- [ ] **Step 1: Port canonical meters**

Start from the meter list required by `tests/test_model_catalog_standard_contract.py`. Include at least:

```text
llm_input_token
llm_output_token
llm_reasoning_token
llm_cache_write_token
llm_cache_read_token
embedding_input_token
image_input_token
image_output_token
image_result
audio_input_minute
audio_output_minute
tts_input_character
stt_audio_minute
video_output_second
video_result
music_output_second
sfx_result
rerank_search
api_request
tool_call
web_search_call
storage_gb_day
unknown
```

- [ ] **Step 2: Port model facts**

Move the current facts from `OPENAI_ACTIVE_MODEL_SEEDS` and `GLOBAL_MODEL_SEEDS` in `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/installer.rs` into vendor directories. Preserve the model IDs that current tests assert, including:

```text
gpt-5.2
gpt-5.2-pro
gpt-5-mini
gpt-5-nano
claude-opus-4-7
claude-sonnet-4-6
gemini-3.1-pro-preview
grok-4.3
qwen3.6-max-preview
deepseek-v4-pro
kimi-k2.5
glm-5.1
doubao-seed-2-0-pro-260215
doubao-seedream-5-0-260128
doubao-seedance-2-0-260128
kling-v3-0-preview
stable-image-ultra
flux-2-pro
suno-v5
eleven_text_to_sound_v2
```

- [ ] **Step 3: Port pricing**

Move current `global_model_pricing_seed_sql()` data into `pricing/<modelId>.json`. Preserve:

- official/reference prices
- upstream/provider prices only when intentionally public
- `sourceUrl`
- `observedAt`
- `effectiveFrom`
- decimal string prices

Provider-specific private costs should move to `overlays/clawrouter` or be left for ClawRouter private config, not model facts.

- [ ] **Step 4: Port rankings**

Move current `global_model_ranking_seed_sql()` rows into `rankings.json` files or `overlays/clawrouter/rankings.json` depending on whether they are public catalog rankings or ClawRouter commercial rankings. The existing `commercial-default` ranking belongs in the ClawRouter overlay unless intentionally published as global catalog data.

- [ ] **Step 5: Build index and validate**

Run:

```powershell
node data/sdkwork-models/tools/build-index.mjs
node data/sdkwork-models/tools/validate-catalog.mjs
python -B -m unittest tests.test_sdkwork_models_standard
```

Expected: all `sdkwork-models` standard tests pass.

- [ ] **Step 6: Commit**

```powershell
git add data/sdkwork-models tests/test_sdkwork_models_standard.py
git commit -m "add vendor-scoped sdkwork model catalog"
```

### Task 5: TypeScript SDK Minimum Implementation

**Files:**
- Create: `data/sdkwork-models/sdkwork-models-typescript/package.json`
- Create: `data/sdkwork-models/sdkwork-models-typescript/tsconfig.json`
- Create: `data/sdkwork-models/sdkwork-models-typescript/src/index.ts`
- Create: `data/sdkwork-models/sdkwork-models-typescript/src/types.ts`
- Create: `data/sdkwork-models/sdkwork-models-typescript/src/loaders.ts`
- Create: `data/sdkwork-models/sdkwork-models-typescript/src/query.ts`
- Create: `data/sdkwork-models/sdkwork-models-typescript/src/validation.ts`
- Create: `data/sdkwork-models/sdkwork-models-typescript/test/catalog.test.ts`

- [ ] **Step 1: Write SDK behavior tests**

Tests must cover:

```ts
import { loadCatalog, findModel, getModelPrices } from "../src/index";

test("loads local catalog and finds model prices", async () => {
  const catalog = await loadCatalog("../models");
  expect(findModel(catalog, "gpt-5.2")?.vendorCode).toBe("openai");
  expect(getModelPrices(catalog, "gpt-5.2").length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Implement types**

Use string price fields:

```ts
export interface ModelPrice {
  priceCode: string;
  priceType: string;
  meterCode: string;
  unitSize: string;
  unitPrice: string;
  minimumQuantity: string;
}
```

- [ ] **Step 3: Implement loaders and queries**

Required exports:

```ts
export async function loadCatalog(pathOrUrl: string): Promise<ModelCatalog> {}
export async function loadBundledCatalog(): Promise<ModelCatalog> {}
export async function loadVendorCatalog(pathOrUrl: string, vendorCode: string): Promise<VendorCatalog> {}
export function findModel(catalog: ModelCatalog, modelId: string): ModelInfo | undefined {}
export function getModelPrices(catalog: ModelCatalog, modelId: string): ModelPrice[] {}
```

- [ ] **Step 4: Run tests**

Run from `data/sdkwork-models/sdkwork-models-typescript`:

```powershell
pnpm.cmd install
pnpm.cmd test
pnpm.cmd build
```

Expected: TypeScript SDK tests and build pass.

- [ ] **Step 5: Commit**

```powershell
git add data/sdkwork-models/sdkwork-models-typescript
git commit -m "add sdkwork models TypeScript loader"
```

### Task 6: Python, Java, and Flutter SDK Skeletons

**Files:**
- Create: `data/sdkwork-models/sdkwork-models-python/pyproject.toml`
- Create: `data/sdkwork-models/sdkwork-models-python/sdkwork_models/*.py`
- Create: `data/sdkwork-models/sdkwork-models-python/tests/test_catalog.py`
- Create: `data/sdkwork-models/sdkwork-models-java/pom.xml`
- Create: `data/sdkwork-models/sdkwork-models-java/src/main/java/com/sdkwork/models/*.java`
- Create: `data/sdkwork-models/sdkwork-models-flutter/pubspec.yaml`
- Create: `data/sdkwork-models/sdkwork-models-flutter/lib/**/*.dart`

- [ ] **Step 1: Implement Python loader minimum**

Expose:

```python
def load_catalog(path_or_url: str) -> ModelCatalog: ...
def find_model(catalog: ModelCatalog, model_id: str) -> ModelInfo | None: ...
def get_model_prices(catalog: ModelCatalog, model_id: str) -> list[ModelPrice]: ...
```

Use `Decimal` only in helper methods; preserve raw price strings.

- [ ] **Step 2: Implement Java type skeleton**

Expose:

```java
public final class SdkworkModels {
    public static ModelCatalog loadCatalog(Path path) { ... }
}
```

Use `BigDecimal` for arithmetic helpers and preserve raw decimal strings.

- [ ] **Step 3: Implement Flutter type skeleton**

Expose:

```dart
final catalog = await SdkworkModels.loadCatalog('assets/sdkwork-models/models');
final model = catalog.findModel('gpt-5.2');
```

- [ ] **Step 4: Run focused checks**

Run:

```powershell
python -B -m unittest discover data/sdkwork-models/sdkwork-models-python/tests
mvn test -f data/sdkwork-models/sdkwork-models-java/pom.xml
dart test data/sdkwork-models/sdkwork-models-flutter
```

If Maven or Dart is unavailable in the environment, record the exact missing tool and keep the source-level tests in CI documentation.

- [ ] **Step 5: Commit**

```powershell
git add data/sdkwork-models/sdkwork-models-python data/sdkwork-models/sdkwork-models-java data/sdkwork-models/sdkwork-models-flutter
git commit -m "add portable sdkwork models SDK skeletons"
```

### Task 7: Rust SDK Loader for ClawRouter

**Files:**
- Create: `data/sdkwork-models/sdkwork-models-rust/Cargo.toml`
- Create: `data/sdkwork-models/sdkwork-models-rust/build.rs`
- Create: `data/sdkwork-models/sdkwork-models-rust/src/lib.rs`
- Create: `data/sdkwork-models/sdkwork-models-rust/src/types.rs`
- Create: `data/sdkwork-models/sdkwork-models-rust/src/loader.rs`
- Create: `data/sdkwork-models/sdkwork-models-rust/src/query.rs`
- Create: `data/sdkwork-models/sdkwork-models-rust/src/validation.rs`
- Create: `data/sdkwork-models/sdkwork-models-rust/src/bundled.rs`
- Create: `data/sdkwork-models/sdkwork-models-rust/tests/catalog.rs`

- [ ] **Step 1: Write Rust loader tests**

```rust
#[test]
fn loads_catalog_and_preserves_decimal_prices() {
    let catalog = sdkwork_models::load_catalog("../models").unwrap();
    let model = catalog.find_model("gpt-5.2").unwrap();
    assert_eq!("openai", model.vendor_code);
    let prices = catalog.model_prices("gpt-5.2");
    assert!(prices.iter().any(|price| price.unit_price.as_str().contains('.')));
}
```

- [ ] **Step 2: Define string-preserving decimal type**

```rust
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct DecimalString(String);
```

Validate with the same regex semantics as the Node validator.

- [ ] **Step 3: Implement filesystem loader**

Required functions:

```rust
pub fn load_catalog(path: impl AsRef<std::path::Path>) -> Result<ModelCatalog, CatalogError>;
pub fn load_bundled_catalog() -> Result<ModelCatalog, CatalogError>;
pub fn load_vendor_catalog(path: impl AsRef<std::path::Path>, vendor_code: &str) -> Result<VendorCatalog, CatalogError>;
```

- [ ] **Step 4: Implement bundled fallback**

`build.rs` must generate a static manifest of bundled JSON files from `../models` so release binaries can install without relying on the current working directory.

The loader order for ClawRouter later will be:

1. explicit `SDKWORK_MODELS_CATALOG_ROOT`
2. `data/sdkwork-models` relative to workspace root
3. bundled catalog from the Rust crate

- [ ] **Step 5: Run Rust SDK tests**

Run:

```powershell
cargo test --manifest-path data/sdkwork-models/sdkwork-models-rust/Cargo.toml
```

Expected: tests pass.

- [ ] **Step 6: Commit**

```powershell
git add data/sdkwork-models/sdkwork-models-rust
git commit -m "add sdkwork models Rust loader"
```

### Task 8: ClawRouter Catalog Importer

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/Cargo.toml`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/mod.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/model_catalog_import.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/model_catalog_import.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/model_catalog_import.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/model_catalog_overlay_import.rs`
- Create: `services/sdkwork-clawrouter-router-service/tests/sdkwork_models_catalog_import.rs`

- [ ] **Step 1: Add Rust dependency**

In `services/sdkwork-clawrouter-router-service/Cargo.toml`:

```toml
sdkwork-models = { path = "../../data/sdkwork-models/sdkwork-models-rust" }
```

- [ ] **Step 2: Write focused SQLite importer test**

The test should:

1. create the schema with the installer schema path
2. load `sdkwork-models`
3. call `import_sqlite_model_catalog`
4. assert models, vendors, meters, prices, and ranking rows exist

Example assertions:

```rust
let gpt_count: i64 = sqlx::query_scalar(
    "SELECT COUNT(1) FROM ai_model WHERE model = 'gpt-5.2' AND vendor_code = 'openai'"
).fetch_one(&pool).await.unwrap();
assert_eq!(1, gpt_count);
```

- [ ] **Step 3: Implement common mapping**

`model_catalog_import.rs` must map:

- `BillingMeter` to `ai_billing_meter`
- `ModelVendor` to `ai_model_vendor`
- `ModelFamily` to `ai_model_family`
- `ModelInfo` to `ai_model`
- model capabilities to `ai_model_capability`
- `ModelPrice` to `ai_model_pricing`
- ranking snapshots to `ai_model_rank_snapshot`

Do not generate raw interpolated SQL for values. Use bind parameters in backend modules.

- [ ] **Step 4: Implement SQLite importer**

Use `INSERT ... ON CONFLICT(id) DO UPDATE` or conflict keys that match current generated schema. Keep deterministic IDs by deriving stable numeric IDs from sorted catalog order or by using existing ID mapping rules. Prefer stable UUIDs based on catalog identity:

```text
vendor-openai
family-openai-gpt-5
model-openai-gpt-5-2
price-gpt-5-2-input-reference-usd
```

- [ ] **Step 5: Implement PostgreSQL importer**

Mirror SQLite behavior with PostgreSQL bind syntax. Keep field mapping identical.

- [ ] **Step 6: Implement overlay importer**

Import ClawRouter overlay data only for product-specific tables:

- integration providers
- provider accounts
- channels
- channel models
- routing profiles/rules
- commercial ranking overlays when present

- [ ] **Step 7: Run importer tests**

Run:

```powershell
cargo test -p sdkwork-clawrouter-router-service --test sdkwork_models_catalog_import
```

Expected: importer test passes for SQLite. PostgreSQL-specific SQL contract can be covered by existing Postgres integration gates after Task 9.

- [ ] **Step 8: Commit**

```powershell
git add services/sdkwork-clawrouter-router-service data/sdkwork-models/sdkwork-models-rust Cargo.toml Cargo.lock
git commit -m "add ClawRouter sdkwork models importer"
```

### Task 9: Replace Installer Model Seed Flow

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/installer.rs`
- Modify: `services/sdkwork-clawrouter-router-service/tests/database_installer.rs`
- Modify: `services/sdkwork-claw-installer/src/main.rs`
- Modify: `services/sdkwork-clawrouter-cloud-gateway/src/runtime.rs`
- Modify: `services/sdkwork-clawrouter-admin-gateway/src/lib.rs`
- Modify: `services/sdkwork-clawrouter-standalone-gateway/src/lib.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/mod.rs`

- [ ] **Step 1: Write installer behavior tests first**

Update `database_installer.rs` to assert:

```rust
assert_eq!("2026.05.07.1", state.get::<String, _>("catalog_version"));
```

Add assertions for catalog source metadata:

```rust
let source_count: i64 = sqlx::query_scalar(
    "SELECT COUNT(1) FROM ai_model_catalog_source WHERE source_name LIKE '%sdkwork-models%'"
).fetch_one(&pool).await.unwrap();
assert!(source_count >= 1);
```

Add repair coverage:

```rust
sqlx::query("DELETE FROM ai_model WHERE model = 'gpt-5.2'")
    .execute(&pool)
    .await
    .unwrap();
let repaired = installer.ensure_installed().await.unwrap();
assert!(repaired.changed);
```

- [ ] **Step 2: Change installation report catalog type**

If catalog version is read from JSON, change:

```rust
pub struct InstallationReport {
    pub catalog_version: &'static str,
}
```

to:

```rust
pub struct InstallationReport {
    pub catalog_version: String,
}
```

Update API response mapping if needed.

- [ ] **Step 3: Add catalog options**

Extend install options:

```rust
pub const ENV_MODELS_CATALOG_ROOT: &str = "SDKWORK_MODELS_CATALOG_ROOT";
pub const ENV_MODELS_OVERLAY: &str = "SDKWORK_MODELS_OVERLAY";

pub struct DatabaseInstallOptions {
    pub environment: String,
    pub seed_profile: String,
    pub models_catalog_root: Option<String>,
    pub models_overlay: String,
}
```

Default overlay: `clawrouter`.

- [ ] **Step 4: Load catalog in installer**

Add a helper:

```rust
fn load_install_model_catalog(options: &DatabaseInstallOptions) -> Result<sdkwork_models::ModelCatalog, DatabaseInstallError> {
    if let Some(root) = &options.models_catalog_root {
        return sdkwork_models::load_catalog(root).map_err(DatabaseInstallError::Catalog);
    }
    sdkwork_models::load_bundled_catalog().map_err(DatabaseInstallError::Catalog)
}
```

Add `DatabaseInstallError::Catalog`.

- [ ] **Step 5: Replace catalog seed execution**

Current flow:

```rust
let seed_statements = commercial_seed_sql();
for statement in &seed_statements {
    execute_sqlite_statement(pool, statement).await?;
}
```

New flow:

```rust
let catalog = load_install_model_catalog(options)?;
record_sqlite_catalog_migration_started(pool, &catalog).await?;
import_sqlite_model_catalog(pool, &catalog).await?;
import_sqlite_clawrouter_overlay(pool, &catalog, options.models_overlay.as_str()).await?;
record_sqlite_catalog_migration_completed(pool, &catalog).await?;
```

Mirror the same for PostgreSQL.

- [ ] **Step 6: Preserve non-catalog seed data temporarily**

Keep product-specific seed functions that are not model facts until overlay import covers them:

- pricing plans if not represented in public catalog
- channel groups
- access policies
- quota policies
- observability seed rows

Rename the remaining function to make the boundary explicit:

```rust
fn product_control_seed_sql() -> Vec<String>
```

It must not contain public model facts, prices, meters, or ranking rows.

- [ ] **Step 7: Remove hard-coded model arrays**

Delete from `installer.rs` after importer tests pass:

- `OPENAI_ACTIVE_MODEL_SEEDS`
- `GLOBAL_MODEL_SEEDS`
- `GLOBAL_PROVIDER_SEEDS` if providers are moved to overlay
- `billing_meter_seed_sql`
- `global_model_catalog_seed_sql`
- `global_model_pricing_seed_sql`
- `global_model_ranking_seed_sql`

Keep only mapping/helpers that are still used by product-specific overlays.

- [ ] **Step 8: Update startup services**

Ensure gateway/admin/app API startup still calls:

```rust
.with_env_options()?
.ensure_installed()
```

and that `with_env_options()` now includes `SDKWORK_MODELS_CATALOG_ROOT`.

- [ ] **Step 9: Run installer tests**

Run:

```powershell
cargo test -p sdkwork-clawrouter-router-service --test database_installer
cargo test -p sdkwork-clawrouter-admin-gateway --test installation_status_route
cargo test -p sdkwork-clawrouter-cloud-gateway --test database_installer_startup
```

Expected: all pass and report catalog version from `sdkwork-models.json`.

- [ ] **Step 10: Commit**

```powershell
git add services/sdkwork-clawrouter-router-service services/sdkwork-claw-installer services/sdkwork-clawrouter-cloud-gateway services/sdkwork-clawrouter-admin-gateway services/sdkwork-clawrouter-standalone-gateway
git commit -m "migrate installer to sdkwork-models catalog"
```

### Task 10: Continuous Catalog Update Workflow

**Files:**
- Create: `tests/test_sdkwork_models_update_workflow.py`
- Create: `data/sdkwork-models/catalog-freshness-policy.json`
- Create: `data/sdkwork-models/releases/README.md`
- Create: `data/sdkwork-models/releases/2026.05.07.1.json`
- Create: `data/sdkwork-models/tools/catalog-diff.mjs`
- Create: `data/sdkwork-models/tools/freshness-report.mjs`
- Create: `data/sdkwork-models/tools/release-catalog.mjs`
- Modify: `data/sdkwork-models/package.json`
- Modify: `data/sdkwork-models/README.md`
- Modify: `docs/32-sdkwork-models-standard.md`

- [ ] **Step 1: Write failing update workflow tests**

Create tests that require:

```python
def test_catalog_update_tools_exist(self):
    for rel in [
        "tools/catalog-diff.mjs",
        "tools/freshness-report.mjs",
        "tools/release-catalog.mjs",
        "catalog-freshness-policy.json",
        "releases/README.md",
    ]:
        self.assertTrue((SDKWORK_MODELS / rel).exists(), rel)
```

Add CLI checks:

```python
def test_catalog_freshness_report_passes(self):
    result = subprocess.run(
        ["node", "tools/freshness-report.mjs", "--max-age-policy", "catalog-freshness-policy.json"],
        cwd=SDKWORK_MODELS,
        text=True,
        capture_output=True,
    )
    self.assertEqual(0, result.returncode, result.stdout + result.stderr)
```

Add release metadata checks:

```python
def test_release_metadata_tracks_catalog_version(self):
    manifest = json.loads((SDKWORK_MODELS / "sdkwork-models.json").read_text(encoding="utf-8"))
    release = json.loads((SDKWORK_MODELS / "releases" / f"{manifest['catalogVersion']}.json").read_text(encoding="utf-8"))
    self.assertEqual(manifest["catalogVersion"], release["catalogVersion"])
    self.assertIn("vendorChanges", release)
    self.assertIn("freshnessReport", release)
```

- [ ] **Step 2: Define freshness policy**

`catalog-freshness-policy.json` must define per-domain freshness windows:

```json
{
  "schemaVersion": "1.0.0",
  "defaultMaxSourceAgeDays": 30,
  "rules": [
    {
      "scope": "pricing",
      "vendorCode": "*",
      "maxSourceAgeDays": 14,
      "severity": "error"
    },
    {
      "scope": "model",
      "vendorCode": "*",
      "maxSourceAgeDays": 45,
      "severity": "warning"
    },
    {
      "scope": "pricing",
      "vendorCode": "openai",
      "maxSourceAgeDays": 7,
      "severity": "error"
    }
  ]
}
```

Rules:

- pricing source evidence should refresh more often than model facts
- stale prices fail releases unless explicitly waived in release metadata
- stale model facts produce warnings unless the vendor is marked high-change
- every waiver must include reason, owner, and expiry date

- [ ] **Step 3: Implement catalog diff**

`catalog-diff.mjs` compares two catalog roots or release directories:

```powershell
node tools/catalog-diff.mjs --from ../sdkwork-models-2026.05.07.1 --to .
```

Output JSON:

```json
{
  "fromCatalogVersion": "2026.05.07.1",
  "toCatalogVersion": "2026.05.08.1",
  "vendorChanges": [
    {
      "vendorCode": "openai",
      "addedModels": ["gpt-5.3"],
      "changedModels": ["gpt-5.2"],
      "deprecatedModels": [],
      "retiredModels": [],
      "priceChanges": [
        {
          "modelId": "gpt-5.2",
          "meterCode": "llm_input_token",
          "fromUnitPrice": "1.750000",
          "toUnitPrice": "1.500000"
        }
      ]
    }
  ]
}
```

- [ ] **Step 4: Implement freshness report**

`freshness-report.mjs` must scan every model source and price source, compute age
from `observedAt`, apply `catalog-freshness-policy.json`, and emit:

```json
{
  "ok": true,
  "generatedAt": "2026-05-07T00:00:00Z",
  "staleSources": [],
  "warnings": []
}
```

Use `--as-of YYYY-MM-DD` for deterministic tests.

- [ ] **Step 5: Implement release helper**

`release-catalog.mjs` must:

1. run `build-index.mjs`
2. run `validate-catalog.mjs`
3. run `freshness-report.mjs`
4. optionally run `catalog-diff.mjs`
5. write `releases/<catalogVersion>.json`
6. print the release summary

It must refuse release when:

- index is not current
- validation has errors
- freshness has error-level stale sources without unexpired waiver
- release metadata version does not match `sdkwork-models.json.catalogVersion`

- [ ] **Step 6: Add package scripts**

Update `data/sdkwork-models/package.json`:

```json
{
  "scripts": {
    "validate": "node tools/validate-catalog.mjs",
    "build:index": "node tools/build-index.mjs",
    "freshness": "node tools/freshness-report.mjs --max-age-policy catalog-freshness-policy.json",
    "diff": "node tools/catalog-diff.mjs",
    "release:check": "node tools/release-catalog.mjs --check",
    "check": "node tools/build-index.mjs --check && node tools/validate-catalog.mjs && node tools/freshness-report.mjs --max-age-policy catalog-freshness-policy.json"
  }
}
```

- [ ] **Step 7: Document update cadence**

Update docs to require:

- high-change vendors reviewed weekly
- standard vendors reviewed at least monthly
- price files reviewed more frequently than model fact files
- each release includes machine-readable diff metadata
- ClawRouter can update by submodule commit, local catalog root, or bundled SDK update
- production deployments should pin `catalogVersion`, not track floating branch heads

- [ ] **Step 8: Run update workflow checks**

Run:

```powershell
node data/sdkwork-models/tools/freshness-report.mjs --max-age-policy data/sdkwork-models/catalog-freshness-policy.json --as-of 2026-05-07
node data/sdkwork-models/tools/release-catalog.mjs --check
python -B -m unittest tests.test_sdkwork_models_update_workflow
```

Expected: update workflow tests pass.

- [ ] **Step 9: Commit**

```powershell
git add data/sdkwork-models tests/test_sdkwork_models_update_workflow.py docs/32-sdkwork-models-standard.md
git commit -m "add sdkwork models update workflow"
```

### Task 11: Post-Install Catalog Refresh API and CLI

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/admin_model_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/admin_model_command.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/admin_system.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_model_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_model_store.rs`
- Modify: `services/sdkwork-claw-installer/src/main.rs`
- Modify: `services/sdkwork-clawrouter-router-service/tests/admin_model_command_api.rs`
- Modify: `services/sdkwork-clawrouter-admin-gateway/tests/installation_status_route.rs`

- [ ] **Step 1: Write refresh behavior tests**

Add API tests for:

- admin status includes catalog version, catalog source, and last catalog refresh status
- `/backend/v3/api/router/models/sync` can accept `source: "sdkwork_models"` and optional `vendorCodes`
- sync updates one vendor without deleting tenant custom models
- installer CLI supports `refresh-catalog`

- [ ] **Step 2: Extend sync command**

Add command fields:

```rust
pub struct SyncAdminModelCatalogCommand {
    pub source: String,
    pub mode: String,
    pub vendor_codes: Vec<String>,
    pub force: bool,
    pub catalog_root: Option<String>,
    pub catalog_version: Option<String>,
}
```

Supported modes:

- `official_refresh`
- `vendor_refresh`
- `catalog_version_refresh`
- `dry_run`

- [ ] **Step 3: Reuse importer for refresh**

The admin sync implementation must call the same importer used by installer.
It must support:

- all vendors
- selected `vendorCodes`
- dry-run diff summary
- refresh run record in `ai_model_catalog_sync_run`
- import snapshot in `ai_pricing_import_snapshot`

- [ ] **Step 4: Add CLI command**

Update `sdkwork-claw-installer`:

```powershell
sdkwork-claw-installer refresh-catalog --catalog-root data/sdkwork-models --vendor openai
```

Keep existing commands:

```text
status
install
upgrade
ensure
```

- [ ] **Step 5: Add conflict protection**

Refresh must not:

- delete tenant-owned custom rows
- overwrite tenant-specific prices
- remove provider secrets
- change local channel health
- enable routing for a model whose catalog `routingState` is `disabled` or `catalog_only`

- [ ] **Step 6: Run refresh tests**

Run:

```powershell
cargo test -p sdkwork-clawrouter-router-service --test admin_model_command_api
cargo test -p sdkwork-clawrouter-admin-gateway --test installation_status_route
cargo test -p sdkwork-clawrouter-router-service --test database_installer
```

Expected: install and refresh paths both use the `sdkwork-models` importer.

- [ ] **Step 7: Commit**

```powershell
git add services/sdkwork-clawrouter-router-service services/sdkwork-claw-installer services/sdkwork-clawrouter-admin-gateway
git commit -m "add sdkwork models catalog refresh flow"
```

### Task 12: Update Contract Tests and Remove Legacy Profile Seed Expectations

**Files:**
- Modify: `tests/test_model_catalog_standard_contract.py`
- Modify: `tests/test_sdkwork_models_standard.py`
- Modify: `../../spring-ai-plus-server-application/src/main/resources/data/bootstrap/*.json` only if they still reference legacy model-catalog files

- [ ] **Step 1: Move seed expectations**

Replace expectations for:

```python
DATA_DIR / "model-catalog" / "model-catalog-dev.json"
```

with:

```python
SDKWORK_MODELS / "models" / "index.json"
SDKWORK_MODELS / "models" / "meters.json"
SDKWORK_MODELS / "models" / "<vendorCode>"
```

- [ ] **Step 2: Require vendor directory coverage**

Assert at least the commercial leading vendors exist:

```python
required_vendors = {
    "openai",
    "anthropic",
    "google",
    "xai",
    "alibaba",
    "deepseek",
    "moonshot",
    "zhipu",
    "baidu",
    "tencent",
    "bytedance",
}
```

- [ ] **Step 3: Enforce installer no-hard-code guard**

Remove any skip/expected-failure from Task 1's no-hard-coded-catalog test.

- [ ] **Step 4: Run contract tests**

Run:

```powershell
python -B -m unittest tests.test_sdkwork_models_standard
python -B -m unittest tests.test_model_catalog_standard_contract
```

Expected: both pass.

- [ ] **Step 5: Commit**

```powershell
git add tests/test_sdkwork_models_standard.py tests/test_model_catalog_standard_contract.py ../../spring-ai-plus-server-application/src/main/resources/data/bootstrap
git commit -m "enforce sdkwork-models catalog contract"
```

### Task 13: Release, Submodule, and Install Documentation

**Files:**
- Modify: `data/sdkwork-models/README.md`
- Modify: `docs/32-sdkwork-models-standard.md`
- Modify: `README.md`
- Create: `data/sdkwork-models/RELEASE.md`
- Create: `docs/33-sdkwork-models-install-flow.md`
- Modify: `scripts/release-preflight.mjs`

- [ ] **Step 1: Document installation flow**

Create `docs/33-sdkwork-models-install-flow.md` covering:

- where the installer looks for the catalog
- `SDKWORK_MODELS_CATALOG_ROOT`
- bundled fallback
- catalog version recording
- per-vendor refresh
- overlay boundary
- operational failure modes

- [ ] **Step 2: Document independent repository setup**

Add local commands in `data/sdkwork-models/RELEASE.md`:

```powershell
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/Sdkwork-Cloud/sdkwork-models.git
git push -u origin main
```

Document ClawRouter submodule usage:

```powershell
git submodule add https://github.com/Sdkwork-Cloud/sdkwork-models.git data/sdkwork-models
git submodule update --init --recursive
```

Do not run network push commands in this workspace unless the user explicitly requests it and approval/network policy allows it.

- [ ] **Step 3: Add release preflight check**

Update `scripts/release-preflight.mjs` to include:

```powershell
pnpm.cmd models:check
```

- [ ] **Step 4: Run full verification**

Run:

```powershell
pnpm.cmd models:check
node data/sdkwork-models/tools/freshness-report.mjs --max-age-policy data/sdkwork-models/catalog-freshness-policy.json --as-of 2026-05-07
node data/sdkwork-models/tools/release-catalog.mjs --check
python -B -m unittest tests.test_sdkwork_models_standard tests.test_sdkwork_models_update_workflow tests.test_model_catalog_standard_contract
cargo test -p sdkwork-clawrouter-router-service --test sdkwork_models_catalog_import
cargo test -p sdkwork-clawrouter-router-service --test database_installer
cargo test -p sdkwork-clawrouter-router-service --test admin_model_command_api
pnpm.cmd verify:fast
```

Expected: all commands pass. If `pnpm.cmd verify:fast` is too broad for the current dirty workspace, record the exact failing unrelated checks and run the targeted commands above.

- [ ] **Step 5: Commit**

```powershell
git add README.md docs data/sdkwork-models scripts/release-preflight.mjs package.json
git commit -m "document sdkwork models install flow"
```

---

## Final Verification Matrix

Before calling the migration complete, run and record:

```powershell
pnpm.cmd models:check
node data/sdkwork-models/tools/freshness-report.mjs --max-age-policy data/sdkwork-models/catalog-freshness-policy.json --as-of 2026-05-07
node data/sdkwork-models/tools/release-catalog.mjs --check
python -B -m unittest tests.test_sdkwork_models_standard
python -B -m unittest tests.test_sdkwork_models_update_workflow
python -B -m unittest tests.test_model_catalog_standard_contract
cargo test --manifest-path data/sdkwork-models/sdkwork-models-rust/Cargo.toml
cargo test -p sdkwork-clawrouter-router-service --test sdkwork_models_catalog_import
cargo test -p sdkwork-clawrouter-router-service --test database_installer
cargo test -p sdkwork-clawrouter-router-service --test admin_model_command_api
cargo test -p sdkwork-clawrouter-admin-gateway --test installation_status_route
cargo test -p sdkwork-clawrouter-cloud-gateway --test database_installer_startup
pnpm.cmd verify:fast
```

Expected final state:

- `data/sdkwork-models` contains the canonical vendor-scoped catalog.
- `node data/sdkwork-models/tools/validate-catalog.mjs` passes.
- `node data/sdkwork-models/tools/build-index.mjs --check` passes.
- Language SDK skeletons expose the required standard APIs.
- The Rust SDK can load local and bundled catalog data.
- `DatabaseInstaller::ensure_installed()` imports model facts, meters, pricing, and rankings from `sdkwork-models`.
- Catalog release checks include freshness, diff metadata, and release metadata.
- Installed ClawRouter deployments can refresh all vendors or selected vendors
  from a newer catalog without reinstalling the database.
- `system_installation_state.catalog_version` matches `sdkwork-models.json.catalogVersion`.
- No public model facts, billing meters, prices, or ranking seed arrays remain hard-coded in `installer.rs`.
- Product-specific providers, channels, routes, and tenant policies remain outside portable model facts.

## Execution Notes

- Keep each task as a separate commit when possible.
- Do not rewrite unrelated dirty workspace changes.
- During migration, keep the old installer tests passing after each task unless the task explicitly introduces a failing guard.
- Prefer direct sqlx bind parameters over generated raw SQL strings for catalog imports.
- Do not use floats for prices in any language.
- Treat `openrouter`, `azure_openai`, `aws_bedrock`, and similar access layers as providers or overlays, not model vendors.
- Do not fetch live external pricing during implementation. Add source URLs and observed dates from the migrated seed data, then schedule separate data refresh work if current prices must be verified.
- Data maintenance is continuous: every catalog release must include validation,
  freshness, diff, and release metadata. Do not allow a release process that
  only edits JSON files without regenerating index and release artifacts.
