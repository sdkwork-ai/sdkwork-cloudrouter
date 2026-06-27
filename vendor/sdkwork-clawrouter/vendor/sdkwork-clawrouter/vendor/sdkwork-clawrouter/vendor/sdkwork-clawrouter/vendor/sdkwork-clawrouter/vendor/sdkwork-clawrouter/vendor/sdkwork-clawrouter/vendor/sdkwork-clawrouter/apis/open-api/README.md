# Open API Contracts

## Purpose

Author-owned open-api contract inputs for SDKWork Claw Router gateway and public integration surfaces.

## Owner

SDKWork Claw Router API surface owners.

## Allowed Content

OpenAPI 3.1.2 contract files, route authority notes, examples, changelogs, and validation fixtures grouped by domain.

## Forbidden Content

Generated SDK transport output, runnable server code, secrets, and generated SDK control-plane `.sdkwork/` files.

## Related Specs

- `../../../sdkwork-specs/API_SPEC.md`
- `../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`

## Verification

- `pnpm api:materialize:check`
- `python -B -m unittest tests.test_api_contract_directory_standard`
