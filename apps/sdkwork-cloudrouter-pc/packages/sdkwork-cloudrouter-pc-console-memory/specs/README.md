# SDKWork Cloud Router Console Memory Component Specs

This directory is the local standards index for `sdkwork-cloudrouter-pc-console-memory`.

Root SDKWork standards remain authoritative. Local component specs can narrow or document this component, but they must not contradict [the root standards](../../../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `sdkwork-cloudrouter-pc-console-memory` |
| Type | `node-package` |
| Root | `sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-console-memory` |
| Domain | `intelligence` |
| Capability | `memory` |
| Languages | `typescript` |
| Status | `ready` |

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
| [GOVERNANCE_SPEC.md](../../../../../../sdkwork-specs/GOVERNANCE_SPEC.md) | Standard ownership, exception, compatibility, and migration rules. |
| [I18N_SPEC.md](../../../../../../sdkwork-specs/I18N_SPEC.md) | User-facing language, locale, message catalog, and fallback rules. |
| [MODULE_SPEC.md](../../../../../../sdkwork-specs/MODULE_SPEC.md) | Reusable package contract and dependency direction. |
| [README.md](../../../../../../sdkwork-specs/README.md) | SDKWork root standards entrypoint. |
| [SDK_SPEC.md](../../../../../../sdkwork-specs/SDK_SPEC.md) | SDK generation and SDK integration rules. |
| [TEST_SPEC.md](../../../../../../sdkwork-specs/TEST_SPEC.md) | Contract, frontend, SDK, security, parity, and documentation verification rules. |

## Public Exports

- `.`

## SDK Clients

- `@sdkwork/memory-app-sdk` — injected through `@sdkwork/cloudroutes-pc-commons/runtime`; this component never constructs the client or its transport.

## Local Extension Specs

- Memory console presentation, module catalog, resource registry, permission hints, and message catalogs are owned by `sdkwork-memory` (`@sdkwork/memory-pc-console-shell` and its dependencies). This component binds the host runtime to that block and owns no Memory UI.
- `src/memoryConsoleRoute.ts` documents the two host-owned configuration points: the console base path (`/console/memory`) and the Memory locale subset with its fallback.

## Verification

- `pnpm --filter @sdkwork/cloudrouter-pc-console-memory typecheck`
- `pnpm --filter @sdkwork/cloudrouter-pc-console-memory test`
