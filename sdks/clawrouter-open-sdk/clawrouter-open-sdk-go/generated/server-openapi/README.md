# clawrouter-open-sdk (Go)

SDKWork Claw Router OpenAI-compatible gateway SDK go generated transport SDK

## Installation

```bash
go get github.com/sdkwork/clawrouter-open-sdk
```

## Quick Start

```go
package main

import (
    "fmt"
    "github.com/sdkwork/clawrouter-open-sdk"
    sdkhttp "github.com/sdkwork/clawrouter-open-sdk/http"

)

func main() {
    cfg := sdkhttp.NewDefaultConfig("https://api.sdkwork.com")
    client := github.com/sdkwork/clawrouter-open-sdk.NewSdkworkAiClientWithConfig(cfg)
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
client := github.com/sdkwork/clawrouter-open-sdk.NewSdkworkAiClientWithConfig(cfg)
client.SetApiKey("your-api-key")
// Sends: Authorization: Bearer <apiKey>
```

### Mode B: Dual Token

```go
cfg := sdkhttp.NewDefaultConfig("https://api.sdkwork.com")
client := github.com/sdkwork/clawrouter-open-sdk.NewSdkworkAiClientWithConfig(cfg)
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
client := github.com/sdkwork/clawrouter-open-sdk.NewSdkworkAiClientWithConfig(cfg)

// Set custom headers
client.SetHeader("X-Custom-Header", "value")
```

## API Modules

- `client.FilesAnthropic` - files_anthropic API
- `client.ChatAnthropic` - chat_anthropic API
- `client.BatchesAnthropic` - batches_anthropic API
- `client.ResponsesGoogle` - responses_google API
- `client.FilesGoogle` - files_google API
- `client.EmbeddingsGoogle` - embeddings_google API
- `client.ChatGoogle` - chat_google API
- `client.VideosKling` - videos_kling API
- `client.ImagesMidjourney` - images_midjourney API
- `client.ImagesNanoBanana` - images_nano_banana API
- `client.AudioSuno` - audio_suno API
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
- `client.Uploads` - upload API
- `client.VectorStores` - vector_store API
- `client.Video` - video API
- `client.VideosVidu` - videos_vidu API
- `client.ImagesVidu` - images_vidu API
- `client.VideosVolcengine` - videos_volcengine API

## Usage Examples

### files_anthropic

