# Repository Guidelines

<!-- SDKWORK-AGENTS-GENERATED: v1 -->

## SDKWORK Soul

Read `../sdkwork-specs/SOUL.md` before executing tasks in this root. Follow specs before memory, dictionary before context, stop on ambiguity, and evidence before completion.

## SDKWORK Standards

Canonical SDKWORK specs path from this root:

- `../sdkwork-specs/README.md`
- `../sdkwork-specs/SOUL.md`
- `../sdkwork-specs/AGENTS_SPEC.md`
- `../sdkwork-specs/CODE_STYLE_SPEC.md`
- `../sdkwork-specs/NAMING_SPEC.md`

Do not copy root standard text into this repository. If these relative paths do not resolve, stop and report the broken workspace layout.

## Application Identity

**Repository status: DISSOLUTION IN PROGRESS — do not extend.**

This repository is being **retired**. Target architecture: [docs/architecture/tech/TECH-2026-06-24-commerce-repository-dissolution.md](docs/architecture/tech/TECH-2026-06-24-commerce-repository-dissolution.md).

- **Do not** add domain services, DDL, router handlers, or new composed HTTP crates here.
- **Do** implement capability changes in `../sdkwork-<capability>/` only.
- **Do** move PC modules from `apps/sdkwork-commerce-pc/packages/*` into each T1 repo as `apps/sdkwork-<capability>-pc/` (see [docs/architecture/tech/TECH-2026-06-24-commerce-pc-capability-distribution.md](docs/architecture/tech/TECH-2026-06-24-commerce-pc-capability-distribution.md)).
- **Do not** create a standalone `sdkwork-commerce-pc` git repository.

Application manifest (until extracted): `apps/sdkwork-commerce-pc/sdkwork.app.config.json`

Mall PC: sibling repo `sdkwork-mall` (`apps/sdkwork-mall-pc/`).

Ten T1 capability repositories are the **only** authoritative owners of commerce domain code:

| Repository | Capability |
| --- | --- |
| `../sdkwork-shop` | shop |
| `../sdkwork-merchandise` | merchandise (SPU/SKU admin) |
| `../sdkwork-catalog` | catalog browse/open |
| `../sdkwork-inventory` | inventory |
| `../sdkwork-order` | order |
| `../sdkwork-payment` | payment |
| `../sdkwork-account` | account / wallet |
| `../sdkwork-membership` | membership |
| `../sdkwork-promotion` | promotion |
| `../sdkwork-invoice` | invoice |

Gateway topology migrates to `../sdkwork-deployments`. IAM stays in `../sdkwork-iam`.

## Local Dictionary Structure

- `AGENTS.md`: local agent entrypoint and relative SDKWORK spec index.
- `CLAUDE.md`: Claude Code compatibility shim that points to `AGENTS.md` and must not duplicate rules.
- `GEMINI.md`: Gemini CLI compatibility shim that points to `AGENTS.md` and must not duplicate rules.
- `CODEX.md`: Codex compatibility shim that points to `AGENTS.md` and must not duplicate rules.
- `sdkwork.app.config.json`: not present here; required for application roots.
- `.sdkwork/`: reserved local dictionary folder; create only for local skills, plugins, manifests, or AI workspace metadata.
- `specs/`: local component contract (`specs/component.spec.json`) and narrowing rules (`specs/README.md`).
- `sdks/`: SDK families, OpenAPI authorities, route manifests, and generated SDK artifacts.
- `package.json`, `pnpm-workspace.yaml`, `Cargo.toml`: language/build manifests.
- Local directories to inspect first when relevant: `apps/`, `crates/`, `generated/`, `packages/`, `sdks/`, `tools/`.

## Documentation Canon

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)

## Spec Resolution Order

1. Read this `AGENTS.md` and any nearer component-level `AGENTS.md`.
2. Read `sdkwork.app.config.json` when present.
3. Read local `specs/README.md` and `specs/component.spec.json` when present.
4. Read local `.sdkwork/README.md`, `.sdkwork/skills/`, and `.sdkwork/plugins/` when relevant.
5. Read `../sdkwork-specs/README.md` and the task-specific root specs.
6. Inspect implementation files only after the relevant dictionary entries are clear.

## Required Specs By Task Type

