# sdkwork-commerce-backend-sdk

Generated SDKWork v3 dual-token transport SDK.

## Installation

```bash
npm install sdkwork-commerce-backend-sdk-generated-typescript
# or
yarn add sdkwork-commerce-backend-sdk-generated-typescript
# or
pnpm add sdkwork-commerce-backend-sdk-generated-typescript
```

## Quick Start

```typescript
import { SdkworkBackendClient } from 'sdkwork-commerce-backend-sdk-generated-typescript';

const client = new SdkworkBackendClient({
  baseUrl: 'http://127.0.0.1:18080',
  timeout: 30000,
});

// Authentication
client.setAuthToken('your-auth-token');
client.setAccessToken('your-access-token');

// Use the SDK
const result = await client.recharges.settings.management.retrieve();
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```typescript
import { SdkworkBackendClient } from 'sdkwork-commerce-backend-sdk-generated-typescript';

const client = new SdkworkBackendClient({
  baseUrl: 'http://127.0.0.1:18080',
  timeout: 30000, // Request timeout in ms
  headers: {      // Custom headers
    'X-Custom-Header': 'value',
  },
});
```

## API Modules

- `client.shops` - shops API
- `client.catalog` - catalog API
- `client.inventory` - inventory API
- `client.orders` - orders API
- `client.payments` - payments API
- `client.refunds` - refunds API
- `client.afterSales` - after_sales API
- `client.fulfillments` - fulfillments API
- `client.shipments` - shipments API
- `client.entitlements` - entitlements API
- `client.memberships` - memberships API
- `client.recharges` - recharges API
- `client.wallet` - wallet API
- `client.promotions` - promotions API
- `client.invoices` - invoices API
- `client.commerceReports` - commerce_reports API
- `client.reports` - reports API
- `client.audit` - audit API

## Usage Examples

### shops

```typescript
// Shops management list.
const params = {
  q: 'q',
  shop_type: 'shop_type',
  operation_status: 'operation_status',
  review_status: 'review_status',
  page: 5,
  page_size: 6,
};
const result = await client.shops.management.list(params);
```

### catalog

```typescript
// Catalog categories management list.
const params = {
  parent_id: 'parent_id',
  status: 'status',
  page: 3,
  page_size: 4,
};
const result = await client.catalog.categories.management.list(params);
```

### inventory

```typescript
// Inventory stocks list.
const params = {
  sku_id: 'sku_id',
  warehouse_id: 'warehouse_id',
  status: 'status',
  page: 4,
  page_size: 5,
};
const result = await client.inventory.stocks.list(params);
```

### orders

```typescript
// Orders cancellations list.
const params = {
  status: 'status',
  page: 2,
  page_size: 3,
};
const result = await client.orders.cancellations.list(params);
```

### payments

```typescript
// Payments providers list.
const params = {
  status: 'status',
};
const result = await client.payments.providers.list(params);
```

### refunds

```typescript
// Refunds management list.
const params = {
  status: 'status',
  page: 2,
  page_size: 3,
};
const result = await client.refunds.management.list(params);
```

### after_sales

```typescript
// After Sales management list.
const params = {
  status: 'status',
  after_sales_type: 'after_sales_type',
  order_id: 'order_id',
  shop_id: 'shop_id',
  page: 5,
  page_size: 6,
};
const result = await client.afterSales.management.list(params);
```

### fulfillments

```typescript
// Fulfillments management list.
const params = {
  status: 'status',
  page: 2,
  page_size: 3,
};
const result = await client.fulfillments.management.list(params);
```

### shipments

```typescript
// Shipments list.
const params = {
  status: 'status',
  page: 2,
  page_size: 3,
};
const result = await client.shipments.list(params);
```

### entitlements

```typescript
// Entitlements accounts list.
const params = {
  subject_type: 'subject_type',
  subject_id: 'subject_id',
  benefit_id: 'benefit_id',
  status: 'status',
  page: 5,
  page_size: 6,
};
const result = await client.entitlements.accounts.list(params);
```

### memberships

```typescript
// Memberships plans management list.
const params = {
  status: 'status',
};
const result = await client.memberships.plans.management.list(params);
```

### recharges

```typescript
// Recharges settings management retrieve.
const result = await client.recharges.settings.management.retrieve();
```

### wallet

```typescript
// Wallet holds list.
const params = {
  status: 'status',
  page: 2,
  page_size: 3,
};
const result = await client.wallet.holds.list(params);
```

### promotions

```typescript
// Promotions codes redemptions list.
const params = {
  page: 1,
  page_size: 2,
  code_status: 'code_status',
};
const result = await client.promotions.codes.redemptions.list(params);
```

### invoices

```typescript
// Invoices management list.
const params = {
  status: 'status',
  page: 2,
  page_size: 3,
};
const result = await client.invoices.management.list(params);
```

### commerce_reports

```typescript
// Commerce Reports payment Reconciliation retrieve.
const params = {
  provider_code: 'provider_code',
  start_time: 'start_time',
  end_time: 'end_time',
};
const result = await client.commerceReports.paymentReconciliation.retrieve(params);
```

### reports

```typescript
// Reports commerce Overview retrieve.
const params = {
  period_start: 'period_start',
  period_end: 'period_end',
};
const result = await client.reports.commerceOverview.retrieve(params);
```

### audit

```typescript
// Audit commerce Events list.
const params = {
  actor_id: 'actor_id',
  source_type: 'source_type',
  page: 3,
  page_size: 4,
};
const result = await client.audit.commerceEvents.list(params);
```

## Error Handling

```typescript
import { SdkworkBackendClient, NetworkError, TimeoutError, AuthenticationError } from 'sdkwork-commerce-backend-sdk-generated-typescript';

try {
  const result = await client.recharges.settings.management.retrieve();
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
