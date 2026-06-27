# Tests

## Purpose

Cross-package, contract, integration, end-to-end, fixture, and static verification inputs live here.

## Owner

SDKWork Commerce maintainers own this directory. Changes must follow the repository `AGENTS.md` entrypoint and the canonical SDKWork specs under `../sdkwork-specs/`.

## Allowed Content

- Repository-level contract and integration tests.
- Safe fixtures and static architecture checks.
- Tests that span package, SDK, app, or crate boundaries.

## Forbidden Content

- Package-local unit tests that belong beside a package or crate.
- Real secrets, live tokens, customer data, runtime databases, generated SDK transport output, or mutable state.

## Related Specs

- `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../sdkwork-specs/TEST_SPEC.md`
- `../sdkwork-specs/SECURITY_SPEC.md`

## Verification

Run the focused test first, then `pnpm run test:node`, `pnpm run test:vitest`, or Cargo checks depending on the touched surface.
