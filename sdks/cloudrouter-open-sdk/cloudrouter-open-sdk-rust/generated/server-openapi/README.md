# cloudrouter-open-sdk (Rust)

SDKWork Cloud Router OpenAI-compatible gateway SDK rust generated transport SDK

## Installation

```bash
cargo add cloudrouter-open-sdk
```

## Quick Start

```rust
use cloudrouter_open_sdk::{SdkworkAiClient, SdkworkConfig};


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

- `client.images_alibaba()` - images_alibaba API
- `client.videos_alibaba()` - videos_alibaba API
- `client.audio_alibaba()` - audio_alibaba API
- `client.files_anthropic()` - files_anthropic API
- `client.chat_anthropic()` - chat_anthropic API
- `client.batches_anthropic()` - batches_anthropic API
- `client.videos_black_forest_labs()` - videos_black_forest_labs API
- `client.images_black_forest_labs()` - images_black_forest_labs API
- `client.videos_bytedance()` - videos_bytedance API
- `client.images_bytedance()` - images_bytedance API
- `client.audio_bytedance()` - audio_bytedance API
- `client.music_elevenlabs()` - music_elevenlabs API
- `client.audio_elevenlabs()` - audio_elevenlabs API
- `client.responses_google()` - responses_google API
- `client.files_google()` - files_google API
- `client.videos_google()` - videos_google API
- `client.embeddings_google()` - embeddings_google API
- `client.chat_google()` - chat_google API
- `client.images_google()` - images_google API
- `client.videos_jimeng()` - videos_jimeng API
- `client.audio_kling()` - audio_kling API
- `client.images_kling()` - images_kling API
- `client.videos_kling()` - videos_kling API
- `client.videos_luma_ai()` - videos_luma_ai API
- `client.videos_minimax()` - videos_minimax API
- `client.images_minimax()` - images_minimax API
- `client.music_minimax()` - music_minimax API
- `client.audio_minimax()` - audio_minimax API
- `client.music_mureka()` - music_mureka API
- `client.videos_pixverse()` - videos_pixverse API
- `client.videos_runway()` - videos_runway API
- `client.images_runway()` - images_runway API
- `client.audio_stability_ai()` - audio_stability_ai API
- `client.images_stability_ai()` - images_stability_ai API
- `client.music_suno()` - music_suno API
- `client.chat_typesafe()` - chat_typesafe API
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
- `client.tool()` - tool API
- `client.uploads()` - upload API
- `client.vector_stores()` - vector_store API
- `client.video()` - video API
- `client.videos_vidu()` - videos_vidu API
- `client.images_vidu()` - images_vidu API
- `client.audio_vidu()` - audio_vidu API
- `client.audio_volcengine()` - audio_volcengine API
- `client.videos_volcengine()` - videos_volcengine API
- `client.images_volcengine()` - images_volcengine API
- `client.images_xai()` - images_xai API
- `client.videos_xai()` - videos_xai API
- `client.videos_zhipu()` - videos_zhipu API
- `client.images_zhipu()` - images_zhipu API

## Usage Examples

### images_alibaba

```rust
use cloudrouter_open_sdk::*;
// Alibaba Wanx image generation
let body = AlibabaImageGenerationRequest {
    input: serde_json::json!({"negative_prompt":"negative-prompt","prompt":"prompt"}),
    model: "model".to_string(),
    parameters: Some(serde_json::json!({"n":"n","prompt_extend":"prompt-extend","seed":"seed","size":"size","watermark":"watermark"})),
    ..Default::default()
};
let x_dash_scope_async = "enable".to_string();
let result = client.images_alibaba().create_api_v1_services_aigc_text2image_image_synthesi(&body, x_dash_scope_async).await?;
println!("{result:?}");
```

### videos_alibaba

```rust
// Alibaba Wan retrieve video generation task
let task_id = "1";
let result = client.videos_alibaba().list_api_v1_tasks(task_id).await?;
println!("{result:?}");
```

### audio_alibaba

```rust
use cloudrouter_open_sdk::*;
// Alibaba Qwen TTS speech synthesis
let body = AlibabaSpeechRequest {
    input: serde_json::json!({"instructions":"instructions","language_type":"language-type","optimize_instructions":"optimize-instructions","text":"text","voice":"voice"}),
    model: "model".to_string(),
    parameters: Some(serde_json::json!({"value":"value"})),
    ..Default::default()
};
let result = client.audio_alibaba().create_api_v1_services_audio_tts_speech_synthesizer(&body).await?;
println!("{result:?}");
```

### files_anthropic

```rust
use std::collections::HashMap;
// Anthropic list files
let mut query = HashMap::new();
query.insert("before_id".to_string(), serde_json::json!("1"));
query.insert("after_id".to_string(), serde_json::json!("1"));
query.insert("limit".to_string(), serde_json::json!(3));
let anthropic_version = "anthropic-version";
let result = client.files_anthropic().get_list_v1_files(Some(&query), anthropic_version).await?;
println!("{result:?}");
```

### chat_anthropic

```rust
use cloudrouter_open_sdk::*;
// Anthropic Claude message
let body = AnthropicMessageCreateRequest {
    cache_control: Some(serde_json::json!({"ttl":"ttl","type":"type"})),
    container: Some(serde_json::json!({"id":"1","skills":"skills"})),
    diagnostics: Some(serde_json::json!({"previous_message_id":"1"})),
    inference_geo: Some("inference-geo".to_string()),
    max_tokens: 5_i64,
    messages: vec![AnthropicMessageParam::default()],
    metadata: Some(serde_json::json!({"user_id":"1"})),
    model: "model".to_string(),
    output_config: Some(serde_json::json!({"effort":"effort","format":"format"})),
    service_tier: Some("auto".to_string()),
    speed: Some("standard".to_string()),
    stop_sequences: Some(vec!["stop-sequences".to_string()]),
    stream: Some(true),
    system: Some("system".to_string()),
    temperature: Some(15.0_f64),
    thinking: Some(serde_json::json!({"budget_tokens":"token","display":"display","type":"type"})),
    tool_choice: Some(serde_json::json!({"disable_parallel_tool_use":"disable-parallel-tool-use","name":"name","type":"type"})),
    tools: Some(vec![serde_json::json!("tools")]),
    top_k: Some(19_i64),
    top_p: Some(20.0_f64),
    ..Default::default()
};
let anthropic_version = "anthropic-version";
let result = client.chat_anthropic().create_v1_message(&body, anthropic_version).await?;
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
let anthropic_version = "anthropic-version";
let result = client.batches_anthropic().get_list_v1_messages_batches(Some(&query), anthropic_version).await?;
println!("{result:?}");
```

### videos_black_forest_labs

```rust
use cloudrouter_open_sdk::*;
// Black Forest Labs FLUX 3 video generation
let body = BlackForestLabsVideoGenerationRequest {
    aspect_ratio: Some("21:9".to_string()),
    draft: Some(false),
    draft_cache: Some("draft-cache".to_string()),
    duration: Some(4_i64),
    generate_audio: Some(true),
    keyframes: Some("keyframes".to_string()),
    mode: "t2v".to_string(),
    prompt: Some("prompt".to_string()),
    resolution: Some("hd".to_string()),
    safety_tolerance: Some(10_i64),
    start_video: Some("start-video".to_string()),
    user: Some("user".to_string()),
    version: Some("version".to_string()),
    ..Default::default()
};
let result = client.videos_black_forest_labs().create_flux_3_video(&body).await?;
println!("{result:?}");
```

### images_black_forest_labs

```rust
use std::collections::HashMap;
// Black Forest Labs retrieve generation result
let mut query = HashMap::new();
query.insert("id".to_string(), serde_json::json!("1"));
let result = client.images_black_forest_labs().list_get_result(Some(&query)).await?;
println!("{result:?}");
```

### videos_bytedance

```rust
use cloudrouter_open_sdk::*;
// ByteDance Seedance video generation
let body = BytedanceVideoGenerationRequest {
    callback_url: Some("https://example.com".to_string()),
    camera_fixed: Some(false),
    content: vec![ArkContentPart::default()],
    draft: Some(false),
    duration: Some(5_i64),
    execution_expires_after: Some(6_i64),
    frames: Some(7_i64),
    generate_audio: Some(false),
    model: "model".to_string(),
    omni_reference_task_type: Some("auto".to_string()),
    output_format: Some("mp4".to_string()),
    priority: Some(12_i64),
    ratio: Some("16:9".to_string()),
    resolution: Some("480p".to_string()),
    return_last_frame: Some(true),
    safety_identifier: Some("safety-identifier".to_string()),
    seed: Some(17_i64),
    service_tier: Some("default".to_string()),
    tools: Some(vec![ArkWebSearchTool::default()]),
    watermark: Some(false),
    ..Default::default()
};
let result = client.videos_bytedance().create_api_v3_contents_generations_task(&body).await?;
println!("{result:?}");
```

### images_bytedance

```rust
use cloudrouter_open_sdk::*;
// ByteDance Seedream image generation
let body = BytedanceImageGenerationRequest {
    background: Some("transparent".to_string()),
    image: Some("image".to_string()),
    layer_decomposition: Some(true),
    model: "model".to_string(),
    optimize_prompt_options: Some(serde_json::json!({"mode":"mode"})),
    output_format: Some("png".to_string()),
    prompt: Some("prompt".to_string()),
    response_format: Some("url".to_string()),
    sequential_image_generation: Some("auto".to_string()),
    sequential_image_generation_options: Some(serde_json::json!({"max_images":"max-images"})),
    size: Some("size".to_string()),
    stream: Some(false),
    tools: Some(vec![ArkWebSearchTool::default()]),
    watermark: Some(false),
    ..Default::default()
};
let result = client.images_bytedance().create_api_v3_images_generation(&body).await?;
println!("{result:?}");
```

### audio_bytedance

```rust
use cloudrouter_open_sdk::*;
// ByteDance Seed TTS speech synthesis
let body = BytedanceSpeechRequest {
    req_params: serde_json::json!({"additions":"additions","audio_params":"audio-params","model":"model","pronunciation_dict":"pronunciation-dict","speaker":"speaker","ssml":"ssml","text":"text","tone":"tone"}),
    ..Default::default()
};
let x_api_resource_id = "seed-tts-2.0".to_string();
let x_api_request_id = "X-Api-Request-Id";
let result = client.audio_bytedance().create_api_v3_tts_unidirectional(&body, x_api_resource_id, x_api_request_id).await?;
println!("{result:?}");
```

### music_elevenlabs

```rust
use cloudrouter_open_sdk::*;
use std::collections::HashMap;
// ElevenLabs music generation
let body = ElevenLabsMusicGenerationRequest {
    composition_plan: Some(serde_json::json!({"negative_global_styles":"negative-global-styles","positive_global_styles":"positive-global-styles","sections":"sections"})),
    finetune_id: Some("1".to_string()),
    finetune_strength: Some(3.0_f64),
    force_instrumental: Some(false),
    generation_mode: Some("track".to_string()),
    lyrics_text: Some("lyrics-text".to_string()),
    model_id: Some("music_v1".to_string()),
    music_length_ms: Some(8_i64),
    music_prompt: Some(serde_json::json!({"negative_global_styles":"negative-global-styles","positive_global_styles":"positive-global-styles","sections":"sections"})),
    prompt: Some("prompt".to_string()),
    respect_sections_durations: Some(true),
    seed: Some(12_i64),
    sign_with_c2pa: Some(true),
    store_for_inpainting: Some(false),
    use_phonetic_names: Some(true),
    ..Default::default()
};
let mut query = HashMap::new();
query.insert("output_format".to_string(), serde_json::json!("output-format"));
let result = client.music_elevenlabs().create_v1_music(&body, Some(&query)).await?;
println!("{result:?}");
```

### audio_elevenlabs

```rust
use cloudrouter_open_sdk::*;
use std::collections::HashMap;
// Generate sound effect
let body = ElevenLabsSoundGenerationRequest {
    duration_seconds: Some(1.0_f64),
    r#loop: Some(false),
    model_id: Some("eleven_text_to_sound_v2".to_string()),
    prompt_influence: Some(4.0_f64),
    text: "text".to_string(),
    ..Default::default()
};
let mut query = HashMap::new();
query.insert("output_format".to_string(), serde_json::json!("output-format"));
let result = client.audio_elevenlabs().create_v1_sound_generation(&body, Some(&query)).await?;
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

