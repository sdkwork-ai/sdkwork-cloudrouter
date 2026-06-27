# Backend API Contracts

## Purpose

Author-owned backend-api contract inputs for SDKWork Claw Router internal admin and operator surfaces.

## Owner

SDKWork Claw Router backend-api surface owners.

## Allowed Content

OpenAPI 3.1.2 contract files, route authority notes, examples, changelogs, and validation fixtures grouped by domain.

## Forbidden Content

Generated SDK transport output, runnable server code, secrets, and generated SDK control-plane `.sdkwork/` files.

## Related Specs

- `../../../sdkwork-specs/API_SPEC.md`
- `../../../sdkwork-specs/WEB_BACKEND_SPEC.md`
- `../../../sdkwork-specs/BACKEND_UI_SPEC.md`

## Verification

- `pnpm api:materialize:check`
- `python -B -m unittest tests.test_api_contract_directory_standard`
