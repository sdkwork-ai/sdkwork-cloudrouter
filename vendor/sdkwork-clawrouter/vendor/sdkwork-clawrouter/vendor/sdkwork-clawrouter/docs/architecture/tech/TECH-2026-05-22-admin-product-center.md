> Migrated from `docs/superpowers/plans/2026-05-22-admin-product-center.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Admin Product Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current catalog and inventory admin screens into a professional Product Center that supports category management, SPU/SKU editing, attributes, pricing, stock operations, and publication workflows on the standard appbase commerce schema.

**Architecture:** Keep the current bounded-context split between catalog and inventory, but upgrade the UI from a generic resource browser into dedicated workspaces. Add the missing backend contract and store behavior first, regenerate the backend SDK, then wire richer frontend workspace components through the existing backend SDK boundary. Treat publication and stock adjustment as explicit command flows with audit and idempotency, not as hidden partial updates.

**Tech Stack:** Rust, TypeScript, React, Vite, generated `@sdkwork/clawrouter-backend-sdk`, OpenAPI generation, schema registry YAML, Rust SQL stores, and the existing `commerce_*` appbase schema.

---

## Scope Boundaries

This plan is intentionally focused on the admin Product Center only:

- In scope: catalog detail flows, category tree operations, SPU/SKU workflows, attribute management, price list item management, stock operations, inventory ledger visibility, publication state transitions, and professional admin workspace layout.
- In scope: backend contract gaps that block the product workspace, including detail endpoints and command endpoints required by the UI.
- In scope: frontend service normalization, state mapping, product workspace components, and runtime tests.
- In scope: contract/SDK regeneration and the associated guards that keep admin calls on `@sdkwork/clawrouter-backend-sdk`.
- Out of scope: new product-domain tables unless the spec explicitly marks them as an approved schema change.
- Out of scope: rewriting unrelated admin modules, changing the global shell layout, or touching app/console product flows that are already correct.

## File Structure

The plan is organized so each file has one clear responsibility.

Modify these backend contract and runtime files first:

- Modify `generated/openapi/clawrouter-backend-openapi.json`
  - Add the missing product-center operation metadata and request/response schemas.
- Modify `sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/src/api/commerce.ts`
  - Regenerated output only; do not hand edit. Verify the new `commerce.catalog` and `commerce.inventory` methods exist.
- Modify `sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/src/types/*`
  - Regenerated output only; verify the new contract types exist.
- Modify `services/sdkwork-clawrouter-router-service/src/api/mod.rs`
  - Register any new product-center API modules.
- Create or modify `services/sdkwork-clawrouter-router-service/src/api/admin_catalog.rs`
  - Host catalog detail and command endpoints that are not already covered by the generic list/update handlers.
- Create or modify `services/sdkwork-clawrouter-router-service/src/api/admin_inventory.rs`
  - Host inventory adjustment and inventory workflow endpoints.
- Create or modify `services/sdkwork-clawrouter-router-service/src/ports/admin_catalog_store.rs`
  - Define the store trait for catalog detail and command operations.
- Create or modify `services/sdkwork-clawrouter-router-service/src/ports/admin_inventory_store.rs`
  - Define the store trait for stock adjustment and inventory workflow operations.
- Create or modify `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sql_admin_catalog.rs`
  - Shared SQL helpers for catalog operations.
- Create or modify `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sql_admin_inventory.rs`
  - Shared SQL helpers for inventory operations.
- Create or modify `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_catalog_store.rs`
  - SQLite implementation of the catalog store contract.
- Create or modify `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_catalog_store.rs`
  - Postgres implementation of the catalog store contract.
- Create or modify `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_inventory_store.rs`
  - SQLite implementation of the inventory store contract.
- Create or modify `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_inventory_store.rs`
  - Postgres implementation of the inventory store contract.
- Create or modify `services/sdkwork-clawrouter-router-service/tests/admin_catalog_api.rs`
  - API tests for catalog read/detail/command behavior.
- Create or modify `services/sdkwork-clawrouter-router-service/tests/admin_inventory_api.rs`
  - API tests for inventory adjustment and ledger behavior.
- Create or modify `services/sdkwork-clawrouter-router-service/tests/admin_catalog_store_sql_contract.rs`
  - Contract tests for catalog store behavior.
- Create or modify `services/sdkwork-clawrouter-router-service/tests/admin_inventory_store_sql_contract.rs`
  - Contract tests for inventory store behavior.

Modify these frontend product-center files next:

- Modify `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/index.tsx`
- Modify `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogTypes.ts`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/ProductCenterShell.tsx`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/ProductsWorkspace.tsx`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/ProductEditorDrawer.tsx`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/ProductSkuMatrix.tsx`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/CategoryTreePanel.tsx`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/AttributeLibraryPanel.tsx`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/PriceListWorkspace.tsx`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/PublicationPanel.tsx`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/ProductAuditPanel.tsx`
- Modify `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/index.tsx`
- Modify `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/inventoryService.ts`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/inventoryTypes.ts`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/InventoryWorkspace.tsx`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/StockDashboard.tsx`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/StockAdjustmentDrawer.tsx`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/ReservationMonitor.tsx`
- Create `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/InventoryLedgerTimeline.tsx`
- Modify `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/index.ts`
  - Replace the generic catalog/inventory copy with product-center oriented copy for the workspace.
- Modify `apps/sdkwork-clawrouter-pc/src/App.tsx`
  - Keep the current routes, but point them to the upgraded workspaces and add detail routes only if the drawer pattern becomes too constrained.

## Task 1: Lock The Backend Contract Gaps

**Files:**
- Modify: `generated/openapi/clawrouter-backend-openapi.json`
- Modify: `sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/src/api/commerce.ts`
- Modify: `sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/src/types/*`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/mod.rs`
- Create or modify: `services/sdkwork-clawrouter-router-service/src/api/admin_catalog.rs`
- Create or modify: `services/sdkwork-clawrouter-router-service/src/api/admin_inventory.rs`
- Create or modify: `services/sdkwork-clawrouter-router-service/tests/admin_catalog_api.rs`
- Create or modify: `services/sdkwork-clawrouter-router-service/tests/admin_inventory_api.rs`

- [ ] **Step 1: Write failing contract tests**

Add Rust and contract assertions that fail until the new product-center operations exist.

Examples:

```rust
assert!(operation_ids.contains(&"catalog.products.retrieve"));
assert!(operation_ids.contains(&"catalog.skus.retrieve"));
assert!(operation_ids.contains(&"catalog.priceLists.items.list"));
assert!(operation_ids.contains(&"catalog.products.submitReview"));
assert!(operation_ids.contains(&"inventory.stocks.adjust"));
```

- [ ] **Step 2: Run the contract tests and confirm they fail**

Run:

```powershell
cargo test -p sdkwork-clawrouter-router-service admin_catalog_api -- --nocapture
cargo test -p sdkwork-clawrouter-router-service admin_inventory_api -- --nocapture
python -B -m tools.clawrouter_openapi_generator
node sdks\clawrouter-backend-sdk\bin\generate-sdk.mjs --language typescript
```

Expected: the tests fail until the new operations and types are added to the backend contract surface.

- [ ] **Step 3: Implement the minimal backend contract and store behavior**

Add the smallest set of endpoints needed by the product workspace:

- detail retrieval for category, product, and SKU
- SKU attribute matrix read/replace support
- price list item read/update support
- media list/update support if the current contract does not already cover it
- publication commands and stock adjustment commands where required by the UI

Keep the store layer ledger-first for inventory and explicit state transitions for publication.

- [ ] **Step 4: Run the contract tests and confirm they pass**

Run the same commands again, plus the root guard:

```powershell
python -B -m tools.clawrouter_sdk_guardian
```

Expected: the backend contract and SDK surface expose the new product-center operations without raw HTTP fallbacks.

- [ ] **Step 5: Commit the contract layer**

Commit only the backend contract, store, and generated SDK changes for this task.

## Task 2: Build The Product Workspace Shell

**Files:**
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/index.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogTypes.ts`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/ProductCenterShell.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/ProductsWorkspace.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/ProductEditorDrawer.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/ProductAuditPanel.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/index.ts`
- Test: `apps/sdkwork-clawrouter-pc/admin-catalog-runtime.test.ts`

- [ ] **Step 1: Write failing frontend service/runtime tests**

Add tests that fail until the catalog workspace exposes product detail, edit, publish, and audit behavior through the generated backend SDK boundary.

Examples:

```ts
assert.match(source, /getClawRouterBackendSdkClient\(\)\.commerce\.catalog\.products\.retrieve/);
assert.match(source, /getClawRouterBackendSdkClient\(\)\.commerce\.catalog\.products\.submitReview/);
assert.match(source, /getClawRouterBackendSdkClient\(\)\.commerce\.catalog\.products\.publish/);
```

- [ ] **Step 2: Run the frontend tests and confirm they fail**

Run:

```powershell
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test admin-catalog-runtime.test.ts
```

Expected: the tests fail because the new workspace files and service calls do not exist yet.

- [ ] **Step 3: Implement the product workspace shell**

Create a dedicated workspace with these panels:

- product list and filters
- product detail drawer
- audit panel
- publication actions

Keep the first screen operational and data-dense. Do not turn it into a marketing page or an oversized hero.

- [ ] **Step 4: Run the frontend tests and confirm they pass**

Run the same `tsx --test` command again.

Expected: the new workspace renders through the backend SDK boundary and the tests capture the expected generated SDK calls.

- [ ] **Step 5: Commit the shell**

Commit the product workspace shell and its runtime tests.

## Task 3: Add Category, Attribute, And SKU Matrix Operations

**Files:**
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/CategoryTreePanel.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/AttributeLibraryPanel.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/ProductSkuMatrix.tsx`
- Create: `services/sdkwork-clawrouter-router-service/tests/admin_catalog_store_sql_contract.rs`

- [ ] **Step 1: Write the failing tests**

Add tests for:

- category tree loading and mutation
- attribute list and attribute value normalization
- SKU attribute matrix read and replace behavior

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```powershell
cargo test -p sdkwork-clawrouter-router-service admin_catalog_store_sql_contract -- --nocapture
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test admin-catalog-runtime.test.ts
```

- [ ] **Step 3: Implement the minimal category, attribute, and SKU matrix logic**

Use the existing `commerce.catalog` SDK contract where possible. If a method is missing, finish the backend contract first and regenerate the SDK before wiring the view.

- [ ] **Step 4: Run the tests and confirm they pass**

Run the same commands again.

- [ ] **Step 5: Commit the category/attribute/SKU work**

Commit only these domain changes.

## Task 4: Add Price List And Publication Workflow Operations

**Files:**
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/catalogService.ts`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/PriceListWorkspace.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog/src/PublicationPanel.tsx`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/admin_catalog.rs`
- Modify: `services/sdkwork-clawrouter-router-service/tests/admin_catalog_api.rs`

- [ ] **Step 1: Write failing tests for price and publication actions**

Add assertions for:

- price list item visibility and edit paths
- publication action availability by status
- publish/unpublish/reject behavior

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```powershell
cargo test -p sdkwork-clawrouter-router-service admin_catalog_api -- --nocapture
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test admin-catalog-runtime.test.ts
```

- [ ] **Step 3: Implement the minimal workflow commands**

Wire the product publication workflow to explicit state transitions and audit logs. Keep the UI from allowing actions that the current status does not permit.

- [ ] **Step 4: Run the tests and confirm they pass**

Run the same commands again.

- [ ] **Step 5: Commit the pricing and publication work**

Commit the workflow-focused changes together so the state machine stays coherent.

## Task 5: Build The Inventory Workspace

**Files:**
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/index.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/inventoryService.ts`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/inventoryTypes.ts`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/InventoryWorkspace.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/StockDashboard.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/StockAdjustmentDrawer.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/ReservationMonitor.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory/src/InventoryLedgerTimeline.tsx`
- Create: `services/sdkwork-clawrouter-router-service/tests/admin_inventory_store_sql_contract.rs`

- [ ] **Step 1: Write failing tests**

Add tests for:

- stock list normalization
- stock adjustment command behavior
- reservation and ledger visibility
- optimistic version handling

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```powershell
cargo test -p sdkwork-clawrouter-router-service admin_inventory_store_sql_contract -- --nocapture
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test admin-inventory-runtime.test.ts
```

- [ ] **Step 3: Implement the inventory workspace**

Present stock state by SKU and warehouse, expose adjustment commands, and keep ledger evidence visible. Do not hide a stock write behind a plain edit form.

- [ ] **Step 4: Run the tests and confirm they pass**

Run the same commands again.

- [ ] **Step 5: Commit the inventory workspace**

Commit the inventory work separately from catalog so the boundaries stay clear.

## Task 6: Update Copy, Routes, And Final Guards

**Files:**
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-i18n/src/index.ts`
- Modify: `apps/sdkwork-clawrouter-pc/src/App.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/commerce-business-runtime.test.ts`
- Modify: `apps/sdkwork-clawrouter-pc/admin-catalog-runtime.test.ts`
- Modify: `apps/sdkwork-clawrouter-pc/admin-inventory-runtime.test.ts`

- [ ] **Step 1: Add the failing route and copy tests**

Assert that the admin shell still routes through `/admin/catalog/*` and `/admin/inventory/*`, but now renders the upgraded workspaces and not the generic list-only experience.

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```powershell
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test commerce-business-runtime.test.ts
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test admin-catalog-runtime.test.ts
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test admin-inventory-runtime.test.ts
```

- [ ] **Step 3: Update the user-facing copy and route wiring**

Make the sidebar and i18n copy describe the professional Product Center, inventory workspace, and publication workflow accurately.

- [ ] **Step 4: Run the tests and confirm they pass**

Re-run the three frontend test files and the SDK guard.

- [ ] **Step 5: Commit the final UI wiring**

Commit the route and copy changes as the final product-center layer.

## Task 7: Run The Final Verification Set

**Files:**
- None expected, unless tests expose an actual gap.

- [ ] **Step 1: Run backend and SDK verification**

Run:

```powershell
python -B -m tools.api_contract_manifest
python -B -m tools.clawrouter_openapi_generator
node sdks\clawrouter-backend-sdk\bin\generate-sdk.mjs --language typescript
python -B -m tools.clawrouter_sdk_guardian
python -B -m tools.schema_quality_gate
```

- [ ] **Step 2: Run frontend runtime verification**

Run:

```powershell
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test admin-catalog-runtime.test.ts
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test admin-inventory-runtime.test.ts
pnpm --dir apps\sdkwork-clawrouter-pc exec tsx --test commerce-business-runtime.test.ts
```

- [ ] **Step 3: Verify the admin experience manually**

Check the product workspace for:

- dense working layout
- correct state badges
- publication actions hidden when invalid
- stock adjustment guarded by reason and version
- no raw HTTP fallback paths

- [ ] **Step 4: Commit or prepare merge**

Only mark the work done after the contract, stores, SDK, runtime tests, and workspace behavior all line up.

## Notes For Implementers

- If a backend SDK method is missing, close the contract first and regenerate the SDK. Do not add portal-side HTTP fallbacks.
- If a schema change becomes necessary, stop and get explicit approval before editing tables, columns, indexes, or migrations.
- Keep the generic `AdminResourceCenter` only if it still helps after the workspace upgrade. If it becomes the wrong abstraction, replace it locally in the product-center packages rather than forcing everything through it.
- The recommended implementation path is small, explicit, and incremental. Do not attempt to solve catalog, inventory, pricing, and publication in one giant edit.

