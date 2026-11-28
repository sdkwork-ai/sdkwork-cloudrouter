# sdkwork-cloudrouter-pc-admin-collection

Domain: platform
Capability: router
Package type: node-package
Status: standardizing

This README is the SDKWork module entrypoint for `sdkwork-cloudrouter-pc-admin-collection`. The machine-readable component contract is `specs/component.spec.json`; canonical standards are under `../../../../../sdkwork-specs/`.

The package owns the admin console for AI capability collections (合集):

- `/admin/collection` — capability collection list, metadata editor, ordered item editor, publish/archive status changes, and publish release history.
- `/admin/collection/categories` — collection category management (create, edit, delete, and standard-category initialization).

## Public API

- `src/index.tsx` exports `CollectionsAdminPage` and `CollectionCategoriesAdminPage`.

## Required SDK Surface

- `@sdkwork/cloudrouter-backend-sdk` through `getCloudRouterBackendSdkClient()` from
  `@sdkwork/cloudroutes-pc-commons/sdk-clients`:
  `ai.collectionCategories.*`, `ai.collections.*`, `ai.collections.items.update`,
  `ai.collections.status.update`, and `ai.collections.releases.list`.

## Configuration

Configuration keys, runtime entrypoints, and integration contracts are declared in `specs/component.spec.json`. Shared modules must receive configuration through typed bootstrap or service boundaries rather than reading host-local environment state directly.

## SaaS/Private/Local Behavior

This component follows the deployment and runtime rules referenced by its `canonicalSpecs` entries. SaaS, private, and local behavior must stay compatible with the relevant SDKWork specs before implementation changes are made.

## Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module. Protected API and SDK access must go through the generated `@sdkwork/cloudrouter-backend-sdk` client owned by the service boundary (`src/collectionService.ts`).

## Extension Points

Extension points are limited to public exports, runtime entrypoints, SDK clients, events, and config keys declared in `specs/component.spec.json`.

## Verification

- `node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root .`
- `node --import tsx --import ./scripts/css-stub-loader.mjs --test admin-collection-runtime.test.ts` (from `apps/sdkwork-cloudrouter-pc`)
- `npx vitest run admin-collection.dom.test.tsx --config vite.config.ts --configLoader native --pool vmThreads --mode standalone.test` (from `apps/sdkwork-cloudrouter-pc`)

## Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`. Update that contract before changing public integration behavior.
