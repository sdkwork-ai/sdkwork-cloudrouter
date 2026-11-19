# @sdkwork/cloudrouter-pc-hardware-market — 智能硬件市场 (Smart Hardware Market)

The public storefront of the Cloud Router Product Center. It is a real mall:
buyers browse published physical hardware products, compare SKU configurations,
fill a shipping address, review the server quote, and place an order that the
shared cashier settles.

## Surfaces

| Route | Page | Purpose |
| --- | --- | --- |
| `/hardware-market` | `HardwareMarketPage` | Hero, category rail, search, sort, product grid, pagination |
| `/hardware-market/product/:productId` | `HardwareMarketProductPage` | Product detail, SKU picker, quantity, checkout entry |

The header entry is `nav.hardwareMarket` (`智能硬件市场` / `Hardware Market`) in
the shared portal navbar.

## Capability integration

- **Catalog (商品中心)** — reads through the generated buyer-facing
  `@sdkwork/catalog-app-sdk` port exposed by
  `@sdkwork/cloudroutes-pc-commons/sdk-clients`:
  `catalog.categories.list`, `catalog.products.list`, `catalog.products.retrieve`,
  `catalog.products.skus.list`. The storefront pins `product_type=physical`, which
  is what makes this the hardware market rather than a generic catalog.
- **Checkout (订单/收银台)** — the physical-goods service wired in
  `@sdkwork/cloudroutes-pc-commons/domain-service-providers`
  (`createSdkworkPhysicalPurchaseService`) prepares a checkout session from the
  selected `skuId` plus shipping address, reads the server quote, and places the
  order. The page then hands the order to the existing `/me/orders/:orderId/cashier`
  route, so payment never forks a second protocol.
- **Merchandising** — the hero links operators to `/admin/products/list`, the
  Product Center admin module that owns products, categories, SKUs, media, and
  inventory. Nothing is cached in the storefront: a publish is visible on reload.

No raw HTTP, no manual auth headers, no generated-SDK edits. Prices and ids stay
strings end to end (int64 wire contract); minor-unit currency formatting is the
only place a number is derived, and only inside the safe integer range.

## Localization

Copy is authored as `src/i18n/<locale>/commerce/hardware-market/*` and composed
by `@sdkwork/cloudrouter-pc-i18n`. English and Simplified Chinese key sets are
identical; the host merge fails on drift.

## Verification

```bash
pnpm --filter @sdkwork/cloudrouter-pc-hardware-market typecheck
pnpm --filter @sdkwork/cloudrouter-pc-hardware-market test
node ../../../sdkwork-specs/tools/check-i18n-standard.mjs --root .
```

The storefront renders a deterministic hardware tile for each product because the
buyer-facing catalog API publishes identity and price but not product media; the
tile hue is seeded from `productNo` and the glyph from the product/category copy.
