# clawrouter-app-sdk (Rust)

SDKWork Claw Router app API SDK rust generated transport SDK

## Installation

```bash
cargo add clawrouter-app-sdk
```

## Quick Start

```rust
use clawrouter_app_sdk::{SdkworkAppClient, SdkworkConfig};


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = SdkworkAppClient::new(SdkworkConfig::new("http://localhost:18082"))?;
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
let client = SdkworkAppClient::new(SdkworkConfig::new("http://localhost:18082"))?;
client.set_header("X-Custom-Header", "value");
```

## API Modules

- `client.ai()` - ai API
- `client.chat()` - chat API
- `client.iam()` - iam API
- `client.notification()` - notification API
- `client.runtime()` - runtime API
- `client.system()` - system API

## Usage Examples

### ai

```rust
// List groups
let result = client.ai().channel_groups_list().await?;
println!("{result:?}");
```

### chat

```rust
use std::collections::HashMap;
// List product chat conversations
let mut query = HashMap::new();
query.insert("page".to_string(), serde_json::json!("page"));
query.insert("page_size".to_string(), serde_json::json!("page-size"));
let result = client.chat().conversations_list(Some(&query)).await?;
println!("{result:?}");
```

### iam

```rust
// List keys
let result = client.iam().api_keys_list().await?;
println!("{result:?}");
```

### notification

```rust
use std::collections::HashMap;
// List portal notifications
let mut query = HashMap::new();
query.insert("include_archived".to_string(), serde_json::json!(true));
query.insert("page".to_string(), serde_json::json!("page"));
query.insert("page_size".to_string(), serde_json::json!("page-size"));
let result = client.notification().notifications_list(Some(&query)).await?;
println!("{result:?}");
```

### runtime

```rust
use std::collections::HashMap;
// List runtime invocations
let mut query = HashMap::new();
query.insert("page".to_string(), serde_json::json!("page"));
query.insert("page_size".to_string(), serde_json::json!("page-size"));
query.insert("conversation_id".to_string(), serde_json::json!("1"));
query.insert("chat_turn_id".to_string(), serde_json::json!("1"));
query.insert("agent_session_id".to_string(), serde_json::json!("1"));
query.insert("runtime".to_string(), serde_json::json!("runtime"));
query.insert("status".to_string(), serde_json::json!("status"));
let result = client.runtime().invocations_list(Some(&query)).await?;
println!("{result:?}");
```

### system

```rust
use std::collections::HashMap;
// Retrieve public site runtime branding settings
let mut query = HashMap::new();
query.insert("tenant_code".to_string(), serde_json::json!("ok"));
query.insert("organization_code".to_string(), serde_json::json!("ok"));
let result = client.system().site_runtime_retrieve(Some(&query)).await?;
println!("{result:?}");
```

## Error Handling

```rust
use clawrouter_app_sdk::{SdkworkAppClient, SdkworkConfig};


let client = SdkworkAppClient::new(SdkworkConfig::new("http://localhost:18082"))?;

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
