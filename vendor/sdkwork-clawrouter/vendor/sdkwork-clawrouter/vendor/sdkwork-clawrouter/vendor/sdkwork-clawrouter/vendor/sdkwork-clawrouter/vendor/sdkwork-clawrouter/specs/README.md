# SDKWork Claw Router Component Specs

This directory is the local standards index for `sdkwork-clawrouter`.

Root SDKWork standards remain authoritative. Local component specs can narrow or document this component, but they must not contradict [the root standards](../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `sdkwork-clawrouter` |
| Type | `app` |
| Root | `sdkwork-clawrouter` |
| Domain | `platform` |
| Capability | `router` |
| Languages | `javascript, rust` |
| Status | `ACTIVE` |

## Application Environment Profiles

- [application-env-standard.md](./application-env-standard.md) defines profile file naming (`.env.{profile}` without `.local`), runtime roots, merge rules, framework mapping, and `SDKWORK_ACCESS_TOKEN` bootstrap rules.
- Verification: `pnpm check:application-env` and `node scripts/ensure-claw-router-env.mjs --lifecycle all`.

## Contract Manifest

- [component.spec.json](./component.spec.json) is the machine-readable component contract.
- [dependency-api-surfaces.json](./dependency-api-surfaces.json) records dependency SDK runtime API
  surface imports, Rust backend route-contract exports, same-origin mount coverage, and explicit
  external-service base URL requirements.
- Shared foundation and default client API composition targets `sdkwork-api-cloud-gateway` through the
  existing `PORTAL_PUBLIC_SDK_BASE_URL` common SDK root and Cargo workspace/feature evidence. Do
  not add a standalone gateway catalog for Claw Router dependency API facts.
- Product API authorities remain owned by Claw Router. Integrated development
  (`pnpm dev`, aliases `pnpm dev` and `pnpm dev:server`) starts the
  topology-aware product server. Gateway-backed desktop commands
  (`pnpm dev:desktop`, `pnpm dev:desktop`, `pnpm dev:desktop`) expose
  app/backend/open surfaces through `sdkwork-api-cloud-gateway`. Product-local
  app/admin routers are for Claw Router-owned contracts and explicit server
  debugging only;
  dependency app/backend routes default to `404` locally and are consumed through the shared
  gateway or explicit split-deployment base URLs.
- Repository layout follows `SDKWORK_WORKSPACE_SPEC.md`: authored API inputs belong in `apis/`,
  Rust route crates belong in `crates/sdkwork-routes-<capability>-<surface>/`, generated SDK
  family workspaces belong in `sdks/`, and top-level `packages/` is limited to governed shared
  TypeScript or React package families.
- Consumers should integrate through public exports, runtime entrypoints, SDK clients, or adapters declared in the manifest.
- Generated SDK language outputs are represented at their SDK family root instead of duplicating local specs in generated folders.

## Canonical Specs

| Spec | Applies Because |
| --- | --- |
| [APP_MANIFEST_SPEC.md](../../sdkwork-specs/APP_MANIFEST_SPEC.md) | sdkwork.app.config.json application registration rules. |
| [APPLICATION_SPEC.md](../../sdkwork-specs/APPLICATION_SPEC.md) | Application shell and module composition. |
| [COMPONENT_SPEC.md](../../sdkwork-specs/COMPONENT_SPEC.md) | Local component specs directory and manifest rules. |
| [CONFIG_SPEC.md](../../sdkwork-specs/CONFIG_SPEC.md) | Runtime configuration, environment, SDK bootstrap, and feature flag rules. |
| [DEPENDENCY_MANAGEMENT_SPEC.md](../../sdkwork-specs/DEPENDENCY_MANAGEMENT_SPEC.md) | Source/build dependency paths, local dev materialization, release Git dependency checkout, and cross-platform path rules. |
| [DEPLOYMENT_SPEC.md](../../sdkwork-specs/DEPLOYMENT_SPEC.md) | SaaS/private/local runtime parity and deployment rules. |
| [DOCUMENTATION_SPEC.md](../../sdkwork-specs/DOCUMENTATION_SPEC.md) | Module README, examples, ADR, changelog, and runbook rules. |
| [DOMAIN_SPEC.md](../../sdkwork-specs/DOMAIN_SPEC.md) | Canonical domain ownership and naming. |
| [FRONTEND_SPEC.md](../../sdkwork-specs/FRONTEND_SPEC.md) | UI, service, SDK, accessibility, and frontend runtime rules. |
| [GOVERNANCE_SPEC.md](../../sdkwork-specs/GOVERNANCE_SPEC.md) | Standard ownership, exception, compatibility, and migration rules. |
| [I18N_SPEC.md](../../sdkwork-specs/I18N_SPEC.md) | User-facing language, locale, message catalog, and fallback rules. |
| [MODULE_SPEC.md](../../sdkwork-specs/MODULE_SPEC.md) | Reusable package contract and dependency direction. |
| [README.md](../../sdkwork-specs/README.md) | SDKWork root standards entrypoint. |
| [SDK_SPEC.md](../../sdkwork-specs/SDK_SPEC.md) | SDK generation and SDK integration rules. |
| [SDKWORK_WORKSPACE_SPEC.md](../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md) | Standard project root directories and `.sdkwork/` metadata rules. |
| [TEST_SPEC.md](../../sdkwork-specs/TEST_SPEC.md) | Contract, frontend, SDK, security, parity, and documentation verification rules. |

## Public Exports

- Public exports are not declared in the package manifest.

## SDK Clients

- No generated SDK client class is declared at this component boundary.

## Local Extension Specs

- [API_SPEC.md](./API_SPEC.md)
- [DATABASE_SPEC.md](./DATABASE_SPEC.md)
- [dependency-api-surfaces.json](./dependency-api-surfaces.json)
- [topology.spec.json](./topology.spec.json) — v2 runtime topology authority (`@sdkwork/app-topology`)

## Runtime Topology

- Platform standard: [APP_RUNTIME_TOPOLOGY_SPEC.md](../../sdkwork-specs/APP_RUNTIME_TOPOLOGY_SPEC.md)
- Adoption guide: [APP_RUNTIME_TOPOLOGY_ADOPTION.md](../../sdkwork-specs/APP_RUNTIME_TOPOLOGY_ADOPTION.md)
- Human summary: [docs/topology-standard.md](../docs/topology-standard.md)
- Profile env: [configs/topology/](../configs/topology/)
- Default dev profile: `standalone.unified-process.development`
- Canonical dev entry: `pnpm dev`
- Split-services validation: `pnpm dev:browser:postgres:split-services:standalone`
- Cloud dev: `pnpm dev:browser:postgres:unified-process:cloud`
- Gateway packaging: `pnpm gateway:matrix`, `pnpm gateway:package:cloud`
- Validate: `pnpm topology:validate`

## Verification

- `cargo test --workspace`
- `pnpm topology:validate`
- `pnpm test:topology`
- `pnpm --filter sdkwork-clawrouter-workspace test`
