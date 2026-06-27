# packages/

Architecture-local shared packages for the commerce service boundary layer.

## Purpose

Framework-independent TypeScript contracts, runtime ports, and service boundaries used by both PC React app packages and Rust service crates.

## Owner

sdkwork-commerce repository maintainers.

## Allowed Content

- `common/commerce/`: shared commerce TypeScript contracts, ports, and service boundary definitions.

## Forbidden Content

- Generated SDK output (belongs in `sdks/`).
- App-specific UI packages (belongs in `apps/`).
- Secrets, credentials, or runtime state.

## Related Specs

- `../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`
- `../sdkwork-specs/MODULE_SPEC.md`
- `../sdkwork-specs/CODE_STYLE_SPEC.md`

## Verification

- `pnpm run typecheck`
