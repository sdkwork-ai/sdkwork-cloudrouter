# sdkwork-clawrouter-pc-admin-catalog

Domain: commerce
Capability: product-admin
Package type: node-package
Status: ready

This README is the SDKWork module entrypoint for `sdkwork-clawrouter-pc-admin-catalog`. The machine-readable component contract is `specs/component.spec.json`; canonical standards are under `../../../../../sdkwork-specs/`.

This package is the Claw Router admin adapter for the Commerce-owned product center. It preserves Claw Router admin routes under `/admin/catalog/*` while re-exporting the complete public API from `sdkwork-commerce (deleted)-pc-admin-product`, including product creation/editing, category management, multi-spec SKU management, category/SKU attributes, store visibility, inventory policy, product detail configuration, and publish-readiness helpers.

## Public API

- `src/index.tsx`
- `src/catalogService.ts`

## Required SDK Surface

- No generated SDK client is owned by this adapter.
- Product-center business calls are delegated to `sdkwork-commerce (deleted)-pc-admin-product` and the Commerce service facade.

## Configuration

Configuration keys, runtime entrypoints, and integration contracts are declared in `specs/component.spec.json`. Shared modules must receive configuration through typed bootstrap or service boundaries rather than reading host-local environment state directly.

## SaaS/Private/Local Behavior

This component follows the deployment and runtime rules referenced by its `canonicalSpecs` entries. SaaS, private, and local behavior must stay compatible with the relevant SDKWork specs before implementation changes are made.

## Security

Do not add secrets, live tokens, manual auth headers, app-local credential handling, raw HTTP, or local SDK forks to this module. Protected API and SDK access must stay inside the Commerce-owned product center package or an approved generated-SDK service boundary.

## Extension Points

Extension points are limited to public exports, runtime entrypoints, SDK clients, events, and config keys declared in `specs/component.spec.json`.

## Verification

- `node apps/scripts/validate-component-specs.mjs --apps-root apps --json`

## Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`. Update that contract before changing public integration behavior.
