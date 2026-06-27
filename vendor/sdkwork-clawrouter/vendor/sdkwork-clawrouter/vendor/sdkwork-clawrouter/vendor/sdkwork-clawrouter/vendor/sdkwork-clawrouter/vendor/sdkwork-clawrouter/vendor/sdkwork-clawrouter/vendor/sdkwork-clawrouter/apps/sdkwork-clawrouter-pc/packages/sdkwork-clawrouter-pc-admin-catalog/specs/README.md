# SDKWork Claw Router Admin Product Center Component Specs

This directory is the local standards index for `sdkwork-clawrouter-pc-admin-catalog`.

Root SDKWork standards remain authoritative. Local component specs can narrow or document this component, but they must not contradict [the root standards](../../../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `sdkwork-clawrouter-pc-admin-catalog` |
| Type | `node-package` |
| Root | `sdkwork-claw-router/apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog` |
| Domain | `commerce` |
| Capability | `product-admin` |
| Languages | `javascript, typescript` |
| Status | `ready` |

This package is a Claw Router admin adapter. The Commerce-owned implementation and product-center service facade live in `sdkwork-commerce-pc-admin-product`; this package preserves Claw Router route/package imports and re-exports the Commerce public API.

## Contract Manifest

- [component.spec.json](./component.spec.json) is the machine-readable component contract.
- Consumers should integrate through public exports, runtime entrypoints, SDK clients, or adapters declared in the manifest.
- Generated SDK language outputs are represented at their SDK family root instead of duplicating local specs in generated folders.

## Canonical Specs

| Spec | Applies Because |
| --- | --- |
| [COMPONENT_SPEC.md](../../../../../../sdkwork-specs/COMPONENT_SPEC.md) | Local component specs directory and manifest rules. |
| [CONFIG_SPEC.md](../../../../../../sdkwork-specs/CONFIG_SPEC.md) | Runtime configuration, environment, SDK bootstrap, and feature flag rules. |
| [DOCUMENTATION_SPEC.md](../../../../../../sdkwork-specs/DOCUMENTATION_SPEC.md) | Module README, examples, ADR, changelog, and runbook rules. |
| [DOMAIN_SPEC.md](../../../../../../sdkwork-specs/DOMAIN_SPEC.md) | Canonical domain ownership and naming. |
| [FRONTEND_SPEC.md](../../../../../../sdkwork-specs/FRONTEND_SPEC.md) | UI, service, SDK, accessibility, and frontend runtime rules. |
| [UI_ARCHITECTURE_SPEC.md](../../../../../../sdkwork-specs/UI_ARCHITECTURE_SPEC.md) | UI architecture, package placement, and SDK surface selection. |
| [APP_PC_ARCHITECTURE_SPEC.md](../../../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md) | PC admin route/package composition rules. |
| [BACKEND_UI_SPEC.md](../../../../../../sdkwork-specs/BACKEND_UI_SPEC.md) | Backend-admin product center UI layering and SDK rules. |
| [GOVERNANCE_SPEC.md](../../../../../../sdkwork-specs/GOVERNANCE_SPEC.md) | Standard ownership, exception, compatibility, and migration rules. |
| [I18N_SPEC.md](../../../../../../sdkwork-specs/I18N_SPEC.md) | User-facing language, locale, message catalog, and fallback rules. |
| [MODULE_SPEC.md](../../../../../../sdkwork-specs/MODULE_SPEC.md) | Reusable package contract and dependency direction. |
| [README.md](../../../../../../sdkwork-specs/README.md) | SDKWork root standards entrypoint. |
| [SDK_SPEC.md](../../../../../../sdkwork-specs/SDK_SPEC.md) | SDK generation and SDK integration rules. |
| [TEST_SPEC.md](../../../../../../sdkwork-specs/TEST_SPEC.md) | Contract, frontend, SDK, security, parity, and documentation verification rules. |

## Public Exports

- `src/index.tsx`
- `src/catalogService.ts`

## SDK Clients

- No generated SDK client class is declared at this component boundary.
- Commerce product center API access is delegated to `sdkwork-commerce-pc-admin-product` and its Commerce service facade.

## Local Extension Specs

- No local extension specs are declared yet.

## Verification

- `node apps/scripts/validate-component-specs.mjs --apps-root apps --json`
