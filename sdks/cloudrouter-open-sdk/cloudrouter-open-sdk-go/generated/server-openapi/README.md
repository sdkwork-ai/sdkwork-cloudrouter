# cloudrouter-open-sdk (Go)

SDKWork Cloud Router OpenAI-compatible gateway SDK go generated transport SDK

## Installation

```bash
go get github.com/sdkwork/cloudrouter-open-sdk
```

## Quick Start

```go
package main

import (
    "fmt"
    "github.com/sdkwork/cloudrouter-open-sdk"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"

)

func main() {
    cfg := sdkhttp.NewDefaultConfig("https://api.sdkwork.com")
    client := github.com/sdkwork/cloudrouter-open-sdk.NewSdkworkAiClientWithConfig(cfg)
    client.SetApiKey("your-api-key")

    // Use the SDK
    result, err := client.Models.List()
    if err != nil {
        panic(err)
    }
    fmt.Println(result)
}
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```go
cfg := sdkhttp.NewDefaultConfig("https://api.sdkwork.com")
client := github.com/sdkwork/cloudrouter-open-sdk.NewSdkworkAiClientWithConfig(cfg)
client.SetApiKey("your-api-key")
// Sends: Authorization: Bearer <apiKey>
```

### Mode B: Dual Token

```go
cfg := sdkhttp.NewDefaultConfig("https://api.sdkwork.com")
client := github.com/sdkwork/cloudrouter-open-sdk.NewSdkworkAiClientWithConfig(cfg)
client.SetAuthToken("your-auth-token")
client.SetAccessToken("your-access-token")
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `SetApiKey(...)` together with `SetAuthToken(...)` + `SetAccessToken(...)` on the same client.

## Configuration (Non-Auth)

```go
cfg := sdkhttp.NewDefaultConfig("https://api.sdkwork.com")
client := github.com/sdkwork/cloudrouter-open-sdk.NewSdkworkAiClientWithConfig(cfg)

// Set custom headers
client.SetHeader("X-Custom-Header", "value")
```

## API Modules

- `client.ImagesAlibaba` - images_alibaba API
- `client.VideosAlibaba` - videos_alibaba API
- `client.AudioAlibaba` - audio_alibaba API
- `client.FilesAnthropic` - files_anthropic API
- `client.ChatAnthropic` - chat_anthropic API
- `client.BatchesAnthropic` - batches_anthropic API
- `client.VideosBlackForestLabs` - videos_black_forest_labs API
- `client.ImagesBlackForestLabs` - images_black_forest_labs API
- `client.VideosBytedance` - videos_bytedance API
- `client.ImagesBytedance` - images_bytedance API
- `client.AudioBytedance` - audio_bytedance API
- `client.MusicElevenlabs` - music_elevenlabs API
- `client.AudioElevenlabs` - audio_elevenlabs API
- `client.ResponsesGoogle` - responses_google API
- `client.FilesGoogle` - files_google API
- `client.VideosGoogle` - videos_google API
- `client.EmbeddingsGoogle` - embeddings_google API
- `client.ChatGoogle` - chat_google API
- `client.ImagesGoogle` - images_google API
- `client.VideosJimeng` - videos_jimeng API
- `client.AudioKling` - audio_kling API
- `client.ImagesKling` - images_kling API
- `client.VideosKling` - videos_kling API
- `client.VideosLumaAi` - videos_luma_ai API
- `client.VideosMinimax` - videos_minimax API
- `client.ImagesMinimax` - images_minimax API
- `client.MusicMinimax` - music_minimax API
- `client.AudioMinimax` - audio_minimax API
- `client.MusicMureka` - music_mureka API
- `client.VideosPixverse` - videos_pixverse API
- `client.VideosRunway` - videos_runway API
- `client.ImagesRunway` - images_runway API
- `client.AudioStabilityAi` - audio_stability_ai API
- `client.ImagesStabilityAi` - images_stability_ai API
- `client.MusicSuno` - music_suno API
- `client.ChatTypesafe` - chat_typesafe API
- `client.Assistants` - assistant API
- `client.Audio` - audio API
- `client.Batches` - batch API
- `client.Chat` - chat API
- `client.Completion` - completion API
- `client.Container` - container API
- `client.Conversation` - conversation API
- `client.Embeddings` - embedding API
- `client.Files` - file API
- `client.Images` - image API
- `client.Models` - model API
- `client.Moderations` - moderation API
- `client.Realtime` - realtime API
- `client.Responses` - response API
- `client.Threads` - thread API
- `client.Tool` - tool API
- `client.Uploads` - upload API
- `client.VectorStores` - vector_store API
- `client.Video` - video API
- `client.VideosVidu` - videos_vidu API
- `client.ImagesVidu` - images_vidu API
- `client.AudioVidu` - audio_vidu API
- `client.AudioVolcengine` - audio_volcengine API
- `client.VideosVolcengine` - videos_volcengine API
- `client.ImagesVolcengine` - images_volcengine API
- `client.ImagesXai` - images_xai API
- `client.VideosXai` - videos_xai API
- `client.VideosZhipu` - videos_zhipu API
- `client.ImagesZhipu` - images_zhipu API

## Usage Examples

### images_alibaba

```go
// Alibaba Wanx image generation
body := sdktypes.AlibabaImageGenerationRequest{
    Input: map[string]sdktypes.ProviderJsonValue{
    "negative_prompt": "negative_prompt",
    "prompt": "prompt",
},
    Model: "model",
    Parameters: map[string]sdktypes.ProviderJsonValue{
    "n": 1,
    "prompt_extend": false,
    "seed": 3,
    "size": "size",
    "watermark": true,
},
}
xDashScopeAsync := "enable"
result, err := client.ImagesAlibaba.CreateApiV1ServicesAigcText2imageImageSynthesi(body, xDashScopeAsync)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_alibaba

```go
// Alibaba Wan retrieve video generation task
taskId := "1"
result, err := client.VideosAlibaba.ListApiV1Tasks(taskId)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### audio_alibaba

