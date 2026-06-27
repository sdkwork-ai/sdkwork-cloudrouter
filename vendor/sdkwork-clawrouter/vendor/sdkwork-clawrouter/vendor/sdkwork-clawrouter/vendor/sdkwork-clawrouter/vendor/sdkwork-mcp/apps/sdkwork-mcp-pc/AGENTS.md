# Repository Guidelines

<!-- SDKWORK-MCP-GENERATED: v2 -->

## SDKWORK Soul

Read `../../../sdkwork-specs/SOUL.md` before executing tasks in this app surface. Follow specs before memory, dictionary before context, stop on ambiguity, and evidence before completion.

## SDKWORK Standards

Canonical SDKWORK specs path from this app surface:

- `../../../sdkwork-specs/README.md`
- `../../../sdkwork-specs/SOUL.md`
- `../../../sdkwork-specs/AGENTS_SPEC.md`
- `../../../sdkwork-specs/PNPM_SCRIPT_SPEC.md`
- `../../../sdkwork-specs/GITHUB_WORKFLOW_SPEC.md`
- `../../../sdkwork-specs/CODE_STYLE_SPEC.md`
- `../../../sdkwork-specs/NAMING_SPEC.md`

## Application Identity

This is the PC browser app surface for the root MCP application. Read `../../sdkwork.app.config.json` only when the task touches app identity, runtime config, SDK wiring, release metadata, app-owned capabilities, packaging, or deployment.

## Local Dictionary Structure

- `AGENTS.md`: app-surface agent entrypoint and relative SDKWork spec index.
- `specs/`: `component.spec.json`, `dependency.composition.json`, and admin permission catalog references.
- `packages/sdkwork-mcp-pc-*`: PC React packages (`core`, `commons`, `hub`, `console`, `admin`, `admin-core`, `shell`) with npm scopes `@sdkwork/mcp-pc-*`.
- `src/`: app bootstrap, shell entrypoint, and routes.
- `vite.config.ts`, `tsconfig.json`: TypeScript and Vite build manifests.

## Spec Resolution Order

Use dynamic progressive loading:

1. Read this `AGENTS.md` and any nearer component-level `AGENTS.md`.
2. Read `../../AGENTS.md` only when repository-root rules or scripts are needed.
3. Read `../../sdkwork.app.config.json` only when app behavior, runtime config, SDK wiring, release, packaging, or app-owned capabilities are touched.
4. Read local package manifests only for the affected package/surface.
5. Read `../../../sdkwork-specs/README.md`, then only the task-specific root specs.
6. Inspect implementation files after the dictionary and relevant specs are clear.

Do not load the whole app surface or every root spec before identifying the task surface.

## Required Specs By Task Type

- Agent/workflow changes: `../../../sdkwork-specs/SOUL.md`, `../../../sdkwork-specs/AGENTS_SPEC.md`, `../../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`, `../../../sdkwork-specs/GITHUB_WORKFLOW_SPEC.md`, and `../../../sdkwork-specs/TEST_SPEC.md`.
- Package script changes: `../../../sdkwork-specs/PNPM_SCRIPT_SPEC.md`, `../../../sdkwork-specs/APP_RUNTIME_TOPOLOGY_SPEC.md`, `../../../sdkwork-specs/CONFIG_SPEC.md`, and `../../../sdkwork-specs/TEST_SPEC.md`.
- Any code change: `../../../sdkwork-specs/CODE_STYLE_SPEC.md`, `../../../sdkwork-specs/NAMING_SPEC.md`, plus only the touched language/framework spec.
- TypeScript/Node code: `../../../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`.
- Frontend/UI code: `../../../sdkwork-specs/FRONTEND_CODE_SPEC.md`, `../../../sdkwork-specs/FRONTEND_SPEC.md`, `../../../sdkwork-specs/UI_ARCHITECTURE_SPEC.md`, `../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`, and `../../../sdkwork-specs/APP_PC_REACT_UI_SPEC.md`.
- SDK integration changes: `../../../sdkwork-specs/APP_SDK_INTEGRATION_SPEC.md`, `../../../sdkwork-specs/SDK_SPEC.md`, `../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`, and `../../../sdkwork-specs/TEST_SPEC.md`.

Language-specific specs are on-demand; do not load Rust, Java, TypeScript, and frontend specs for unrelated tasks.

## Code Style Rules

Read `../../../sdkwork-specs/CODE_STYLE_SPEC.md` and `../../../sdkwork-specs/NAMING_SPEC.md` before code changes. Keep package boundaries focused. Prefer generated app/backend SDKs over ad-hoc HTTP wrappers in production surfaces.

## Build, Test, and Verification

- `pnpm dev`: browser development with Vite proxy to local mcp APIs.
- `pnpm build`: browser bundle build.
- `pnpm typecheck`: TypeScript check.

From the repository root, use `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm check`, and `pnpm verify` for cross-surface validation.

## Agent Execution Rules

Use the convention dictionary before broad source loading. Follow dynamic progressive loading: nearest AGENTS, relevant manifests/specs, task-specific root standards, then implementation. Record exact verification commands and important outputs before reporting completion.

## Human Review Rules

Request human review before breaking SDKWork standards, changing public naming, altering security/auth behavior, changing runtime config semantics, changing package/release metadata, deleting data/files, or changing generated SDK ownership. Surface unresolved spec paths instead of guessing.
