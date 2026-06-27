# Tests

## Purpose
`tests/` stores cross-package tests, contract tests, integration tests, end-to-end tests, fixtures, and static verification inputs.

## Owner
SDKWork Claw Router quality and component maintainers.

## Allowed Content
Python unittest suites, contract fixtures, static guardian tests, integration fixtures, safe test data, and cross-package verification helpers.

## Forbidden Content
Package-local unit tests that belong beside a package, live secrets, production data, runtime databases, generated SDK transport output, logs, and caches.

## Related Specs
- `../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../../sdkwork-specs/TEST_SPEC.md`
- `../../sdkwork-specs/QUALITY_GATE_SPEC.md`

## Verification
- `python -B -m unittest tests.test_architecture_standard_guardian`
- `python -B -m unittest tests.test_sdkwork_routes_api_package_standard`
