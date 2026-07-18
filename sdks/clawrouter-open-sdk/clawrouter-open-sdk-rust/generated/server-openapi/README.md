# clawrouter-open-sdk (Rust)

SDKWork Claw Router OpenAI-compatible gateway SDK rust generated transport SDK

## Installation

```bash
cargo add clawrouter-open-sdk
```

## Quick Start

```rust
use clawrouter_open_sdk::{SdkworkAiClient, SdkworkConfig};


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = SdkworkAiClient::new(SdkworkConfig::new("https://api.sdkwork.com"))?;
    client.set_api_key("your-api-key");

    let result = client.models().list().await?;
    println!("{result:?}");
    Ok(())
}
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```rust
let client = SdkworkAiClient::new(SdkworkConfig::new("https://api.sdkwork.com"))?;
client.set_api_key("your-api-key");
// Sends: Authorization: Bearer <apiKey>
```

### Mode B: Dual Token

```rust
let client = SdkworkAiClient::new(SdkworkConfig::new("https://api.sdkwork.com"))?;
client.set_auth_token("your-auth-token");
client.set_access_token("your-access-token");
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `set_api_key(...)` together with `set_auth_token(...)` + `set_access_token(...)` on the same client.

## Configuration (Non-Auth)

```rust
let client = SdkworkAiClient::new(SdkworkConfig::new("https://api.sdkwork.com"))?;
client.set_header("X-Custom-Header", "value");
```

## API Modules

- `client.files_anthropic()` - files_anthropic API
- `client.chat_anthropic()` - chat_anthropic API
- `client.batches_anthropic()` - batches_anthropic API
- `client.responses_google()` - responses_google API
- `client.files_google()` - files_google API
- `client.embeddings_google()` - embeddings_google API
- `client.chat_google()` - chat_google API
- `client.videos_kling()` - videos_kling API
- `client.images_midjourney()` - images_midjourney API
- `client.images_nano_banana()` - images_nano_banana API
- `client.audio_suno()` - audio_suno API
- `client.assistants()` - assistant API
- `client.audio()` - audio API
- `client.batches()` - batch API
- `client.chat()` - chat API
- `client.completion()` - completion API
- `client.container()` - container API
- `client.conversation()` - conversation API
- `client.embeddings()` - embedding API
- `client.files()` - file API
- `client.images()` - image API
- `client.models()` - model API
- `client.moderations()` - moderation API
- `client.realtime()` - realtime API
- `client.responses()` - response API
- `client.threads()` - thread API
- `client.uploads()` - upload API
- `client.vector_stores()` - vector_store API
- `client.video()` - video API
- `client.videos_vidu()` - videos_vidu API
- `client.images_vidu()` - images_vidu API
- `client.videos_volcengine()` - videos_volcengine API

## Usage Examples

### files_anthropic

```rust
use std::collections::HashMap;
// Anthropic list files
let mut query = HashMap::new();
query.insert("before_id".to_string(), serde_json::json!("1"));
query.insert("after_id".to_string(), serde_json::json!("1"));
query.insert("limit".to_string(), serde_json::json!(3));
let result = client.files_anthropic().get_list_v1_files(Some(&query)).await?;
println!("{result:?}");
```

### chat_anthropic

```rust
use clawrouter_open_sdk::*;
// Anthropic Claude message
let body = AnthropicMessageCreateRequest {
    max_tokens: 1_i64,
    messages: vec![AnthropicMessageParam::default()],
    metadata: Some(serde_json::json!({"value":"value"})),
    model: "model".to_string(),
    stop_sequences: Some(vec!["stop-sequences".to_string()]),
    stream: Some(false),
    system: Some("system".to_string()),
    temperature: Some(8.0_f64),
    thinking: Some(serde_json::json!({"budget_tokens":"token","type":"type"})),
    tool_choice: Some(serde_json::json!({"name":"name","type":"type"})),
    tools: Some(vec![AnthropicTool::default()]),
    top_k: Some(12_i64),
    top_p: Some(13.0_f64),
    ..Default::default()
};
let result = client.chat_anthropic().create_v1_message(&body).await?;
println!("{result:?}");
```

