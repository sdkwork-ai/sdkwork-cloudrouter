# PC App Tests

## Purpose
`tests/` stores PC app cross-package test fixtures and application-local browser or integration test documentation.

## Owner
SDKWork CloudRouter PC quality maintainers.

## Allowed Content
Application-local fixtures, browser test helpers, integration test notes, and cross-package PC app test artifacts.

## Forbidden Content
Package-local unit tests that belong with their package, live secrets, private customer data, runtime databases, generated SDK output, logs, and caches.

## Related Specs
- `../../../../sdkwork-specs/TEST_SPEC.md`
- `../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`

## Verification
- `pnpm.cmd --dir apps/sdkwork-cloudrouter-pc typecheck`
- `python -B tools/architecture_standard_guardian.py` from the repository root
