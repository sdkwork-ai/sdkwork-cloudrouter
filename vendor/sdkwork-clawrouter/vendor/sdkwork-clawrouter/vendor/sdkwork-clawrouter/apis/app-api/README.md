# App API Contracts

## Purpose

Author-owned app-api contract inputs for SDKWork Claw Router product and user-facing client surfaces.

## Owner

SDKWork Claw Router app-api surface owners.

## Allowed Content

OpenAPI 3.1.2 contract files, route authority notes, examples, changelogs, and validation fixtures grouped by domain.

## Forbidden Content

Generated SDK transport output, runnable server code, secrets, and generated SDK control-plane `.sdkwork/` files.

## Related Specs

- `../../../sdkwork-specs/API_SPEC.md`
- `../../../sdkwork-specs/WEB_BACKEND_SPEC.md`

## Verification

- `pnpm api:materialize:check`
- `python -B -m unittest tests.test_api_contract_directory_standard`