### videos_google

```rust
// Google Gemini retrieve video operation (Veo)
let model = "model";
let operation_id = "1";
let result = client.videos_google().list_v1beta_models_operations(model, operation_id).await?;
println!("{result:?}");
```

### embeddings_google

```rust
use cloudrouter_open_sdk::*;
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
use cloudrouter_open_sdk::*;
// Google Gemini count tokens
let model = "model";
let body = GoogleCountTokensRequest {
    contents: Some(vec![GoogleContent::default()]),
    generate_content_request: Some(serde_json::json!({"cachedContent":"cachedcontent","contents":"contents","continuationToken":"token","generationConfig":"generationconfig","labels":"labels","model":"model","safetySettings":"safetysettings","serviceTier":"servicetier","store":"store","systemInstruction":"systeminstruction","toolConfig":"toolconfig","tools":"tools"})),
    ..Default::default()
};
let result = client.chat_google().create_v1beta_models_model_count_token(model, &body).await?;
println!("{result:?}");
```

### images_google

```rust
use cloudrouter_open_sdk::*;
// Google Gemini image generation
let model = "model";
let body = GeminiImageGenerationRequest {
    instances: vec![serde_json::json!("instances")],
    parameters: Some(serde_json::json!({"aspectRatio":"aspectratio","personGeneration":"persongeneration","sampleCount":"samplecount"})),
    ..Default::default()
};
let result = client.images_google().create_v1beta_models_model_generate_image(model, &body).await?;
println!("{result:?}");
```

