# PC App Packages

## Purpose
`packages/` stores PC React package families for app, console, admin, commons, SDK reference, API reference, and feature modules.

## Owner
SDKWork ClawRouter PC package owners.

## Allowed Content
`sdkwork-clawrouter-pc-*`, `sdkwork-clawrouter-pc-console-*`, and `sdkwork-clawrouter-pc-admin-*` packages with package-local `specs/`, source, tests, and README files.

## Forbidden Content
Rust route crates, repository-root shared packages, generated SDK transport output, manual HTTP SDK forks, live secrets, runtime databases, logs, and caches.

## Related Specs
- `../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`
- `../../../../sdkwork-specs/APP_PC_REACT_UI_SPEC.md`
- `../../../../sdkwork-specs/NAMING_SPEC.md`

## Verification
- `pnpm.cmd --dir apps/sdkwork-clawrouter-pc typecheck`
- `python -B -m unittest tests.test_frontend_source_hygiene_standard` from the repository root