### batches_anthropic

```rust
use std::collections::HashMap;
// Anthropic list message batches
let mut query = HashMap::new();
query.insert("before_id".to_string(), serde_json::json!("1"));
query.insert("after_id".to_string(), serde_json::json!("1"));
query.insert("limit".to_string(), serde_json::json!(3));
let result = client.batches_anthropic().get_list_v1_messages_batches(Some(&query)).await?;
println!("{result:?}");
```

### responses_google

```rust
use std::collections::HashMap;
// Google Gemini list cached contents
let mut query = HashMap::new();
query.insert("pageSize".to_string(), serde_json::json!(1));
query.insert("pageToken".to_string(), serde_json::json!("token"));
let result = client.responses_google().get_list_v1beta_cached_contents(Some(&query)).await?;
println!("{result:?}");
```

### files_google

```rust
use std::collections::HashMap;
// Google Gemini list files
let mut query = HashMap::new();
query.insert("pageSize".to_string(), serde_json::json!(1));
query.insert("pageToken".to_string(), serde_json::json!("token"));
let result = client.files_google().get_list_v1beta_files(Some(&query)).await?;
println!("{result:?}");
```

### embeddings_google

```rust
use clawrouter_open_sdk::*;
// Google Gemini batch embed contents
let model = "model";
let body = GoogleBatchEmbedContentsRequest {
    requests: vec![GoogleEmbedContentRequest::default()],
    ..Default::default()
};
let result = client.embeddings_google().create_v1beta_models_model_batch_embed_content(model, &body).await?;
println!("{result:?}");
```

### chat_google

```rust
use clawrouter_open_sdk::*;
// Google Gemini count tokens
let model = "model";
let body = GoogleCountTokensRequest {
    contents: Some(vec![GoogleContent::default()]),
    generate_content_request: Some(serde_json::json!({"cachedContent":"cachedcontent","contents":"contents","generationConfig":"generationconfig","safetySettings":"safetysettings","systemInstruction":"systeminstruction","toolConfig":"toolconfig","tools":"tools"})),
    ..Default::default()
};
let result = client.chat_google().create_v1beta_models_model_count_token(model, &body).await?;
println!("{result:?}");
```

### videos_kling

```rust
use clawrouter_open_sdk::*;
// Kling video generation
let body = KlingVideoGenerationRequest {
    aspect_ratio: Some("aspect-ratio".to_string()),
    callback_url: Some("callback-url".to_string()),
    cfg_scale: Some(3.0_f64),
    duration: Some(4_i64),
    image: Some("image".to_string()),
    image_tail: Some("image-tail".to_string()),
    mode: Some("mode".to_string()),
    model: Some("model".to_string()),
    negative_prompt: Some("negative-prompt".to_string()),
    prompt: "prompt".to_string(),
    ..Default::default()
};
let result = client.videos_kling().create_v1_videos_generation(&body).await?;
println!("{result:?}");
```

### images_midjourney

```rust
use clawrouter_open_sdk::*;
// Midjourney image generation
let body = MidjourneyImageGenerationRequest {
    aspect_ratio: Some("aspect-ratio".to_string()),
    callback_url: Some("callback-url".to_string()),
    model: Some("model".to_string()),
    prompt: "prompt".to_string(),
    seed: Some(5_i64),
    style: Some("style".to_string()),
    ..Default::default()
};
let result = client.images_midjourney().create_v1_images_generation(&body).await?;
println!("{result:?}");
```

### images_nano_banana

