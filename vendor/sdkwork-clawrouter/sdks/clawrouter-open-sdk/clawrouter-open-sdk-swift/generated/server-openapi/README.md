# clawrouter-open-sdk (Swift)

SDKWork Claw Router OpenAI-compatible gateway SDK swift generated transport SDK

## Installation

Add to `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/sdkwork/ai-sdk-swift", from: "0.1.0")
]
```

## Quick Start

```swift
import AiSDK
import SDKworkCommon

let config = SdkConfig(baseUrl: "https://api.sdkwork.com")
let client = SdkworkAiClient(config: config)
client.setApiKey("your-api-key")

// Use the SDK
let result = try await client.models.list()
print(result)
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```swift
let config = SdkConfig(baseUrl: "https://api.sdkwork.com")
let client = SdkworkAiClient(config: config)
client.setApiKey("your-api-key")
// Sends: Authorization: Bearer <apiKey>
```

### Mode B: Dual Token

```swift
let config = SdkConfig(baseUrl: "https://api.sdkwork.com")
let client = SdkworkAiClient(config: config)
client.setAuthToken("your-auth-token")
client.setAccessToken("your-access-token")
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `setApiKey(...)` together with `setAuthToken(...)` + `setAccessToken(...)` on the same client.

## Configuration (Non-Auth)

```swift
let config = SdkConfig(baseUrl: "https://api.sdkwork.com")
let client = SdkworkAiClient(config: config)

// Set custom headers
client.setHeader("X-Custom-Header", value: "value")
```

## API Modules

- `client.filesAnthropic` - files_anthropic API
- `client.chatAnthropic` - chat_anthropic API
- `client.batchesAnthropic` - batches_anthropic API
- `client.responsesGoogle` - responses_google API
- `client.filesGoogle` - files_google API
- `client.embeddingsGoogle` - embeddings_google API
- `client.chatGoogle` - chat_google API
- `client.videosKling` - videos_kling API
- `client.imagesMidjourney` - images_midjourney API
- `client.imagesNanoBanana` - images_nano_banana API
- `client.audioSuno` - audio_suno API
- `client.assistants` - assistant API
- `client.audio` - audio API
- `client.batches` - batch API
- `client.chat` - chat API
- `client.completion` - completion API
- `client.container` - container API
- `client.conversation` - conversation API
- `client.embeddings` - embedding API
- `client.eval` - eval API
- `client.files` - file API
- `client.fineTuning` - fine_tuning API
- `client.images` - image API
- `client.models` - model API
- `client.moderations` - moderation API
- `client.organization` - organization API
- `client.project` - project API
- `client.realtime` - realtime API
- `client.responses` - response API
- `client.skill` - skill API
- `client.threads` - thread API
- `client.uploads` - upload API
- `client.vectorStores` - vector_store API
- `client.video` - video API
- `client.videosVidu` - videos_vidu API
- `client.imagesVidu` - images_vidu API
- `client.videosVolcengine` - videos_volcengine API

## Usage Examples

### files_anthropic

```swift
// Anthropic list files
let params: [String: Any] = [
    "before_id": "1",
    "after_id": "1",
    "limit": 3
]
let result = try await client.filesAnthropic.getListV1Files(params: params)
print(result)
```

### chat_anthropic

```swift
// Anthropic Claude message
let body = AnthropicMessageCreateRequest(
    maxTokens: 1,
    messages: [AnthropicMessageParam()],
    metadata: [:],
    model: "model",
    stopSequences: ["stop-sequences"],
    stream: false,
    system: "system",
    temperature: 8.0,
    thinking: [:],
    toolChoice: [:],
    tools: [AnthropicTool()],
    topK: 12,
    topP: 13.0
)
let result = try await client.chatAnthropic.createV1Message(body: body)
print(result)
```

### batches_anthropic

```swift
// Anthropic list message batches
let params: [String: Any] = [
    "before_id": "1",
    "after_id": "1",
    "limit": 3
]
let result = try await client.batchesAnthropic.getListV1MessagesBatches(params: params)
print(result)
```

### responses_google

```swift
// Google Gemini list cached contents
let params: [String: Any] = [
    "pageSize": 1,
    "pageToken": "token"
]
let result = try await client.responsesGoogle.getListV1betaCachedContents(params: params)
print(result)
```

