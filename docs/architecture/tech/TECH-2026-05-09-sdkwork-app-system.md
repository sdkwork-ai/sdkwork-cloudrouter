> Migrated from `docs/superpowers/plans/2026-05-09-sdkwork-app-system.md` on 2026-06-24.
> Owner: SDKWork maintainers

# SDKWork App System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Rust-side SDKWork app system as a first-class, installable platform_app-compatible catalog with seed data, installer import, SDK-backed APIs, and frontend service integration.

**Architecture:** `sdkwork.app.config.json` remains the app source of truth; `data/app/sdkwork-apps.json` is the installable seed projection; Rust installer owns database schema creation and idempotent seed import into `appstore_app` and app catalog projections. Public AppCenter reads remain `/app/v3/api/app/store`; management surfaces are added through schema registry -> OpenAPI -> generated SDKs before frontend services consume them.

**Tech Stack:** Rust, sqlx, axum, SQLite/Postgres, Python unittest quality gates, Node ESM app-standard scripts, generated TypeScript SDKs.

---

### Task 1: App Seed Contract

**Files:**
- Create: `tests/test_app_seed_catalog_standard.py`
- Create: `data/app/README.md`
- Create: `data/app/sdkwork-apps.json`
- Modify: `../scripts/lib/sdkwork-app-standard-init-all.mjs`

- [ ] **Step 1: Write the failing Python test**

Add a test that asserts `data/app/sdkwork-apps.json` exists, has `kind=sdkwork.appstore_app.seed`, contains at least `sdkwork-clawrouter`, stores `platform_app` fields matching Java `platform_app`, and has no duplicate `appKey`.

- [ ] **Step 2: Run the test to verify RED**

Run: `python -m unittest tests.test_app_seed_catalog_standard`

Expected: FAIL because `data/app/sdkwork-apps.json` does not exist.

- [ ] **Step 3: Implement the seed export**

Create `data/app` documentation and seed JSON generated from existing SDKWork App Standard manifests. Keep the schema minimal and deterministic.

- [ ] **Step 4: Run the test to verify GREEN**

Run: `python -m unittest tests.test_app_seed_catalog_standard`

Expected: PASS.

### Task 2: Installer Schema And Seed Import

**Files:**
- Modify: `generated/schema/postgres/schema.sql`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/installer.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/database_installer.rs`

- [ ] **Step 1: Write the failing Rust installer test**

Assert `ensure_installed()` creates `appstore_app`, `plus_category`, `studio_catalog_asset`, `studio_catalog_artifact`, and imports at least one active app from `data/app`.

- [ ] **Step 2: Run the test to verify RED**

Run: `cargo test -p sdkwork-clawrouter-router-service sqlite_installer_installs_schema_and_sdkwork_models_catalog_once -- --nocapture`

Expected: FAIL because app tables/seed rows are missing.

- [ ] **Step 3: Implement schema and importer**

Add Java-compatible tables and indexes to generated schema, then add installer code to load and upsert `data/app/sdkwork-apps.json` after schema creation and before installation is marked installed.

- [ ] **Step 4: Run the installer test to verify GREEN**

Run: `cargo test -p sdkwork-clawrouter-router-service sqlite_installer_installs_schema_and_sdkwork_models_catalog_once -- --nocapture`

Expected: PASS.

### Task 3: App Store Reads From Installed Seed

**Files:**
- Test: `services/sdkwork-clawrouter-router-service/tests/sqlite_app_store_read_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/app_catalog_mapping.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_store_read_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_store_read_store.rs`

- [ ] **Step 1: Write failing coverage for appKey lookup**

Assert app detail can be loaded by numeric `id` and by `config.standard.appKey`, so frontend routes can use stable app keys.

- [ ] **Step 2: Run the read-store test to verify RED**

Run: `cargo test -p sdkwork-clawrouter-router-service sqlite_app_store_loads_active_apps_for_subject_with_public_contract_fields -- --nocapture`

Expected: FAIL for app-key lookup before implementation.

- [ ] **Step 3: Implement app-key lookup and clean mapping**

Keep public DTOs stable. Read `config.standard.appKey` as an alternate detail lookup key and ensure release/download projection prefers `installConfig`/`releaseNotes`.

- [ ] **Step 4: Run read-store tests**

Run: `cargo test -p sdkwork-clawrouter-router-service sqlite_app_store_read_store -- --nocapture`

Expected: PASS.

### Task 4: API Contract And SDK

**Files:**
- Modify: `docs/schema-registry/frontend-field-contracts.yaml`
- Generated: `generated/api/api-contract-manifest.json`
- Generated: `generated/openapi/clawrouter-app-openapi.json`
- Generated: `generated/openapi/clawrouter-backend-openapi.json`
- Generated: `sdks/clawrouter-app-sdk`
- Generated: `sdks/clawrouter-backend-sdk`

- [ ] **Step 1: Add failing contract assertions**

Extend Python tests to require app management/backend app operations in contract and OpenAPI.

- [ ] **Step 2: Run contract tests to verify RED**

Run: `python -m unittest tests.test_app_center_runtime_standard`

Expected: FAIL until contracts are added/generated.

- [ ] **Step 3: Update contract source and regenerate**

Run the official contract and SDK generation commands from the local skills.

- [ ] **Step 4: Run contract and guardian checks**

Run: `python -B -m tools.clawrouter_sdk_guardian` and `python -B -m tools.schema_quality_gate`.

Expected: PASS or report exact remaining blocker.

### Task 5: Final Verification

**Files:**
- All touched files.

- [ ] **Step 1: Run targeted Python tests**

Run: `python -m unittest tests.test_app_seed_catalog_standard tests.test_app_center_runtime_standard`

- [ ] **Step 2: Run targeted Rust tests**

Run: `cargo test -p sdkwork-clawrouter-router-service app_store -- --nocapture`

- [ ] **Step 3: Run installer smoke**

Run: `cargo test -p sdkwork-clawrouter-router-service database_installer -- --nocapture`

- [ ] **Step 4: Report exact verification evidence**

Summarize commands, pass/fail status, and any residual risk.