```rust
use clawrouter_open_sdk::*;
// Nano Banana image generation
let body = NanoBananaImageGenerationRequest {
    aspect_ratio: Some("aspect-ratio".to_string()),
    callback_url: Some("callback-url".to_string()),
    images: Some(vec!["images".to_string()]),
    model: Some("model".to_string()),
    prompt: "prompt".to_string(),
    seed: Some(6_i64),
    size: Some("size".to_string()),
    ..Default::default()
};
let result = client.images_nano_banana().create_generations(&body).await?;
println!("{result:?}");
```

### audio_suno

```rust
use clawrouter_open_sdk::*;
// Suno music generation
let body = SunoMusicGenerationRequest {
    callback_url: Some("callback-url".to_string()),
    duration: Some(2.0_f64),
    model: Some("model".to_string()),
    negative_tags: Some("negative-tags".to_string()),
    prompt: "prompt".to_string(),
    tags: Some("tags".to_string()),
    title: Some("title".to_string()),
    ..Default::default()
};
let result = client.audio_suno().create_v1_music_generation(&body).await?;
println!("{result:?}");
```

### assistant

```rust
use std::collections::HashMap;
// List assistants
let mut query = HashMap::new();
query.insert("limit".to_string(), serde_json::json!(1));
query.insert("order".to_string(), serde_json::json!("asc"));
query.insert("after".to_string(), serde_json::json!("after"));
query.insert("before".to_string(), serde_json::json!("before"));
let result = client.assistants().list(Some(&query)).await?;
println!("{result:?}");
```

### audio

```rust
use std::collections::HashMap;
// List voice consents
let mut query = HashMap::new();
query.insert("limit".to_string(), serde_json::json!(1));
query.insert("order".to_string(), serde_json::json!("asc"));
query.insert("after".to_string(), serde_json::json!("after"));
query.insert("before".to_string(), serde_json::json!("before"));
let result = client.audio().get_list_voice_consents(Some(&query)).await?;
println!("{result:?}");
```

### batch

```rust
use std::collections::HashMap;
// List batches
let mut query = HashMap::new();
query.insert("limit".to_string(), serde_json::json!(1));
query.insert("order".to_string(), serde_json::json!("asc"));
query.insert("after".to_string(), serde_json::json!("after"));
query.insert("before".to_string(), serde_json::json!("before"));
let result = client.batches().list(Some(&query)).await?;
println!("{result:?}");
```

### chat

```rust
use std::collections::HashMap;
// List stored chat completions
let mut query = HashMap::new();
query.insert("limit".to_string(), serde_json::json!(1));
query.insert("order".to_string(), serde_json::json!("asc"));
query.insert("after".to_string(), serde_json::json!("after"));
query.insert("before".to_string(), serde_json::json!("before"));
query.insert("model".to_string(), serde_json::json!("model"));
query.insert("metadata".to_string(), serde_json::json!("metadata"));
let result = client.chat().list(Some(&query)).await?;
println!("{result:?}");
```

### completion

```rust
use clawrouter_open_sdk::*;
// Create completion
let body = OpenAiCompletionCreateRequest {
    best_of: Some(1_i64),
    echo: Some(false),
    frequency_penalty: Some(3.0_f64),
    logit_bias: Some(serde_json::json!({"value":"value"})),
    logprobs: Some(5_i64),
    max_tokens: Some(6_i64),
    model: "model".to_string(),
    n: Some(8_i64),
    presence_penalty: Some(9.0_f64),
    prompt: "prompt".to_string(),
    seed: Some(11_i64),
    stop: Some("stop".to_string()),
    stream: Some(true),
    suffix: Some("suffix".to_string()),
    temperature: Some(15.0_f64),
    top_p: Some(16.0_f64),
    user: Some("user".to_string()),
    ..Default::default()
};
let result = client.completion().create(&body).await?;
println!("{result:?}");
```

### container

```rust
use std::collections::HashMap;
// List containers
let mut query = HashMap::new();
query.insert("limit".to_string(), serde_json::json!(1));
query.insert("order".to_string(), serde_json::json!("asc"));
query.insert("after".to_string(), serde_json::json!("after"));
query.insert("before".to_string(), serde_json::json!("before"));
let result = client.container().list(Some(&query)).await?;
println!("{result:?}");
```

