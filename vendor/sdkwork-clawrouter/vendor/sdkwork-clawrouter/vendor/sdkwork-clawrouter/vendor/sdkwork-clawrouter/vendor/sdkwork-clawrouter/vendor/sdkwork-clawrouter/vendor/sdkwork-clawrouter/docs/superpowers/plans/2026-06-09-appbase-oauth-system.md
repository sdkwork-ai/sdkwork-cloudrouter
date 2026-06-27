# Appbase OAuth System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement an appbase-owned OAuth system and remove Claw Router `open_platform_*` technical debt without compatibility aliases.

**Architecture:** Appbase owns OAuth database tables, app-api runtime route contracts, provider ingress route contracts, and backend-api management route contracts. Claw Router consumes appbase backend SDK resources from an independent `/admin/oauth` admin module and deletes product-local open-platform ownership.

**Tech Stack:** Rust route/storage crates, SQL migrations, OpenAPI/SDK materialization, TypeScript React backend-admin UI, generated `@sdkwork/iam-backend-sdk`.

---

### Task 1: Appbase Storage Contract

**Files:**
- Modify: `../sdkwork-appbase/packages/native-rust/iam/sdkwork-iam-storage-sqlx-rust/tests/iam_storage_standard.rs`
- Modify: `../sdkwork-appbase/packages/native-rust/iam/sdkwork-iam-storage-sqlx-rust/migrations/0001_iam_foundation.sql`
- Modify: `../sdkwork-appbase/packages/native-rust/iam/sdkwork-iam-storage-sqlx-rust/src/lib.rs`

- [ ] **Step 1: Write failing storage tests**

Add tests that assert the migration declares all required `iam_oauth_*` tables, required indexes, no `iam_oauth_client_secret`, no plaintext `client_secret`, resource-account access modes, mini-program columns, provider callback columns, and `IamTables` constants.

- [ ] **Step 2: Run red storage test**

Run: `cargo test --manifest-path ../sdkwork-appbase/packages/native-rust/iam/sdkwork-iam-storage-sqlx-rust/Cargo.toml`

Expected: FAIL because OAuth tables/constants do not exist.

- [ ] **Step 3: Implement storage contract**

Add portable SQL table definitions and focused `IamTables` constants. Use `iam_oauth_secret` for all owner kinds. Keep secret values as refs/hashes/status only.

- [ ] **Step 4: Run green storage test**

Run the same cargo test. Expected: PASS for storage standard tests.

### Task 2: Appbase HTTP Route Contract

**Files:**
- Modify: `../sdkwork-appbase/packages/native-rust/iam/sdkwork-iam-http-rust/tests/iam_http_standard.rs`
- Modify: `../sdkwork-appbase/packages/native-rust/iam/sdkwork-iam-http-rust/src/sdkwork_appbase_app_api.rs`
- Modify: `../sdkwork-appbase/packages/native-rust/iam/sdkwork-iam-http-rust/src/sdkwork_appbase_open_api.rs`
- Modify: `../sdkwork-appbase/packages/native-rust/iam/sdkwork-iam-http-rust/src/sdkwork_appbase_backend_api.rs`

- [ ] **Step 1: Write failing route contract tests**

Add tests for `/app/v3/api/oauth/*`, `/iam/v3/api/oauth/provider_callbacks/*`, and `/backend/v3/api/iam/oauth/*` route metadata. Assert backend routes do not create sessions and app credential-entry routes reject credential headers.

- [ ] **Step 2: Run red HTTP test**

Run: `cargo test --manifest-path ../sdkwork-appbase/packages/native-rust/iam/sdkwork-iam-http-rust/Cargo.toml`

Expected: FAIL because OAuth route metadata is missing or still under `/app/v3/api/auth/*`.

- [ ] **Step 3: Implement route metadata**

Replace legacy OAuth placeholders with canonical route metadata. Keep handlers fail-closed/unavailable where runtime providers are not implemented yet, but make the API surface correct and standard.

- [ ] **Step 4: Run green HTTP test**

Run the same cargo test. Expected: PASS for route standard tests.

### Task 3: Claw Router Open Platform Removal Guard

**Files:**
- Modify or create focused Claw Router tests under existing test locations after locating current open-platform contract sources.
- Delete Claw Router-owned `open_platform_*` schema/API/store/admin packages when located.

- [ ] **Step 1: Write failing removal tests**

Assert no schema registry source, generated OpenAPI, Rust route manifest, generated Claw Router backend SDK, sidebar route, or admin package exposes `open_platform`, `openPlatform`, or `/admin/open-platform`.

- [ ] **Step 2: Run red removal test**

Run the narrow Claw Router test for the guard. Expected: FAIL while old open-platform artifacts exist.

- [ ] **Step 3: Remove old artifacts**

Delete product-local open-platform sources. Do not add compatibility redirects or aliases.

- [ ] **Step 4: Regenerate contracts as needed**

Regenerate from source contract inputs only. Do not hand-edit generated SDK output.

- [ ] **Step 5: Run green removal test**

Run the same guard test. Expected: PASS.

### Task 4: Claw Router `/admin/oauth` Module

**Files:**
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-oauth/`
- Modify: Claw Router PC admin module registry/sidebar/i18n files after locating current registry pattern.
- Test: focused admin route/module tests.

- [ ] **Step 1: Write failing admin tests**

Assert sidebar includes `oauth`, default route is `/admin/oauth/overview`, canonical routes include login, mini-program login, provider catalog, integrations, clients, secrets, surfaces, flow configs, operator platforms, resource accounts, resource authorizations, webhooks, operational resources, account links, grants, callback diagnostics, and diagnostic runs.

- [ ] **Step 2: Run red admin test**

Run the focused PC admin test. Expected: FAIL because module is absent.

- [ ] **Step 3: Implement admin package**

Build dense backend-admin pages and service boundary using `getSdkworkAppbaseBackendSdkClient` and `@sdkwork/iam-backend-sdk` only. No raw HTTP, no Claw Router backend SDK for appbase-owned OAuth.

- [ ] **Step 4: Run green admin test**

Run the focused PC admin test. Expected: PASS.

### Task 5: Final Verification

**Files:**
- No new files unless verification exposes a focused fix.

- [ ] **Step 1: Run appbase storage tests**

Run: `cargo test --manifest-path ../sdkwork-appbase/packages/native-rust/iam/sdkwork-iam-storage-sqlx-rust/Cargo.toml`

- [ ] **Step 2: Run appbase HTTP tests**

Run: `cargo test --manifest-path ../sdkwork-appbase/packages/native-rust/iam/sdkwork-iam-http-rust/Cargo.toml`

- [ ] **Step 3: Run Claw Router focused tests**

Run the narrow tests added for open-platform removal and `/admin/oauth`.

- [ ] **Step 4: Run broader checks when practical**

Run `pnpm.cmd test` or the narrow package test/build command that covers the touched PC admin package.
