# Admin Category Initialization Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable admin-triggered category initialization and complete product-category CRUD for multi-level catalog trees.

**Architecture:** Store canonical category seed data under `data/categories/<taxonomy>/categories.json`, with product categories targeting `commerce_product_category` and reusable platform categories targeting `plus_category`. Add a backend admin command endpoint that imports selected datasets idempotently; keep installer participation disabled by default but represented by manifest policy so install can opt in later. The portal adds a product category management page and initialization button that calls the generated backend SDK.

**Tech Stack:** Rust, Axum, SQLx SQLite/Postgres stores, schema-registry OpenAPI generation, generated `@sdkwork/clawrouter-backend-sdk`, React, TypeScript, Node runtime tests.

---

## Files

- Create: `data/categories/README.md`
- Create: `data/categories/product/categories.json`
- Create: `data/categories/agents/categories.json`
- Create: `data/categories/agent-skills/categories.json`
- Create: `data/categories/mcp/categories.json`
- Create: `data/categories/apps/categories.json`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/admin_catalog.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/admin_catalog_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_catalog_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_catalog_store.rs`
- Modify: `services/sdkwork-clawrouter-admin-gateway/tests/product_center_routes.rs`
- Modify: `docs/schema-registry/frontend-field-contracts/operations/backend-commerce-catalog.yaml`
- Regenerate: `generated/api/api-contract-manifest.json`
- Regenerate: `generated/openapi/clawrouter-backend-openapi.json`
- Regenerate: `sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/**`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/CategoryManagementPage.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/index.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/admin-catalog-runtime.test.ts`

## Tasks

### Task 1: Backend Red Tests

- [ ] Add a route test proving `POST /backend/v3/api/catalog/category_seeds/initialize` imports selected data directories idempotently.
- [ ] Add a route/store test proving product category names accept Chinese text, recursive list output includes level 2+ paths, self-parent updates are rejected, child categories block deletion, and active products block deletion.
- [ ] Run the focused Rust test and confirm it fails for the expected missing endpoint/behavior.

### Task 2: Seed Data Standard

- [ ] Add `data/categories/README.md` documenting manifest fields, install policy, and extension rules.
- [ ] Add one directory per taxonomy with `categories.json`.
- [ ] Keep product category `categoryNo` ASCII-stable while display names are Chinese and aligned to common WeChat Shop-style retail top-level industries.

### Task 3: Backend Implementation

- [ ] Extend `AdminCatalogStore` with `initialize_category_seeds`.
- [ ] Add request/response DTOs and route handling in `admin_catalog.rs`.
- [ ] Implement SQLite and Postgres seed import for `commerce_product_category` and `plus_category`.
- [ ] Make category validation Unicode-aware for display names while keeping IDs/codes ASCII-stable.
- [ ] Add recursive category list output and parent/child integrity checks.
- [ ] Run the focused Rust test and confirm it passes.

### Task 4: Contract And SDK

- [ ] Add `catalog.categorySeeds.initialize` to `backend-commerce-catalog.yaml`.
- [ ] Regenerate manifest/OpenAPI/backend TypeScript SDK with the repository SDK generation commands.
- [ ] Verify the portal service uses only `getClawRouterBackendSdkClient().catalog.categorySeeds.initialize`.

### Task 5: Admin UI

- [ ] Add `CategoryManagementPage.tsx` with list, create, edit, archive/delete, and initialize actions.
- [ ] Wire `/admin/catalog/categories` to the dedicated page while keeping non-product sections on `AdminResourceCenter`.
- [ ] Add runtime source tests for the button, SDK call, no raw fetch/axios, CRUD markers, and data attributes.

### Task 6: Verification

- [ ] Run focused Rust admin API test.
- [ ] Run focused portal runtime test.
- [ ] Run schema/SDK guards if regeneration changed contracts.
- [ ] Report any skipped full-gate command with the exact blocker.
