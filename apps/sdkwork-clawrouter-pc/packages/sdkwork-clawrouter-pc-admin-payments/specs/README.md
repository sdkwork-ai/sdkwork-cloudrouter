# SDKWork Claw Router Admin Payments Component Specs

This directory is the local standards index for `sdkwork-clawrouter-pc-admin-payments`.

Root SDKWork standards remain authoritative. Local component specs can narrow or document this component, but they must not contradict [the root standards](../../../../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `sdkwork-clawrouter-pc-admin-payments` |
| Type | `react-package` |
| Root | `sdkwork-clawrouter/apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-payments` |
| Domain | `payment` |
| Capability | `payment` |
| Languages | `javascript`, `typescript` |
| Status | `standardizing` |

## Contract Manifest

- [component.spec.json](./component.spec.json) is the machine-readable component contract.
- Consumers should integrate through public exports, runtime entrypoints, SDK clients, or adapters declared in the manifest.
- Generated SDK language outputs are represented at their SDK family root instead of duplicating local specs in generated folders.

## Canonical Specs

| Spec | Applies Because |
| --- | --- |
| [COMPONENT_SPEC.md](../../../../../../../sdkwork-specs/COMPONENT_SPEC.md) | Local component specs directory and manifest rules. |
| [CONFIG_SPEC.md](../../../../../../../sdkwork-specs/CONFIG_SPEC.md) | Runtime configuration, environment, SDK bootstrap, and feature flag rules. |
| [DOCUMENTATION_SPEC.md](../../../../../../../sdkwork-specs/DOCUMENTATION_SPEC.md) | Module README, examples, ADR, changelog, and runbook rules. |
| [DOMAIN_SPEC.md](../../../../../../../sdkwork-specs/DOMAIN_SPEC.md) | Canonical domain ownership and naming. |
| [FRONTEND_SPEC.md](../../../../../../../sdkwork-specs/FRONTEND_SPEC.md) | UI, service, SDK, accessibility, and frontend runtime rules. |
| [GOVERNANCE_SPEC.md](../../../../../../../sdkwork-specs/GOVERNANCE_SPEC.md) | Standard ownership, exception, compatibility, and migration rules. |
| [I18N_SPEC.md](../../../../../../../sdkwork-specs/I18N_SPEC.md) | User-facing language, locale, message catalog, and fallback rules. |
| [MODULE_SPEC.md](../../../../../../../sdkwork-specs/MODULE_SPEC.md) | Reusable package contract and dependency direction. |
| [PERFORMANCE_SPEC.md](../../../../../../../sdkwork-specs/PERFORMANCE_SPEC.md) | Latency, pagination, bundle, scalability, and retry budget rules. |
| [PRIVACY_SPEC.md](../../../../../../../sdkwork-specs/PRIVACY_SPEC.md) | Personal, tenant, sensitive, and regulated data rules. |
| [README.md](../../../../../../../sdkwork-specs/README.md) | SDKWork root standards entrypoint. |
| [SDK_SPEC.md](../../../../../../../sdkwork-specs/SDK_SPEC.md) | SDK generation and SDK integration rules. |
| [SECURITY_SPEC.md](../../../../../../../sdkwork-specs/SECURITY_SPEC.md) | Secure auth, token, secrets, CORS, validation, and logging rules. |
| [TEST_SPEC.md](../../../../../../../sdkwork-specs/TEST_SPEC.md) | Contract, frontend, SDK, security, parity, and documentation verification rules. |

## Public Exports

- `src/index.tsx`

## SDK Clients

- `@sdkwork/payment-backend-sdk` through the injected Payment backend service.
- `@sdkwork/clawrouter-backend-sdk` for Claw Router-owned payment extensions.

The provider-account surface composes the public
`@sdkwork/payment-pc-admin-provider` package. It does not copy Payment DTOs,
credential forms, transports, or generated SDK code into Claw Router.

## Local Extension Specs

- No local extension specs are declared yet.

## Verification

- `node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root .`
