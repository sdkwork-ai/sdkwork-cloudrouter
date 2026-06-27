# @sdkwork/commerce-pc-admin-core

Commerce PC `backend-admin` runtime metadata and backend SDK family inventory.

This package is the admin-only boundary for backend SDK metadata, route guard descriptors, and operator context contracts. It must not own app login UI, app-api session creation, customer console workflows, or user-facing app SDK wrappers.

## Standards

- `../../../../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`
- `../../../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`
- `../../../../../../sdkwork-specs/BACKEND_UI_SPEC.md`
- `../../../../../../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`
- `../../../../../../sdkwork-specs/COMPONENT_SPEC.md`

## Verification

```bash
pnpm --filter @sdkwork/commerce-pc-admin-core typecheck
node --test sdks/test/verify-commerce-standard-architecture.test.mjs
```
