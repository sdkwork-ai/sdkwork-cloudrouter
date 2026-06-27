# sdks/

SDKWork Commerce SDK family workspaces live here.

## Purpose

This directory contains SDK family manifests, authority OpenAPI materialization outputs, derived `sdkgen` inputs, generated language workspaces, and SDK verification tests for Commerce-owned APIs.

## Owner

SDKWork Commerce maintainers own this directory. SDK family changes must follow `../sdkwork-specs/SDK_SPEC.md` and `../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`.

## Allowed Content

- SDK family roots such as `sdkwork-commerce-sdk`, `sdkwork-commerce-app-sdk`, and `sdkwork-commerce-backend-sdk`.
- SDK family metadata, component specs, authority OpenAPI, derived generator inputs, generated language workspaces, and SDK tests.
- Shared SDK verification helpers under `test/` when they span families.

## Forbidden Content

- Authored API contract sources; those live in `apis/`.
- Repository or application workspace skills/plugins; those live in `.sdkwork/`.
- Hand edits to generated SDK transport output under `generated/server-openapi/`.
- Secrets, runtime state, user-private files, or local credentials.

## Related Specs

- `../sdkwork-specs/SDK_SPEC.md`
- `../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`
- `../sdkwork-specs/API_SPEC.md`
- `../sdkwork-specs/TEST_SPEC.md`

## Verification

Run `pnpm run sdk:check` and `pnpm run test:node` after SDK metadata, OpenAPI materialization, or generated SDK family changes.
