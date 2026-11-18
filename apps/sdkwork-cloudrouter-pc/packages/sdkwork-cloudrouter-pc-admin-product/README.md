# @sdkwork/cloudrouter-pc-admin-product

Cloud Router PC admin **Product Center (商品中心)** — one header module and one
sidebar tree over the whole commerce chain an operator reasons about:

```
catalog (products → SKUs → brands)
  → taxonomy (categories → category attributes)
    → inventory (stock levels → movements → reservations)
      → fulfillment (shipments → logistics tracking)
```

## Capability ownership

This package owns **presentation and composition only**. Every domain rule lives
in the module that owns it, and the pages reach it through that module's
generated backend SDK:

| Product Center surface | Owning module | Generated SDK | Backend surface |
| --- | --- | --- | --- |
| Products, SKUs, categories, category attributes, brands | storefront catalog (`sdkwork-merchandise` / `@sdkwork/shop-backend-sdk`) | `@sdkwork/shop-backend-sdk` | `/backend/v3/api/catalog/*` |
| Stock levels, movements, reservations | inventory (`@sdkwork/inventory-backend-sdk`) | `@sdkwork/inventory-backend-sdk` | `/backend/v3/api/inventory/*` |
| Shipments, packages, tracking numbers | order (`@sdkwork/order-backend-sdk`) | `@sdkwork/order-backend-sdk` | `/backend/v3/api/shipments/*` |

Consequences that keep the boundary honest:

- No page imports `fetch`, `axios`, or a raw URL. The only data entry point is
  `productCenterService.ts`, which calls the generated client factories exposed
  by `@sdkwork/cloudroutes-pc-commons/sdk-clients`.
- Optimistic concurrency is preserved: every write the backend guards with
  `If-Match` sends back the `version` the caller read, so a stale edit answers
  `41201` instead of silently overwriting another operator.
- Money is never converted to a JavaScript number in the list surfaces; prices
  stay integer minor units and are formatted by `formatMinorAmount`.
- The module does not depend on `react-router-dom`; the only cross-screen links
  are plain anchors, so any host can embed it.

## Composition contract

`src/contribution.ts` is the single source of truth for the admin shell:

- `PRODUCT_CENTER_ADMIN_MODULE_DEF` — header module (`id: 'productCenter'`).
- `PRODUCT_CENTER_ADMIN_MENU` — sidebar items and groups.
- `PRODUCT_CENTER_ADMIN_ROUTE_RECORDS` — `screen` ids the host maps to a page.
- `PRODUCT_CENTER_ADMIN_PERMISSION_HINTS` — `/admin/products` →
  `cloudrouter.admin.access`.

`src/i18n/index.ts` exports `productCenterAdminMessages` (en + zh, key-parity
checked); the host composes it into the admin catalog.

## Verification

```bash
pnpm --filter @sdkwork/cloudrouter-pc-admin-product typecheck
pnpm --filter @sdkwork/cloudrouter-pc-admin-product test
```

The package tests assert the contribution contract, the SDK call mapping
(including `If-Match`), pagination normalization, error projection, and en/zh
key parity.
