# @sdkwork/commerce-pc-shell

Commerce PC app shell, user-facing navigation, and app layout composition.

This package owns shell markup and route navigation rendering. It receives runtime data and page content from the app root. It must not construct SDK clients, call backend APIs, own business services, or import capability package internals.

## Standards

- `../../../../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`
- `../../../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`
- `../../../../../../sdkwork-specs/APP_PC_REACT_UI_SPEC.md`
- `../../../../../../sdkwork-specs/FRONTEND_SPEC.md`
- `../../../../../../sdkwork-specs/COMPONENT_SPEC.md`

## Verification

```bash
pnpm --filter @sdkwork/commerce-pc-shell typecheck
node --test sdks/test/verify-commerce-standard-architecture.test.mjs
```
