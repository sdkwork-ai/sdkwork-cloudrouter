# Commerce Standard Architecture Migration Design

## Objective

Migrate the full `sdkwork-commerce` workspace to the current SDKWork repository, application, API, SDK, PC React, TypeScript, and Rust architecture standards while preserving existing commerce behavior and generated SDK ownership.

The migration covers the repository root, `apps/sdkwork-commerce-pc`, shared TypeScript packages, Rust crates, SDK generation inputs, OpenAPI materialization, component specs, documentation, and verification commands. It does not redesign commerce product behavior, hand-edit generated SDK output, or replace generated SDK integration with raw HTTP.

## Standards

This design follows these root standards from `../sdkwork-specs/`: `SOUL.md`, `SDKWORK_WORKSPACE_SPEC.md`, `AGENTS_SPEC.md`, `CODE_STYLE_SPEC.md`, `NAMING_SPEC.md`, `COMPONENT_SPEC.md`, `APPLICATION_SPEC.md`, `APP_MANIFEST_SPEC.md`, `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`, `APP_PC_ARCHITECTURE_SPEC.md`, `UI_ARCHITECTURE_SPEC.md`, `APP_PC_REACT_UI_SPEC.md`, `BACKEND_UI_SPEC.md`, `API_SPEC.md`, `SDK_SPEC.md`, `SDK_WORKSPACE_GENERATION_SPEC.md`, `DEPENDENCY_MANAGEMENT_SPEC.md`, `TYPESCRIPT_CODE_SPEC.md`, `RUST_CODE_SPEC.md`, and `TEST_SPEC.md`.

## Current Findings

The repository root already has `AGENTS.md`, `.sdkwork/`, `apps/`, `crates/`, `docs/`, `packages/`, `sdks/`, `specs/`, and `tools/`. It does not yet represent every active standard top-level capability with tracked content: `apis/`, `configs/`, `deployments/`, `jobs/`, `plugins/`, `examples/`, `scripts/`, and `tests/` are missing.

The application identity exists at `apps/sdkwork-commerce-pc/sdkwork.app.config.json`. That app root currently has only `sdkwork.app.config.json` and `packages/`, so it is missing its application-level `AGENTS.md`, tool shims, `.sdkwork/`, `config/`, `docs/`, `scripts/`, `sdks/`, `specs/`, `src/`, and `tests/` structure required by the PC application standard.

The PC React packages under `apps/sdkwork-commerce-pc/packages/` use legacy shared package names such as `@sdkwork/commerce-pc-wallet` and directory names such as `sdkwork-commerce-pc-wallet`. New PC application package names must use normalized `sdkwork-commerce-pc-*`, `sdkwork-commerce-pc-console-*`, and `sdkwork-commerce-pc-admin-*` families.

The Rust workspace contains crates with responsibility-ambiguous or forbidden names under the new Rust naming rules, including `sdkwork-commerce-contract-service`, `sdkwork-commerce-service-host`, `sdkwork-commerce-api-server`, `sdkwork-commerce-bootstrap-service`, and `sdkwork-commerce-tauri-host`. These names need responsibility-specific replacements rather than compatibility wrapper crates.

OpenAPI authority inputs are currently under `generated/openapi/`. The current SDK scripts read those files and materialize normalized SDK inputs from TypeScript contracts. The new API standard requires authored API contract sources and materialization inputs under `apis/`, while generated SDK family workspaces remain under `sdks/`.

## Migration Strategy

Use a phased, compatibility-conscious migration in one implementation sequence:

1. Standardize repository and app-root dictionaries first.
2. Move or mirror author-owned API inputs into `apis/` and keep SDK family output in `sdks/`.
3. Rename PC package directories and package identities to canonical `sdkwork-commerce-pc-*` forms.
4. Rename Rust crates to responsibility-specific names and update Cargo workspace dependencies, imports, component specs, README files, and tests.
5. Update static tests so the new layout is executable and old names fail only where they are intentionally recorded as migration history.