### videos_jimeng

```rust
// Jimeng retrieve video generation task
let task_id = "1";
let result = client.videos_jimeng().list_v1_tasks(task_id).await?;
println!("{result:?}");
```

### audio_kling

```rust
use cloudrouter_open_sdk::*;
// Kling text to audio
let body = KlingSoundGenerationRequest {
    callback_url: Some("callback-url".to_string()),
    duration: 2.0_f64,
    external_task_id: Some("1".to_string()),
    prompt: "prompt".to_string(),
    ..Default::default()
};
let result = client.audio_kling().create_v1_audio_text_to_audio(&body).await?;
println!("{result:?}");
```

### images_kling

```rust
use cloudrouter_open_sdk::*;
// Kling image generation
let body = KlingImageGenerationRequest {
    aspect_ratio: Some("16:9".to_string()),
    callback_url: Some("callback-url".to_string()),
    element_list: Some(vec![KlingElementReference::default()]),
    external_task_id: Some("1".to_string()),
    human_fidelity: Some(5.0_f64),
    image: Some("image".to_string()),
    image_fidelity: Some(7.0_f64),
    image_reference: Some("subject".to_string()),
    model_name: Some("kling-v2-1".to_string()),
    n: Some(10_i64),
    negative_prompt: Some("negative-prompt".to_string()),
    prompt: "prompt".to_string(),
    resolution: Some("1k".to_string()),
    watermark_info: Some(serde_json::json!({"enabled":"enabled"})),
    ..Default::default()
};
let result = client.images_kling().create_v1_images_generation(&body).await?;
println!("{result:?}");
```

