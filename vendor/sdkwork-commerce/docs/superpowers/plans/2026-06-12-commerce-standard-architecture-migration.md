# Commerce Standard Architecture Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the full `sdkwork-commerce` workspace to the current SDKWork repository, app-root, API, SDK, PC React, TypeScript, and Rust architecture standards without changing commerce behavior.

**Architecture:** Keep the repository root as the pnpm and Cargo workspace root. Move authored API inputs to `apis/`, keep generated SDK family workspaces under `sdks/`, normalize the PC app root and package taxonomy under `apps/sdkwork-commerce-pc`, and rename Rust crates to responsibility-specific names. Generated SDK transport output remains generator-owned and is not hand-edited.

**Tech Stack:** Node `node:test`, pnpm, TypeScript, Vite/Vitest, Rust Cargo, SQLx, OpenAPI JSON, SDKWork SDK generator wrapper scripts.

---

## Task 1: Add Executable Architecture Standard Checks

**Files:**
- Create: `sdks/test/verify-commerce-standard-architecture.test.mjs`
- Modify: `docs/superpowers/plans/2026-06-12-commerce-standard-architecture-migration.md`

- [ ] Write a failing Node static test that verifies the standard root dictionary, PC app root dictionary, `apis/` OpenAPI source placement, canonical PC package names, and Rust crate responsibility names.
- [ ] Run `node --test sdks/test/verify-commerce-standard-architecture.test.mjs` and confirm it fails on the pre-migration layout.
- [ ] Keep the test focused on architecture contracts only; existing behavior tests remain in current service, SDK, Vitest, and Cargo suites.

## Task 2: Standardize Repository And PC App Root Dictionaries

**Files:**
- Create root placeholders under `apis/`, `configs/`, `deployments/`, `jobs/`, `plugins/`, `examples/`, `scripts/`, and `tests/`.
- Create app-root files under `apps/sdkwork-commerce-pc/AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, `.sdkwork/`, `config/`, `docs/`, `scripts/`, `sdks/`, `specs/`, `src/bootstrap/`, and `tests/`.
- Modify: `README.md`

- [ ] Add tracked README placeholders that state purpose, owner, allowed content, forbidden content, related specs, and verification.
- [ ] Add PC app-root `AGENTS.md` with relative `../../../sdkwork-specs/` links and shim files that point to `AGENTS.md`.
- [ ] Add PC app-root `.sdkwork/README.md`, `.sdkwork/skills/README.md`, `.sdkwork/plugins/README.md`, and `.sdkwork/.gitignore`.
- [ ] Update root `README.md` so it documents `apis/` as API source input and PC packages as normalized app-root packages.
- [ ] Run `node --test sdks/test/verify-commerce-standard-architecture.test.mjs` and confirm only later migration expectations still fail.

## Task 3: Move Authored OpenAPI Inputs To `apis/`

**Files:**
- Move: `apis/open-api/commerce/commerce-open-api.openapi.json` to `apis/open-api/commerce/commerce-open-api.openapi.json`
- Move: `apis/app-api/commerce/commerce-app-api.openapi.json` to `apis/app-api/commerce/commerce-app-api.openapi.json`
- Move: `apis/backend-api/commerce/commerce-backend-api.openapi.json` to `apis/backend-api/commerce/commerce-backend-api.openapi.json`
- Modify: `tools/commerce_openapi_export.mjs`, `tools/commerce_sdk_generate.mjs`, SDK family `.sdkwork-assembly.json`, `sdk-manifest.json`, component specs, SDK tests, and README references.

- [ ] Update default input/output paths in SDK tooling from `generated/openapi` to `apis/...`.
- [ ] Keep `--check` output under `target/commerce-openapi-check`.
- [ ] Update SDK family metadata so `generationInputSpec` and `authoritySpec` point at the new `apis/` inputs.
- [ ] Run `pnpm run sdk:check` and fix path regressions without editing generated SDK transport output.

## Task 4: Normalize PC Package Names And Paths

**Files:**
- Move packages from `apps/sdkwork-commerce-pc/packages/*` to direct `apps/sdkwork-commerce-pc/packages/sdkwork-commerce-pc-*` directories.
- Move `apps/sdkwork-commerce-pc/tests/test-utils` to `apps/sdkwork-commerce-pc/tests/test-utils`.
- Modify package `package.json`, component specs, READMEs, imports, `tsconfig.base.json`, `pnpm-workspace.yaml`, and package tests.

- [ ] Rename each package according to the approved mapping, including `@sdkwork/commerce-pc-admin-product` for product admin.
- [ ] Update source imports and package metadata from old `@sdkwork/*-pc-react` names to canonical `@sdkwork/commerce-pc-*` names.
- [ ] Update package-local tests and static checks that assert package names.
- [ ] Run focused Node standard tests and `pnpm run typecheck`.

## Task 5: Normalize Rust Crate Names And Cargo Dependencies

**Files:**
- Move crates from old `sdkwork-commerce-*-rust` directories to responsibility-specific directories.
- Modify root `Cargo.toml`, crate `Cargo.toml` files, Rust imports, tests, READMEs, and component specs.

- [ ] Rename business crates to `sdkwork-commerce-<capability>-service`.
- [ ] Rename contract, service-host, API server, Tauri host, SQLx repository, membership repository, bootstrap, and RPC crates to responsibility-specific names.
- [ ] Update Cargo package names to lowercase kebab-case and update dependency aliases/imports to the new snake_case crate names.
- [ ] Ensure no forbidden Rust crate names remain as directories, Cargo packages, dependency aliases, feature aliases, or public wrapper crates.
- [ ] Run `cargo fmt --all --check` and `cargo test --workspace`.

## Task 6: Update Documentation, Specs, And Static Standard Tests

**Files:**
- Modify affected `README.md`, `specs/component.spec.json`, package/crate specs, SDK family smoke tests, and migration cleanup tests.

- [ ] Update component specs to match renamed package/crate identities and surfaces.
- [ ] Update static checks so old names are allowed only in migration/design docs.
- [ ] Keep generated SDK output untouched unless regenerated by the SDK family scripts.

## Task 7: Final Verification

**Commands:**
- `node --test sdks/test/verify-commerce-standard-architecture.test.mjs`
- `pnpm run sdk:check`
- `pnpm run typecheck`
- `pnpm run test:node`
- `pnpm run test:vitest`
- `cargo fmt --all --check`
- `cargo test --workspace`

- [ ] Run the narrowest checks first, then aggregate checks.
- [ ] Record command outcomes and important failures.
- [ ] Fix regressions until the required checks pass or report a concrete blocker with evidence.
