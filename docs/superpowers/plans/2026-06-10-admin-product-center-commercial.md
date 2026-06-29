# Admin Product Center Commercial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the admin Product Center to a commercial operating baseline covering categories, shops/stores, SPU create/edit/retrieve, multi-spec SKU matrix, category attributes, SKU attributes, product detail configuration, pricing, inventory readiness, and publish readiness.

**Architecture:** Claw Router owns the admin shell, route mounting, and wrapper integration. `sdkwork-商���` owns the real product-admin UI package at `apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product`, which must consume `@sdkwork/commerce-service` rather than Claw Router SDKs or raw HTTP. Complete the frontend workflow and typed service boundary first without changing schemas; close backend/API/SDK gaps contract-first only after explicit approval for any table, migration, or generated-SDK churn.

**Tech Stack:** TypeScript, React, Vite/Vitest, `@sdkwork/commerce-service`, Commerce generated backend SDK, Claw Router admin wrapper, Rust/SQLx/OpenAPI for later backend contract tasks.

---

## Source Spec

- Design spec: `docs/superpowers/specs/2026-06-10-admin-product-center-commercial-design.md`
- Superseded spec for context: `docs/superpowers/specs/2026-05-22-admin-product-center-design.md`

## Current Workspace Constraints

- `sdkwork-clawrouter` has unrelated dirty generated app SDK/IAM/runtime work. Do not stage or revert it.
- `sdkwork-商���` has active parallel work, including product-admin files. Preserve and build on it.
- Do not hand-edit generated SDK output.
- Do not add raw `fetch`, `axios`, manual auth headers, or local SDK forks.
- Do not change tables, columns, indexes, migrations, or embedded schemas without explicit human approval.
- Product admin UI uses `@sdkwork/commerce-service`; Claw Router wrapper must remain a thin integration layer.

## File Structure

Primary Commerce implementation files:

- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/catalogService.ts`
  - Owns product-admin service facade over `@sdkwork/commerce-service`.
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/productAdminTypes.ts`
  - Local view models for product detail config, store visibility, SKU matrix, attributes, pricing, inventory readiness, and publish readiness.
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/productAdminReadiness.ts`
  - Pure readiness and validation functions. No React, SDK, or persistence code.
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/productAdminMapping.ts`
  - Pure mapping between draft/view-model state and service payloads.
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductDetailConfigPanel.tsx`
  - Commercial detail configuration UI section.
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductStoreInventoryPanel.tsx`
  - Store visibility and inventory/source readiness UI section.
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductPublishReadinessPanel.tsx`
  - Publish readiness checklist and action affordance section.
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductAttributeValuePanel.tsx`
  - Category and SKU attribute value UI section.
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/SkuMatrixCommercialPanel.tsx`
  - Focused SKU matrix controls extracted from the oversized create/edit page.
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductCreatePage.tsx`
  - Keep route behavior, preserve existing retrieve-based edit loading, and compose the new focused panels.
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/SkuManagementPage.tsx`
  - Align standalone SKU management with the same SKU attribute and readiness concepts.
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductListPage.tsx`
  - Surface readiness, detail completeness, store visibility, SKU status, and inventory risk in the list.
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/index.tsx`
  - Export stable public components/types only.
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts`
  - Add guards for service boundaries, no raw HTTP, complete commercial view-model helpers, and no list-search edit fallback.

Claw Router integration files:

- Inspect, modify only if needed: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/index.tsx`
- Inspect, modify only if needed: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts`
- Inspect, modify only if needed: `apps/sdkwork-clawrouter-pc/admin-catalog-runtime.test.ts`

Backend/API/SDK gap files for later approved contract work:

- `E:/sdkwork-space/sdkwork-商���/packages/common/commerce/sdkwork-商���-contracts/src/index.ts`
- `E:/sdkwork-space/sdkwork-商���/packages/common/commerce/sdkwork-商���-sdk-ports/src/index.ts`
- `E:/sdkwork-space/sdkwork-商���/packages/common/commerce/sdkwork-商���-service/tests/commerce-service.standard.test.ts`
- `E:/sdkwork-space/sdkwork-商���/generated/openapi/commerce-backend-api.openapi.json`
- `E:/sdkwork-space/sdkwork-商���/sdks/sdkwork-商���-backend-sdk/**`
- `E:/sdkwork-space/sdkwork-商���/crates/**`

