# sdkwork-commerce-pc

SDKWork Commerce PC application root.

This root owns the Commerce PC renderer composition boundary, normalized PC package family under `packages/`, app-local config templates, app-local specs, scripts, and tests. Application identity lives in `sdkwork.app.config.json`; packaging workflow metadata lives in `sdkwork.workflow.json`; runtime config examples live under `config/`.

The root package `@sdkwork/commerce-pc-app` is the thin Vite application composition root. It owns `index.html`, `vite.config.ts`, `src/bootstrap/*`, AuthGate wiring, and page assembly. App layout and navigation are owned by `@sdkwork/commerce-pc-shell`; business pages and services remain in normalized packages such as `@sdkwork/commerce-pc-commerce`.

Infrastructure packages are split by SDKWork PC architecture role:

- `@sdkwork/commerce-pc-core`: app-side runtime identity and app/open SDK family inventory.
- `@sdkwork/commerce-pc-commons`: domain-neutral shared helpers.
- `@sdkwork/commerce-pc-shell`: app/user shell layout and navigation rendering.
- `@sdkwork/commerce-pc-admin-core`: `backend-admin` runtime and backend SDK family inventory.
- `@sdkwork/commerce-pc-admin-shell`: `backend-admin` route and navigation metadata.

`bin/` is reserved for cross-platform operational scripts. `public/` is reserved for browser-served static assets and must not contain secrets, generated SDK source, or host-local config.

## Package Commands

Run from this application root or with `pnpm --dir apps/sdkwork-commerce-pc <command>`:

```bash
pnpm run dev
pnpm run dev:server
pnpm run build
pnpm run build:staging
pnpm run build:prod
pnpm run typecheck
pnpm run test
pnpm run test:config
pnpm run lint
```

## Standards

- `../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`
- `../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`
- `../../../sdkwork-specs/APP_MANIFEST_SPEC.md`
- `../../../sdkwork-specs/CONFIG_SPEC.md`
- `../../../sdkwork-specs/ENVIRONMENT_SPEC.md`
- `../../../sdkwork-specs/GITHUB_WORKFLOW_SPEC.md`
- `../../../sdkwork-specs/RELEASE_SPEC.md`
- `../../../sdkwork-specs/SUPPLY_CHAIN_SECURITY_SPEC.md`
- `../../../sdkwork-specs/QUALITY_GATE_SPEC.md`
- `../../../sdkwork-specs/APP_PC_REACT_UI_SPEC.md`
- `../../../sdkwork-specs/BACKEND_UI_SPEC.md`
- `../../../sdkwork-specs/COMPONENT_SPEC.md`
- `../../../sdkwork-specs/TEST_SPEC.md`

## Verification

Run from the repository root:

```bash
node --test sdks/test/verify-commerce-standard-architecture.test.mjs
node ../sdkwork-github-workflow/scripts/sdkwork-workflow.mjs validate --config apps/sdkwork-commerce-pc/sdkwork.workflow.json
pnpm --dir apps/sdkwork-commerce-pc run typecheck
pnpm --dir apps/sdkwork-commerce-pc run build
pnpm run typecheck
pnpm run test:vitest
```
