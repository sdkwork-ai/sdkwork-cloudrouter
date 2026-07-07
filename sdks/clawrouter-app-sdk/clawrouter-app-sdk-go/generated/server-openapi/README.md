# clawrouter-app-sdk (Go)

SDKWork Claw Router app API SDK go generated transport SDK

## Installation

```bash
go get github.com/sdkwork/clawrouter-app-sdk
```

## Quick Start

```go
package main

import (
    "fmt"
    "github.com/sdkwork/clawrouter-app-sdk"
    sdkhttp "github.com/sdkwork/clawrouter-app-sdk/http"

)

func main() {
    cfg := sdkhttp.NewDefaultConfig("http://localhost:18082")
    client := github.com/sdkwork/clawrouter-app-sdk.NewSdkworkAppClientWithConfig(cfg)
    client.SetAuthToken("your-auth-token")
client.SetAccessToken("your-access-token")

    // Use the SDK
    result, err := client.Ai.ChannelGroupsList()
    if err != nil {
        panic(err)
    }
    fmt.Println(result)
}
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```go
cfg := sdkhttp.NewDefaultConfig("http://localhost:18082")
client := github.com/sdkwork/clawrouter-app-sdk.NewSdkworkAppClientWithConfig(cfg)

// Set custom headers
client.SetHeader("X-Custom-Header", "value")
```

## API Modules

- `client.System` - system API
- `client.Ai` - ai API
- `client.Chat` - chat API
- `client.Iam` - iam API
- `client.Notification` - notification API
- `client.Runtime` - runtime API

## Usage Examples

### system

```go
// List
result, err := client.System.AfterSalesRequestsList()
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### ai

```go
// List
result, err := client.Ai.ChannelGroupsList()
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### chat

```go
// List
result, err := client.Chat.ConversationsList()
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### iam

```go
// List
result, err := client.Iam.ApiKeysList()
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### notification

```go
// List
result, err := client.Notification.NotificationsList()
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### runtime

```go
// List
result, err := client.Runtime.InvocationsList()
if err != nil {
    panic(err)
}
fmt.Println(result)
```

## Error Handling

```go
_, err := client.Ai.ChannelGroupsList()
if err != nil {
    // Handle error
    fmt.Println("Error:", err)
    return
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

> Set `GO_RELEASE_TAG` (or `SDKWORK_RELEASE_TAG`) and push tag if needed.

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
