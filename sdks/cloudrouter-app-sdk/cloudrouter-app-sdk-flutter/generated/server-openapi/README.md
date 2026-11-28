# cloudrouter-app-sdk (Flutter)

SDKWork Cloud Router app API SDK flutter generated transport SDK

## Installation

Add to `pubspec.yaml`:

```yaml
dependencies:
  cloudrouter_app_sdk: ^0.1.0
```

## Quick Start

```dart
import 'package:cloudrouter_app_sdk/cloudrouter_app_sdk.dart';

final client = SdkworkAppClient.withBaseUrl(baseUrl: 'http://localhost:18082');
client.setAuthToken('your-auth-token');
client.setAccessToken('your-access-token');

// Use the SDK
final result = await client.ai.agentsList();
print(result);
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```dart
final client = SdkworkAppClient.withBaseUrl(baseUrl: 'http://localhost:18082');

// Set custom headers
client.setHeader('X-Custom-Header', 'value');
```

## API Modules

- `client.ai` - ai API
- `client.iam` - iam API
- `client.system` - system API
- `client.notification` - notification API
- `client.runtime` - runtime API

## Usage Examples

### ai
```dart
// Resolve console hardware agents
final result = await client.ai.agentsList();
print(result);
```

### iam
```dart
// List settings
final result = await client.iam.usersSettingsRetrieve();
print(result);
```

### system
```dart
// Resolve console hardware devices
final result = await client.system.iotDevicesList();
print(result);
```

### notification
```dart
// List notifications
final params = <String, dynamic>{
  'app_id': '1',
  'include_archived': false,
  'page': 3,
  'page_size': 4,
};
final result = await client.notification.notificationsList(params);
print(result);
```

### runtime
```dart
// List runtime invocations
final params = <String, dynamic>{
  'page': 1,
  'page_size': 2,
  'conversation_id': '1',
  'chat_turn_id': '1',
  'agent_session_id': '1',
  'runtime': 'runtime',
  'status': 'pending',
};
final result = await client.runtime.invocationsList(params);
print(result);
```

## Error Handling

```dart
try {
  final result = await client.ai.agentsList();
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
