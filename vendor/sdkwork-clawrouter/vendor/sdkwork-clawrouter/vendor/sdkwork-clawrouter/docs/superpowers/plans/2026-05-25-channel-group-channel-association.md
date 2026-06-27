# Channel Group Channel Association Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add flexible management for channel groups to associate with provider channel accounts, allowing one channel account to be used by multiple groups.

**Architecture:** Introduce `ai_channel_group_member` as the many-to-many system-of-record table owned by the channel group management flow. Expose group-owned backend APIs through `@sdkwork/clawrouter-backend-sdk`, update the SQL catalog/runtime route selection to honor active group-channel bindings, and add a focused association panel in the admin group UI.

**Tech Stack:** Rust/Axum/sqlx, PostgreSQL and SQLite schema contracts, YAML frontend field contracts, generated TypeScript backend SDK, React/TypeScript portal, pnpm.

---

### Task 1: Backend API Contract Tests

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/tests/admin_channel_group_api.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/admin_channel_group_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/admin_channel_group.rs`

- [ ] Write failing API tests for listing and replacing group channel bindings.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test admin_channel_group_api admin_channel_group_route_lists_and_replaces_channel_bindings`.
- [ ] Add port DTOs and trait methods for group channel bindings.
- [ ] Add Axum routes under `/backend/v3/api/router/channel_groups/{group_id}/channel_bindings`.
- [ ] Re-run the focused API test until it passes.

### Task 2: Schema and SQL Store

**Files:**
- Modify: `docs/schema-registry/sdkwork-clawrouter.tables.yaml`
- Modify/generated: `generated/schema/postgres/schema.sql`
- Modify/generated: `generated/schema/manifest/schema-manifest.json`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_channel_group_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_channel_group_store.rs`
- Modify: `crates/sdkwork-claw-test-support/src/lib.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/sqlite_admin_channel_group_store.rs`

- [ ] Write failing SQLite store tests proving one channel can be bound to two groups and replace is idempotent.
- [ ] Add `ai_channel_group_member` to schema registry with tenant entity columns, indexes, and frontend route ownership.
- [ ] Regenerate schema SQL and manifest via `python -B -m tools.schema_compiler` and `python -B -m tools.schema_manifest`.
- [ ] Implement Postgres and SQLite list/replace methods using soft delete for removed bindings.
- [ ] Re-run focused SQLite tests.

### Task 3: Runtime Route Selection

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/queries/snapshot.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/queries.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/rows.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/provider_route_selector.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/provider_route_selector.rs`

- [ ] Write failing selector test proving group-bound channels restrict candidates for that group.
- [ ] Load group binding priority/weight into provider account pool route rows.
- [ ] Filter/sort provider account pool routes by authenticated group context.
- [ ] Re-run selector tests.

### Task 4: OpenAPI and SDK

**Files:**
- Modify: `docs/schema-registry/frontend-field-contracts/operations/backend-router.yaml`
- Generated: `generated/api/api-contract-manifest.json`
- Generated: `generated/openapi/clawrouter-backend-openapi.json`
- Generated: `sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/**`

- [ ] Add backend operations and DTO schemas for group channel bindings.
- [ ] Regenerate contract and backend SDK with the project commands.
- [ ] Verify generated SDK exposes `iam.channelGroups.channelBindings` or the closest generator naming.

### Task 5: Portal UI

**Files:**
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-group/src/groupService.ts`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-group/src/index.tsx`
- Modify/add i18n resources under `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/resources/admin/`
- Test: `apps/sdkwork-clawrouter-pc/admin-app-runtime.test.ts` or focused admin group runtime test

- [ ] Write failing portal runtime/type test proving group service uses backend SDK methods for bindings.
- [ ] Add service methods for list/replace bindings.
- [ ] Add a group row action opening a focused channel association dialog.
- [ ] Reuse channel display data without showing `secretRef`.
- [ ] Re-run portal runtime test and `pnpm.cmd --dir apps/sdkwork-clawrouter-pc typecheck`.

### Task 6: Verification

- [ ] Run focused Rust tests for admin channel group API/store and route selector.
- [ ] Run schema quality gate or report any pre-existing unrelated failure.
- [ ] Run backend SDK guardian after regeneration.
- [ ] Run portal typecheck and focused runtime test.
