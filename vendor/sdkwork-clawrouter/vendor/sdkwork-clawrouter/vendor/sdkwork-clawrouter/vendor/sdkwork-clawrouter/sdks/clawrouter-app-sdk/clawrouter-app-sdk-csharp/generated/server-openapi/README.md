# clawrouter-app-sdk (C#)

SDKWork Claw Router app API SDK csharp generated transport SDK

## Installation

```bash
dotnet add package Sdkwork.ClawRouter.App.Sdk
```

Or add to your `.csproj`:

```xml
<PackageReference Include="Sdkwork.ClawRouter.App.Sdk" Version="0.1.0" />
```

## Quick Start

```csharp
using Sdkwork.ClawRouter.App.Models;
using Sdkwork.ClawRouter.App;
using SDKwork.Common.Core;

var config = new SdkConfig("http://localhost:18082");
var client = new SdkworkAppClient(config);
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
var config = new SdkConfig("http://localhost:18082");
var client = new SdkworkAppClient(config);

// Set custom headers
client.SetHeader("X-Custom-Header", "value");
```

## API Modules

- `client.Ai` - ai API
- `client.Chat` - chat API
- `client.Iam` - iam API
- `client.Notification` - notification API
- `client.Runtime` - runtime API
- `client.System` - system API

## Usage Examples

### ai

```csharp
// List groups
var result = await client.Ai.ChannelGroupsListAsync();
Console.WriteLine(result);
```

### chat

```csharp
// List product chat conversations
var query = new Dictionary<string, object>
{
    ["page"] = "page",
    ["page_size"] = "page-size",
};
var result = await client.Chat.ConversationsListAsync(query);
Console.WriteLine(result);
```

### iam

```csharp
// List keys
var result = await client.Iam.ApiKeysListAsync();
Console.WriteLine(result);
```

### notification

```csharp
// List portal notifications
var query = new Dictionary<string, object>
{
    ["include_archived"] = true,
    ["page"] = "page",
    ["page_size"] = "page-size",
};
var result = await client.Notification.NotificationsListAsync(query);
Console.WriteLine(result);
```

### runtime

```csharp
// List runtime invocations
var query = new Dictionary<string, object>
{
    ["page"] = "page",
    ["page_size"] = "page-size",
    ["conversation_id"] = "1",
    ["chat_turn_id"] = "1",
    ["agent_session_id"] = "1",
    ["runtime"] = "runtime",
    ["status"] = "status",
};
var result = await client.Runtime.InvocationsListAsync(query);
Console.WriteLine(result);
```

### system

```csharp
// Retrieve public site runtime branding settings
var query = new Dictionary<string, object>
{
    ["tenant_code"] = "ok",
    ["organization_code"] = "ok",
};
var result = await client.System.SiteRuntimeRetrieveAsync(query);
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