### videos_kling

```rust
use cloudrouter_open_sdk::*;
// Kling create avatar video
let body = KlingAvatarCreateRequest {
    audio_url: Some("audio-url".to_string()),
    callback_url: Some("callback-url".to_string()),
    human_image: "human-image".to_string(),
    model_name: Some("name".to_string()),
    prompt: Some("prompt".to_string()),
    text: Some("text".to_string()),
    voice_id: Some("1".to_string()),
    voice_language: Some("voice-language".to_string()),
    voice_mode: Some("voice-mode".to_string()),
    ..Default::default()
};
let result = client.videos_kling().create_v1_videos_avatar(&body).await?;
println!("{result:?}");
```

### videos_luma_ai

```rust
use cloudrouter_open_sdk::*;
// Luma Dream Machine video generation
let body = LumaVideoGenerationRequest {
    aspect_ratio: Some("1:1".to_string()),
    callback_url: Some("https://example.com".to_string()),
    concepts: Some(vec![LumaConcept::default()]),
    duration: Some("duration".to_string()),
    generation_type: Some("video".to_string()),
    keyframes: Some(serde_json::json!({"frame0":"frame0","frame1":"frame1"})),
    r#loop: Some(true),
    model: "ray-2".to_string(),
    prompt: Some("prompt".to_string()),
    resolution: Some("resolution".to_string()),
    ..Default::default()
};
let result = client.videos_luma_ai().create_generations(&body).await?;
println!("{result:?}");
```

