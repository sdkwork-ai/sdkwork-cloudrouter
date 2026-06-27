# Public Assets

## Purpose
`public/` stores static browser assets served by the PC React portal.

## Owner
SDKWork ClawRouter PC frontend maintainers.

## Allowed Content
Static assets, public OpenAPI snapshots used by local tools, WASM assets, and documented public files that are safe to serve to browsers.

## Forbidden Content
Secrets, backend-only config, runtime user data, private service endpoints, generated SDK packages, logs, caches, and production credentials.

## Related Specs
- `../../../../sdkwork-specs/FRONTEND_SPEC.md`
- `../../../../sdkwork-specs/APP_PC_REACT_UI_SPEC.md`

## Verification
- `pnpm.cmd --dir apps/sdkwork-clawrouter-pc typecheck`
- `python -B tools/architecture_standard_guardian.py` from the repository root
