> Owner: SDKWork maintainers
> Status: **retired** — superseded by relay-only Cloud Router Admin (2026-06-30)

## Retirement notice

Product Center commercial admin design (`/admin/catalog/*`, `@sdkwork/cloudrouter-pc-admin-catalog`) was removed from Cloud Router before launch. Catalog commerce administration moves to `sdkwork-manager` or the owning commerce application.

Cloud Router retains **model catalog** under `/admin/model/*` via `@sdkwork/models-pc-admin-catalog` (vendors, resources, sites, mappings)—routing metadata, not commerce product admin.

See [TECH-2026-06-10-admin-product-center-commercial.md](./TECH-2026-06-10-admin-product-center-commercial.md) for the current boundary statement.
