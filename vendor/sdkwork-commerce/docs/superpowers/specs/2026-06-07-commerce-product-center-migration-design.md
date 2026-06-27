# Commerce Product Center Migration Design

## Objective

Migrate the product center ownership from `sdkwork-clawrouter` to `sdkwork-commerce` while keeping the existing Claw Router admin UI visual structure unchanged. Commerce becomes the owner of product catalog backend APIs, backend SDK service methods, the PC admin product package, and exported admin components. Claw Router becomes a consumer that imports Commerce product center components and service boundaries instead of owning product/catalog app-api or backend-api SDK paths.

## Standards

This design follows:

- `../sdkwork-specs/SOUL.md`
- `../sdkwork-specs/MIGRATION_SPEC.md`
- `../sdkwork-specs/API_SPEC.md`
- `../sdkwork-specs/SDK_SPEC.md`
- `../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`
- `../sdkwork-specs/APP_SDK_INTEGRATION_SPEC.md`
- `../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`
- `../sdkwork-specs/BACKEND_UI_SPEC.md`
- `../sdkwork-specs/FRONTEND_SPEC.md`
- `../sdkwork-specs/UI_ARCHITECTURE_SPEC.md`
- `../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`
- `../sdkwork-specs/RUST_CODE_SPEC.md`
- `../sdkwork-specs/WEB_BACKEND_SPEC.md`
- `../sdkwork-specs/TEST_SPEC.md`

## Migration Plan

```yaml
id: MIG-2026-0607-COMMERCE-PRODUCT-CENTER
owner: sdkwork-commerce
status: active
requirement: REQ-2026-0607-COMMERCE-PRODUCT-CENTER
type: mixed
scope:
  producers:
    - sdkwork-commerce/packages/common/commerce/sdkwork-commerce-sdk-ports
    - sdkwork-commerce/packages/common/commerce/sdkwork-commerce-service
    - sdkwork-commerce/apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-admin-product
    - sdkwork-commerce/crates/sdkwork-commerce-api-server
    - sdkwork-commerce/sdks/sdkwork-commerce-backend-sdk
  consumers:
    - sdkwork-clawrouter/apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog
    - sdkwork-clawrouter/apps/sdkwork-clawrouter-pc
compatibility_window:
  starts_at: 2026-06-07
  ends_at: 2026-07-07
strategy: adapter
rollback:
  supported: true
  steps:
    - Keep the Claw Router compatibility package name and restore its previous package dependency graph if Commerce package resolution is blocked.
    - Do not hand-edit generated SDK output; restore generated artifacts by rerunning the owning SDK generator from source contracts.
verification:
  - pnpm test:node
  - pnpm test:vitest
  - pnpm sdk:check
  - pnpm --dir ../sdkwork-clawrouter/apps/sdkwork-clawrouter-pc typecheck
```

## Ownership Boundary

Commerce owns product center capabilities:

- Product/SPU records
- SKU records and multi-spec variants
- Product category tree
- Category attributes and product attribute definitions
- Category seed initialization
- Price lists
- Product center backend SDK service methods
- Product center PC admin UI package

Claw Router must not regenerate product center app-api/backend-api operations as an application-owned API. It can continue to mount product center UI through a compatibility package during the migration window, but that package must delegate to Commerce exports and must not call `getClawRouterBackendSdkClient().commerce.catalog`.

## Frontend Package Design

Create a Commerce PC admin package:

```text
sdkwork-commerce/apps/sdkwork-commerce-pc/
  sdkwork.app.config.json
  packages/
    sdkwork-commerce-pc-admin-product/
      package.json
      specs/
        component.spec.json
        README.md
      src/
        index.tsx
        catalogService.ts
        commerce-admin-primitives.tsx
        commerce-api-result.ts
        ProductListPage.tsx
        ProductCreatePage.tsx
        CategoryManagementPage.tsx
        SkuManagementPage.tsx
        AttributeManagementPage.tsx
      tests/
        product-admin.service.test.ts
```

The public exports include:

- `CatalogAdmin`
- `CommerceProductAdmin`
- product center page components
- existing catalog service function names for compatibility
- `createCommerceProductAdminService`
- `createCommerceProductAdminWorkspaceManifest`

The Claw Router package `sdkwork-clawrouter-pc-admin-catalog` remains as an adapter package and re-exports Commerce product center components. This preserves existing host imports and routes while moving the implementation owner.

## Visual Parity Contract

The Commerce package must preserve the current Claw Router product center page source structure, class names, data attributes, and screen density. The migration does not redesign the UI. Mechanical source migration is allowed, followed only by import and service boundary changes. Static tests assert representative visual markers such as:

- `data-admin-product-list-page`
- `data-admin-category-management-page`
- `data-admin-catalog-attribute-management-page`
- `data-admin-catalog-table-viewport`
- `bg-slate-50`
- `dark:bg-[#0a0a0a]`
- `bg-lobster-600`

## SDK And Service Boundary

Commerce product admin services use `@sdkwork/commerce-service`, which is backed by `@sdkwork/commerce-sdk-ports` and generated Commerce app/backend SDK clients. The PC admin package must not:

- call raw HTTP;
- build manual auth headers;
- construct generated SDK clients directly inside UI components;
- import `sdkwork-clawroutes-pc-commons/runtime`;
- call `getClawRouterBackendSdkClient()`.

Missing generated backend SDK methods are represented first in Commerce method-tree tests, then closed through the Commerce owner contract and generator flow. Generated SDK output is not hand-edited.

## Backend/API Composition

Commerce already exposes most catalog backend routes under `/backend/v3/api/catalog/*`. The migration must close any remaining method gaps required by the existing Claw Router product center workflow:

- `catalog.categorySeeds.create`
- `catalog.categoryAttributes.list`
- `catalog.categoryAttributes.create`
- `catalog.categoryAttributes.update`
- `catalog.categoryAttributes.delete`
- `catalog.products.delete`
- `catalog.skus.delete`

If the Rust route contract is missing a route, Commerce adds it in the owning route manifest/source and regenerates OpenAPI/SDK through Commerce scripts. Claw Router backend route composition can then mount or proxy Commerce-owned Rust service APIs without retaining product center ownership.

## Verification Strategy

The migration is test-first:

1. Add static migration tests in Commerce that fail while the Commerce PC app/product package and Claw Router delegation do not exist.
2. Add Commerce service tests that fail while the Commerce method tree lacks complete catalog admin methods.
3. Add product admin service tests that fail until `createCommerceProductAdminService` calls the Commerce service boundary.
4. Implement the smallest changes needed to pass focused tests.
5. Run broader SDK, UI, and typecheck commands once focused tests pass.

## Review Note

The superpowers plan/spec review loop recommends subagent review, but the available multi-agent tool policy requires explicit user request for delegation. This migration proceeds with inline self-review and focused verification unless the user explicitly asks for subagent delegation.