### conversation

```rust
use std::collections::HashMap;
// List conversations
let mut query = HashMap::new();
query.insert("limit".to_string(), serde_json::json!(1));
query.insert("order".to_string(), serde_json::json!("asc"));
query.insert("after".to_string(), serde_json::json!("after"));
query.insert("before".to_string(), serde_json::json!("before"));
let result = client.conversation().list(Some(&query)).await?;
println!("{result:?}");
```

### embedding

```rust
use clawrouter_open_sdk::*;
// Create embeddings
let body = OpenAiEmbeddingsRequest {
    dimensions: Some(1_i64),
    encoding_format: Some("float".to_string()),
    input: "input".to_string(),
    model: "model".to_string(),
    user: Some("user".to_string()),
    ..Default::default()
};
let result = client.embeddings().create(&body).await?;
println!("{result:?}");
```

### file

```rust
use std::collections::HashMap;
// List files
let mut query = HashMap::new();
query.insert("limit".to_string(), serde_json::json!(1));
query.insert("order".to_string(), serde_json::json!("asc"));
query.insert("after".to_string(), serde_json::json!("after"));
query.insert("before".to_string(), serde_json::json!("before"));
let result = client.files().list(Some(&query)).await?;
println!("{result:?}");
```

### image

```rust
use clawrouter_open_sdk::*;
// Create image edit
let body = OpenAiImageEditRequest {
    image: Some("image".to_string()),
    mask: Some("mask".to_string()),
    model: "model".to_string(),
    prompt: "prompt".to_string(),
    ..Default::default()
};
let result = client.images().create_edit(&body).await?;
println!("{result:?}");
```

### model

```rust
// List models
let result = client.models().list().await?;
println!("{result:?}");
```

### moderation

```rust
use clawrouter_open_sdk::*;
// Create moderation
let body = OpenAiModerationCreateRequest {
    input: "input".to_string(),
    model: "model".to_string(),
    ..Default::default()
};
let result = client.moderations().create(&body).await?;
println!("{result:?}");
```

### realtime

```rust
use clawrouter_open_sdk::*;
// Create realtime call
let body = OpenAiRealtimeCallCreateRequest {
    metadata: Some(serde_json::json!({"value":"value"})),
    sdp: Some("sdp".to_string()),
    session: Some("session".to_string()),
    ..Default::default()
};
let result = client.realtime().create_call(&body).await?;
println!("{result:?}");
```

### response

```rust
use clawrouter_open_sdk::*;
// Create response
let body = OpenAiResponsesRequest {
    background: Some(true),
    conversation: Some("conversation".to_string()),
    include: Some(vec!["include".to_string()]),
    input: "input".to_string(),
    instructions: Some("instructions".to_string()),
    max_output_tokens: Some(6_i64),
    max_tool_calls: Some(7_i64),
    metadata: Some(serde_json::json!({"value":"value"})),
    model: "model".to_string(),
    parallel_tool_calls: Some(false),
    previous_response_id: Some("1".to_string()),
    prompt: Some(serde_json::json!({"id":"1","variables":"variables","version":"version"})),
    prompt_cache_key: Some("prompt-cache-key".to_string()),
    reasoning: Some(serde_json::json!({"effort":"effort","summary":"summary"})),
    service_tier: Some("auto".to_string()),
    store: Some(false),
    stream: Some(true),
    temperature: Some(18.0_f64),
    text: Some(serde_json::json!({"format":"format"})),
    tool_choice: Some("tool-choice".to_string()),
    tools: Some(vec![OpenAiTool::default()]),
    top_logprobs: Some(22_i64),
    top_p: Some(23.0_f64),
    truncation: Some("auto".to_string()),
    user: Some("user".to_string()),
    ..Default::default()
};
let result = client.responses().create(&body).await?;
println!("{result:?}");
```

