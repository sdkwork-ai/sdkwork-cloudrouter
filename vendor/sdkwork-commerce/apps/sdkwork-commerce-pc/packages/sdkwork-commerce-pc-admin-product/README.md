# sdkwork-commerce-pc-admin-product

Commerce-owned PC internal admin product center package.

## Public API

- `CatalogAdmin`
- `CommerceProductAdmin`
- `createCommerceProductAdminService`
- `createCommerceProductAdminWorkspaceManifest`
- product, category, SKU, attribute, and price-list admin page components

## Integration

Hosts import this package through its public root export. Services use `@sdkwork/commerce-service`, which must be configured by the host bootstrap with Commerce app/backend SDK clients.

Claw Router may keep a compatibility package that re-exports this package during the migration window, but Claw Router must not call its own product/catalog backend SDK methods for product center administration.
