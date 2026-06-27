# sdkwork-commerce-app-sdk

Generated SDKWork v3 dual-token transport SDK.

## Installation

```bash
npm install sdkwork-commerce-app-sdk-generated-typescript
# or
yarn add sdkwork-commerce-app-sdk-generated-typescript
# or
pnpm add sdkwork-commerce-app-sdk-generated-typescript
```

## Quick Start

```typescript
import { SdkworkAppClient } from 'sdkwork-commerce-app-sdk-generated-typescript';

const client = new SdkworkAppClient({
  baseUrl: 'http://127.0.0.1:18080',
  timeout: 30000,
});

// Authentication
client.setAuthToken('your-auth-token');
client.setAccessToken('your-access-token');

// Use the SDK
const result = await client.accounts.current.summary.retrieve();
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```typescript
import { SdkworkAppClient } from 'sdkwork-commerce-app-sdk-generated-typescript';

const client = new SdkworkAppClient({
  baseUrl: 'http://127.0.0.1:18080',
  timeout: 30000, // Request timeout in ms
  headers: {      // Custom headers
    'X-Custom-Header': 'value',
  },
});
```

## API Modules

- `client.accounts` - accounts API
- `client.shops` - shops API
- `client.catalog` - catalog API
- `client.cart` - cart API
- `client.addresses` - addresses API
- `client.checkout` - checkout API
- `client.orders` - orders API
- `client.payments` - payments API
- `client.refunds` - refunds API
- `client.afterSales` - after_sales API
- `client.fulfillments` - fulfillments API
- `client.shipments` - shipments API
- `client.memberships` - memberships API
- `client.recharges` - recharges API
- `client.billing` - billing API
- `client.wallet` - wallet API
- `client.promotions` - promotions API
- `client.invoices` - invoices API

## Usage Examples

### accounts

```typescript
// Accounts current summary retrieve.
const result = await client.accounts.current.summary.retrieve();
```

### shops

```typescript
// Shops current retrieve.
const result = await client.shops.current.retrieve();
```

### catalog

```typescript
// Catalog attributes list.
const params = {
  category_id: 'category_id',
};
const result = await client.catalog.attributes.list(params);
```

### cart

```typescript
// Cart current retrieve.
const result = await client.cart.current.retrieve();
```

### addresses

```typescript
// Addresses list.
const params = {
  page: 1,
  page_size: 2,
};
const result = await client.addresses.list(params);
```

### checkout

```typescript
// Checkout sessions create.
const body = {};
const result = await client.checkout.sessions.create(body);
```

### orders

```typescript
// Orders statistics retrieve.
const result = await client.orders.statistics.retrieve();
```

### payments

```typescript
// Payments methods list.
const result = await client.payments.methods.list();
```

### refunds

```typescript
// Refunds list.
const params = {
  status: 'status',
  page: 2,
  page_size: 3,
};
const result = await client.refunds.list(params);
```

### after_sales

```typescript
// After Sales requests list.
const params = {
  status: 'status',
  order_id: 'order_id',
  page: 3,
  page_size: 4,
};
const result = await client.afterSales.requests.list(params);
```

### fulfillments

```typescript
// Fulfillments list.
const params = {
  status: 'status',
  page: 2,
  page_size: 3,
};
const result = await client.fulfillments.list(params);
```

### shipments

```typescript
// Shipments retrieve.
const shipmentId = '1';
const result = await client.shipments.retrieve(shipmentId);
```

### memberships

```typescript
// Memberships current retrieve.
const result = await client.memberships.current.retrieve();
```

### recharges

```typescript
// Recharges settings retrieve.
const result = await client.recharges.settings.retrieve();
```

### billing

```typescript
// Billing history list.
const params = {
  page: 1,
  page_size: 2,
  type: 'type',
  status: 'status',
  cursor: 'cursor',
};
const result = await client.billing.history.list(params);
```

### wallet

```typescript
// Wallet overview retrieve.
const result = await client.wallet.overview.retrieve();
```

### promotions

```typescript
// Promotions user Coupons list.
const params = {
  status: 'status',
  page: 2,
  page_size: 3,
};
const result = await client.promotions.userCoupons.list(params);
```

### invoices

```typescript
// Invoices statistics retrieve.
const result = await client.invoices.statistics.retrieve();
```

## Error Handling

```typescript
import { SdkworkAppClient, NetworkError, TimeoutError, AuthenticationError } from 'sdkwork-commerce-app-sdk-generated-typescript';

try {
  const result = await client.accounts.current.summary.retrieve();
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof TimeoutError) {
    console.error('Request timed out:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    throw error;
  }
}
```

## Publishing

This SDK includes cross-platform publish scripts in `bin/`:
- `bin/publish-core.mjs`
- `bin/publish.sh`
- `bin/publish.ps1`

### Check

```bash
./bin/publish.sh --action check
```

### Publish

```bash
./bin/publish.sh --action publish --channel release
```

```powershell
.\bin\publish.ps1 --action publish --channel test --dry-run
```

> Configure npm registry credentials before release publish.

## License

MIT

## Regeneration Contract

- HTTP/OpenAPI generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- HTTP/OpenAPI generation also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- HTTP/OpenAPI apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put HTTP/OpenAPI hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across HTTP/OpenAPI regenerations.
- If an HTTP/OpenAPI generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
- RPC SDK source workspaces use convention-first evidence by default: RPC SDK family naming, language workspace naming, `rpc/*.manifest.json`, proto source references, generated client source, and native package manifests.
- Use `sdkgen inspect --protocol rpc` to verify RPC convention evidence. Request persisted generator evidence only with `--emit-control-plane` for release, CI, audit, or migration workflows; evidence paths are derived by generator convention.
