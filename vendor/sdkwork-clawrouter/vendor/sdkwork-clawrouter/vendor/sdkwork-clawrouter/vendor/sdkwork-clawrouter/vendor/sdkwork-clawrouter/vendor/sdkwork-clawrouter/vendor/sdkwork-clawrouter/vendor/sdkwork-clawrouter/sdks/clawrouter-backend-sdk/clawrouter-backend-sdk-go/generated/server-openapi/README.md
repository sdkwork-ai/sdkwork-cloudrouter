# clawrouter-backend-sdk (Go)

SDKWork Claw Router backend API SDK go generated transport SDK

## Installation

```bash
go get github.com/sdkwork/clawrouter-backend-sdk
```

## Quick Start

```go
package main

import (
    "fmt"
    "github.com/sdkwork/clawrouter-backend-sdk"
    sdkhttp "github.com/sdkwork/clawrouter-backend-sdk/http"

)

func main() {
    cfg := sdkhttp.NewDefaultConfig("http://localhost:18081")
    client := github.com/sdkwork/clawrouter-backend-sdk.NewSdkworkBackendClientWithConfig(cfg)
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
cfg := sdkhttp.NewDefaultConfig("http://localhost:18081")
client := github.com/sdkwork/clawrouter-backend-sdk.NewSdkworkBackendClientWithConfig(cfg)

// Set custom headers
client.SetHeader("X-Custom-Header", "value")
```

## API Modules

- `client.Ai` - ai API
- `client.Content` - content API
- `client.Iam` - iam API
- `client.Integration` - integration API
- `client.Mcp` - mcp API
- `client.Messaging` - messaging API
- `client.Prompts` - prompts API
- `client.ServiceProviders` - service_providers API
- `client.Sites` - sites API
- `client.Storage` - storage API
- `client.System` - system API

## Usage Examples

### ai

```go
// List groups
result, err := client.Ai.ChannelGroupsList()
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### content

```go
// List announcements
result, err := client.Content.AnnouncementsList()
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### iam

```go
// Delete API key
apiKeyId := "1"
result, err := client.Iam.ApiKeysDelete(apiKeyId)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### integration

```go
// List channels
result, err := client.Integration.ChannelsList()
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### mcp

```go
// List MCP servers
params := map[string]interface{}{
    "page": "page",
    "page_size": "page_size",
    "q": "q",
    "transport": "transport",
    "visibility": "visibility",
    "status": "status",
    "category_id": "category_id",
}
result, err := client.Mcp.ServersList(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### messaging

```go
// Messaging provider accounts list
params := map[string]interface{}{
    "page": "page",
    "page_size": "page_size",
    "q": "q",
    "status": "status",
    "channel": "sms",
    "provider_code": "provider_code",
}
result, err := client.Messaging.ProviderAccountsList(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### prompts

```go
// List admin prompts
params := map[string]interface{}{
    "page": "page",
    "page_size": "page_size",
    "q": "q",
    "prompt_type": "prompt_type",
    "visibility": "visibility",
    "status": "status",
    "category_id": "category_id",
}
result, err := client.Prompts.DefinitionsList(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### service_providers

```go
// Service Provider Adjustments List
params := map[string]interface{}{
    "page": "page",
    "page_size": "page_size",
    "status": "status",
    "provider_id": "provider_id",
    "seller_provider_id": "seller_provider_id",
    "buyer_provider_id": "buyer_provider_id",
    "edge_id": "edge_id",
}
result, err := client.ServiceProviders.AdjustmentsList(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### sites

```go
// List sites
params := map[string]interface{}{
    "q": "q",
}
result, err := client.Sites.SiteCatalogList(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### storage

```go
// List storage providers
result, err := client.Storage.OssProvidersList()
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### system

```go
// Retrieve IAM auth runtime settings
result, err := client.System.AuthSettingsRetrieve()
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