### files_google

```swift
// Google Gemini list files
let params: [String: Any] = [
    "pageSize": 1,
    "pageToken": "token"
]
let result = try await client.filesGoogle.getListV1betaFiles(params: params)
print(result)
```

### embeddings_google

```swift
// Google Gemini batch embed contents
let model = "model"
let body = GoogleBatchEmbedContentsRequest(requests: [GoogleEmbedContentRequest()])
let result = try await client.embeddingsGoogle.createV1betaModelsModelBatchEmbedContent(model: model, body: body)
print(result)
```

### chat_google

```swift
// Google Gemini count tokens
let model = "model"
let body = GoogleCountTokensRequest(
    contents: [GoogleContent()],
    generateContentRequest: [:]
)
let result = try await client.chatGoogle.createV1betaModelsModelCountToken(model: model, body: body)
print(result)
```

### videos_kling

```swift
// Kling video generation
let body = KlingVideoGenerationRequest(
    aspectRatio: "aspect-ratio",
    callbackUrl: "callback-url",
    cfgScale: 3.0,
    duration: 4,
    image: "image",
    imageTail: "image-tail",
    mode: "mode",
    model: "model",
    negativePrompt: "negative-prompt",
    prompt: "prompt"
)
let result = try await client.videosKling.createV1VideosGeneration(body: body)
print(result)
```

### images_midjourney

```swift
// Midjourney image generation
let body = MidjourneyImageGenerationRequest(
    aspectRatio: "aspect-ratio",
    callbackUrl: "callback-url",
    model: "model",
    prompt: "prompt",
    seed: 5,
    style: "style"
)
let result = try await client.imagesMidjourney.createV1ImagesGeneration(body: body)
print(result)
```

### images_nano_banana

```swift
// Nano Banana image generation
let body = NanoBananaImageGenerationRequest(
    aspectRatio: "aspect-ratio",
    callbackUrl: "callback-url",
    images: ["images"],
    model: "model",
    prompt: "prompt",
    seed: 6,
    size: "size"
)
let result = try await client.imagesNanoBanana.createGeneration(body: body)
print(result)
```

### audio_suno

```swift
// Suno music generation
let body = SunoMusicGenerationRequest(
    callbackUrl: "callback-url",
    duration: 2.0,
    model: "model",
    negativeTags: "negative-tags",
    prompt: "prompt",
    tags: "tags",
    title: "title"
)
let result = try await client.audioSuno.createV1MusicGeneration(body: body)
print(result)
```

### assistant

```swift
// List assistants
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.assistants.list(params: params)
print(result)
```

### audio

```swift
// List voice consents
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.audio.getListVoiceConsents(params: params)
print(result)
```

### batch

```swift
// List batches
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.batches.list(params: params)
print(result)
```

### chat

```swift
// List stored chat completions
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before",
    "model": "model",
    "metadata": "metadata"
]
let result = try await client.chat.list(params: params)
print(result)
```

### completion

```swift
// Create completion
let body = OpenAiCompletionCreateRequest(
    bestOf: 1,
    echo: false,
    frequencyPenalty: 3.0,
    logitBias: [:],
    logprobs: 5,
    maxTokens: 6,
    model: "model",
    n: 8,
    presencePenalty: 9.0,
    prompt: "prompt",
    seed: 11,
    stop: "stop",
    stream: true,
    suffix: "suffix",
    temperature: 15.0,
    topP: 16.0,
    user: "user"
)
let result = try await client.completion.create(body: body)
print(result)
```

### container

```swift
// List containers
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.container.list(params: params)
print(result)
```

### conversation

```swift
// List conversations
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.conversation.list(params: params)
print(result)
```

### embedding

```swift
// Create embeddings
let body = OpenAiEmbeddingsRequest(
    dimensions: 1,
    encodingFormat: "float",
    input: "input",
    model: "model",
    user: "user"
)
let result = try await client.embeddings.create(body: body)
print(result)
```

### eval

```swift
// List evals
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.eval.list(params: params)
print(result)
```

### file

```swift
// List files
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.files.list(params: params)
print(result)
```

### fine_tuning

```swift
// List fine-tuning jobs
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.fineTuning.listJob(params: params)
print(result)
```

### image