```go
// Alibaba Qwen TTS speech synthesis
body := sdktypes.AlibabaSpeechRequest{
    Input: map[string]sdktypes.ProviderJsonValue{
    "instructions": "instructions",
    "language_type": "Auto",
    "optimize_instructions": true,
    "text": "text",
    "voice": "voice",
},
    Model: "model",
    Parameters: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
}
result, err := client.AudioAlibaba.CreateApiV1ServicesAudioTtsSpeechSynthesizer(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### files_anthropic

```go
// Anthropic list files
params := map[string]interface{}{
    "before_id": "before_id",
    "after_id": "after_id",
    "limit": 3,
}
anthropicVersion := "anthropic-version"
result, err := client.FilesAnthropic.GetListV1Files(params, anthropicVersion)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### chat_anthropic

```go
// Anthropic Claude message
body := sdktypes.AnthropicMessageCreateRequest{
    CacheControl: map[string]sdktypes.ProviderJsonValue{
    "ttl": "5m",
    "type": "ephemeral",
},
    Container: map[string]sdktypes.ProviderJsonValue{
    "id": "id",
    "skills": []sdktypes.AnthropicSkill{
    sdktypes.AnthropicSkill{
        SkillId: "skill_id",
        Type: "anthropic",
        Version: "version",
    },
},
},
    Diagnostics: map[string]sdktypes.ProviderJsonValue{
    "previous_message_id": "previous_message_id",
},
    InferenceGeo: "inference_geo",
    MaxTokens: 5,
    Messages: []sdktypes.AnthropicMessageParam{
    sdktypes.AnthropicMessageParam{
        Content: "content",
        Role: "user",
    },
},
    Metadata: map[string]sdktypes.ProviderJsonValue{
    "user_id": "user_id",
},
    Model: "model",
    OutputConfig: map[string]sdktypes.ProviderJsonValue{
    "effort": "low",
    "format": map[string]sdktypes.ProviderJsonValue{
    "schema": map[string]sdktypes.ProviderJsonValue{
    "additionalProperties": true,
    "description": "description",
    "enum": []sdktypes.ProviderJsonValue{
    "item",
},
    "items": "items",
    "properties": map[string]interface{}{
    "value": "value",
},
    "required": []string{
    "item",
},
    "type": "type",
},
    "type": "json_schema",
},
},
    ServiceTier: "auto",
    Speed: "standard",
    StopSequences: []string{
    "item",
},
    Stream: true,
    System: "system",
    Temperature: 15,
    Thinking: map[string]sdktypes.ProviderJsonValue{
    "budget_tokens": 1,
    "display": "summarized",
    "type": "enabled",
},
    ToolChoice: map[string]sdktypes.ProviderJsonValue{
    "disable_parallel_tool_use": true,
    "name": "name",
    "type": "auto",
},
    Tools: []sdktypes.AnthropicTool{
    map[string]sdktypes.ProviderJsonValue{
        "allowed_callers": []string{
        "direct",
    },
        "cache_control": map[string]sdktypes.ProviderJsonValue{
        "ttl": "5m",
        "type": "ephemeral",
    },
        "defer_loading": true,
        "description": "description",
        "eager_input_streaming": true,
        "input_examples": []map[string]sdktypes.ProviderJsonValue{
        map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
    },
        "input_schema": map[string]sdktypes.ProviderJsonValue{
        "additionalProperties": true,
        "description": "description",
        "enum": []sdktypes.ProviderJsonValue{
        "item",
    },
        "items": "items",
        "properties": map[string]interface{}{
        "value": "value",
    },
        "required": []string{
        "item",
    },
        "type": "type",
    },
        "name": "name",
        "strict": true,
        "type": "custom",
    },
},
    TopK: 19,
    TopP: 20,
}
anthropicVersion := "anthropic-version"
result, err := client.ChatAnthropic.CreateV1Message(body, anthropicVersion)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### batches_anthropic

```go
// Anthropic list message batches
params := map[string]interface{}{
    "before_id": "before_id",
    "after_id": "after_id",
    "limit": 3,
}
anthropicVersion := "anthropic-version"
result, err := client.BatchesAnthropic.GetListV1MessagesBatches(params, anthropicVersion)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_black_forest_labs

