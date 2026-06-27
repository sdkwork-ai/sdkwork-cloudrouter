# PC App Source

## Purpose
`src/` stores the PC React application shell, routing, host integration, shared app bootstrap, styles, and entrypoints.

## Owner
SDKWork ClawRouter PC frontend maintainers.

## Allowed Content
React entrypoints, application shell code, local state bridges, route composition, typed host adapters, and source-local declarations.

## Forbidden Content
Generated SDK transport code, raw `/app/v3/api` or `/backend/v3/api` business HTTP clients, manual auth headers, live secrets, runtime data, logs, and caches.

## Related Specs
- `../../../../sdkwork-specs/FRONTEND_CODE_SPEC.md`
- `../../../../sdkwork-specs/UI_ARCHITECTURE_SPEC.md`
- `../../../../sdkwork-specs/APP_PC_REACT_UI_SPEC.md`

## Verification
- `pnpm.cmd --dir apps/sdkwork-clawrouter-pc typecheck`
- `python -B -m unittest tests.test_frontend_source_hygiene_standard` from the repository root
