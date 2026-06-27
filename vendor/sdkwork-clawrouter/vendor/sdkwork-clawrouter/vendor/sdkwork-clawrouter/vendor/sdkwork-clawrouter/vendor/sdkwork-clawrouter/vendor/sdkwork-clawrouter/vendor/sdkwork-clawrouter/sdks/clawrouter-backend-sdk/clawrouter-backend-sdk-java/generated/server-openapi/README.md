# clawrouter-backend-sdk (Java)

SDKWork Claw Router backend API SDK java generated transport SDK

## Installation

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>com.sdkwork.clawrouter</groupId>
    <artifactId>clawrouter-backend-sdk</artifactId>
    <version>0.1.0</version>
</dependency>
```

Or with Gradle:

```groovy
implementation 'com.sdkwork.clawrouter:clawrouter-backend-sdk:0.1.0'
```

## Quick Start

```java
import com.sdkwork.clawrouter.backend.SdkworkBackendClient;
import com.sdkwork.common.core.Types;
import com.sdkwork.clawrouter.backend.model.*;

public class Main {
    public static void main(String[] args) throws Exception {
        Types.SdkConfig config = new Types.SdkConfig("http://localhost:18081");
        SdkworkBackendClient client = new SdkworkBackendClient(config);
        client.setAuthToken("your-auth-token");
client.setAccessToken("your-access-token");

        // Use the SDK
        ChannelGroupsListResult result = client.getAi().channelGroupsList();
        System.out.println(result);
    }
}
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```java
Types.SdkConfig config = new Types.SdkConfig("http://localhost:18081");
SdkworkBackendClient client = new SdkworkBackendClient(config);

// Set custom headers
client.getHttpClient().setHeader("X-Custom-Header", "value");
```

## API Modules

- `client.getAi()` - ai API
- `client.getContent()` - content API
- `client.getIam()` - iam API
- `client.getIntegration()` - integration API
- `client.getMcp()` - mcp API
- `client.getMessaging()` - messaging API
- `client.getPrompts()` - prompts API
- `client.getServiceProviders()` - service_providers API
- `client.getSites()` - sites API
- `client.getStorage()` - storage API
- `client.getSystem()` - system API

## Usage Examples

### ai

```java
// List groups
ChannelGroupsListResult result = client.getAi().channelGroupsList();
System.out.println(result);
```

### content

```java
// List announcements
AnnouncementsListResult result = client.getContent().announcementsList();
System.out.println(result);
```

### iam

```java
// Delete API key
String apiKeyId = "1";
ApiKeysDeleteResult result = client.getIam().apiKeysDelete(apiKeyId);
System.out.println(result);
```

### integration

```java
// List channels
ChannelsListResult result = client.getIntegration().channelsList();
System.out.println(result);
```

### mcp

```java
// List MCP servers
Map<String, Object> params = new LinkedHashMap<>();
params.put("page", "page");
params.put("page_size", "page-size");
params.put("q", "q");
params.put("transport", "transport");
params.put("visibility", "visibility");
params.put("status", "status");
params.put("category_id", "1");
ServersListResult result = client.getMcp().serversList(params);
System.out.println(result);
```

### messaging

```java
// Messaging provider accounts list
Map<String, Object> params = new LinkedHashMap<>();
params.put("page", "page");
params.put("page_size", "page-size");
params.put("q", "q");
params.put("status", "status");
params.put("channel", "sms");
params.put("provider_code", "ok");
ProviderAccountsListResult result = client.getMessaging().providerAccountsList(params);
System.out.println(result);
```

### prompts

```java
// List admin prompts
Map<String, Object> params = new LinkedHashMap<>();
params.put("page", "page");
params.put("page_size", "page-size");
params.put("q", "q");
params.put("prompt_type", "prompt-type");
params.put("visibility", "visibility");
params.put("status", "status");
params.put("category_id", "1");
DefinitionsListResult result = client.getPrompts().definitionsList(params);
System.out.println(result);
```

### service_providers

```java
// Service Provider Adjustments List
Map<String, Object> params = new LinkedHashMap<>();
params.put("page", "page");
params.put("page_size", "page-size");
params.put("status", "status");
params.put("provider_id", "1");
params.put("seller_provider_id", "1");
params.put("buyer_provider_id", "1");
params.put("edge_id", "1");
AdjustmentsListResult result = client.getServiceProviders().adjustmentsList(params);
System.out.println(result);
```

### sites

```java
// List sites
Map<String, Object> params = new LinkedHashMap<>();
params.put("q", "q");
SiteCatalogListResult result = client.getSites().siteCatalogList(params);
System.out.println(result);
```

### storage

```java
// List storage providers
OssProvidersListResult result = client.getStorage().ossProvidersList();
System.out.println(result);
```

### system

```java
// Retrieve IAM auth runtime settings
AuthSettingsRetrieveResult result = client.getSystem().authSettingsRetrieve();
System.out.println(result);
```

## Error Handling

```java
try {
    ChannelGroupsListResult result = client.getAi().channelGroupsList();
    System.out.println(result);
} catch (Exception e) {
    System.err.println("Error: " + e.getMessage());
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

> Use Maven `settings.xml` credentials and optional `MAVEN_PUBLISH_PROFILE`.

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
