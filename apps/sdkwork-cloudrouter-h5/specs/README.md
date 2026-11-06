# SDKWork CloudRouter H5 Component Specs

This directory is the local standards index for `sdkwork-cloudrouter-h5`.

Root SDKWork standards remain authoritative. Local component specs can narrow or document this component, but they must not contradict [the root standards](../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `sdkwork-cloudrouter-h5` |
| Type | `h5-app-root` |
| Root | `sdkwork-cloudrouter/apps/sdkwork-cloudrouter-h5` |
| Domain | `platform` |
| Capability | `router` |
| Surface | `console` |
| Languages | `typescript`, `react` |
| Status | `standardizing` |

## Contract Manifest

- [component.spec.json](./component.spec.json) is the machine-readable component contract.
- Consumers integrate through the root entrypoints declared in `contracts.publicExports` and through the package family `h5-core`, `h5-commons`, `h5-shell`, `h5-i18n`, and `h5-console-*`.
- Generated SDK language outputs are represented at their SDK family root instead of duplicating local specs in generated folders.

## Canonical Specs

| Spec | Applies Because |
| --- | --- |
| [APP_H5_ARCHITECTURE_SPEC.md](../../../../sdkwork-specs/APP_H5_ARCHITECTURE_SPEC.md) | H5 application root architecture and mobile host profile. |
| [APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md](../../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md) | Cross-client package taxonomy, dependency direction, and route identity. |
| [APP_COMPOSITION_SPEC.md](../../../../sdkwork-specs/APP_COMPOSITION_SPEC.md) | Native-authority application composition and core package entrypoints. |
| [APP_SDK_INTEGRATION_SPEC.md](../../../../sdkwork-specs/APP_SDK_INTEGRATION_SPEC.md) | Generated app SDK, IAM runtime, and TokenManager wiring. |
| [CODE_STYLE_SPEC.md](../../../../sdkwork-specs/CODE_STYLE_SPEC.md) | Common code style and build source integrity. |
| [NAMING_SPEC.md](../../../../sdkwork-specs/NAMING_SPEC.md) | Package, component, and route naming. |

## Public Exports

- `src/main.tsx`
- `src/App.tsx`
- `src/AuthGate.tsx`

## Runtime Configuration

- Profile sources: `etc/browser/runtime-env.<deployment-profile>.<environment>.json`.
- Deployment index: `etc/sdkwork.deployment.config.json` (`kind = sdkwork.component-deployment`).
- Materialized browser document: `public/runtime-env.json` via `pnpm workflow:materialize-client-env`.
- Host-specific additions: `config/host/`.

## Local Extension Specs

- No local extension specs are declared yet.

## Verification

- `pnpm typecheck`
- `pnpm test`
- `pnpm check`
