# apis/backend-api/

Commerce backend-api surface OpenAPI contracts.

## Purpose

This directory contains the author-owned OpenAPI 3.1.2 contract for the Commerce backend-api surface. These contracts define backend-admin operations for internal company staff, operators, and platform administrators such as shop management, catalog admin, payment admin, and commerce reports.

## Owner

sdkwork-commerce repository maintainers.

## Allowed Content

- `commerce/commerce-backend-api.openapi.json`: the backend-api OpenAPI contract.
- Route, schema, example, changelog, and test subdirectories when the contract grows.

## Forbidden Content

- Generated SDK output (belongs in `sdks/`).
- App-user-facing operations (belongs in `apis/app-api/`).
- Public/open operations (belongs in `apis/open-api/`).
- Secrets, credentials, or runtime state.

## Related Specs

- `../../sdkwork-specs/API_SPEC.md`
- `../../sdkwork-specs/WEB_BACKEND_SPEC.md`
- `../../sdkwork-specs/SDK_SPEC.md`

## Verification

- `pnpm run sdk:check`