```go
// Black Forest Labs FLUX 3 video generation
body := sdktypes.BlackForestLabsVideoGenerationRequest{
    AspectRatio: "21:9",
    Draft: false,
    DraftCache: "draft_cache",
    Duration: 4,
    GenerateAudio: true,
    Keyframes: "keyframes",
    Mode: "t2v",
    Prompt: "prompt",
    Resolution: "hd",
    SafetyTolerance: 10,
    StartVideo: "start_video",
    User: "user",
    Version: "version",
}
result, err := client.VideosBlackForestLabs.CreateFlux3Video(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_black_forest_labs

```go
// Black Forest Labs retrieve generation result
params := map[string]interface{}{
    "id": "id",
}
result, err := client.ImagesBlackForestLabs.ListGetResult(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_bytedance

```go
// ByteDance Seedance video generation
body := sdktypes.BytedanceVideoGenerationRequest{
    CallbackUrl: "callback_url",
    CameraFixed: false,
    Content: []sdktypes.ArkContentPart{
    sdktypes.ArkContentPart{
        AudioUrl: map[string]sdktypes.ProviderJsonValue{
        "url": "url",
    },
        DraftTask: map[string]sdktypes.ProviderJsonValue{
        "id": "id",
    },
        ImageUrl: map[string]sdktypes.ProviderJsonValue{
        "url": "url",
    },
        Role: "first_frame",
        Text: "text",
        Type: "text",
        VideoUrl: map[string]sdktypes.ProviderJsonValue{
        "url": "url",
    },
    },
},
    Draft: false,
    Duration: 5,
    ExecutionExpiresAfter: 6,
    Frames: 7,
    GenerateAudio: false,
    Model: "model",
    OmniReferenceTaskType: "auto",
    OutputFormat: "mp4",
    Priority: 12,
    Ratio: "16:9",
    Resolution: "480p",
    ReturnLastFrame: true,
    SafetyIdentifier: "safety_identifier",
    Seed: 17,
    ServiceTier: "default",
    Tools: []sdktypes.ArkWebSearchTool{
    sdktypes.ArkWebSearchTool{
        Type: "web_search",
    },
},
    Watermark: false,
}
result, err := client.VideosBytedance.CreateApiV3ContentsGenerationsTask(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_bytedance

```go
// ByteDance Seedream image generation
body := sdktypes.BytedanceImageGenerationRequest{
    Background: "transparent",
    Image: "image",
    LayerDecomposition: true,
    Model: "model",
    OptimizePromptOptions: map[string]sdktypes.ProviderJsonValue{
    "mode": "standard",
},
    OutputFormat: "png",
    Prompt: "prompt",
    ResponseFormat: "url",
    SequentialImageGeneration: "auto",
    SequentialImageGenerationOptions: map[string]sdktypes.ProviderJsonValue{
    "max_images": 1,
},
    Size: "size",
    Stream: false,
    Tools: []sdktypes.ArkWebSearchTool{
    sdktypes.ArkWebSearchTool{
        Type: "web_search",
    },
},
    Watermark: false,
}
result, err := client.ImagesBytedance.CreateApiV3ImagesGeneration(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### audio_bytedance

```go
// ByteDance Seed TTS speech synthesis
body := sdktypes.BytedanceSpeechRequest{
    ReqParams: map[string]sdktypes.ProviderJsonValue{
    "additions": "additions",
    "audio_params": map[string]sdktypes.ProviderJsonValue{
    "format": "mp3",
    "loudness_rate": 2,
    "sample_rate": 3,
    "speech_rate": 4,
},
    "model": "model",
    "pronunciation_dict": map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    "speaker": "speaker",
    "ssml": "ssml",
    "text": "text",
    "tone": []string{
    "item",
},
},
}
xApiResourceId := "seed-tts-2.0"
xApiRequestId := "X-Api-Request-Id"
result, err := client.AudioBytedance.CreateApiV3TtsUnidirectional(body, xApiResourceId, xApiRequestId)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### music_elevenlabs

```go
// ElevenLabs music generation
body := sdktypes.ElevenLabsMusicGenerationRequest{
    CompositionPlan: map[string]sdktypes.ProviderJsonValue{
    "negative_global_styles": []string{
    "item",
},
    "positive_global_styles": []string{
    "item",
},
    "sections": []map[string]sdktypes.ProviderJsonValue{
    map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
},
},
    FinetuneId: "finetune_id",
    FinetuneStrength: 3,
    ForceInstrumental: false,
    GenerationMode: "track",
    LyricsText: "lyrics_text",
    ModelId: "music_v1",
    MusicLengthMs: 8,
    MusicPrompt: map[string]sdktypes.ProviderJsonValue{
    "negative_global_styles": []string{
    "item",
},
    "positive_global_styles": []string{
    "item",
},
    "sections": []map[string]sdktypes.ProviderJsonValue{
    map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
},
},
    Prompt: "prompt",
    RespectSectionsDurations: true,
    Seed: 12,
    SignWithC2pa: true,
    StoreForInpainting: false,
    UsePhoneticNames: true,
}
params := map[string]interface{}{
    "output_format": "output_format",
}
result, err := client.MusicElevenlabs.CreateV1Music(body, params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### audio_elevenlabs

```go
// Generate sound effect
body := sdktypes.ElevenLabsSoundGenerationRequest{
    DurationSeconds: 1,
    Loop: false,
    ModelId: "eleven_text_to_sound_v2",
    PromptInfluence: 4,
    Text: "text",
}
params := map[string]interface{}{
    "output_format": "output_format",
}
result, err := client.AudioElevenlabs.CreateV1SoundGeneration(body, params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### responses_google

```go
// Google Gemini list cached contents
params := map[string]interface{}{
    "pageSize": 1,
    "pageToken": "pageToken",
}
result, err := client.ResponsesGoogle.GetListV1betaCachedContents(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### files_google

```go
// Google Gemini list files
params := map[string]interface{}{
    "pageSize": 1,
    "pageToken": "pageToken",
}
result, err := client.FilesGoogle.GetListV1betaFiles(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_google

```go
// Google Gemini retrieve video operation (Veo)
model := "model"
operationId := "1"
result, err := client.VideosGoogle.ListV1betaModelsOperations(model, operationId)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### embeddings_google

```go
// Google Gemini batch embed contents
model := "model"
body := sdktypes.GoogleBatchEmbedContentsRequest{
    Requests: []sdktypes.GoogleEmbedContentRequest{
    sdktypes.GoogleEmbedContentRequest{
        Content: map[string]sdktypes.ProviderJsonValue{
        "parts": []sdktypes.GooglePart{
        sdktypes.GooglePart{
            AudioTranscription: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            CodeExecutionResult: map[string]sdktypes.ProviderJsonValue{
            "outcome": "outcome",
            "output": "output",
        },
            ExecutableCode: map[string]sdktypes.ProviderJsonValue{
            "code": "code",
            "language": "language",
        },
            FileData: map[string]sdktypes.ProviderJsonValue{
            "fileUri": "fileUri",
            "mimeType": "mimeType",
        },
            FunctionCall: map[string]sdktypes.ProviderJsonValue{
            "args": map[string]interface{}{
            "value": "value",
        },
            "name": "name",
        },
            FunctionResponse: map[string]sdktypes.ProviderJsonValue{
            "name": "name",
            "response": map[string]interface{}{
            "value": "value",
        },
        },
            InlineData: map[string]sdktypes.ProviderJsonValue{
            "data": "data",
            "mimeType": "mimeType",
        },
            MediaProcessing: "MEDIA_PROCESSING_UNSPECIFIED",
            MediaResolution: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            PartMetadata: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            SpeechMetadata: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            Text: "text",
            Thought: true,
            ThoughtSignature: "thoughtSignature",
            ToolCall: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            ToolResponse: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            VideoMetadata: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
        },
    },
        "role": "role",
    },
        EmbedContentConfig: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        Model: "model",
        OutputDimensionality: 4,
        TaskType: "TASK_TYPE_UNSPECIFIED",
        Title: "title",
    },
},
}
result, err := client.EmbeddingsGoogle.CreateV1betaModelsModelBatchEmbedContent(model, body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### chat_google

```go
// Google Gemini count tokens
model := "model"
body := sdktypes.GoogleCountTokensRequest{
    Contents: []sdktypes.GoogleContent{
    sdktypes.GoogleContent{
        Parts: []sdktypes.GooglePart{
        sdktypes.GooglePart{
            AudioTranscription: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            CodeExecutionResult: map[string]sdktypes.ProviderJsonValue{
            "outcome": "outcome",
            "output": "output",
        },
            ExecutableCode: map[string]sdktypes.ProviderJsonValue{
            "code": "code",
            "language": "language",
        },
            FileData: map[string]sdktypes.ProviderJsonValue{
            "fileUri": "fileUri",
            "mimeType": "mimeType",
        },
            FunctionCall: map[string]sdktypes.ProviderJsonValue{
            "args": map[string]interface{}{
            "value": "value",
        },
            "name": "name",
        },
            FunctionResponse: map[string]sdktypes.ProviderJsonValue{
            "name": "name",
            "response": map[string]interface{}{
            "value": "value",
        },
        },
            InlineData: map[string]sdktypes.ProviderJsonValue{
            "data": "data",
            "mimeType": "mimeType",
        },
            MediaProcessing: "MEDIA_PROCESSING_UNSPECIFIED",
            MediaResolution: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            PartMetadata: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            SpeechMetadata: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            Text: "text",
            Thought: true,
            ThoughtSignature: "thoughtSignature",
            ToolCall: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            ToolResponse: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            VideoMetadata: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
        },
    },
        Role: "role",
    },
},
    GenerateContentRequest: map[string]sdktypes.ProviderJsonValue{
    "cachedContent": "cachedContent",
    "contents": []sdktypes.GoogleContent{
    sdktypes.GoogleContent{
        Parts: []sdktypes.GooglePart{
        sdktypes.GooglePart{
            AudioTranscription: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            CodeExecutionResult: map[string]sdktypes.ProviderJsonValue{
            "outcome": "outcome",
            "output": "output",
        },
            ExecutableCode: map[string]sdktypes.ProviderJsonValue{
            "code": "code",
            "language": "language",
        },
            FileData: map[string]sdktypes.ProviderJsonValue{
            "fileUri": "fileUri",
            "mimeType": "mimeType",
        },
            FunctionCall: map[string]sdktypes.ProviderJsonValue{
            "args": map[string]interface{}{
            "value": "value",
        },
            "name": "name",
        },
            FunctionResponse: map[string]sdktypes.ProviderJsonValue{
            "name": "name",
            "response": map[string]interface{}{
            "value": "value",
        },
        },
            InlineData: map[string]sdktypes.ProviderJsonValue{
            "data": "data",
            "mimeType": "mimeType",
        },
            MediaProcessing: "MEDIA_PROCESSING_UNSPECIFIED",
            MediaResolution: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            PartMetadata: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            SpeechMetadata: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            Text: "text",
            Thought: true,
            ThoughtSignature: "thoughtSignature",
            ToolCall: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            ToolResponse: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
            VideoMetadata: map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
        },
    },
        Role: "role",
    },
},
    "continuationToken": "continuationToken",
    "generationConfig": map[string]sdktypes.ProviderJsonValue{
    "audioTranscriptionConfig": map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    "candidateCount": 2,
    "enableAffectiveDialog": true,
    "enableEnhancedCivicAnswers": false,
    "frequencyPenalty": 5,
    "imageConfig": map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    "logprobs": 7,
    "maxOutputTokens": 8,
    "mediaResolution": "MEDIA_RESOLUTION_UNSPECIFIED",
    "presencePenalty": 10,
    "responseFormat": map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    "responseJsonSchema": "responseJsonSchema",
    "responseLogprobs": true,
    "responseMimeType": "responseMimeType",
    "responseModalities": []string{
    "item",
},
    "responseSchema": map[string]sdktypes.ProviderJsonValue{
    "description": "description",
    "enum": []string{
    "item",
},
    "format": "format",
    "items": "items",
    "nullable": true,
    "properties": map[string]interface{}{
    "value": "value",
},
    "required": []string{
    "item",
},
    "type": "type",
},
    "seed": 17,
    "speechConfig": map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    "stopSequences": []string{
    "item",
},
    "temperature": 20,
    "thinkingConfig": map[string]sdktypes.ProviderJsonValue{
    "includeThoughts": true,
    "thinkingBudget": 2,
},
    "topK": 22,
    "topP": 23,
    "translationConfig": map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
},
    "labels": map[string]string{
    "value": "value",
},
    "model": "model",
    "safetySettings": []sdktypes.GoogleSafetySetting{
    sdktypes.GoogleSafetySetting{
        Category: "category",
        Threshold: "threshold",
    },
},
    "serviceTier": "unspecified",
    "store": true,
    "systemInstruction": map[string]sdktypes.ProviderJsonValue{
    "parts": []sdktypes.GooglePart{
    sdktypes.GooglePart{
        AudioTranscription: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        CodeExecutionResult: map[string]sdktypes.ProviderJsonValue{
        "outcome": "outcome",
        "output": "output",
    },
        ExecutableCode: map[string]sdktypes.ProviderJsonValue{
        "code": "code",
        "language": "language",
    },
        FileData: map[string]sdktypes.ProviderJsonValue{
        "fileUri": "fileUri",
        "mimeType": "mimeType",
    },
        FunctionCall: map[string]sdktypes.ProviderJsonValue{
        "args": map[string]interface{}{
        "value": "value",
    },
        "name": "name",
    },
        FunctionResponse: map[string]sdktypes.ProviderJsonValue{
        "name": "name",
        "response": map[string]interface{}{
        "value": "value",
    },
    },
        InlineData: map[string]sdktypes.ProviderJsonValue{
        "data": "data",
        "mimeType": "mimeType",
    },
        MediaProcessing: "MEDIA_PROCESSING_UNSPECIFIED",
        MediaResolution: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        PartMetadata: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        SpeechMetadata: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        Text: "text",
        Thought: true,
        ThoughtSignature: "thoughtSignature",
        ToolCall: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        ToolResponse: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        VideoMetadata: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
    },
},
    "role": "role",
},
    "toolConfig": map[string]sdktypes.ProviderJsonValue{
    "functionCallingConfig": map[string]sdktypes.ProviderJsonValue{
    "allowedFunctionNames": []string{
    "item",
},
    "mode": "mode",
},
},
    "tools": []sdktypes.GoogleTool{
    sdktypes.GoogleTool{
        CodeExecution: map[string]sdktypes.ProviderJsonValue{
        "enabled": true,
    },
        ComputerUse: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        FileSearch: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        FunctionDeclarations: []sdktypes.GoogleFunctionDeclaration{
        sdktypes.GoogleFunctionDeclaration{
            Description: "description",
            Name: "name",
            Parameters: map[string]sdktypes.ProviderJsonValue{
            "description": "description",
            "enum": []string{
            "item",
        },
            "format": "format",
            "items": "items",
            "nullable": true,
            "properties": map[string]interface{}{
            "value": "value",
        },
            "required": []string{
            "item",
        },
            "type": "type",
        },
            Response: map[string]sdktypes.ProviderJsonValue{
            "description": "description",
            "enum": []string{
            "item",
        },
            "format": "format",
            "items": "items",
            "nullable": true,
            "properties": map[string]interface{}{
            "value": "value",
        },
            "required": []string{
            "item",
        },
            "type": "type",
        },
        },
    },
        GoogleMaps: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        GoogleSearch: map[string]sdktypes.ProviderJsonValue{
        "dynamicRetrievalConfig": map[string]sdktypes.ProviderJsonValue{
        "dynamicThreshold": 1,
        "mode": "mode",
    },
    },
        GoogleSearchRetrieval: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        McpServers: []map[string]sdktypes.ProviderJsonValue{
        map[string]sdktypes.ProviderJsonValue{
            "value": "value",
        },
    },
        UrlContext: map[string]sdktypes.ProviderJsonValue{
        "allowedDomains": []string{
        "item",
    },
    },
    },
},
},
}
result, err := client.ChatGoogle.CreateV1betaModelsModelCountToken(model, body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_google

```go
// Google Gemini image generation
model := "model"
body := sdktypes.GeminiImageGenerationRequest{
    Instances: []map[string]sdktypes.ProviderJsonValue{
    map[string]sdktypes.ProviderJsonValue{
        "image": map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        "prompt": "prompt",
    },
},
    Parameters: map[string]sdktypes.ProviderJsonValue{
    "aspectRatio": "aspectRatio",
    "personGeneration": "personGeneration",
    "sampleCount": 3,
},
}
result, err := client.ImagesGoogle.CreateV1betaModelsModelGenerateImage(model, body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_jimeng

```go
// Jimeng retrieve video generation task
taskId := "1"
result, err := client.VideosJimeng.ListV1Tasks(taskId)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### audio_kling

```go
// Kling text to audio
body := sdktypes.KlingSoundGenerationRequest{
    CallbackUrl: "callback_url",
    Duration: 2,
    ExternalTaskId: "external_task_id",
    Prompt: "prompt",
}
result, err := client.AudioKling.CreateV1AudioTextToAudio(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_kling

```go
// Kling image generation
body := sdktypes.KlingImageGenerationRequest{
    AspectRatio: "16:9",
    CallbackUrl: "callback_url",
    ElementList: []sdktypes.KlingElementReference{
    sdktypes.KlingElementReference{
        ElementId: 1,
    },
},
    ExternalTaskId: "external_task_id",
    HumanFidelity: 5,
    Image: "image",
    ImageFidelity: 7,
    ImageReference: "subject",
    ModelName: "kling-v2-1",
    N: 10,
    NegativePrompt: "negative_prompt",
    Prompt: "prompt",
    Resolution: "1k",
    WatermarkInfo: map[string]sdktypes.ProviderJsonValue{
    "enabled": true,
},
}
result, err := client.ImagesKling.CreateV1ImagesGeneration(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_kling

```go
// Kling create avatar video
body := sdktypes.KlingAvatarCreateRequest{
    AudioUrl: "audio_url",
    CallbackUrl: "callback_url",
    HumanImage: "human_image",
    ModelName: "model_name",
    Prompt: "prompt",
    Text: "text",
    VoiceId: "voice_id",
    VoiceLanguage: "voice_language",
    VoiceMode: "voice_mode",
}
result, err := client.VideosKling.CreateV1VideosAvatar(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_luma_ai

```go
// Luma Dream Machine video generation
body := sdktypes.LumaVideoGenerationRequest{
    AspectRatio: "1:1",
    CallbackUrl: "callback_url",
    Concepts: []sdktypes.LumaConcept{
    sdktypes.LumaConcept{
        Key: "key",
    },
},
    Duration: "duration",
    GenerationType: "video",
    Keyframes: map[string]sdktypes.ProviderJsonValue{
    "frame0": map[string]sdktypes.ProviderJsonValue{
    "id": "id",
    "type": "image",
    "url": "url",
},
    "frame1": map[string]sdktypes.ProviderJsonValue{
    "id": "id",
    "type": "image",
    "url": "url",
},
},
    Loop: true,
    Model: "ray-2",
    Prompt: "prompt",
    Resolution: "resolution",
}
result, err := client.VideosLumaAi.CreateGeneration(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_minimax

```go
// MiniMax retrieve video file
params := map[string]interface{}{
    "file_id": "file_id",
}
result, err := client.VideosMinimax.ListV1FilesRetrieve(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_minimax

```go
// MiniMax image generation
body := sdktypes.MinimaxImageGenerationRequest{
    AspectRatio: "1:1",
    Height: 2,
    Model: "image-01",
    N: 4,
    Prompt: "prompt",
    PromptOptimizer: false,
    ResponseFormat: "url",
    Seed: 8,
    SubjectReference: []map[string]sdktypes.ProviderJsonValue{
    map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
},
    Width: 10,
}
result, err := client.ImagesMinimax.CreateV1ImageGeneration(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### music_minimax

```go
// Minimax create music generation
body := sdktypes.MiniMaxMusicGenerationRequest{
    AudioBase64: "audio_base64",
    AudioSetting: map[string]sdktypes.ProviderJsonValue{
    "bitrate": 32000,
    "format": "mp3",
    "sample_rate": 16000,
},
    AudioUrl: "audio_url",
    CoverFeatureId: "cover_feature_id",
    IsInstrumental: true,
    Lyrics: "lyrics",
    LyricsOptimizer: true,
    Model: "music-3.0",
    OutputFormat: "url",
    Prompt: "prompt",
    Stream: true,
}
result, err := client.MusicMinimax.CreateV1MusicGeneration(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### audio_minimax

```go
// MiniMax speech synthesis
body := sdktypes.MinimaxTextToSpeechRequest{
    AudioSetting: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    LanguageBoost: "language_boost",
    Model: "speech-2.8-hd",
    OutputFormat: "url",
    PronunciationDict: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    Stream: false,
    StreamOptions: map[string]sdktypes.ProviderJsonValue{
    "exclude_aggregated_audio": true,
},
    SubtitleEnable: false,
    SubtitleType: "sentence",
    Text: "text",
    TextNormalizationMode: "basic",
    TimbreWeights: []sdktypes.MinimaxTimbreWeight{
    sdktypes.MinimaxTimbreWeight{
        VoiceId: "voice_id",
        Weight: 2,
    },
},
    VoiceModify: map[string]sdktypes.ProviderJsonValue{
    "intensity": 1,
    "pitch": 2,
    "sound_effects": "spacious_echo",
    "timbre": 4,
},
    VoiceSetting: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
}
result, err := client.AudioMinimax.CreateV1T2aV(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### music_mureka

```go
// Mureka song generation
body := sdktypes.MurekaMusicGenerationRequest{
    CallbackUrl: "callback_url",
    Duration: 2,
    Lyrics: "lyrics",
    Model: "model",
    Prompt: "prompt",
    ReferenceAudioUrl: "reference_audio_url",
    Tags: []string{
    "item",
},
    Title: "title",
}
result, err := client.MusicMureka.CreateV1SongGenerate(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_pixverse

```go
// PixVerse retrieve video generation
videoId := "1"
aiTraceId := "Ai-trace-id"
result, err := client.VideosPixverse.ListOpenapiV2VideoResult(videoId, aiTraceId)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_runway

```go
// Runway image to video
body := sdktypes.RunwayImageToVideoRequest{
    Audio: true,
    Bitrate: "standard",
    CfgScale: 3,
    ContentModeration: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    Draft: true,
    Duration: 6,
    Model: "model",
    NegativePrompt: "negativePrompt",
    OutputFormat: "mp4",
    PromptExpansionMode: "disabled",
    PromptImage: "promptImage",
    PromptText: "promptText",
    ProresProfile: "422",
    ProviderSettings: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    Ratio: "ratio",
    ReferenceAudio: []map[string]sdktypes.ProviderJsonValue{
    map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
},
    ReferenceVideos: []map[string]sdktypes.ProviderJsonValue{
    map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
},
    References: []map[string]sdktypes.ProviderJsonValue{
    map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
},
    Resolution: "480p",
    Seed: 20,
}
xRunwayVersion := "2024-11-06"
result, err := client.VideosRunway.CreateV1ImageToVideo(body, xRunwayVersion)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_runway

```go
// Runway retrieve task
taskId := "1"
xRunwayVersion := "2024-11-06"
result, err := client.ImagesRunway.ListV1Tasks(taskId, xRunwayVersion)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### audio_stability_ai

```go
// Stability AI text-to-audio (music and sound effects)
body := sdktypes.StabilityAudioRequest{
    CfgScale: 1,
    Duration: 2,
    Model: "stable-audio-2",
    OutputFormat: "mp3",
    Prompt: "prompt",
    Seed: 6,
    Steps: 7,
}
result, err := client.AudioStabilityAi.CreateTextToAudio(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_stability_ai

```go
// Stability AI image generation
mode := "mode"
body := sdktypes.StabilityImageGenerationRequest{
    AspectRatio: "21:9",
    CfgScale: 2,
    Image: "image",
    Mode: "text-to-image",
    Model: "sd3.5-large",
    NegativePrompt: "negative_prompt",
    OutputFormat: "png",
    Prompt: "prompt",
    Seed: 9,
    Strength: 10,
    StylePreset: "style_preset",
}
accept := "application/json"
result, err := client.ImagesStabilityAi.CreateGenerate(mode, body, accept)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### music_suno

```go
// Suno music generation
body := sdktypes.SunoMusicGenerationRequest{
    CallbackUrl: "callback_url",
    Duration: 2,
    Model: "model",
    NegativeTags: "negative_tags",
    Prompt: "prompt",
    Tags: "tags",
    Title: "title",
}
result, err := client.MusicSuno.CreateV1MusicGeneration(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### chat_typesafe

```go
// TypeSafe AI System One decision
body := sdktypes.TypeSafeSystemOneRequest{
    Model: "model",
    Questions: map[string]sdktypes.TypeSafeQuestion{
    "value": map[string]sdktypes.ProviderJsonValue{
    "criteria": "criteria",
    "instructions": "instructions",
    "type": "choice",
},
},
    State: "state",
}
result, err := client.ChatTypesafe.CreateV1Systemone(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### assistant

```go
// List assistants
params := map[string]interface{}{
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before",
}
result, err := client.Assistants.List(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### audio

```go
// List voice consents
params := map[string]interface{}{
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before",
}
result, err := client.Audio.GetListVoiceConsents(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### batch

```go
// List batches
params := map[string]interface{}{
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before",
}
result, err := client.Batches.List(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### chat

```go
// List stored chat completions
params := map[string]interface{}{
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before",
    "model": "model",
    "metadata": "metadata",
}
result, err := client.Chat.List(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### completion

```go
// Create completion
body := sdktypes.OpenAiCompletionCreateRequest{
    BestOf: 1,
    Echo: false,
    FrequencyPenalty: 3,
    LogitBias: map[string]float64{
    "value": 1,
},
    Logprobs: 5,
    MaxTokens: 6,
    Model: "model",
    N: 8,
    PresencePenalty: 9,
    Prompt: "prompt",
    Seed: 11,
    Stop: "stop",
    Stream: true,
    StreamOptions: map[string]sdktypes.ProviderJsonValue{
    "include_usage": true,
},
    Suffix: "suffix",
    Temperature: 16,
    TopP: 17,
    User: "user",
}
result, err := client.Completion.Create(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### container

```go
// List containers
params := map[string]interface{}{
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before",
}
result, err := client.Container.List(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### conversation

```go
// List conversations
params := map[string]interface{}{
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before",
}
result, err := client.Conversation.List(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### embedding

```go
// Create embeddings
body := sdktypes.OpenAiEmbeddingsRequest{
    Dimensions: 1,
    EncodingFormat: "float",
    Input: "input",
    Model: "model",
    User: "user",
}
result, err := client.Embeddings.Create(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### file

```go
// List files
params := map[string]interface{}{
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before",
}
result, err := client.Files.List(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### image

```go
// Create image edit
body := sdktypes.OpenAiImageEditRequest{
    Background: "transparent",
    Complexity: "low",
    FrameCount: 3,
    FrameDurationMs: 4,
    Images: []sdktypes.OpenAiImageReferenceInput{
    "item",
},
    InputFidelity: "high",
    Markup: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    Mask: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    Model: "model",
    Moderation: "low",
    N: 11,
    OutputCompression: 12,
    OutputFormat: "png",
    PartialImages: 14,
    Prompt: "prompt",
    Quality: "low",
    SafetyIdentifier: "safety_identifier",
    Size: "size",
    Stream: true,
    Svg: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    User: "user",
}
result, err := client.Images.CreateEdit(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### model

```go
// List models
result, err := client.Models.List()
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### moderation

```go
// Create moderation
body := sdktypes.OpenAiModerationCreateRequest{
    Input: "input",
    Model: "model",
}
result, err := client.Moderations.Create(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### realtime

```go
// Create realtime call
body := sdktypes.OpenAiRealtimeCallCreateRequest{
    Metadata: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    Sdp: "sdp",
    Session: "session",
}
result, err := client.Realtime.CreateCall(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### response

```go
// Create response
body := sdktypes.OpenAiResponsesRequest{
    Background: true,
    Conversation: "conversation",
    Include: []string{
    "item",
},
    Input: "input",
    Instructions: "instructions",
    MaxOutputTokens: 6,
    MaxToolCalls: 7,
    Metadata: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    Model: "model",
    ParallelToolCalls: false,
    PreviousResponseId: "previous_response_id",
    Prompt: map[string]sdktypes.ProviderJsonValue{
    "id": "id",
    "variables": map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    "version": "version",
},
    PromptCacheKey: "prompt_cache_key",
    Reasoning: map[string]sdktypes.ProviderJsonValue{
    "effort": "minimal",
    "summary": "auto",
},
    ServiceTier: "auto",
    Store: false,
    Stream: true,
    Temperature: 18,
    Text: map[string]sdktypes.ProviderJsonValue{
    "format": map[string]sdktypes.ProviderJsonValue{
    "json_schema": map[string]sdktypes.ProviderJsonValue{
    "description": "description",
    "name": "name",
    "schema": map[string]sdktypes.ProviderJsonValue{
    "additionalProperties": "additionalProperties",
    "description": "description",
    "enum": []sdktypes.ProviderJsonValue{
    "item",
},
    "items": "items",
    "properties": map[string]interface{}{
    "value": "value",
},
    "required": []string{
    "item",
},
    "type": "type",
},
    "strict": false,
},
    "type": "text",
},
},
    ToolChoice: "tool_choice",
    Tools: []sdktypes.OpenAiTool{
    sdktypes.OpenAiTool{
        Function: map[string]sdktypes.ProviderJsonValue{
        "description": "description",
        "name": "name",
        "parameters": map[string]sdktypes.ProviderJsonValue{
        "additionalProperties": "additionalProperties",
        "description": "description",
        "enum": []sdktypes.ProviderJsonValue{
        "item",
    },
        "items": "items",
        "properties": map[string]interface{}{
        "value": "value",
    },
        "required": []string{
        "item",
    },
        "type": "type",
    },
        "strict": false,
    },
        Type: "function",
    },
},
    TopLogprobs: 22,
    TopP: 23,
    Truncation: "auto",
    User: "user",
}
result, err := client.Responses.Create(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### thread

```go
// Create thread
body := sdktypes.OpenAiThreadCreateRequest{
    Messages: []sdktypes.OpenAiThreadMessageCreateRequest{
    sdktypes.OpenAiThreadMessageCreateRequest{
        Attachments: []sdktypes.ProviderJsonValue{
        "item",
    },
        Content: "content",
        Metadata: map[string]sdktypes.ProviderJsonValue{
        "value": "value",
    },
        Role: "role",
    },
},
    Metadata: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    ToolResources: "tool_resources",
}
result, err := client.Threads.Create(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### tool

```go
// Fetch a web page
body := sdktypes.OpenAiDeepSeekWebFetchRequest{
    Url: "url",
}
result, err := client.Tool.CreateFetch(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### upload

```go
// Create upload
body := sdktypes.OpenAiUploadCreateRequest{
    Bytes: 1,
    ExpiresAfter: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    Filename: "filename",
    MimeType: "mime_type",
    Purpose: "purpose",
}
result, err := client.Uploads.Create(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### vector_store

```go
// List vector stores
params := map[string]interface{}{
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before",
}
result, err := client.VectorStores.ListVectorStore(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### video

```go
// List videos
params := map[string]interface{}{
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before",
}
result, err := client.Video.List(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_vidu

```go
// Vidu image to video
body := sdktypes.ViduImageToVideoRequest{
    Audio: true,
    CallbackUrl: "callback_url",
    Duration: 3,
    Images: []string{
    "item",
},
    IsRec: true,
    MetaData: "meta_data",
    Model: "model",
    OffPeak: false,
    Payload: "payload",
    Prompt: "prompt",
    Resolution: "resolution",
    Seed: 12,
    Watermark: true,
    WmPosition: 14,
    WmUrl: "wm_url",
}
result, err := client.VideosVidu.CreateEntV2Img2video(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_vidu

```go
// Vidu reference to image
body := sdktypes.ViduReferenceToImageRequest{
    AspectRatio: "aspect_ratio",
    Bgm: false,
    CallbackUrl: "callback_url",
    Images: []string{
    "item",
},
    Model: "model",
    OffPeak: false,
    Payload: "payload",
    Prompt: "prompt",
    Resolution: "resolution",
    Seed: 10,
}
result, err := client.ImagesVidu.CreateEntV2Reference2image(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### audio_vidu

```go
// Vidu text to audio
body := sdktypes.ViduTextToAudioRequest{
    Bgm: true,
    CallbackUrl: "callback_url",
    Duration: 3,
    Model: "model",
    OffPeak: true,
    Payload: "payload",
    Prompt: "prompt",
    Seed: 8,
}
result, err := client.AudioVidu.CreateEntV2Text2audio(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### audio_volcengine

```go
// Volcengine create speech
body := sdktypes.OpenAiSpeechCreateRequest{
    Input: "input",
    Instructions: "instructions",
    Model: "model",
    ResponseFormat: "mp3",
    Speed: 5,
    StreamFormat: "sse",
    Voice: "voice",
}
result, err := client.AudioVolcengine.CreateApiV3AudioSpeech(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_volcengine

```go
// Volcengine Ark content generation task
body := sdktypes.VolcengineContentGenerationTaskCreateRequest{
    CallbackUrl: "callback_url",
    CameraFixed: false,
    Content: []sdktypes.VolcengineContentPart{
    sdktypes.VolcengineContentPart{
        AudioUrl: map[string]sdktypes.ProviderJsonValue{
        "url": "url",
    },
        DraftTask: map[string]sdktypes.ProviderJsonValue{
        "id": "id",
    },
        ImageUrl: map[string]sdktypes.ProviderJsonValue{
        "url": "url",
    },
        Role: "first_frame",
        Text: "text",
        Type: "text",
        VideoUrl: map[string]sdktypes.ProviderJsonValue{
        "url": "url",
    },
    },
},
    Draft: false,
    Duration: 5,
    ExecutionExpiresAfter: 6,
    Frames: 7,
    GenerateAudio: false,
    Model: "model",
    OmniReferenceTaskType: "auto",
    OutputFormat: "mp4",
    Priority: 12,
    Ratio: "16:9",
    Resolution: "480p",
    ReturnLastFrame: true,
    SafetyIdentifier: "safety_identifier",
    Seed: 17,
    ServiceTier: "default",
    Tools: []sdktypes.ArkWebSearchTool{
    sdktypes.ArkWebSearchTool{
        Type: "web_search",
    },
},
    Watermark: false,
}
result, err := client.VideosVolcengine.CreateApiV3ContentsGenerationsTask(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_volcengine

```go
// Volcengine Ark image generation
body := sdktypes.VolcengineImageGenerationRequest{
    Background: "transparent",
    Image: "image",
    LayerDecomposition: true,
    Model: "model",
    OptimizePromptOptions: map[string]sdktypes.ProviderJsonValue{
    "mode": "standard",
},
    OutputFormat: "png",
    Prompt: "prompt",
    ResponseFormat: "url",
    SequentialImageGeneration: "auto",
    SequentialImageGenerationOptions: map[string]sdktypes.ProviderJsonValue{
    "max_images": 1,
},
    Size: "size",
    Stream: false,
    Tools: []sdktypes.ArkWebSearchTool{
    sdktypes.ArkWebSearchTool{
        Type: "web_search",
    },
},
    Watermark: false,
}
result, err := client.ImagesVolcengine.CreateApiV3ImagesGeneration(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_xai

```go
// xAI Grok Imagine image edit
body := sdktypes.XaiImageEditRequest{
    AspectRatio: "1:1",
    Deferred: false,
    Image: map[string]sdktypes.ProviderJsonValue{
    "file_id": "file_id",
    "url": "url",
},
    Images: []sdktypes.XaiImageUrl{
    sdktypes.XaiImageUrl{
        FileId: "file_id",
        Url: "url",
    },
},
    Model: "model",
    N: 6,
    Output: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    Prompt: "prompt",
    Resolution: "1k",
    ResponseFormat: "url",
    StorageOptions: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    User: "user",
}
result, err := client.ImagesXai.CreateV1ImagesEdit(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_xai

```go
// xAI Grok Imagine video edit
body := sdktypes.XaiVideoEditRequest{
    Model: "model",
    Output: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    Prompt: "prompt",
    StorageOptions: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    User: "user",
    Video: map[string]sdktypes.ProviderJsonValue{
    "file_id": "file_id",
    "url": "url",
},
}
result, err := client.VideosXai.CreateV1VideosEdit(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### videos_zhipu

```go
// Zhipu retrieve video generation task
taskId := "1"
result, err := client.VideosZhipu.ListApiPaasV4AsyncResult(taskId)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_zhipu

```go
// Zhipu CogView image generation
body := sdktypes.ZhipuImageGenerationRequest{
    Model: "glm-image",
    Prompt: "prompt",
    Quality: "hd",
    Size: "size",
    UserId: "user_id",
    WatermarkEnabled: false,
}
result, err := client.ImagesZhipu.CreateApiPaasV4ImagesGeneration(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

## Error Handling

```go
_, err := client.Models.List()
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
