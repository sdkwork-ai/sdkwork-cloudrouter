# clawrouter-app-sdk (Swift)

SDKWork Claw Router app API SDK swift generated transport SDK

## Installation

Add to `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/sdkwork/ClawRouterAppSdk", from: "0.1.0")
]
```

## Quick Start

```swift
import AppSDK
import SDKworkCommon

let config = SdkConfig(baseUrl: "http://localhost:18082")
let client = SdkworkAppClient(config: config)
client.setAuthToken("your-auth-token")
client.setAccessToken("your-access-token")

// Use the SDK
let result = try await client.ai.channelGroupsList()
print(result)
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```swift
let config = SdkConfig(baseUrl: "http://localhost:18082")
let client = SdkworkAppClient(config: config)

// Set custom headers
client.setHeader("X-Custom-Header", value: "value")
```

## API Modules

- `client.system` - system API
- `client.ai` - ai API
- `client.chat` - chat API
- `client.iam` - iam API
- `client.notification` - notification API
- `client.runtime` - runtime API

## Usage Examples

### system

```swift
// List
let result = try await client.system.afterSalesRequestsList()
print(result)
```

### ai

```swift
// List
let result = try await client.ai.channelGroupsList()
print(result)
```

### chat

```swift
// List
let result = try await client.chat.conversationsList()
print(result)
```

### iam

```swift
// List
let result = try await client.iam.apiKeysList()
print(result)
```

### notification

```swift
// List
let result = try await client.notification.notificationsList()
print(result)
```

### runtime

```swift
// List
let result = try await client.runtime.invocationsList()
print(result)
```

## Error Handling

```swift
do {
    try await client.ai.channelGroupsList()
} catch {
    print("Error: \(error)")
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

> Set `SWIFT_RELEASE_TAG` (or `SDKWORK_RELEASE_TAG`) for tag-based release.

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
