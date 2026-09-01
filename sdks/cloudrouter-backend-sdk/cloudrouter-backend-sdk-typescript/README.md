# cloudrouter-backend-sdk

Professional TypeScript SDK for SDKWork API.

## Installation

```bash
npm install sdkwork-cloudrouter-backend-sdk-generated-typescript
# or
yarn add sdkwork-cloudrouter-backend-sdk-generated-typescript
# or
pnpm add sdkwork-cloudrouter-backend-sdk-generated-typescript
```

## Quick Start

```typescript
import { SdkworkBackendClient } from 'sdkwork-cloudrouter-backend-sdk-generated-typescript';

const client = new SdkworkBackendClient({
  baseUrl: 'http://localhost:18081',
  timeout: 30000,
});

// Mode A: API Key (recommended for server-to-server calls)
client.setApiKey('your-api-key');

// Use the SDK
const result = await client.commerce.settingsRetrieve();
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```typescript
const client = new SdkworkBackendClient({ baseUrl: 'http://localhost:18081' });
client.setApiKey('your-api-key');
// Sends: Access-Token: <apiKey>
```

### Mode B: Dual Token

```typescript
const client = new SdkworkBackendClient({ baseUrl: 'http://localhost:18081' });
client.setAuthToken('your-auth-token');
client.setAccessToken('your-access-token');
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `setApiKey(...)` together with `setAuthToken(...)` + `setAccessToken(...)` on the same client.

## Configuration (Non-Auth)

```typescript
import { SdkworkBackendClient } from 'sdkwork-cloudrouter-backend-sdk-generated-typescript';

const client = new SdkworkBackendClient({
  baseUrl: 'http://localhost:18081',
  timeout: 30000, // Request timeout in ms
  headers: {      // Custom headers
    'X-Custom-Header': 'value',
  },
});
```

## API Modules

- `client.intelligence` - intelligence API
- `client.commerce` - commerce API
- `client.pricing` - pricing API
- `client.storage` - storage API
- `client.system` - system API

## Usage Examples

### intelligence

```typescript
// List upstream resource catalog
const result = await client.intelligence.upstreamResourceCatalogRetrieve();
```

### commerce

```typescript
// Retrieve
const result = await client.commerce.settingsRetrieve();
```

### pricing

```typescript
// List pricing default regions
const params = {
  q: 'q',
  page: 2,
  page_size: 3,
};
const result = await client.pricing.defaultRegionsList(params);
```

### storage

```typescript
// Backend storage default buckets list
const params = {
  cursor: 'cursor',
  page_size: 2,
  status: 'status',
  logical_scope: 'logical_scope',
  scope_type: 'scope_type',
  scope_id: 'scope_id',
  run_type: 'run_type',
};
const result = await client.storage.defaultBucketsList(params);
```

### system

```typescript
// List cloud router auth settings
const result = await client.system.authSettingsRetrieve();
```

## Error Handling

```typescript
import { SdkworkBackendClient, NetworkError, TimeoutError, AuthenticationError } from 'sdkwork-cloudrouter-backend-sdk-generated-typescript';

try {
  const result = await client.commerce.settingsRetrieve();
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

TypeScript check and publish commands use pnpm to materialize workspace dependency versions in a temporary tarball. They reject local-only dependency protocols before npm publication and do not rewrite the source `package.json`.

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

> Set `NPM_TOKEN` (and optional `NPM_REGISTRY_URL`) before release publish.

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