### videos_minimax

```rust
use std::collections::HashMap;
// MiniMax retrieve video file
let mut query = HashMap::new();
query.insert("file_id".to_string(), serde_json::json!("1"));
let result = client.videos_minimax().list_v1_files_retrieve(Some(&query)).await?;
println!("{result:?}");
```

### images_minimax

```rust
use cloudrouter_open_sdk::*;
// MiniMax image generation
let body = MinimaxImageGenerationRequest {
    aspect_ratio: Some("1:1".to_string()),
    height: Some(2_i64),
    model: "image-01".to_string(),
    n: Some(4_i64),
    prompt: "prompt".to_string(),
    prompt_optimizer: Some(false),
    response_format: Some("url".to_string()),
    seed: Some(8_i64),
    subject_reference: Some(vec![serde_json::json!("subject-reference")]),
    width: Some(10_i64),
    ..Default::default()
};
let result = client.images_minimax().create_v1_image_generation(&body).await?;
println!("{result:?}");
```

### music_minimax

```rust
use cloudrouter_open_sdk::*;
// Minimax create music generation
let body = MiniMaxMusicGenerationRequest {
    audio_base64: Some("audio-base64".to_string()),
    audio_setting: Some(serde_json::json!({"bitrate":"bitrate","format":"format","sample_rate":"sample-rate"})),
    audio_url: Some("audio-url".to_string()),
    cover_feature_id: Some("1".to_string()),
    is_instrumental: Some(true),
    lyrics: Some("lyrics".to_string()),
    lyrics_optimizer: Some(true),
    model: "music-3.0".to_string(),
    output_format: Some("url".to_string()),
    prompt: Some("prompt".to_string()),
    stream: Some(true),
    ..Default::default()
};
let result = client.music_minimax().create_v1_music_generation(&body).await?;
println!("{result:?}");
```

### audio_minimax

```rust
use cloudrouter_open_sdk::*;
// MiniMax speech synthesis
let body = MinimaxTextToSpeechRequest {
    audio_setting: Some(serde_json::json!({"value":"value"})),
    language_boost: Some("language-boost".to_string()),
    model: "speech-2.8-hd".to_string(),
    output_format: Some("url".to_string()),
    pronunciation_dict: Some(serde_json::json!({"value":"value"})),
    stream: Some(false),
    stream_options: Some(serde_json::json!({"exclude_aggregated_audio":"exclude-aggregated-audio"})),
    subtitle_enable: Some(false),
    subtitle_type: Some("sentence".to_string()),
    text: "text".to_string(),
    text_normalization_mode: Some("basic".to_string()),
    timbre_weights: Some(vec![MinimaxTimbreWeight::default()]),
    voice_modify: Some(serde_json::json!({"intensity":"intensity","pitch":"pitch","sound_effects":"sound-effects","timbre":"timbre"})),
    voice_setting: Some(serde_json::json!({"value":"value"})),
    ..Default::default()
};
let result = client.audio_minimax().create_v1_t2a_v(&body).await?;
println!("{result:?}");
```

### music_mureka

```rust
use cloudrouter_open_sdk::*;
// Mureka song generation
let body = MurekaMusicGenerationRequest {
    callback_url: Some("callback-url".to_string()),
    duration: Some(2_i64),
    lyrics: Some("lyrics".to_string()),
    model: "model".to_string(),
    prompt: Some("prompt".to_string()),
    reference_audio_url: Some("reference-audio-url".to_string()),
    tags: Some(vec!["tags".to_string()]),
    title: Some("title".to_string()),
    ..Default::default()
};
let result = client.music_mureka().create_v1_song_generate(&body).await?;
println!("{result:?}");
```

### videos_pixverse

```rust
// PixVerse retrieve video generation
let video_id = "1";
let ai_trace_id = "Ai-trace-id";
let result = client.videos_pixverse().list_openapi_v2_video_result(video_id, ai_trace_id).await?;
println!("{result:?}");
```

