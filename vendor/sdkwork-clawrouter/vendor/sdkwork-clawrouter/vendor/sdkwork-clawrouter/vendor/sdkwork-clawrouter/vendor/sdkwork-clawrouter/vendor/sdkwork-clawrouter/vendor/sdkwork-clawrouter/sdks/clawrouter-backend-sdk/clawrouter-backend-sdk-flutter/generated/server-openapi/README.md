# clawrouter-backend-sdk (Flutter)

SDKWork Claw Router backend API SDK flutter generated transport SDK

## Installation

Add to `pubspec.yaml`:

```yaml
dependencies:
  clawrouter_backend_sdk: ^0.1.0
```

## Quick Start

```dart
import 'package:clawrouter_backend_sdk/clawrouter_backend_sdk.dart';

final client = SdkworkBackendClient.withBaseUrl(baseUrl: 'http://localhost:18081');
client.setAuthToken('your-auth-token');
client.setAccessToken('your-access-token');

// Use the SDK
final result = await client.ai.channelGroupsList();
print(result);
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```dart
final client = SdkworkBackendClient.withBaseUrl(baseUrl: 'http://localhost:18081');

// Set custom headers
client.setHeader('X-Custom-Header', 'value');
```

## API Modules

- `client.ai` - ai API
- `client.content` - content API
- `client.iam` - iam API
- `client.integration` - integration API
- `client.mcp` - mcp API
- `client.messaging` - messaging API
- `client.prompts` - prompts API
- `client.serviceProviders` - service_providers API
- `client.sites` - sites API
- `client.storage` - storage API
- `client.system` - system API

## Usage Examples

### ai
```dart
// List groups
final result = await client.ai.channelGroupsList();
print(result);
```

### content
```dart
// List announcements
final result = await client.content.announcementsList();
print(result);
```

### iam
```dart
// Delete API key
final apiKeyId = '1';
final result = await client.iam.apiKeysDelete(apiKeyId);
print(result);
```

### integration
```dart
// List channels
final result = await client.integration.channelsList();
print(result);
```

### mcp
```dart
// List MCP servers
final params = <String, dynamic>{
  'page': 'page',
  'page_size': 'page-size',
  'q': 'q',
  'transport': 'transport',
  'visibility': 'visibility',
  'status': 'status',
  'category_id': '1',
};
final result = await client.mcp.serversList(params);
print(result);
```

### messaging
```dart
// Messaging provider accounts list
final params = <String, dynamic>{
  'page': 'page',
  'page_size': 'page-size',
  'q': 'q',
  'status': 'status',
  'channel': 'sms',
  'provider_code': 'ok',
};
final result = await client.messaging.providerAccountsList(params);
print(result);
```

### prompts
```dart
// List admin prompts
final params = <String, dynamic>{
  'page': 'page',
  'page_size': 'page-size',
  'q': 'q',
  'prompt_type': 'prompt-type',
  'visibility': 'visibility',
  'status': 'status',
  'category_id': '1',
};
final result = await client.prompts.definitionsList(params);
print(result);
```

### service_providers
```dart
// Service Provider Adjustments List
final params = <String, dynamic>{
  'page': 'page',
  'page_size': 'page-size',
  'status': 'status',
  'provider_id': '1',
  'seller_provider_id': '1',
  'buyer_provider_id': '1',
  'edge_id': '1',
};
final result = await client.serviceProviders.adjustmentsList(params);
print(result);
```

### sites
```dart
// List sites
final params = <String, dynamic>{
  'q': 'q',
};
final result = await client.sites.siteCatalogList(params);
print(result);
```

### storage
```dart
// List storage providers
final result = await client.storage.ossProvidersList();
print(result);
```

### system
```dart
// Retrieve IAM auth runtime settings
final result = await client.system.authSettingsRetrieve();
print(result);
```

## Error Handling

```dart
try {
  final result = await client.ai.channelGroupsList();
  print(result);
} catch (e) {
  print('Error: $e');
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

> Ensure `dart pub publish --dry-run` passes before release publish.

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
