# Admin Prompts And MCP Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add professional admin Prompt and MCP management with unified Category reuse and vertical domain models.

**Architecture:** Category remains the only cross-domain abstraction and is backed by the existing `plus_category`/Category model. Prompt and MCP keep independent tables, APIs, SDK contracts, and admin pages while reusing shared admin UI primitives and generated backend SDK boundaries.

**Tech Stack:** Rust, Axum, SQLx, sdkwork-appbase studio storage contracts, OpenAPI/SDK generation, React, TypeScript, Vite, generated `@sdkwork/clawrouter-backend-sdk`.

---

### Task 1: Appbase Studio Storage Schema

**Files:**
- Modify: `sdkwork-appbase/packages/native-rust/studio/sdkwork-studio-storage-sqlx-rust/src/lib.rs`
- Create: `sdkwork-appbase/packages/native-rust/studio/sdkwork-studio-storage-sqlx-rust/migrations/0003_studio_prompt.sql`
- Create: `sdkwork-appbase/packages/native-rust/studio/sdkwork-studio-storage-sqlx-rust/migrations/0004_studio_mcp.sql`
- Modify: `sdkwork-appbase/packages/native-rust/studio/sdkwork-studio-storage-sqlx-rust/tests/studio_storage_standard.rs`

- [ ] **Step 1: Write failing tests** asserting prompt and MCP tables are declared, use `category_id`, and do not create prompt/MCP category tables.
- [ ] **Step 2: Run appbase studio storage tests** with `cargo test --manifest-path packages/native-rust/studio/sdkwork-studio-storage-sqlx-rust/Cargo.toml`.
- [ ] **Step 3: Add migrations and manifest exports** for `studio_prompt`, `studio_prompt_version`, `studio_prompt_binding`, `studio_mcp_server`, `studio_mcp_server_revision`, `studio_mcp_tool`, `studio_mcp_binding`.
- [ ] **Step 4: Re-run appbase studio storage tests** and keep output clean.

### Task 2: Claw Router Schema Registry

**Files:**
- Modify: `docs/schema-registry/sdkwork-clawrouter.tables.yaml`
- Modify generated schema only through the project schema generator if required by local gates.

- [ ] **Step 1: Write or update schema quality expectations** to include vertical prompt/MCP tables and unified `plus_category` usage.
- [ ] **Step 2: Run the schema quality gate enough to see the missing-table failure.**
- [ ] **Step 3: Add vertical prompt/MCP table contracts with `category_id` references and no prompt/MCP category tables.**
- [ ] **Step 4: Re-run schema validation/generation commands used by the repo.**

### Task 3: Backend Domain APIs

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/ports/admin_prompt_store.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/ports/admin_mcp_store.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/api/admin_prompts.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/api/admin_mcp.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/mod.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/mod.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/admin_prompt_api.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/admin_mcp_api.rs`

- [ ] **Step 1: Write failing route tests** for listing, creating, publishing/testing Prompt versions, and listing categories by the shared Category contract where applicable.
- [ ] **Step 2: Write failing route tests** for MCP service CRUD, revision publishing, tool discovery, tool updates, health-check, and bindings.
- [ ] **Step 3: Implement the minimal vertical store traits and Axum routers.**
- [ ] **Step 4: Verify Rust API tests pass.**

### Task 4: SQL Stores And Initialization Data

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_prompt_store.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_prompt_store.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_mcp_store.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_mcp_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/mod.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/mod.rs`
- Modify: `services/sdkwork-clawrouter-admin-gateway/src/lib.rs`
- Test: SQLite SQL contract tests for Prompt and MCP.

- [ ] **Step 1: Write failing SQL store tests** proving category reuse, audit reuse, versioning, bindings, seeded demo data, and no dedicated category tables.
- [ ] **Step 2: Implement SQLite and Postgres stores with explicit vertical schemas.**
- [ ] **Step 3: Wire admin API runtime store creation.**
- [ ] **Step 4: Re-run focused Rust tests.**

### Task 5: OpenAPI And Generated Backend SDK

**Files:**
- Modify: `docs/schema-registry/frontend-field-contracts.yaml` and split operation/model files as required by local conventions.
- Regenerate: `generated/api/api-contract-manifest.json`
- Regenerate: `generated/openapi/clawrouter-backend-openapi.json`
- Regenerate: `sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript`

- [ ] **Step 1: Add failing contract assertions** for `/backend/v3/api/prompts/*` and `/backend/v3/api/mcp/*`.
- [ ] **Step 2: Add vertical Prompt/MCP backend operations and schemas.**
- [ ] **Step 3: Run SDK generation commands from `clawrouter-backend-sdk-integration`.**
- [ ] **Step 4: Run SDK guardian/schema quality gates.**

### Task 6: Admin Portal UI

**Files:**
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-prompts/*`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-mcp/*`
- Modify: `apps/sdkwork-clawrouter-pc/src/App.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/src/adminModuleRegistry.ts`
- Modify: `apps/sdkwork-clawrouter-pc/package.json`
- Modify: `apps/sdkwork-clawrouter-pc/pnpm-workspace.yaml`
- Modify i18n resources under `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/resources/admin`
- Test: add portal runtime tests for menu, routes, service SDK usage, i18n key alignment.

- [ ] **Step 1: Write failing portal runtime tests** for sidebar entries, route registration, package exports, generated SDK usage, and no raw HTTP.
- [ ] **Step 2: Implement `AdminPromptPage` and `AdminMcpPage` as vertical pages reusing shared table/state primitives.**
- [ ] **Step 3: Add i18n and route/menu integration.**
- [ ] **Step 4: Run portal runtime tests, typecheck, and build.**

### Task 7: Final Verification

- [ ] **Step 1: Run focused appbase studio storage tests.**
- [ ] **Step 2: Run focused Rust product/admin API tests.**
- [ ] **Step 3: Run schema/SDK generation guards.**
- [ ] **Step 4: Run portal runtime tests, typecheck, and build.**
- [ ] **Step 5: Report remaining unrelated dirty-worktree failures separately.**