### videos_runway

```rust
use cloudrouter_open_sdk::*;
// Runway image to video
let body = RunwayImageToVideoRequest {
    audio: Some(true),
    bitrate: Some("standard".to_string()),
    cfg_scale: Some(3.0_f64),
    content_moderation: Some(serde_json::json!({"value":"value"})),
    draft: Some(true),
    duration: Some(6_i64),
    model: "model".to_string(),
    negative_prompt: Some("negativeprompt".to_string()),
    output_format: Some("mp4".to_string()),
    prompt_expansion_mode: Some("disabled".to_string()),
    prompt_image: "promptimage".to_string(),
    prompt_text: Some("prompttext".to_string()),
    prores_profile: Some("422".to_string()),
    provider_settings: Some(serde_json::json!({"value":"value"})),
    ratio: Some("ratio".to_string()),
    reference_audio: Some(vec![serde_json::json!("referenceaudio")]),
    reference_videos: Some(vec![serde_json::json!("referencevideos")]),
    references: Some(vec![serde_json::json!("references")]),
    resolution: Some("480p".to_string()),
    seed: Some(20_i64),
    ..Default::default()
};
let x_runway_version = "2024-11-06".to_string();
let result = client.videos_runway().create_v1_image_to_video(&body, x_runway_version).await?;
println!("{result:?}");
```

### images_runway

```rust
// Runway retrieve task
let task_id = "1";
let x_runway_version = "2024-11-06".to_string();
let result = client.images_runway().list_v1_tasks(task_id, x_runway_version).await?;
println!("{result:?}");
```

### audio_stability_ai

```rust
use cloudrouter_open_sdk::*;
// Stability AI text-to-audio (music and sound effects)
let body = StabilityAudioRequest {
    cfg_scale: Some(1.0_f64),
    duration: Some(2.0_f64),
    model: Some("stable-audio-2".to_string()),
    output_format: Some("mp3".to_string()),
    prompt: "prompt".to_string(),
    seed: Some(6_i64),
    steps: Some(7_i64),
    ..Default::default()
};
let result = client.audio_stability_ai().create_text_to_audio(&body).await?;
println!("{result:?}");
```

### images_stability_ai

```rust
use cloudrouter_open_sdk::*;
// Stability AI image generation
let mode = "mode";
let body = StabilityImageGenerationRequest {
    aspect_ratio: Some("21:9".to_string()),
    cfg_scale: Some(2.0_f64),
    image: Some("image".to_string()),
    mode: Some("text-to-image".to_string()),
    model: Some("sd3.5-large".to_string()),
    negative_prompt: Some("negative-prompt".to_string()),
    output_format: Some("png".to_string()),
    prompt: "prompt".to_string(),
    seed: Some(9_i64),
    strength: Some(10.0_f64),
    style_preset: Some("style-preset".to_string()),
    ..Default::default()
};
let accept = "application/json".to_string();
let result = client.images_stability_ai().create_generate(mode, &body, accept).await?;
println!("{result:?}");
```

### music_suno

```rust
use cloudrouter_open_sdk::*;
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
let result = client.music_suno().create_v1_music_generation(&body).await?;
println!("{result:?}");
```

### chat_typesafe

