# clawrouter-backend-sdk (C#)

SDKWork Claw Router backend API SDK csharp generated transport SDK

## Installation

```bash
dotnet add package Sdkwork.ClawRouter.Backend.Sdk
```

Or add to your `.csproj`:

```xml
<PackageReference Include="Sdkwork.ClawRouter.Backend.Sdk" Version="0.1.0" />
```

## Quick Start

```csharp
using Sdkwork.ClawRouter.Backend.Models;
using Sdkwork.ClawRouter.Backend;
using SDKwork.Common.Core;

var config = new SdkConfig("http://localhost:18081");
var client = new SdkworkBackendClient(config);
client.SetAuthToken("your-auth-token");
client.SetAccessToken("your-access-token");

var result = await client.Ai.ChannelGroupsListAsync();
Console.WriteLine(result);
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```csharp
var config = new SdkConfig("http://localhost:18081");
var client = new SdkworkBackendClient(config);

// Set custom headers
client.SetHeader("X-Custom-Header", "value");
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

```csharp
// List groups
var result = await client.Ai.ChannelGroupsListAsync();
Console.WriteLine(result);
```

### content

```csharp
// List announcements
var result = await client.Content.AnnouncementsListAsync();
Console.WriteLine(result);
```

### iam

```csharp
// Delete API key
var apiKeyId = "1";
var result = await client.Iam.ApiKeysDeleteAsync(apiKeyId);
Console.WriteLine(result);
```

### integration

```csharp
// List channels
var result = await client.Integration.ChannelsListAsync();
Console.WriteLine(result);
```

### mcp

```csharp
// List MCP servers
var query = new Dictionary<string, object>
{
    ["page"] = "page",
    ["page_size"] = "page-size",
    ["q"] = "q",
    ["transport"] = "transport",
    ["visibility"] = "visibility",
    ["status"] = "status",
    ["category_id"] = "1",
};
var result = await client.Mcp.ServersListAsync(query);
Console.WriteLine(result);
```

### messaging

```csharp
// Messaging provider accounts list
var query = new Dictionary<string, object>
{
    ["page"] = "page",
    ["page_size"] = "page-size",
    ["q"] = "q",
    ["status"] = "status",
    ["channel"] = "sms",
    ["provider_code"] = "ok",
};
var result = await client.Messaging.ProviderAccountsListAsync(query);
Console.WriteLine(result);
```

### prompts

```csharp
// List admin prompts
var query = new Dictionary<string, object>
{
    ["page"] = "page",
    ["page_size"] = "page-size",
    ["q"] = "q",
    ["prompt_type"] = "prompt-type",
    ["visibility"] = "visibility",
    ["status"] = "status",
    ["category_id"] = "1",
};
var result = await client.Prompts.DefinitionsListAsync(query);
Console.WriteLine(result);
```

### service_providers

```csharp
// Service Provider Adjustments List
var query = new Dictionary<string, object>
{
    ["page"] = "page",
    ["page_size"] = "page-size",
    ["status"] = "status",
    ["provider_id"] = "1",
    ["seller_provider_id"] = "1",
    ["buyer_provider_id"] = "1",
    ["edge_id"] = "1",
};
var result = await client.ServiceProviders.AdjustmentsListAsync(query);
Console.WriteLine(result);
```

### sites

```csharp
// List sites
var query = new Dictionary<string, object>
{
    ["q"] = "q",
};
var result = await client.Sites.SiteCatalogListAsync(query);
Console.WriteLine(result);
```

### storage

```csharp
// List storage providers
var result = await client.Storage.OssProvidersListAsync();
Console.WriteLine(result);
```

### system

```csharp
// Retrieve IAM auth runtime settings
var result = await client.System.AuthSettingsRetrieveAsync();
Console.WriteLine(result);
```

## Error Handling

```csharp
try
{
    await client.Ai.ChannelGroupsListAsync();
}
catch (HttpRequestException ex)
{
    Console.WriteLine($"Error: {ex.Message}");
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

> Configure NuGet registry credentials before release publish.

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