```swift
// Create image edit
let body = OpenAiImageEditRequest(
    image: "image",
    mask: "mask",
    model: "model",
    prompt: "prompt"
)
let result = try await client.images.createEdit(body: body)
print(result)
```

### model

```swift
// List models
let result = try await client.models.list()
print(result)
```

### moderation

```swift
// Create moderation
let body = OpenAiModerationCreateRequest(
    input: "input",
    model: "model"
)
let result = try await client.moderations.create(body: body)
print(result)
```

### organization

```swift
// List organization admin API keys
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.organization.getListAdminApiKeys(params: params)
print(result)
```

### project

```swift
// List project roles
let projectId = "1"
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.project.getListRoles(projectId: projectId, params: params)
print(result)
```

### realtime

```swift
// Create realtime call
let body = OpenAiRealtimeCallCreateRequest(
    metadata: [:],
    sdp: "sdp",
    session: "session"
)
let result = try await client.realtime.createCall(body: body)
print(result)
```

### response

```swift
// Create response
let body = OpenAiResponsesRequest(
    background: true,
    conversation: "conversation",
    include: ["include"],
    input: "input",
    instructions: "instructions",
    maxOutputTokens: 6,
    maxToolCalls: 7,
    metadata: [:],
    model: "model",
    parallelToolCalls: false,
    previousResponseId: "1",
    prompt: [:],
    promptCacheKey: "prompt-cache-key",
    reasoning: [:],
    serviceTier: "auto",
    store: false,
    stream: true,
    temperature: 18.0,
    text: [:],
    toolChoice: "tool-choice",
    tools: [OpenAiTool()],
    topLogprobs: 22,
    topP: 23.0,
    truncation: "auto",
    user: "user"
)
let result = try await client.responses.create(body: body)
print(result)
```

### skill

```swift
// List skills
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.skill.list(params: params)
print(result)
```

### thread

```swift
// Create thread
let body = OpenAiThreadCreateRequest(
    messages: [OpenAiThreadMessageCreateRequest()],
    metadata: [:],
    toolResources: "tool-resources"
)
let result = try await client.threads.create(body: body)
print(result)
```

### upload

```swift
// Create upload
let body = OpenAiUploadCreateRequest(
    bytes: 1,
    filename: "name",
    mimeType: "mime-type",
    purpose: "purpose"
)
let result = try await client.uploads.create(body: body)
print(result)
```

### vector_store

```swift
// List vector stores
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.vectorStores.listVectorStore(params: params)
print(result)
```

### video

```swift
// List videos
let params: [String: Any] = [
    "limit": 1,
    "order": "asc",
    "after": "after",
    "before": "before"
]
let result = try await client.video.list(params: params)
print(result)
```

### videos_vidu

```swift
// Vidu image to video
let body = ViduImageToVideoRequest(
    aspectRatio: "aspect-ratio",
    callbackUrl: "callback-url",
    duration: 3,
    images: ["images"],
    model: "model",
    movementAmplitude: "movement-amplitude",
    payload: "payload",
    prompt: "prompt",
    resolution: "resolution",
    seed: 10
)
let result = try await client.videosVidu.createEntV2Img2video(body: body)
print(result)
```

### images_vidu

```swift
// Vidu reference to image
let body = ViduReferenceToImageRequest(
    aspectRatio: "aspect-ratio",
    callbackUrl: "callback-url",
    images: ["images"],
    model: "model",
    payload: "payload",
    prompt: "prompt",
    seed: 7,
    style: "style"
)
let result = try await client.imagesVidu.createEntV2Reference2image(body: body)
print(result)
```

### videos_volcengine

```swift
// Volcengine Ark content generation task
let body = VolcengineContentGenerationTaskCreateRequest(
    callbackUrl: "callback-url",
    content: [VolcengineContentPart()],
    metadata: [:],
    model: "model"
)
let result = try await client.videosVolcengine.createApiV3ContentsGenerationsTask(body: body)
print(result)
```

## Error Handling

```swift
do {
    try await client.models.list()
} catch {
    print("Error: \(error)")
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

> Set `SWIFT_RELEASE_TAG` (or `SDKWORK_RELEASE_TAG`) for tag-based release.

## License

MIT

## Regeneration Contract

- Generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- Each run also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- Apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across regenerations.
- If a generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