### thread

```rust
use clawrouter_open_sdk::*;
// Create thread
let body = OpenAiThreadCreateRequest {
    messages: Some(vec![OpenAiThreadMessageCreateRequest::default()]),
    metadata: Some(serde_json::json!({"value":"value"})),
    tool_resources: Some("tool-resources".to_string()),
    ..Default::default()
};
let result = client.threads().create(&body).await?;
println!("{result:?}");
```

### upload

```rust
use clawrouter_open_sdk::*;
// Create upload
let body = OpenAiUploadCreateRequest {
    bytes: 1_i64,
    filename: "name".to_string(),
    mime_type: "mime-type".to_string(),
    purpose: "purpose".to_string(),
    ..Default::default()
};
let result = client.uploads().create(&body).await?;
println!("{result:?}");
```

### vector_store

```rust
use std::collections::HashMap;
// List vector stores
let mut query = HashMap::new();
query.insert("limit".to_string(), serde_json::json!(1));
query.insert("order".to_string(), serde_json::json!("asc"));
query.insert("after".to_string(), serde_json::json!("after"));
query.insert("before".to_string(), serde_json::json!("before"));
let result = client.vector_stores().list_vector_stores(Some(&query)).await?;
println!("{result:?}");
```

### video

```rust
use std::collections::HashMap;
// List videos
let mut query = HashMap::new();
query.insert("limit".to_string(), serde_json::json!(1));
query.insert("order".to_string(), serde_json::json!("asc"));
query.insert("after".to_string(), serde_json::json!("after"));
query.insert("before".to_string(), serde_json::json!("before"));
let result = client.video().list(Some(&query)).await?;
println!("{result:?}");
```

### videos_vidu

```rust
use clawrouter_open_sdk::*;
// Vidu image to video
let body = ViduImageToVideoRequest {
    aspect_ratio: Some("aspect-ratio".to_string()),
    callback_url: Some("callback-url".to_string()),
    duration: Some(3_i64),
    images: vec!["images".to_string()],
    model: "model".to_string(),
    movement_amplitude: Some("movement-amplitude".to_string()),
    payload: Some("payload".to_string()),
    prompt: Some("prompt".to_string()),
    resolution: Some("resolution".to_string()),
    seed: Some(10_i64),
    ..Default::default()
};
let result = client.videos_vidu().create_ent_v2_img2video(&body).await?;
println!("{result:?}");
```

### images_vidu

```rust
use clawrouter_open_sdk::*;
// Vidu reference to image
let body = ViduReferenceToImageRequest {
    aspect_ratio: Some("aspect-ratio".to_string()),
    callback_url: Some("callback-url".to_string()),
    images: vec!["images".to_string()],
    model: "model".to_string(),
    payload: Some("payload".to_string()),
    prompt: "prompt".to_string(),
    seed: Some(7_i64),
    style: Some("style".to_string()),
    ..Default::default()
};
let result = client.images_vidu().create_ent_v2_reference2image(&body).await?;
println!("{result:?}");
```

### videos_volcengine

```rust
use clawrouter_open_sdk::*;
// Volcengine Ark content generation task
let body = VolcengineContentGenerationTaskCreateRequest {
    callback_url: Some("callback-url".to_string()),
    content: vec![VolcengineContentPart::default()],
    metadata: Some(serde_json::json!({"value":"value"})),
    model: "model".to_string(),
    ..Default::default()
};
let result = client.videos_volcengine().create_api_v3_contents_generations_task(&body).await?;
println!("{result:?}");
```

## Error Handling

```rust
use clawrouter_open_sdk::{SdkworkAiClient, SdkworkConfig};


let client = SdkworkAiClient::new(SdkworkConfig::new("https://api.sdkwork.com"))?;

let outcome: Result<(), _> = async {
    client.models().list().await?;
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
