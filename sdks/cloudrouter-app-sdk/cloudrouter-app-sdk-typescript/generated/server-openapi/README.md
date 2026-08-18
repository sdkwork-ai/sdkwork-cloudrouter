# cloudrouter-app-sdk

SDKWork Cloud Router app API SDK

## Installation

```bash
npm install @sdkwork/cloudrouter-app-sdk
# or
yarn add @sdkwork/cloudrouter-app-sdk
# or
pnpm add @sdkwork/cloudrouter-app-sdk
```

## Quick Start

```typescript
import { SdkworkAppClient } from '@sdkwork/cloudrouter-app-sdk';

const client = new SdkworkAppClient({
  baseUrl: 'http://localhost:18082',
  timeout: 30000,
});

// Authentication
client.setAuthToken('your-auth-token');
client.setAccessToken('your-access-token');

// Use the SDK
const body = {
  inviteCode: 'inviteCode',
};
const result = await client.iam.invite.validate.create(body);
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```typescript
import { SdkworkAppClient } from '@sdkwork/cloudrouter-app-sdk';

const client = new SdkworkAppClient({
  baseUrl: 'http://localhost:18082',
  timeout: 30000, // Request timeout in ms
  headers: {      // Custom headers
    'X-Custom-Header': 'value',
  },
});
```

## API Modules

- `client.ai` - ai API
- `client.iam` - iam API
- `client.notification` - notification API
- `client.runtime` - runtime API
- `client.system` - system API

## Usage Examples

### ai

```typescript
// List routing usage
const result = await client.ai.routing.usage.retrieve();
```

### iam

```typescript
// Validate invite code
const body = {
  inviteCode: 'inviteCode',
};
const result = await client.iam.invite.validate.create(body);
```

### notification

```typescript
// List notifications
const params = {
  app_id: 'app_id',
  include_archived: false,
  page: 3,
  page_size: 4,
};
const result = await client.notification.list(params);
```

### runtime

```typescript
// List runtime invocations
const params = {
  page: 1,
  page_size: 2,
  conversation_id: 'conversation_id',
  chat_turn_id: 'chat_turn_id',
  agent_session_id: 'agent_session_id',
  runtime: 'runtime',
  status: 'pending',
};
const result = await client.runtime.invocations.list(params);
```

### system

```typescript
// List site branding
const params = {
  tenant_code: 'tenant_code',
  organization_code: 'organization_code',
};
const result = await client.system.site.runtime.retrieve(params);
```

## Error Handling

```typescript
import { SdkworkAppClient, NetworkError, TimeoutError, AuthenticationError } from '@sdkwork/cloudrouter-app-sdk';

try {
  const body = {
    inviteCode: 'inviteCode',
  };
  const result = await client.iam.invite.validate.create(body);
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
