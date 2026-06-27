# clawrouter-backend-sdk (Rust)

SDKWork Claw Router backend API SDK rust generated transport SDK

## Installation

```bash
cargo add clawrouter-backend-sdk
```

## Quick Start

```rust
use clawrouter_backend_sdk::{SdkworkBackendClient, SdkworkConfig};


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = SdkworkBackendClient::new(SdkworkConfig::new("http://localhost:18081"))?;
    client.set_auth_token("your-auth-token");
client.set_access_token("your-access-token");

    let result = client.ai().channel_groups_list().await?;
    println!("{result:?}");
    Ok(())
}
```

## Authentication

```text
Authorization: Bearer <authToken>
Access-Token: <accessToken>
```


## Configuration (Non-Auth)

```rust
let client = SdkworkBackendClient::new(SdkworkConfig::new("http://localhost:18081"))?;
client.set_header("X-Custom-Header", "value");
```

## API Modules

- `client.ai()` - ai API
- `client.content()` - content API
- `client.iam()` - iam API
- `client.integration()` - integration API
- `client.mcp()` - mcp API
- `client.messaging()` - messaging API
- `client.prompts()` - prompts API
- `client.service_providers()` - service_providers API
- `client.sites()` - sites API
- `client.storage()` - storage API
- `client.system()` - system API

## Usage Examples

### ai

```rust
// List groups
let result = client.ai().channel_groups_list().await?;
println!("{result:?}");
```

### content

```rust
// List announcements
let result = client.content().announcements_list().await?;
println!("{result:?}");
```

### iam

```rust
// Delete API key
let api_key_id = "1";
let result = client.iam().api_keys_delete(api_key_id).await?;
println!("{result:?}");
```

### integration

```rust
// List channels
let result = client.integration().channels_list().await?;
println!("{result:?}");
```

### mcp

```rust
use std::collections::HashMap;
// List MCP servers
let mut query = HashMap::new();
query.insert("page".to_string(), serde_json::json!("page"));
query.insert("page_size".to_string(), serde_json::json!("page-size"));
query.insert("q".to_string(), serde_json::json!("q"));
query.insert("transport".to_string(), serde_json::json!("transport"));
query.insert("visibility".to_string(), serde_json::json!("visibility"));
query.insert("status".to_string(), serde_json::json!("status"));
query.insert("category_id".to_string(), serde_json::json!("1"));
let result = client.mcp().servers_list(Some(&query)).await?;
println!("{result:?}");
```

### messaging

```rust
use std::collections::HashMap;
// Messaging provider accounts list
let mut query = HashMap::new();
query.insert("page".to_string(), serde_json::json!("page"));
query.insert("page_size".to_string(), serde_json::json!("page-size"));
query.insert("q".to_string(), serde_json::json!("q"));
query.insert("status".to_string(), serde_json::json!("status"));
query.insert("channel".to_string(), serde_json::json!("sms"));
query.insert("provider_code".to_string(), serde_json::json!("ok"));
let result = client.messaging().provider_accounts_list(Some(&query)).await?;
println!("{result:?}");
```

### prompts

```rust
use std::collections::HashMap;
// List admin prompts
let mut query = HashMap::new();
query.insert("page".to_string(), serde_json::json!("page"));
query.insert("page_size".to_string(), serde_json::json!("page-size"));
query.insert("q".to_string(), serde_json::json!("q"));
query.insert("prompt_type".to_string(), serde_json::json!("prompt-type"));
query.insert("visibility".to_string(), serde_json::json!("visibility"));
query.insert("status".to_string(), serde_json::json!("status"));
query.insert("category_id".to_string(), serde_json::json!("1"));
let result = client.prompts().definitions_list(Some(&query)).await?;
println!("{result:?}");
```

### service_providers

```rust
use std::collections::HashMap;
// Service Provider Adjustments List
let mut query = HashMap::new();
query.insert("page".to_string(), serde_json::json!("page"));
query.insert("page_size".to_string(), serde_json::json!("page-size"));
query.insert("status".to_string(), serde_json::json!("status"));
query.insert("provider_id".to_string(), serde_json::json!("1"));
query.insert("seller_provider_id".to_string(), serde_json::json!("1"));
query.insert("buyer_provider_id".to_string(), serde_json::json!("1"));
query.insert("edge_id".to_string(), serde_json::json!("1"));
let result = client.service_providers().adjustments_list(Some(&query)).await?;
println!("{result:?}");
```

### sites

```rust
use std::collections::HashMap;
// List sites
let mut query = HashMap::new();
query.insert("q".to_string(), serde_json::json!("q"));
let result = client.sites().site_catalog_list(Some(&query)).await?;
println!("{result:?}");
```

### storage

```rust
// List storage providers
let result = client.storage().oss_providers_list().await?;
println!("{result:?}");
```

### system

```rust
// Retrieve IAM auth runtime settings
let result = client.system().auth_settings_retrieve().await?;
println!("{result:?}");
```

## Error Handling

```rust
use clawrouter_backend_sdk::{SdkworkBackendClient, SdkworkConfig};


let client = SdkworkBackendClient::new(SdkworkConfig::new("http://localhost:18081"))?;

let outcome: Result<(), _> = async {
    client.ai().channel_groups_list().await?;
    Ok(())
}.await;

match outcome {
    Ok(()) => println!("request completed"),
    Err(error) => eprintln!("request failed: {error}"),
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

> Set cargo registry credentials before `cargo publish` and use `--dry-run` first.

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
