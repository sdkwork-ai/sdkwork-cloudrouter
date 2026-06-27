# @sdkwork/commerce-pc-commons

Domain-neutral Commerce PC helpers shared by shell and feature packages.

This package may expose small route filters, visual identity constants, formatting helpers, and future design-system adapters. It must not own business pages, SDK client construction, route ownership, domain services, or backend-admin behavior.

## Standards

- `../../../../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`
- `../../../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`
- `../../../../../../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`
- `../../../../../../sdkwork-specs/COMPONENT_SPEC.md`

## Verification

```bash
pnpm --filter @sdkwork/commerce-pc-commons typecheck
node --test sdks/test/verify-commerce-standard-architecture.test.mjs
```
