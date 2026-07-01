> Migrated from `docs/superpowers/specs/2026-05-22-admin-product-center-design.md` on 2026-06-24.
> Owner: SDKWork maintainers
>
> **Claw Router status (2026-06-29): Superseded.** Live Product Center authority is `sdkwork-clawrouter-pc-admin-catalog` with `getClawRouterBackendSdkClient().catalog.*`. See [TECH-2026-06-10-admin-product-center-commercial-design.md](./TECH-2026-06-10-admin-product-center-commercial-design.md).

# Admin Product Center Design (Archive)

Historical control-plane design for catalog + inventory admin workspaces. The bounded-context split (catalog vs inventory) and generated backend SDK boundary remain valid.

## Live Claw Router Authority

| Concern | Owner |
| --- | --- |
| Catalog admin UI | `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-catalog` |
| Inventory admin UI | `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-inventory` |
| SDK boundary | `createCatalogAdminService()` → `getClawRouterBackendSdkClient().catalog.*` |
| Routes | `/admin/catalog/*`, `/admin/inventory/*` |

Retired: external commerce PC React embed packages, legacy commerce service facades, monolithic commerce SDK families.

## Verification

```bash
node scripts/check-commerce-debt.mjs
cd apps/sdkwork-clawrouter-pc && node --test commerce-debt-runtime.test.ts
```
