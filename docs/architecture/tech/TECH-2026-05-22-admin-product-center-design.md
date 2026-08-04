> Migrated from `docs/superpowers/specs/2026-05-22-admin-product-center-design.md` on 2026-06-24.
> Owner: SDKWork maintainers
>
> **Cloud Router status (2026-06-29): Superseded.** Live Product Center authority is `sdkwork-cloudrouter-pc-admin-catalog` with `getCloudRouterBackendSdkClient().catalog.*`. See [TECH-2026-06-10-admin-product-center-commercial-design.md](./TECH-2026-06-10-admin-product-center-commercial-design.md).

# Admin Product Center Design (Archive)

Historical control-plane design for catalog + inventory admin workspaces. The bounded-context split (catalog vs inventory) and generated backend SDK boundary remain valid.

## Live Cloud Router Authority

| Concern | Owner |
| --- | --- |
| Catalog admin UI | `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-catalog` |
| Inventory admin UI | `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-inventory` |
| SDK boundary | `createCatalogAdminService()` → `getCloudRouterBackendSdkClient().catalog.*` |
| Routes | `/admin/catalog/*`, `/admin/inventory/*` |

Retired: external commerce PC React embed packages, legacy commerce service facades, monolithic commerce SDK families.

## Verification

```bash
node scripts/check-commerce-debt.mjs
cd apps/sdkwork-cloudrouter-pc && node --test commerce-debt-runtime.test.ts
```