```rust
use cloudrouter_open_sdk::*;
// TypeSafe AI System One decision
let body = TypeSafeSystemOneRequest {
    model: Some("model".to_string()),
    questions: serde_json::json!({"value":"value"}),
    state: "state".to_string(),
    ..Default::default()
};
let result = client.chat_typesafe().create_v1_systemone(&body).await?;
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
use cloudrouter_open_sdk::*;
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
    stream_options: Some(serde_json::json!({"include_usage":"include-usage"})),
    suffix: Some("suffix".to_string()),
    temperature: Some(16.0_f64),
    top_p: Some(17.0_f64),
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
use cloudrouter_open_sdk::*;
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
use cloudrouter_open_sdk::*;
// Create image edit
let body = OpenAiImageEditRequest {
    background: Some("transparent".to_string()),
    complexity: Some("low".to_string()),
    frame_count: Some(3_i64),
    frame_duration_ms: Some(4_i64),
    images: vec![OpenAiImageReferenceInput::default()],
    input_fidelity: Some("high".to_string()),
    markup: Some(serde_json::json!({"value":"value"})),
    mask: Some(serde_json::json!({"value":"value"})),
    model: Some("model".to_string()),
    moderation: Some("low".to_string()),
    n: Some(11_i64),
    output_compression: Some(12_i64),
    output_format: Some("png".to_string()),
    partial_images: Some(14_i64),
    prompt: "prompt".to_string(),
    quality: Some("low".to_string()),
    safety_identifier: Some("safety-identifier".to_string()),
    size: Some("size".to_string()),
    stream: Some(true),
    svg: Some(serde_json::json!({"value":"value"})),
    user: Some("user".to_string()),
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
use cloudrouter_open_sdk::*;
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
use cloudrouter_open_sdk::*;
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
use cloudrouter_open_sdk::*;
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
use cloudrouter_open_sdk::*;
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

### tool

```rust
use cloudrouter_open_sdk::*;
// Fetch a web page
let body = OpenAiDeepSeekWebFetchRequest {
    url: "https://example.com".to_string(),
    ..Default::default()
};
let result = client.tool().create_fetch(&body).await?;
println!("{result:?}");
```

### upload

```rust
use cloudrouter_open_sdk::*;
// Create upload
let body = OpenAiUploadCreateRequest {
    bytes: 1_i64,
    expires_after: Some(serde_json::json!({"value":"value"})),
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
use cloudrouter_open_sdk::*;
// Vidu image to video
let body = ViduImageToVideoRequest {
    audio: Some(true),
    callback_url: Some("callback-url".to_string()),
    duration: Some(3_i64),
    images: vec!["images".to_string()],
    is_rec: Some(true),
    meta_data: Some("meta-data".to_string()),
    model: "model".to_string(),
    off_peak: Some(false),
    payload: Some("payload".to_string()),
    prompt: Some("prompt".to_string()),
    resolution: Some("resolution".to_string()),
    seed: Some(12_i64),
    watermark: Some(true),
    wm_position: Some(14_i64),
    wm_url: Some("wm-url".to_string()),
    ..Default::default()
};
let result = client.videos_vidu().create_ent_v2_img2video(&body).await?;
println!("{result:?}");
```

### images_vidu

```rust
use cloudrouter_open_sdk::*;
// Vidu reference to image
let body = ViduReferenceToImageRequest {
    aspect_ratio: Some("aspect-ratio".to_string()),
    bgm: Some(false),
    callback_url: Some("callback-url".to_string()),
    images: Some(vec!["images".to_string()]),
    model: "model".to_string(),
    off_peak: Some(false),
    payload: Some("payload".to_string()),
    prompt: "prompt".to_string(),
    resolution: Some("resolution".to_string()),
    seed: Some(10_i64),
    ..Default::default()
};
let result = client.images_vidu().create_ent_v2_reference2image(&body).await?;
println!("{result:?}");
```

### audio_vidu

```rust
use cloudrouter_open_sdk::*;
// Vidu text to audio
let body = ViduTextToAudioRequest {
    bgm: Some(true),
    callback_url: Some("callback-url".to_string()),
    duration: Some(3.0_f64),
    model: "model".to_string(),
    off_peak: Some(true),
    payload: Some("payload".to_string()),
    prompt: "prompt".to_string(),
    seed: Some(8_i64),
    ..Default::default()
};
let result = client.audio_vidu().create_ent_v2_text2audio(&body).await?;
println!("{result:?}");
```

### audio_volcengine

```rust
use cloudrouter_open_sdk::*;
// Volcengine create speech
let body = OpenAiSpeechCreateRequest {
    input: "input".to_string(),
    instructions: Some("instructions".to_string()),
    model: "model".to_string(),
    response_format: Some("mp3".to_string()),
    speed: Some(5.0_f64),
    stream_format: Some("sse".to_string()),
    voice: "voice".to_string(),
    ..Default::default()
};
let result = client.audio_volcengine().create_api_v3_audio_speech(&body).await?;
println!("{result:?}");
```

### videos_volcengine

```rust
use cloudrouter_open_sdk::*;
// Volcengine Ark content generation task
let body = VolcengineContentGenerationTaskCreateRequest {
    callback_url: Some("https://example.com".to_string()),
    camera_fixed: Some(false),
    content: vec![VolcengineContentPart::default()],
    draft: Some(false),
    duration: Some(5_i64),
    execution_expires_after: Some(6_i64),
    frames: Some(7_i64),
    generate_audio: Some(false),
    model: "model".to_string(),
    omni_reference_task_type: Some("auto".to_string()),
    output_format: Some("mp4".to_string()),
    priority: Some(12_i64),
    ratio: Some("16:9".to_string()),
    resolution: Some("480p".to_string()),
    return_last_frame: Some(true),
    safety_identifier: Some("safety-identifier".to_string()),
    seed: Some(17_i64),
    service_tier: Some("default".to_string()),
    tools: Some(vec![ArkWebSearchTool::default()]),
    watermark: Some(false),
    ..Default::default()
};
let result = client.videos_volcengine().create_api_v3_contents_generations_task(&body).await?;
println!("{result:?}");
```

### images_volcengine

```rust
use cloudrouter_open_sdk::*;
// Volcengine Ark image generation
let body = VolcengineImageGenerationRequest {
    background: Some("transparent".to_string()),
    image: Some("image".to_string()),
    layer_decomposition: Some(true),
    model: "model".to_string(),
    optimize_prompt_options: Some(serde_json::json!({"mode":"mode"})),
    output_format: Some("png".to_string()),
    prompt: Some("prompt".to_string()),
    response_format: Some("url".to_string()),
    sequential_image_generation: Some("auto".to_string()),
    sequential_image_generation_options: Some(serde_json::json!({"max_images":"max-images"})),
    size: Some("size".to_string()),
    stream: Some(false),
    tools: Some(vec![ArkWebSearchTool::default()]),
    watermark: Some(false),
    ..Default::default()
};
let result = client.images_volcengine().create_api_v3_images_generation(&body).await?;
println!("{result:?}");
```

### images_xai

```rust
use cloudrouter_open_sdk::*;
// xAI Grok Imagine image edit
let body = XaiImageEditRequest {
    aspect_ratio: Some("1:1".to_string()),
    deferred: Some(false),
    image: Some(serde_json::json!({"file_id":"1","url":"url"})),
    images: Some(vec![XaiImageUrl::default()]),
    model: Some("model".to_string()),
    n: Some(6_i64),
    output: Some(serde_json::json!({"value":"value"})),
    prompt: "prompt".to_string(),
    resolution: Some("1k".to_string()),
    response_format: Some("url".to_string()),
    storage_options: Some(serde_json::json!({"value":"value"})),
    user: Some("user".to_string()),
    ..Default::default()
};
let result = client.images_xai().create_v1_images_edit(&body).await?;
println!("{result:?}");
```

### videos_xai

```rust
use cloudrouter_open_sdk::*;
// xAI Grok Imagine video edit
let body = XaiVideoEditRequest {
    model: Some("model".to_string()),
    output: Some(serde_json::json!({"value":"value"})),
    prompt: "prompt".to_string(),
    storage_options: Some(serde_json::json!({"value":"value"})),
    user: Some("user".to_string()),
    video: serde_json::json!({"file_id":"1","url":"url"}),
    ..Default::default()
};
let result = client.videos_xai().create_v1_videos_edit(&body).await?;
println!("{result:?}");
```

### videos_zhipu

```rust
// Zhipu retrieve video generation task
let task_id = "1";
let result = client.videos_zhipu().list_api_paas_v4_async_result(task_id).await?;
println!("{result:?}");
```

### images_zhipu

```rust
use cloudrouter_open_sdk::*;
// Zhipu CogView image generation
let body = ZhipuImageGenerationRequest {
    model: "glm-image".to_string(),
    prompt: "prompt".to_string(),
    quality: Some("hd".to_string()),
    size: Some("size".to_string()),
    user_id: Some("1".to_string()),
    watermark_enabled: Some(false),
    ..Default::default()
};
let result = client.images_zhipu().create_api_paas_v4_images_generation(&body).await?;
println!("{result:?}");
```

## Error Handling

```rust
use cloudrouter_open_sdk::{SdkworkAiClient, SdkworkConfig};


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
