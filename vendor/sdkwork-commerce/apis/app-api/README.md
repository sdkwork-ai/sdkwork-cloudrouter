# apis/app-api/

Commerce app-api surface OpenAPI contracts.

## Purpose

This directory contains the author-owned OpenAPI 3.1.2 contract for the Commerce app-api surface. These contracts define authenticated app-user-facing operations such as shop self-service, wallet, checkout, orders, payments, membership, and invoices.

## Owner

sdkwork-commerce repository maintainers.

## Allowed Content

- `commerce/commerce-app-api.openapi.json`: the app-api OpenAPI contract.
- Route, schema, example, changelog, and test subdirectories when the contract grows.

## Forbidden Content

- Generated SDK output (belongs in `sdks/`).
- Backend-admin operations (belongs in `apis/backend-api/`).
- Public/open operations (belongs in `apis/open-api/`).
- Secrets, credentials, or runtime state.

## Related Specs

- `../../sdkwork-specs/API_SPEC.md`
- `../../sdkwork-specs/WEB_BACKEND_SPEC.md`
- `../../sdkwork-specs/SDK_SPEC.md`

## Verification

- `pnpm run sdk:check`