Do not touch the backend/API/SDK gap files in the first frontend completion pass unless the user explicitly approves schema/generated SDK churn.

## Task 1: Protect The Existing Commerce Service Boundary

**Files:**
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts`
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/catalogService.ts`

- [ ] **Step 1: Add service-boundary guard expectations**

Add test assertions that the product admin package:

```ts
expect(source).toContain("@sdkwork/commerce-service");
expect(source).not.toMatch(/\bfetch\s*\(/);
expect(source).not.toMatch(/\baxios\b/);
expect(source).not.toMatch(/clawrouter-backend-sdk/);
expect(source).toContain("catalog.products.management.retrieve");
```

- [ ] **Step 2: Run the focused service test**

Run:

```powershell
pnpm run test:vitest -- apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts
```

Expected: PASS or fail only on missing new guards.

- [ ] **Step 3: Update `catalogService.ts` only if needed**

Keep `createCommerceProductAdminService` as the single remote-call boundary. Add method placeholders only when the current `@sdkwork/commerce-service` surface already exposes them; otherwise document as a contract gap in the plan notes instead of faking a transport path.

- [ ] **Step 4: Re-run the focused service test**

Run the same command.

- [ ] **Step 5: Commit this guard layer**

```powershell
git -C E:\sdkwork-space\sdkwork-商��� add apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/catalogService.ts
git -C E:\sdkwork-space\sdkwork-商��� commit -m "test: guard product admin service boundary"
```

## Task 2: Add Product Admin View Models And Readiness Logic

**Files:**
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/productAdminTypes.ts`
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/productAdminReadiness.ts`
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/productAdminMapping.ts`
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts`

- [ ] **Step 1: Add failing tests for commercial readiness helpers**

Assert that readiness covers:

- product basics
- leaf category selection
- required category attributes
- structured detail config
- at least one sellable SKU
- SKU number/title/price/fulfillment
- required SKU attributes
- physical inventory/source policy
- store/channel visibility
- price completeness

- [ ] **Step 2: Run the focused test**

Run:

```powershell
pnpm run test:vitest -- apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts
```

Expected: FAIL until helper modules exist.

- [ ] **Step 3: Implement typed view models**

Define local authored types only. Do not duplicate generated DTOs as transport contracts.

Minimum types:

- `ProductDetailConfig`
- `ProductStoreVisibility`
- `ProductInventoryPolicy`
- `ProductCategoryAttributeValue`
- `ProductSkuAttributeValue`
- `ProductReadinessIssue`
- `ProductReadinessReport`
- `CommercialSkuDraft`
- `CommercialProductDraft`

- [ ] **Step 4: Implement readiness and mapping functions**

Create pure functions:

- `evaluateProductReadiness(draft)`
- `isProductPublishable(draft)`
- `normalizeProductDetailConfig(input)`
- `normalizeStoreVisibility(input)`
- `normalizeCategoryAttributeValues(input)`
- `normalizeSkuAttributeValues(input)`
- `buildCommercialProductMetadata(draft)`

- [ ] **Step 5: Run the focused test until it passes**

Run the same command.

- [ ] **Step 6: Commit view-model helpers**

```powershell
git -C E:\sdkwork-space\sdkwork-商��� add apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/productAdminTypes.ts apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/productAdminReadiness.ts apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/productAdminMapping.ts apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts
git -C E:\sdkwork-space\sdkwork-商��� commit -m "feat: add product admin readiness view models"
```

## Task 3: Split Commercial Product Editor Panels

