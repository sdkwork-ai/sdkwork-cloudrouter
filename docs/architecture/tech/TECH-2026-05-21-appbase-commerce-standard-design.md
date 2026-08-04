> Migrated from `docs/superpowers/specs/2026-05-21-appbase-commerce-standard-design.md` on 2026-06-24.
> Owner: SDKWork maintainers
>
> **Cloud Router status (2026-06-29): Archived for this repository.** Cloud Router aligns to per-domain capabilities and `cloudrouter-*-domain-transport-generated-typescript`, not a monolithic commerce standard SDK family.

# Appbase Commerce Standard Design (Archive)

Described a no-compatibility commerce standard for appbase repositories. Cloud Router consumes **domain-top-level** backend SDK modules (`wallet`, `catalog`, `memberships`, `promotions`, `inventory`, `invoices`, `orders`, `payments`, …).

See `sdks/cloudrouter-backend-sdk/sdk-manifest.json` and `apps/sdkwork-cloudrouter-pc/specs/component.spec.json` for live capability inventory.

## Verification

```bash
node scripts/check-commerce-debt.mjs
cd apps/sdkwork-cloudrouter-pc && node --test sdk-composition-standard.test.mjs
```
