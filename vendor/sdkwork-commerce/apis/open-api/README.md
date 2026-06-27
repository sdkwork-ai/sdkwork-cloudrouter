# apis/open-api/

Commerce open-api surface OpenAPI contracts.

## Purpose

This directory contains the author-owned OpenAPI 3.1.2 contract for the Commerce open-api surface. These contracts define public-facing operations accessible via API key authentication, such as public product catalog reads and storefront operations.

## Owner

sdkwork-commerce repository maintainers.

## Allowed Content

- `commerce/commerce-open-api.openapi.json`: the open-api OpenAPI contract.
- Route, schema, example, changelog, and test subdirectories when the contract grows.

## Forbidden Content

- Generated SDK output (belongs in `sdks/`).
- Authenticated app-user operations (belongs in `apis/app-api/`).
- Backend-admin operations (belongs in `apis/backend-api/`).
- Secrets, credentials, or runtime state.

## Related Specs

- `../../sdkwork-specs/API_SPEC.md`
- `../../sdkwork-specs/WEB_BACKEND_SPEC.md`
- `../../sdkwork-specs/SDK_SPEC.md`

## Verification

- `pnpm run sdk:check`