**Files:**
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductDetailConfigPanel.tsx`
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductStoreInventoryPanel.tsx`
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductPublishReadinessPanel.tsx`
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductAttributeValuePanel.tsx`
- Create: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/SkuMatrixCommercialPanel.tsx`
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductCreatePage.tsx`
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts`

- [ ] **Step 1: Add static UI composition tests**

Assert that `ProductCreatePage.tsx` imports and renders the new panels and retains:

- `retrieveCommerceProduct`
- `generateSkuDraftsFromSpecGroups`
- `ensureSkuAttributeDefinitions`
- `submitProductDraft`

- [ ] **Step 2: Run focused tests**

Run:

```powershell
pnpm run test:vitest -- apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts
```

Expected: FAIL until panel files and imports exist.

- [ ] **Step 3: Implement panel components**

Use dense backend-admin UI layout:

- compact section headers
- table-like rows for SKU and attributes
- no marketing hero
- no decorative gradients/orbs
- stable dimensions for matrix/table controls
- accessible labels for interactive controls

- [ ] **Step 4: Wire panels into `ProductCreatePage.tsx`**

Preserve existing draft state and submit behavior. Add panel callbacks around existing `updateDraft` and `updateSkuDrafts` rather than introducing a second state model.

- [ ] **Step 5: Run focused tests**

Run the same focused Vitest command.

- [ ] **Step 6: Commit panel split**

```powershell
git -C E:\sdkwork-space\sdkwork-商��� add apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductCreatePage.tsx apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductDetailConfigPanel.tsx apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductStoreInventoryPanel.tsx apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductPublishReadinessPanel.tsx apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductAttributeValuePanel.tsx apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/SkuMatrixCommercialPanel.tsx apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts
git -C E:\sdkwork-space\sdkwork-商��� commit -m "feat: compose commercial product editor panels"
```

## Task 4: Persist Commercial Detail Through Existing Metadata

**Files:**
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductCreatePage.tsx`
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/productAdminMapping.ts`
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts`

- [ ] **Step 1: Add payload tests**

Assert draft payload includes structured metadata without schema changes:

```ts
expect(payload.metadata.productDetailConfig).toMatchObject({ mainImage: expect.anything() });
expect(payload.metadata.storeVisibility).toMatchObject({ storeIds: expect.any(Array) });
expect(payload.metadata.categoryAttributeValues).toBeDefined();
expect(payload.metadata.publishReadiness).toBeDefined();
```

- [ ] **Step 2: Run focused tests**

Run the focused Vitest command.

- [ ] **Step 3: Map detail/store/attribute/readiness into metadata**

Use validated JSON metadata as the phase-one persistence bridge. Do not introduce `commerce_product_detail_section` or channel visibility tables without approval.

- [ ] **Step 4: Load metadata back into edit draft**

Extend `createProductDraftFromCatalogRecords` to read the metadata shape while keeping compatibility with older product records.

- [ ] **Step 5: Run focused tests**

Run the focused Vitest command.

- [ ] **Step 6: Commit metadata persistence bridge**

```powershell
git -C E:\sdkwork-space\sdkwork-商��� add apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductCreatePage.tsx apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/productAdminMapping.ts apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts
git -C E:\sdkwork-space\sdkwork-商��� commit -m "feat: persist product detail readiness metadata"
```

## Task 5: Polish Product List And SKU Management Commercial Signals

**Files:**
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductListPage.tsx`
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/SkuManagementPage.tsx`
- Modify: `E:/sdkwork-space/sdkwork-商���/apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts`

- [ ] **Step 1: Add static signals tests**

Assert the product list and SKU page expose:

- readiness status
- detail completeness
- store visibility
- SKU attribute status
- inventory/source policy status
- price completeness

- [ ] **Step 2: Run focused tests**

Run the focused Vitest command.

- [ ] **Step 3: Add dense operational signals**

Keep table/list layout compact. Avoid page-level hero sections. Use badges, compact meters, and short field labels.

- [ ] **Step 4: Run focused tests**

Run the focused Vitest command.

- [ ] **Step 5: Commit list and SKU polish**

```powershell
git -C E:\sdkwork-space\sdkwork-商��� add apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/ProductListPage.tsx apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/src/SkuManagementPage.tsx apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts
git -C E:\sdkwork-space\sdkwork-商��� commit -m "feat: show commercial product center signals"
```

