# clawrouter-backend-sdk (Kotlin)

SDKWork Claw Router backend API SDK kotlin generated transport SDK

## Installation

Add to your `build.gradle.kts`:

```kotlin
implementation("com.sdkwork.clawrouter:clawrouter-backend-sdk:0.1.0")
```

Or with Gradle Groovy:

```groovy
implementation 'com.sdkwork.clawrouter:clawrouter-backend-sdk:0.1.0'
```

## Quick Start

```kotlin
import com.sdkwork.clawrouter.backend.SdkworkBackendClient
import com.sdkwork.clawrouter.backend.*
import com.sdkwork.common.core.SdkConfig
import kotlinx.coroutines.runBlocking

fun main() = runBlocking {
    val config = SdkConfig(baseUrl = "http://localhost:18081")
    val client = SdkworkBackendClient(config)
    client.setAuthToken("your-auth-token")
client.setAccessToken("your-access-token")

    // Use the SDK
    val result = client.ai.channelGroupsList()
    println(result)
}
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```kotlin
val config = SdkConfig(baseUrl = "http://localhost:18081")
val client = SdkworkBackendClient(config)
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

```kotlin
// List groups
val result = client.ai.channelGroupsList()
println(result)
```

### content

```kotlin
// List announcements
val result = client.content.announcementsList()
println(result)
```

### iam

```kotlin
// Delete API key
val apiKeyId = "1"
val result = client.iam.apiKeysDelete(apiKeyId)
println(result)
```

### integration

```kotlin
// List channels
val result = client.integration.channelsList()
println(result)
```

### mcp

```kotlin
// List MCP servers
val params = linkedMapOf<String, Any>(
    "page" to "page",
    "page_size" to "page-size",
    "q" to "q",
    "transport" to "transport",
    "visibility" to "visibility",
    "status" to "status",
    "category_id" to "1"
)
val result = client.mcp.serversList(params)
println(result)
```

### messaging

```kotlin
// Messaging provider accounts list
val params = linkedMapOf<String, Any>(
    "page" to "page",
    "page_size" to "page-size",
    "q" to "q",
    "status" to "status",
    "channel" to "sms",
    "provider_code" to "ok"
)
val result = client.messaging.providerAccountsList(params)
println(result)
```

### prompts

```kotlin
// List admin prompts
val params = linkedMapOf<String, Any>(
    "page" to "page",
    "page_size" to "page-size",
    "q" to "q",
    "prompt_type" to "prompt-type",
    "visibility" to "visibility",
    "status" to "status",
    "category_id" to "1"
)
val result = client.prompts.definitionsList(params)
println(result)
```

### service_providers

```kotlin
// Service Provider Adjustments List
val params = linkedMapOf<String, Any>(
    "page" to "page",
    "page_size" to "page-size",
    "status" to "status",
    "provider_id" to "1",
    "seller_provider_id" to "1",
    "buyer_provider_id" to "1",
    "edge_id" to "1"
)
val result = client.serviceProviders.adjustmentsList(params)
println(result)
```

### sites

```kotlin
// List sites
val params = linkedMapOf<String, Any>(
    "q" to "q"
)
val result = client.sites.siteCatalogList(params)
println(result)
```

### storage

```kotlin
// List storage providers
val result = client.storage.ossProvidersList()
println(result)
```

### system

```kotlin
// Retrieve IAM auth runtime settings
val result = client.system.authSettingsRetrieve()
println(result)
```

## Error Handling

```kotlin
import kotlinx.coroutines.runBlocking

fun main() = runBlocking {
    try {
        val result = client.ai.channelGroupsList()
        println(result)
    } catch (e: Exception) {
        println("Error: ${e.message}")
    }
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

> Configure Gradle publishing credentials and optional `GRADLE_PUBLISH_TASK`.

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
