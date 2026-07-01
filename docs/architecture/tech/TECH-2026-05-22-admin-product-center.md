> Migrated from `docs/superpowers/plans/2026-05-22-admin-product-center.md` on 2026-06-24.
> Owner: SDKWork maintainers
>
> **Claw Router status (2026-06-30): Retired from portal.** Commerce catalog/inventory admin packages removed; relay-only admin. See [TECH-2026-06-10-admin-product-center-commercial.md](./TECH-2026-06-10-admin-product-center-commercial.md).

# Admin Product Center Implementation Plan (Archive)

This checklist plan is retired. Do not implement from historical task steps here.

## Former work surface (removed from Claw Router portal)

- `@sdkwork/clawrouter-pc-admin-catalog` — removed
- `@sdkwork/clawrouter-pc-admin-inventory` — removed

Backend catalog APIs may remain for domain composition; portal admin UI is out of scope for Claw Router.

## Verification

```bash
pnpm check:commerce-debt:strict
cd apps/sdkwork-clawrouter-pc && node --test sdk-composition-standard.test.mjs
```
