# Commerce Product Center Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move product center frontend/admin SDK ownership from `sdkwork-clawrouter` to `sdkwork-commerce` while preserving the current Claw Router admin UI visuals.

**Architecture:** Commerce owns product center backend SDK/service methods and the reusable PC admin package. Claw Router keeps a compatibility package name that re-exports Commerce product center components and no longer calls Claw Router product/catalog backend SDK methods.

**Tech Stack:** TypeScript, React, Vitest, Node test runner, Commerce service ports, SDKWork Commerce backend SDK family, Rust route manifests.

---

### Task 1: Static Migration Guardrails

**Files:**
- Create: `sdks/test/verify-commerce-product-admin-migration.test.mjs`

- [ ] **Step 1: Write the failing test**

Create a Node test that asserts:

- `apps/sdkwork-commerce-pc/sdkwork.app.config.json` exists.
- `apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/package.json` exists.
- the package exports `CatalogAdmin`, `CommerceProductAdmin`, and `createCommerceProductAdminService`.
- the component spec cites `APP_PC_ARCHITECTURE_SPEC.md` and `BACKEND_UI_SPEC.md`.
- representative migrated UI markers exist in the Commerce package.
- migrated source does not import `sdkwork-clawroutes-pc-commons` or call `getClawRouterBackendSdkClient`.
- the Claw Router catalog adapter imports Commerce product admin exports.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:node`

Expected: FAIL because the Commerce app manifest and product admin package are not implemented yet.

- [ ] **Step 3: Implement the minimal structure**

Create the Commerce PC app manifest, product admin package manifests/specs, migrated sources, and Claw Router adapter.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:node`

Expected: PASS for the new static migration guardrail.

### Task 2: Commerce Catalog Admin SDK Method Coverage

**Files:**
- Modify: `packages/common/commerce/sdkwork-commerce-sdk-ports/src/index.ts`
- Modify: `packages/common/commerce/sdkwork-commerce-service/tests/commerce-service.standard.test.ts`

- [ ] **Step 1: Write the failing test**

Extend the existing Commerce service test to require:

- `commerce.catalog.categorySeeds.create`
- `commerce.catalog.categoryAttributes.list`
- `commerce.catalog.categoryAttributes.create`
- `commerce.catalog.categoryAttributes.update`
- `commerce.catalog.categoryAttributes.delete`
- `commerce.catalog.products.delete`
- `commerce.catalog.skus.delete`

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:vitest -- packages/common/commerce/sdkwork-commerce-service/tests/commerce-service.standard.test.ts`

Expected: FAIL because the method tree does not expose those methods yet.

- [ ] **Step 3: Add methods to the Commerce backend method tree**

Update only `BACKEND_COMMERCE_METHOD_TREE`; do not edit generated SDK output.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:vitest -- packages/common/commerce/sdkwork-commerce-service/tests/commerce-service.standard.test.ts`

Expected: PASS.

### Task 3: Commerce Product Admin Service

**Files:**
- Create: `apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/src/catalogService.ts`
- Create: `apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/tests/product-admin.service.test.ts`

- [ ] **Step 1: Write the failing service test**

Use a fake Commerce service and assert the product admin service delegates list/create/update/delete calls to `commerceService.admin.catalog.*`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:vitest -- apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/tests/product-admin.service.test.ts`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement service wrapper**

Implement `createCommerceProductAdminService` and compatibility functions such as `listCommerceProducts`, `createCommerceCategory`, and `initializeCommerceCategorySeeds`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:vitest -- apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/tests/product-admin.service.test.ts`

Expected: PASS.

### Task 4: Preserve Current UI In Commerce

**Files:**
- Create: migrated page files under `apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/src/`
- Create: `commerce-admin-primitives.tsx`
- Create: `commerce-api-result.ts`

- [ ] **Step 1: Mechanically copy UI pages**

Copy the existing Claw Router product center page files to the Commerce package.

- [ ] **Step 2: Replace only imports and local service boundary**

Replace Claw Router commons/runtime imports with Commerce-local primitives and helpers. Keep class names, JSX layout, and data attributes unchanged.

- [ ] **Step 3: Run UI/static tests**

Run: `pnpm test:node && pnpm test:vitest -- apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/tests/product-admin.service.test.ts`

Expected: PASS.

### Task 5: Claw Router Adapter

**Files:**
- Modify: `../sdkwork-clawrouter/apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/index.tsx`
- Modify: `../sdkwork-clawrouter/apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts`
- Modify: `../sdkwork-clawrouter/apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/package.json`
- Modify: `../sdkwork-clawrouter/apps/sdkwork-clawrouter-pc/package.json`
- Modify: `../sdkwork-clawrouter/apps/sdkwork-clawrouter-pc/pnpm-workspace.yaml`

- [ ] **Step 1: Write or run static adapter test**

Use the Commerce static test to assert the adapter imports Commerce product admin exports and no longer calls `getClawRouterBackendSdkClient().commerce.catalog`.

- [ ] **Step 2: Implement adapter**

Make `src/index.tsx` re-export Commerce product admin components and make `src/catalogService.ts` re-export Commerce product admin service functions.

- [ ] **Step 3: Update workspace package dependencies**

Add Commerce package/service paths and dependency entries without reverting existing unrelated Claw Router changes.

- [ ] **Step 4: Run Claw Router focused typecheck**

Run: `pnpm --dir ../sdkwork-clawrouter/apps/sdkwork-clawrouter-pc typecheck`

Expected: PASS or report unrelated pre-existing typecheck failures separately.

### Task 6: Backend/API Ownership Audit

**Files:**
- Inspect: `../sdkwork-clawrouter/services/sdkwork-claw-product/src/api/admin_catalog.rs`
- Inspect: `crates/sdkwork-commerce-api-server/src/lib.rs`
- Inspect: Commerce generated OpenAPI source/generator inputs

- [ ] **Step 1: Audit route ownership**

Run a focused `rg` for `/app/v3/api/catalog` and `/backend/v3/api/catalog` in Claw Router source and generator inputs.

- [ ] **Step 2: Close Commerce route gaps through owner sources**

Add Commerce route definitions only in owner route manifest/source if required. Regenerate OpenAPI/SDK through Commerce scripts.

- [ ] **Step 3: Avoid generated-output hand edits**

Do not patch generated SDK files directly. Use source contracts and generation scripts.

- [ ] **Step 4: Run SDK checks**

Run: `pnpm sdk:check`

Expected: PASS or report exact missing generator/source ownership gaps.

### Task 7: Final Verification

**Files:**
- No new implementation files unless verification finds a defect.

- [ ] **Step 1: Run focused Commerce checks**

Run:

```powershell
pnpm test:node
pnpm test:vitest -- apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product/tests/product-admin.service.test.ts
pnpm test:vitest -- packages/common/commerce/sdkwork-commerce-service/tests/commerce-service.standard.test.ts
```

- [ ] **Step 2: Run broader checks**

Run:

```powershell
pnpm test:vitest
pnpm sdk:check
```

- [ ] **Step 3: Report evidence**

Summarize commands, pass/fail status, files changed, and residual backend/API ownership gaps.
