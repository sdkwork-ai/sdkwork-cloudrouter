# clawrouter-app-sdk (Java)

SDKWork Claw Router app API SDK java generated transport SDK

## Installation

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>com.sdkwork.clawrouter</groupId>
    <artifactId>clawrouter-app-sdk</artifactId>
    <version>0.1.0</version>
</dependency>
```

Or with Gradle:

```groovy
implementation 'com.sdkwork.clawrouter:clawrouter-app-sdk:0.1.0'
```

## Quick Start

```java
import com.sdkwork.clawrouter.app.SdkworkAppClient;
import com.sdkwork.common.core.Types;
import com.sdkwork.clawrouter.app.model.*;

public class Main {
    public static void main(String[] args) throws Exception {
        Types.SdkConfig config = new Types.SdkConfig("http://localhost:18082");
        SdkworkAppClient client = new SdkworkAppClient(config);
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
Types.SdkConfig config = new Types.SdkConfig("http://localhost:18082");
SdkworkAppClient client = new SdkworkAppClient(config);

// Set custom headers
client.getHttpClient().setHeader("X-Custom-Header", "value");
```

## API Modules

- `client.getSystem()` - system API
- `client.getAi()` - ai API
- `client.getChat()` - chat API
- `client.getIam()` - iam API
- `client.getNotification()` - notification API
- `client.getRuntime()` - runtime API

## Usage Examples

### system

```java
// List
AfterSalesRequestsListResult result = client.getSystem().afterSalesRequestsList();
System.out.println(result);
```

### ai

```java
// List
ChannelGroupsListResult result = client.getAi().channelGroupsList();
System.out.println(result);
```

### chat

```java
// List
ConversationsListResult result = client.getChat().conversationsList();
System.out.println(result);
```

### iam

```java
// List
ApiKeysListResult result = client.getIam().apiKeysList();
System.out.println(result);
```

### notification

```java
// List
NotificationsListResult result = client.getNotification().notificationsList();
System.out.println(result);
```

### runtime

```java
// List
InvocationsListResult result = client.getRuntime().invocationsList();
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