## Task 6: Verify Claw Router Wrapper Still Integrates Commerce Product Admin

**Files:**
- Inspect: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/index.tsx`
- Inspect: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts`
- Modify only if needed: `apps/sdkwork-clawrouter-pc/admin-catalog-runtime.test.ts`

- [ ] **Step 1: Check wrapper contract**

Confirm Claw Router still re-exports `sdkwork-商���-pc-admin-product` and does not call Claw Router catalog SDK directly for Commerce product admin UI.

- [ ] **Step 2: Add/update wrapper guard only if needed**

Guard against:

```ts
assert.match(indexSource, /sdkwork-商���-pc-admin-product/);
assert.doesNotMatch(serviceSource, /fetch\s*\(/);
assert.doesNotMatch(serviceSource, /axios/);
```

- [ ] **Step 3: Run Claw Router catalog guard**

Run:

```powershell
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test admin-catalog-runtime.test.ts
```

- [ ] **Step 4: Commit Claw Router wrapper changes only if files changed**

```powershell
git add apps/sdkwork-clawrouter-pc/admin-catalog-runtime.test.ts apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/index.tsx apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts
git commit -m "test: guard commerce product admin wrapper"
```

## Task 7: Contract And Backend Completion After Approval

**Files:**
- Modify only after approval: `E:/sdkwork-space/sdkwork-商���/packages/common/commerce/sdkwork-商���-contracts/src/index.ts`
- Modify only after approval: `E:/sdkwork-space/sdkwork-商���/packages/common/commerce/sdkwork-商���-sdk-ports/src/index.ts`
- Modify only after approval: `E:/sdkwork-space/sdkwork-商���/generated/openapi/commerce-backend-api.openapi.json`
- Regenerate only after approval: `E:/sdkwork-space/sdkwork-商���/sdks/sdkwork-商���-backend-sdk/**`
- Modify only after approval: `E:/sdkwork-space/sdkwork-商���/crates/**`

- [ ] **Step 1: Ask for explicit backend/schema/generated-SDK approval**

Required before any table, migration, or large generated SDK changes.

- [ ] **Step 2: Close contract gaps**

Add approved Commerce backend service methods for:

- attribute value list/create/update/archive
- SKU attribute matrix replace or bulk upsert
- product aggregate retrieve/save
- price list item list/upsert/delete
- product detail section list/replace, if schema is approved
- product publish-readiness validate
- publish lifecycle commands
- inventory adjustment command

- [ ] **Step 3: Regenerate SDKs**

Use the repo's Commerce generation commands and never hand-edit generated output.

- [ ] **Step 4: Update product admin service to use new methods**

Replace metadata bridge behavior with first-class aggregate methods only when the generated service surface exists.

- [ ] **Step 5: Commit backend/API/SDK completion in isolated commits**

Keep contracts, generated SDKs, Rust implementation, and frontend wiring reviewable.

## Task 8: Final Verification And Push

**Files:**
- None unless verification exposes actual gaps.

- [ ] **Step 1: Run focused Commerce product-admin verification**

Run:

```powershell
pnpm run test:vitest -- apps/sdkwork-商���-pc/packages/sdkwork-商���-pc-admin-product/tests/product-admin.service.test.ts
```

- [ ] **Step 2: Run Claw Router wrapper verification**

Run:

```powershell
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test admin-catalog-runtime.test.ts
```

- [ ] **Step 3: Review dirty files before commit**

Run:

```powershell
git -C E:\sdkwork-space\sdkwork-商��� status --short
git -C E:\sdkwork-space\sdkwork-clawrouter status --short
```

Stage only files from this plan. Do not stage unrelated generated SDK/IAM/runtime changes.

- [ ] **Step 4: Push after scoped commits**

Push the branches or `main` only after confirming staged content is scoped and parallel dirty files were not included.

## Review Loop Note

The superpowers plan workflow normally asks for a plan-review subagent. This environment only allows spawning subagents when the user explicitly requests delegation, so this plan uses self-review unless the user authorizes subagents.