- Agent/workflow changes: `../sdkwork-specs/SOUL.md`, `../sdkwork-specs/AGENTS_SPEC.md`, `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`.
- Any code change: `../sdkwork-specs/CODE_STYLE_SPEC.md`, `../sdkwork-specs/NAMING_SPEC.md`, plus only the touched language/framework spec.
- Rust code: `../sdkwork-specs/RUST_CODE_SPEC.md` and `../sdkwork-specs/RUST_RPC_SPEC.md` when RPC is touched.
- Java/Spring code: `../sdkwork-specs/JAVA_CODE_SPEC.md` and `../sdkwork-specs/WEB_BACKEND_SPEC.md` when HTTP backend behavior is touched.
- TypeScript/Node code: `../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`.
- Frontend/UI code: `../sdkwork-specs/FRONTEND_CODE_SPEC.md`, `../sdkwork-specs/FRONTEND_SPEC.md`, `../sdkwork-specs/UI_ARCHITECTURE_SPEC.md`, and exactly one detailed UI architecture spec.
- API changes: `../sdkwork-specs/API_SPEC.md`, `../sdkwork-specs/WEB_BACKEND_SPEC.md`, `../sdkwork-specs/SDK_SPEC.md`, `../sdkwork-specs/TEST_SPEC.md`.
- Database changes: `../sdkwork-specs/DATABASE_SPEC.md`, `../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md`, `../sdkwork-specs/PRIVACY_SPEC.md`, `../sdkwork-specs/TEST_SPEC.md`.
- HTTP API / web framework: `../sdkwork-specs/API_SPEC.md`, `../sdkwork-specs/WEB_FRAMEWORK_SPEC.md`, `../sdkwork-specs/WEB_BACKEND_SPEC.md`.
- Repository scripts: `../sdkwork-specs/PNPM_SCRIPT_SPEC.md`.
- SDK generation/consumption: `../sdkwork-specs/SDK_SPEC.md`, `../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`, `../sdkwork-specs/API_SPEC.md`, `../sdkwork-specs/TEST_SPEC.md`.
- App identity/release: `../sdkwork-specs/APP_MANIFEST_SPEC.md`, `../sdkwork-specs/CONFIG_SPEC.md`, `../sdkwork-specs/DEPLOYMENT_SPEC.md`.
- Security/auth: `../sdkwork-specs/IAM_SPEC.md`, `../sdkwork-specs/IAM_LOGIN_INTEGRATION_SPEC.md`, `../sdkwork-specs/SECURITY_SPEC.md`, `../sdkwork-specs/PRIVACY_SPEC.md`.

Language-specific specs are on-demand; do not load Rust, Java, TypeScript, and frontend specs for unrelated tasks.

## Code Style Rules

Read `../sdkwork-specs/CODE_STYLE_SPEC.md` and `../sdkwork-specs/NAMING_SPEC.md` before code changes.

Load language specs only when touched: Rust uses `RUST_CODE_SPEC.md`, Java/Spring uses `JAVA_CODE_SPEC.md`, TypeScript/Node uses `TYPESCRIPT_CODE_SPEC.md`, and frontend/UI uses `FRONTEND_CODE_SPEC.md`.

For Rust, keep `src/lib.rs` limited to module declarations, re-exports, light docs, and wiring; move handlers, services, repositories, DTOs, SQL, provider clients, and tests into focused modules.

For TypeScript or frontend code, prefer strict types, explicit package exports, colocated tests, and existing package/module boundaries.

## Build, Test, and Verification

Run commands from this directory unless a command explicitly targets another path.

- `pnpm install`: install dependencies for this workspace or package.
- `pnpm run test`: run the configured test suite for this scope.
- `pnpm run typecheck`: run TypeScript type checks.
- `pnpm run verify`: run repository verification or architecture checks.
- `pnpm run db:validate`: validate `database/` lifecycle assets against `DATABASE_FRAMEWORK_SPEC.md`.
- `pnpm run check`: run route manifest, SDK, database, and type checks.
- `pnpm run test:commerce-standard-contracts`: run the configured test suite for this scope.
- `pnpm run test:node`: run the configured test suite for this scope.
- `pnpm run test:vitest`: run the configured test suite for this scope.
- `cargo fmt --all --check`: verify Rust formatting across workspace crates.
- `cargo test --workspace`: run workspace Rust tests.
- `cargo clippy --workspace --tests -- -D warnings`: lint Rust tests and crates with warnings denied.

Run the narrowest relevant check first, then broader verification when API contracts, SDK generation, persistence, security, or cross-package boundaries change.

## Agent Execution Rules

Use the convention dictionary instead of broad context loading. Do not hand-edit generated SDK output unless the task is explicitly about generated artifacts and the source contract is verified. Do not replace generated SDK integration with raw HTTP. Keep changes scoped to the owning module, package, crate, or app root. Record the exact verification commands and important outputs before reporting completion.

## Human Review Rules

Request human review before breaking SDKWORK standards, changing public naming, altering security/auth behavior, changing database migrations or production deployment config, deleting data/files, or changing generated SDK ownership. Surface unresolved spec paths, app identity conflicts, component ownership conflicts, and API authority ambiguity instead of guessing.
