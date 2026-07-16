# clawrouter-app-domain-transport

SDKWork Claw Router app API SDK federated domain transport

## Installation

```bash
npm install sdkwork-clawrouter-app-sdk-domains-generated-typescript
# or
yarn add sdkwork-clawrouter-app-sdk-domains-generated-typescript
# or
pnpm add sdkwork-clawrouter-app-sdk-domains-generated-typescript
```

## Quick Start

```typescript
import { SdkworkAppClient } from 'sdkwork-clawrouter-app-sdk-domains-generated-typescript';

const client = new SdkworkAppClient({
  baseUrl: 'http://localhost:18082',
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
import { SdkworkAppClient } from 'sdkwork-clawrouter-app-sdk-domains-generated-typescript';

const client = new SdkworkAppClient({
  baseUrl: 'http://localhost:18082',
  timeout: 30000, // Request timeout in ms
  headers: {      // Custom headers
    'X-Custom-Header': 'value',
  },
});
```

## API Modules

- `client.accounts` - accounts API
- `client.addresses` - addresses API
- `client.afterSales` - after_sales API
- `client.billing` - billing API
- `client.cart` - cart API
- `client.catalog` - catalog API
- `client.checkout` - checkout API
- `client.fulfillments` - fulfillments API
- `client.invoices` - invoices API
- `client.memberships` - memberships API
- `client.orders` - orders API
- `client.payments` - payments API
- `client.promotions` - promotions API
- `client.recharges` - recharges API
- `client.refunds` - refunds API
- `client.shipments` - shipments API
- `client.wallet` - wallet API
- `client.withdrawals` - withdrawals API

## Usage Examples

### accounts

```typescript
// Retrieve
const result = await client.accounts.current.summary.retrieve();
```

### addresses

```typescript
// List
const result = await client.addresses.list();
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

### billing

```typescript
// List
const result = await client.billing.history.list();
```

### cart

```typescript
// Retrieve
const result = await client.cart.current.retrieve();
```

### catalog

```typescript
// List
const result = await client.catalog.attributes.list();
```

### checkout

```typescript
// Checkout sessions retrieve.
const checkoutSessionId = '1';
const result = await client.checkout.sessions.retrieve(checkoutSessionId);
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

### invoices

```typescript
// List
const result = await client.invoices.list();
```

### memberships

```typescript
// List
const result = await client.memberships.benefits.list();
```

### orders

```typescript
// Orders statistics retrieve.
const result = await client.orders.statistics.retrieve();
```

### payments

```typescript
// List
const result = await client.payments.methods.list();
```

### promotions

```typescript
// List
const result = await client.promotions.offers.list();
```

### recharges

```typescript
// Recharges settings retrieve.
const result = await client.recharges.settings.retrieve();
```

### refunds

```typescript
// List
const result = await client.refunds.list();
```

### shipments

```typescript
// Shipments retrieve.
const shipmentId = '1';
const result = await client.shipments.retrieve(shipmentId);
```

### wallet

```typescript
// List
const result = await client.wallet.accounts.list();
```

### withdrawals

```typescript
// Withdrawal requests retrieve.
const withdrawalRequestId = '1';
const result = await client.withdrawals.requests.retrieve(withdrawalRequestId);
```

## Error Handling

```typescript
import { SdkworkAppClient, NetworkError, TimeoutError, AuthenticationError } from 'sdkwork-clawrouter-app-sdk-domains-generated-typescript';

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
