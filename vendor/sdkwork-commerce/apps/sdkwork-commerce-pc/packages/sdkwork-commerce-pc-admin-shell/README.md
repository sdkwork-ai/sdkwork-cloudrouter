# @sdkwork/commerce-pc-admin-shell

Commerce PC `backend-admin` shell route metadata and guard descriptors.

This package may expose admin route filtering, admin route prefixes, menu metadata, and guard descriptors. It must not own app user navigation, user console navigation, business data transport, raw HTTP, or SDK client construction.

## Standards

- `../../../../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`
- `../../../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`
- `../../../../../../sdkwork-specs/BACKEND_UI_SPEC.md`
- `../../../../../../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`
- `../../../../../../sdkwork-specs/COMPONENT_SPEC.md`

## Verification

```bash
pnpm --filter @sdkwork/commerce-pc-admin-shell typecheck
node --test sdks/test/verify-commerce-standard-architecture.test.mjs
```