```go
// Anthropic list files
params := map[string]interface{}{
    "before_id": "before_id",
    "after_id": "after_id",
    "limit": 3,
}
result, err := client.FilesAnthropic.GetListV1Files(params)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### chat_anthropic

```go
// Anthropic Claude message
body := sdktypes.AnthropicMessageCreateRequest{
    MaxTokens: 1,
    Messages: []sdktypes.AnthropicMessageParam{
    sdktypes.AnthropicMessageParam{
        Content: "content",
        Role: "user",
    },
},
    Metadata: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    Model: "model",
    StopSequences: []string{
    "item",
},
    Stream: false,
    System: "system",
    Temperature: 8,
    Thinking: map[string]sdktypes.ProviderJsonValue{
    "budget_tokens": 1,
    "type": "type",
},
    ToolChoice: map[string]sdktypes.ProviderJsonValue{
    "name": "name",
    "type": "type",
},
    Tools: []sdktypes.AnthropicTool{
    sdktypes.AnthropicTool{
        Description: "description",
        InputSchema: map[string]sdktypes.ProviderJsonValue{
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
        Name: "name",
    },
},
    TopK: 12,
    TopP: 13,
}
result, err := client.ChatAnthropic.CreateV1Message(body)
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
result, err := client.BatchesAnthropic.GetListV1MessagesBatches(params)
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
            Text: "text",
        },
    },
        "role": "role",
    },
        OutputDimensionality: 2,
        TaskType: "taskType",
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
            Text: "text",
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
            Text: "text",
        },
    },
        Role: "role",
    },
},
    "generationConfig": map[string]sdktypes.ProviderJsonValue{
    "candidateCount": 1,
    "maxOutputTokens": 2,
    "responseMimeType": "responseMimeType",
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
    "stopSequences": []string{
    "item",
},
    "temperature": 6,
    "thinkingConfig": map[string]sdktypes.ProviderJsonValue{
    "includeThoughts": true,
    "thinkingBudget": 2,
},
    "topK": 8,
    "topP": 9,
},
    "safetySettings": []sdktypes.GoogleSafetySetting{
    sdktypes.GoogleSafetySetting{
        Category: "category",
        Threshold: "threshold",
    },
},
    "systemInstruction": map[string]sdktypes.ProviderJsonValue{
    "parts": []sdktypes.GooglePart{
    sdktypes.GooglePart{
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
        Text: "text",
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
        GoogleSearch: map[string]sdktypes.ProviderJsonValue{
        "dynamicRetrievalConfig": map[string]sdktypes.ProviderJsonValue{
        "dynamicThreshold": 1,
        "mode": "mode",
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

### videos_kling

```go
// Kling video generation
body := sdktypes.KlingVideoGenerationRequest{
    AspectRatio: "aspect_ratio",
    CallbackUrl: "callback_url",
    CfgScale: 3,
    Duration: 4,
    Image: "image",
    ImageTail: "image_tail",
    Mode: "mode",
    Model: "model",
    NegativePrompt: "negative_prompt",
    Prompt: "prompt",
}
result, err := client.VideosKling.CreateV1VideosGeneration(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_midjourney

```go
// Midjourney image generation
body := sdktypes.MidjourneyImageGenerationRequest{
    AspectRatio: "aspect_ratio",
    CallbackUrl: "callback_url",
    Model: "model",
    Prompt: "prompt",
    Seed: 5,
    Style: "style",
}
result, err := client.ImagesMidjourney.CreateV1ImagesGeneration(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### images_nano_banana

```go
// Nano Banana image generation
body := sdktypes.NanoBananaImageGenerationRequest{
    AspectRatio: "aspect_ratio",
    CallbackUrl: "callback_url",
    Images: []string{
    "item",
},
    Model: "model",
    Prompt: "prompt",
    Seed: 6,
    Size: "size",
}
result, err := client.ImagesNanoBanana.CreateGeneration(body)
if err != nil {
    panic(err)
}
fmt.Println(result)
```

### audio_suno

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
result, err := client.AudioSuno.CreateV1MusicGeneration(body)
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
    Suffix: "suffix",
    Temperature: 15,
    TopP: 16,
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
    Image: "image",
    Mask: "mask",
    Model: "model",
    Prompt: "prompt",
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

### upload

```go
// Create upload
body := sdktypes.OpenAiUploadCreateRequest{
    Bytes: 1,
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
    AspectRatio: "aspect_ratio",
    CallbackUrl: "callback_url",
    Duration: 3,
    Images: []string{
    "item",
},
    Model: "model",
    MovementAmplitude: "movement_amplitude",
    Payload: "payload",
    Prompt: "prompt",
    Resolution: "resolution",
    Seed: 10,
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
    CallbackUrl: "callback_url",
    Images: []string{
    "item",
},
    Model: "model",
    Payload: "payload",
    Prompt: "prompt",
    Seed: 7,
    Style: "style",
}
result, err := client.ImagesVidu.CreateEntV2Reference2image(body)
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
    Content: []sdktypes.VolcengineContentPart{
    sdktypes.VolcengineContentPart{
        FileId: "file_id",
        ImageUrl: "image_url",
        Text: "text",
        Type: "type",
        VideoUrl: "video_url",
    },
},
    Metadata: map[string]sdktypes.ProviderJsonValue{
    "value": "value",
},
    Model: "model",
}
result, err := client.VideosVolcengine.CreateApiV3ContentsGenerationsTask(body)
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
