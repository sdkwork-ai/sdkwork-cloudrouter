# SDKWork CloudRouter Mini Program Component Specs

This directory is the local standards index for `sdkwork-cloudrouter-mini-program`.

Root SDKWork standards remain authoritative. Local component specs can narrow or document this component, but they must not contradict [the root standards](../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `sdkwork-cloudrouter-mini-program` |
| Type | `mini-program-app-root` |
| Root | `sdkwork-cloudrouter/apps/sdkwork-cloudrouter-mini-program` |
| Domain | `platform` |
| Capability | `router` |
| Surface | `console` |
| Languages | `typescript`, `javascript` |
| Status | `standardizing` |

## Contract Manifest

- [component.spec.json](./component.spec.json) is the machine-readable component contract.
- The package family is `mp-core`, `mp-commons`, `mp-shell`, `mp-i18n`, and `mp-console-*`; platform page projection lives in `src/pages/`.
- Generated SDK language outputs are represented at their SDK family root instead of duplicating local specs in generated folders.

## Canonical Specs

| Spec | Applies Because |
| --- | --- |
| [COMPONENT_SPEC.md](../../../../sdkwork-specs/COMPONENT_SPEC.md) | Local component specs directory and manifest rules. |
| [MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md](../../../../sdkwork-specs/MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md) | Mini program root layout, package taxonomy, host adapters, and route projection. |
| [APP_MINI_PROGRAM_UI_SPEC.md](../../../../sdkwork-specs/APP_MINI_PROGRAM_UI_SPEC.md) | Mini program page/component/service split and interaction rules. |
| [APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md](../../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md) | Cross-client package taxonomy and dependency direction. |
| [APP_SDK_INTEGRATION_SPEC.md](../../../../sdkwork-specs/APP_SDK_INTEGRATION_SPEC.md) | Generated app SDK and console port wiring. |
| [FRONTEND_SPEC.md](../../../../sdkwork-specs/FRONTEND_SPEC.md) | UI, service, SDK, and accessibility rules. |
| [MODULE_SPEC.md](../../../../sdkwork-specs/MODULE_SPEC.md) | Reusable package contract for the `mp-*` family. |
| [CODE_STYLE_SPEC.md](../../../../sdkwork-specs/CODE_STYLE_SPEC.md) | Common code style and build source integrity. |
| [NAMING_SPEC.md](../../../../sdkwork-specs/NAMING_SPEC.md) | Package, page, and route naming. |
| [TEST_SPEC.md](../../../../sdkwork-specs/TEST_SPEC.md) | Surface contract verification rules. |

## Public Exports

- `src/app.js`

## Runtime Configuration

- Runtime env profiles: `config/mini-program/runtime-env.<deployment-profile>.<environment>.json`.
- Deployment index: `etc/sdkwork.deployment.config.json` (`kind = sdkwork.component-deployment`).
- Host packaging metadata: `config/host/`.
- Generated runtime bundle: `src/runtime/` via `node scripts/build-runtime.mjs`.

## Local Extension Specs

- No local extension specs are declared yet.

## Verification

- `pnpm typecheck`
- `node --test tests/mini-program-surface-contract.test.mjs`
- `pnpm check`