Compatibility aliases may exist only as TypeScript path resolution or documentation during the migration when required to keep internal tests green. They must not create new source packages with old forbidden names, and Rust forbidden crate names must not remain as wrapper crates or package aliases.

## Repository Root Design

Add missing standard top-level directories with tracked README placeholders where no runtime content exists: `apis/`, `configs/`, `deployments/`, `jobs/`, `plugins/`, `examples/`, `scripts/`, and `tests/`.

Each README states purpose, owner, allowed content, forbidden content, related specs, and verification. The root `README.md` becomes the active root layout index and explains that `packages/common/commerce/` is the repository-level shared TypeScript module collection, while application-local PC packages live under `apps/sdkwork-commerce-pc/packages/`.

The repository root remains the Cargo and pnpm workspace root. Sibling SDKWork source dependencies remain centralized in `pnpm-workspace.yaml` and root `Cargo.toml`; member packages must not introduce duplicate sibling source paths.

## PC Application Root Design

Standardize `apps/sdkwork-commerce-pc/` as the PC application root with `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, `.sdkwork/`, `config/browser`, `config/desktop`, `config/server`, `config/container`, `config/tauri`, `docs/`, `scripts/`, `sdks/`, `specs/`, `src/bootstrap`, `tests/`, and `packages/`.

The app root `AGENTS.md` uses accurate relative links to `../../../sdkwork-specs/`. Its local `.sdkwork/` is application metadata only and must not contain generated SDK output, secrets, local runtime state, or user-private files.

The initial `src/bootstrap/` content is a thin composition placeholder only. It must not introduce a new app shell or fake runtime behavior unless tests require a typed boundary. Commerce feature behavior remains in packages and services.

## API And SDK Design

Create `apis/open-api/commerce/`, `apis/app-api/commerce/`, and `apis/backend-api/commerce/` as authored contract and materialization-input locations for commerce HTTP surfaces. The existing OpenAPI snapshots can be moved there or consumed from there by `tools/commerce_openapi_export.mjs`.

SDK family output remains under `sdks/sdkwork-commerce-sdk/`, `sdks/sdkwork-commerce-app-sdk/`, and `sdks/sdkwork-commerce-backend-sdk/`.

`tools/commerce_sdk_generate.mjs` and `tools/commerce_openapi_export.mjs` are updated so their default input paths start from `apis/`, their check output remains under `target/`, and committed generated transport output is still regenerated only through the owning SDK family scripts. Generated files under `sdks/**/generated/server-openapi/` are never hand-edited.

## PC Package Design

Rename app-root PC packages to canonical application package names:

| Current package | Canonical package |
| --- | --- |
| `@sdkwork/commerce-pc-commerce` | `@sdkwork/commerce-pc-commerce` |
| `@sdkwork/commerce-pc-billing` | `@sdkwork/commerce-pc-billing` |
| `@sdkwork/commerce-pc-checkout` | `@sdkwork/commerce-pc-checkout` |
| `@sdkwork/commerce-pc-coupon` | `@sdkwork/commerce-pc-coupon` |
| `@sdkwork/commerce-pc-entitlement` | `@sdkwork/commerce-pc-entitlement` |
| `@sdkwork/commerce-pc-invoice` | `@sdkwork/commerce-pc-invoice` |
| `@sdkwork/commerce-pc-membership` | `@sdkwork/commerce-pc-membership` |
| `@sdkwork/commerce-pc-membership-purchase` | `@sdkwork/commerce-pc-membership-purchase` |
| `@sdkwork/commerce-pc-offer` | `@sdkwork/commerce-pc-offer` |
| `@sdkwork/commerce-pc-order` | `@sdkwork/commerce-pc-order` |
| `@sdkwork/commerce-pc-payment` | `@sdkwork/commerce-pc-payment` |
| `@sdkwork/commerce-pc-points` | `@sdkwork/commerce-pc-points` |
| `@sdkwork/commerce-pc-pricing` | `@sdkwork/commerce-pc-pricing` |
| `@sdkwork/commerce-pc-subscription` | `@sdkwork/commerce-pc-subscription` |
| `@sdkwork/commerce-pc-wallet` | `@sdkwork/commerce-pc-wallet` |
| `@sdkwork/commerce-pc-admin-membership` | `@sdkwork/commerce-pc-admin-membership` |
| `sdkwork-commerce-pc-admin-product` | `@sdkwork/commerce-pc-admin-product` |

Update directory names, `package.json` names, `tsconfig.base.json` path aliases, package dependencies, source imports, tests, README files, and component specs together. App/user packages continue to use app SDK boundaries. Admin packages declare `component.surface: "backend-admin"` and follow `BACKEND_UI_SPEC.md`.

## Rust Crate Design

Rename Rust crates by responsibility and update root Cargo workspace metadata:

| Current directory | Canonical responsibility |
| --- | --- |
| `sdkwork-commerce-contract-service` | shared contract/support crate, for example `sdkwork-commerce-contract-service` if it owns service contracts and value objects |
| `sdkwork-commerce-service-host` | `sdkwork-commerce-service-host` |
| `sdkwork-commerce-api-server` | route/API adapter crates or `sdkwork-commerce-api-server` depending on actual executable responsibility |
| `sdkwork-commerce-bootstrap-service` | bootstrap module folded into `sdkwork-commerce-service-host` or `sdkwork-commerce-api-server` |
| `sdkwork-commerce-tauri-host` | `sdkwork-commerce-tauri-host` |
| `sdkwork-commerce-storage-repository-sqlx` | capability repository crates or a documented repository-sqlx implementation boundary |
| `sdkwork-commerce-membership-repository-sqlx` | `sdkwork-commerce-membership-repository-sqlx` |

Existing business capability crates such as account, catalog, inventory, invoice, membership, order, payment, and promotion should be evaluated against `sdkwork-<domain>-<capability>-service`. If their current package name is not compliant, rename the package and directory in the same Cargo update. Do not keep forbidden old crate names as wrapper crates, public re-export aliases, or feature aliases.

## Component Specs And Documentation

Every moved package and crate keeps `specs/README.md` and `specs/component.spec.json`. The component manifest must match the new package/crate identity, canonical domain, capability, surface, root path, language specs, public exports, SDK dependencies, dependency API export policy, and verification commands.

Historical references to old names may remain only in migration documents and changelog sections explicitly labeled as migration history. New README examples, package scripts, tests, and imports use canonical names.

## Verification Plan

Run focused checks first, then aggregate verification:

```powershell
pnpm run sdk:check
pnpm run typecheck
pnpm run test:node
pnpm run test:vitest
cargo fmt --all --check
cargo test --workspace
```

If Rust crate renames touch shared workspace imports broadly, run `cargo test -p <renamed-crate>` for the smallest renamed crates before the workspace test. If PC package renames touch many imports, run package-focused Vitest tests before all Vitest tests.

## Rollback

Rollback is file- and phase-based. Directory dictionary additions can be reverted without behavior impact. API source path changes roll back by restoring tool default inputs to the previous OpenAPI snapshot location. PC package rename failures roll back by restoring package directories, package names, and tsconfig aliases from the same commit set. Rust crate rename failures roll back by restoring root `Cargo.toml`, crate directories, package names, and imports from the same commit set.

Do not roll back by editing generated SDK output. Regenerate from source contracts when SDK output changes are required.

## Acceptance Criteria

- Repository root active capabilities are represented by standard directories or documented standard exceptions.
- `apps/sdkwork-commerce-pc` has its own application dictionary and PC app root structure.
- Authored API inputs are discoverable under `apis/` and trace to SDK family materialization under `sdks/`.
- PC packages use canonical `sdkwork-commerce-pc-*` and `sdkwork-commerce-pc-admin-*` names.
- Rust crates avoid forbidden generic `core`, `runtime`, `backend`, `common`, and `manager` suffixes.
- Component specs match moved package and crate identities.
- Existing functionality remains covered by TypeScript, SDK, Vitest, and Cargo verification.
- No generated SDK transport output is hand-edited.
