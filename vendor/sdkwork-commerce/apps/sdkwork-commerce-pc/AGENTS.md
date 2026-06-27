# Repository Guidelines

## SDKWORK Soul

Read `../../../sdkwork-specs/SOUL.md` before executing tasks in this application root. Follow specs before memory, dictionary before context, stop on ambiguity, and evidence before completion.

## SDKWORK Standards

Canonical SDKWORK specs path from this application root:

- `../../../sdkwork-specs/README.md`
- `../../../sdkwork-specs/SOUL.md`
- `../../../sdkwork-specs/AGENTS_SPEC.md`
- `../../../sdkwork-specs/CODE_STYLE_SPEC.md`
- `../../../sdkwork-specs/NAMING_SPEC.md`

Do not copy root standard text into this application root. If these relative paths do not resolve, stop and report the broken workspace layout.

## Application Identity

Read `sdkwork.app.config.json` before changing application behavior, runtime config, SDK wiring, release metadata, app-owned capabilities, package topology, or app-root verification.

## Local Dictionary Structure

- `AGENTS.md`: application agent entrypoint and relative SDKWork spec index.
- `CLAUDE.md`, `GEMINI.md`, `CODEX.md`: tool compatibility shims that point to `AGENTS.md` and must not duplicate rules.
- `sdkwork.app.config.json`: application identity, runtime family, release metadata, and app-owned capability metadata.
- `.sdkwork/`: application-local skills, plugins, manifests, and AI workspace metadata.
- `specs/`: application component contract and narrowing rules.
- `sdks/`: application-root SDK workspace references and generated SDK integration notes.
- `config/`: browser, desktop, server, container, and Tauri config templates.
- `src/bootstrap/`: app composition boundary for environment, runtime, SDK clients, IAM runtime, and routes.
- `packages/`: normalized PC packages named `sdkwork-commerce-pc-*` or `sdkwork-commerce-pc-admin-*`.
- `tests/`: app-level architecture, package-boundary, config, and route verification.

## Spec Resolution Order

1. Read this `AGENTS.md` and any nearer component-level `AGENTS.md`.
2. Read `sdkwork.app.config.json`.
3. Read local `specs/README.md` and `specs/component.spec.json`.
4. Read local `.sdkwork/README.md`, `.sdkwork/skills/`, and `.sdkwork/plugins/` when relevant.
5. Read repository root `../../AGENTS.md` when a task crosses app boundaries.
6. Read `../../../sdkwork-specs/README.md` and task-specific root specs.
7. Inspect implementation files only after dictionary entries are clear.

## Required Specs By Task Type

- Agent/workflow changes: `../../../sdkwork-specs/SOUL.md`, `../../../sdkwork-specs/AGENTS_SPEC.md`, `../../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`.
- Any code change: `../../../sdkwork-specs/CODE_STYLE_SPEC.md`, `../../../sdkwork-specs/NAMING_SPEC.md`, plus only the touched language/framework spec.
- TypeScript/Node code: `../../../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`.
- Frontend/UI code: `../../../sdkwork-specs/FRONTEND_CODE_SPEC.md`, `../../../sdkwork-specs/FRONTEND_SPEC.md`, `../../../sdkwork-specs/UI_ARCHITECTURE_SPEC.md`, and exactly one detailed UI architecture spec.
- PC app architecture changes: `../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`, `../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`, and package-specific UI specs.
- Backend-admin PC packages: `../../../sdkwork-specs/BACKEND_UI_SPEC.md`.
- SDK wiring or generated SDK consumption: `../../../sdkwork-specs/SDK_SPEC.md`, `../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`, and `../../../sdkwork-specs/TEST_SPEC.md`.

## Code Style Rules

Read `../../../sdkwork-specs/CODE_STYLE_SPEC.md` and `../../../sdkwork-specs/NAMING_SPEC.md` before code changes.

For TypeScript and frontend code, prefer strict types, explicit package exports, colocated tests, and existing package/module boundaries. Do not import another package through `/src/` internals. Do not replace generated SDK integration with raw HTTP.

## Build, Test, and Verification

Run commands from the repository root unless a command explicitly targets this app root.

- `pnpm install`: install dependencies for the workspace.
- `pnpm run typecheck`: run TypeScript type checks.
- `pnpm run test:node`: run Node static and SDK tests.
- `pnpm run test:vitest`: run Vitest suites.
- `node --test sdks/test/verify-commerce-standard-architecture.test.mjs`: run Commerce standard architecture checks.

Run the narrowest relevant check first, then broader verification when package names, SDK wiring, config, routes, or app-root contracts change.

## Agent Execution Rules

Use the convention dictionary instead of broad context loading. Keep changes scoped to the owning app root, package, or component. Do not hand-edit generated SDK transport output. Do not replace generated SDK integration with raw HTTP. Record verification commands and important outputs before reporting completion.

## Human Review Rules

Request human review before breaking SDKWork standards, changing public naming beyond this approved migration, altering security/auth behavior, changing production deployment config, deleting data/files, or changing generated SDK ownership. Surface unresolved app identity conflicts, component ownership conflicts, and API authority ambiguity instead of guessing.
