# clawrouter-open-sdk (Kotlin)

SDKWork Claw Router OpenAI-compatible gateway SDK kotlin generated transport SDK

## Installation

Add to your `build.gradle.kts`:

```kotlin
implementation("com.sdkwork.clawrouter:clawrouter-open-sdk:0.1.0")
```

Or with Gradle Groovy:

```groovy
implementation 'com.sdkwork.clawrouter:clawrouter-open-sdk:0.1.0'
```

## Quick Start

```kotlin
import com.sdkwork.clawrouter.open.SdkworkAiClient
import com.sdkwork.clawrouter.open.*
import com.sdkwork.common.core.SdkConfig
import kotlinx.coroutines.runBlocking

fun main() = runBlocking {
    val config = SdkConfig(baseUrl = "https://api.sdkwork.com")
    val client = SdkworkAiClient(config)
    client.setApiKey("your-api-key")

    // Use the SDK
    val result = client.models.list()
    println(result)
}
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```kotlin
val config = SdkConfig(baseUrl = "https://api.sdkwork.com")
val client = SdkworkAiClient(config)
client.setApiKey("your-api-key")
// Sends: Authorization: Bearer <apiKey>
```

### Mode B: Dual Token

```kotlin
val config = SdkConfig(baseUrl = "https://api.sdkwork.com")
val client = SdkworkAiClient(config)
client.setAuthToken("your-auth-token")
client.setAccessToken("your-access-token")
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `setApiKey(...)` together with `setAuthToken(...)` + `setAccessToken(...)` on the same client.

## Configuration (Non-Auth)

```kotlin
val config = SdkConfig(baseUrl = "https://api.sdkwork.com")
val client = SdkworkAiClient(config)
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

```kotlin
// Anthropic list files
val params = linkedMapOf<String, Any>(
    "before_id" to "1",
    "after_id" to "1",
    "limit" to 3
)
val result = client.filesAnthropic.getListV1Files(params)
println(result)
```

### chat_anthropic

```kotlin
// Anthropic Claude message
val body = AnthropicMessageCreateRequest(
    maxTokens = 1,
    messages = listOf(AnthropicMessageParam()),
    metadata = linkedMapOf<String, Any>(
    "value" to "value"
),
    model = "model",
    stopSequences = listOf("stop-sequences"),
    stream = false,
    system = "system",
    temperature = 8,
    thinking = linkedMapOf<String, Any>(
    "budget_tokens" to 1,
    "type" to "type"
),
    toolChoice = linkedMapOf<String, Any>(
    "name" to "name",
    "type" to "type"
),
    tools = listOf(AnthropicTool()),
    topK = 12,
    topP = 13
)
val result = client.chatAnthropic.createV1Message(body)
println(result)
```

### batches_anthropic

```kotlin
// Anthropic list message batches
val params = linkedMapOf<String, Any>(
    "before_id" to "1",
    "after_id" to "1",
    "limit" to 3
)
val result = client.batchesAnthropic.getListV1MessagesBatches(params)
println(result)
```

### responses_google

```kotlin
// Google Gemini list cached contents
val params = linkedMapOf<String, Any>(
    "pageSize" to 1,
    "pageToken" to "token"
)
val result = client.responsesGoogle.getListV1betaCachedContents(params)
println(result)
```

### files_google

```kotlin
// Google Gemini list files
val params = linkedMapOf<String, Any>(
    "pageSize" to 1,
    "pageToken" to "token"
)
val result = client.filesGoogle.getListV1betaFiles(params)
println(result)
```

### embeddings_google

```kotlin
// Google Gemini batch embed contents
val model = "model"
val body = GoogleBatchEmbedContentsRequest(
    requests = listOf(GoogleEmbedContentRequest())
)
val result = client.embeddingsGoogle.createV1betaModelsModelBatchEmbedContent(model, body)
println(result)
```

### chat_google

```kotlin
// Google Gemini count tokens
val model = "model"
val body = GoogleCountTokensRequest(
    contents = listOf(GoogleContent()),
    generateContentRequest = linkedMapOf<String, Any>(
    "cachedContent" to "cachedcontent",
    "contents" to listOf(GoogleContent()),
    "generationConfig" to linkedMapOf<String, Any>(
    "candidateCount" to 1,
    "maxOutputTokens" to 2,
    "responseMimeType" to "responsemimetype",
    "responseSchema" to linkedMapOf<String, Any>(
    "description" to "description",
    "enum" to listOf("enum"),
    "format" to "format",
    "items" to "items",
    "nullable" to true,
    "properties" to linkedMapOf<String, Any>(
    "value" to "value"
),
    "required" to listOf("required"),
    "type" to "type"
),
    "stopSequences" to listOf("stopsequences"),
    "temperature" to 6,
    "thinkingConfig" to linkedMapOf<String, Any>(
    "includeThoughts" to true,
    "thinkingBudget" to 2
),
    "topK" to 8,
    "topP" to 9
),
    "safetySettings" to listOf(GoogleSafetySetting()),
    "systemInstruction" to linkedMapOf<String, Any>(
    "parts" to listOf(GooglePart()),
    "role" to "role"
),
    "toolConfig" to linkedMapOf<String, Any>(
    "functionCallingConfig" to linkedMapOf<String, Any>(
    "allowedFunctionNames" to listOf("name"),
    "mode" to "mode"
)
),
    "tools" to listOf(GoogleTool())
)
)
val result = client.chatGoogle.createV1betaModelsModelCountToken(model, body)
println(result)
```

### videos_kling

```kotlin
// Kling video generation
val body = KlingVideoGenerationRequest(
    aspectRatio = "aspect-ratio",
    callbackUrl = "callback-url",
    cfgScale = 3,
    duration = 4,
    image = "image",
    imageTail = "image-tail",
    mode = "mode",
    model = "model",
    negativePrompt = "negative-prompt",
    prompt = "prompt"
)
val result = client.videosKling.createV1VideosGeneration(body)
println(result)
```

### images_midjourney

```kotlin
// Midjourney image generation
val body = MidjourneyImageGenerationRequest(
    aspectRatio = "aspect-ratio",
    callbackUrl = "callback-url",
    model = "model",
    prompt = "prompt",
    seed = 5,
    style = "style"
)
val result = client.imagesMidjourney.createV1ImagesGeneration(body)
println(result)
```

### images_nano_banana

```kotlin
// Nano Banana image generation
val body = NanoBananaImageGenerationRequest(
    aspectRatio = "aspect-ratio",
    callbackUrl = "callback-url",
    images = listOf("images"),
    model = "model",
    prompt = "prompt",
    seed = 6,
    size = "size"
)
val result = client.imagesNanoBanana.createGeneration(body)
println(result)
```

### audio_suno

```kotlin
// Suno music generation
val body = SunoMusicGenerationRequest(
    callbackUrl = "callback-url",
    duration = 2,
    model = "model",
    negativeTags = "negative-tags",
    prompt = "prompt",
    tags = "tags",
    title = "title"
)
val result = client.audioSuno.createV1MusicGeneration(body)
println(result)
```

### assistant

```kotlin
// List assistants
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.assistants.list(params)
println(result)
```

### audio

```kotlin
// List voice consents
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.audio.getListVoiceConsents(params)
println(result)
```

### batch

```kotlin
// List batches
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.batches.list(params)
println(result)
```

### chat

```kotlin
// List stored chat completions
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before",
    "model" to "model",
    "metadata" to "metadata"
)
val result = client.chat.list(params)
println(result)
```

### completion

```kotlin
// Create completion
val body = OpenAiCompletionCreateRequest(
    bestOf = 1,
    echo = false,
    frequencyPenalty = 3,
    logitBias = linkedMapOf<String, Any>(
    "value" to 1
),
    logprobs = 5,
    maxTokens = 6,
    model = "model",
    n = 8,
    presencePenalty = 9,
    prompt = "prompt",
    seed = 11,
    stop = "stop",
    stream = true,
    suffix = "suffix",
    temperature = 15,
    topP = 16,
    user = "user"
)
val result = client.completion.create(body)
println(result)
```

### container

```kotlin
// List containers
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.container.list(params)
println(result)
```

### conversation

```kotlin
// List conversations
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.conversation.list(params)
println(result)
```

### embedding

```kotlin
// Create embeddings
val body = OpenAiEmbeddingsRequest(
    dimensions = 1,
    encodingFormat = "float",
    input = "input",
    model = "model",
    user = "user"
)
val result = client.embeddings.create(body)
println(result)
```

### eval

```kotlin
// List evals
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.eval.list(params)
println(result)
```

### file

```kotlin
// List files
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.files.list(params)
println(result)
```

### fine_tuning

```kotlin
// List fine-tuning jobs
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.fineTuning.listJob(params)
println(result)
```

### image

```kotlin
// Create image edit
val body = OpenAiImageEditRequest(
    image = "image",
    mask = "mask",
    model = "model",
    prompt = "prompt"
)
val result = client.images.createEdit(body)
println(result)
```

### model

```kotlin
// List models
val result = client.models.list()
println(result)
```

### moderation

```kotlin
// Create moderation
val body = OpenAiModerationCreateRequest(
    input = "input",
    model = "model"
)
val result = client.moderations.create(body)
println(result)
```

### organization

```kotlin
// List organization admin API keys
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.organization.getListAdminApiKeys(params)
println(result)
```

### project

```kotlin
// List project roles
val projectId = "1"
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.project.getListRoles(projectId, params)
println(result)
```

### realtime

```kotlin
// Create realtime call
val body = OpenAiRealtimeCallCreateRequest(
    metadata = linkedMapOf<String, Any>(
    "value" to "value"
),
    sdp = "sdp",
    session = "session"
)
val result = client.realtime.createCall(body)
println(result)
```

### response

```kotlin
// Create response
val body = OpenAiResponsesRequest(
    background = true,
    conversation = "conversation",
    include = listOf("include"),
    input = "input",
    instructions = "instructions",
    maxOutputTokens = 6,
    maxToolCalls = 7,
    metadata = linkedMapOf<String, Any>(
    "value" to "value"
),
    model = "model",
    parallelToolCalls = false,
    previousResponseId = "1",
    prompt = linkedMapOf<String, Any>(
    "id" to "1",
    "variables" to linkedMapOf<String, Any>(
    "value" to "value"
),
    "version" to "version"
),
    promptCacheKey = "prompt-cache-key",
    reasoning = linkedMapOf<String, Any>(
    "effort" to "minimal",
    "summary" to "auto"
),
    serviceTier = "auto",
    store = false,
    stream = true,
    temperature = 18,
    text = linkedMapOf<String, Any>(
    "format" to linkedMapOf<String, Any>(
    "json_schema" to linkedMapOf<String, Any>(
    "description" to "description",
    "name" to "name",
    "schema" to linkedMapOf<String, Any>(
    "additionalProperties" to true,
    "description" to "description",
    "enum" to listOf("enum"),
    "items" to "items",
    "properties" to linkedMapOf<String, Any>(
    "value" to "value"
),
    "required" to listOf("required"),
    "type" to "type"
),
    "strict" to false
),
    "type" to "text"
)
),
    toolChoice = "tool-choice",
    tools = listOf(OpenAiTool()),
    topLogprobs = 22,
    topP = 23,
    truncation = "auto",
    user = "user"
)
val result = client.responses.create(body)
println(result)
```

### skill

```kotlin
// List skills
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.skill.list(params)
println(result)
```

### thread

```kotlin
// Create thread
val body = OpenAiThreadCreateRequest(
    messages = listOf(OpenAiThreadMessageCreateRequest()),
    metadata = linkedMapOf<String, Any>(
    "value" to "value"
),
    toolResources = "tool-resources"
)
val result = client.threads.create(body)
println(result)
```

### upload

```kotlin
// Create upload
val body = OpenAiUploadCreateRequest(
    bytes = 1,
    filename = "name",
    mimeType = "mime-type",
    purpose = "purpose"
)
val result = client.uploads.create(body)
println(result)
```

### vector_store

```kotlin
// List vector stores
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.vectorStores.listVectorStore(params)
println(result)
```

### video

```kotlin
// List videos
val params = linkedMapOf<String, Any>(
    "limit" to 1,
    "order" to "asc",
    "after" to "after",
    "before" to "before"
)
val result = client.video.list(params)
println(result)
```

### videos_vidu

```kotlin
// Vidu image to video
val body = ViduImageToVideoRequest(
    aspectRatio = "aspect-ratio",
    callbackUrl = "callback-url",
    duration = 3,
    images = listOf("images"),
    model = "model",
    movementAmplitude = "movement-amplitude",
    payload = "payload",
    prompt = "prompt",
    resolution = "resolution",
    seed = 10
)
val result = client.videosVidu.createEntV2Img2video(body)
println(result)
```

### images_vidu

```kotlin
// Vidu reference to image
val body = ViduReferenceToImageRequest(
    aspectRatio = "aspect-ratio",
    callbackUrl = "callback-url",
    images = listOf("images"),
    model = "model",
    payload = "payload",
    prompt = "prompt",
    seed = 7,
    style = "style"
)
val result = client.imagesVidu.createEntV2Reference2image(body)
println(result)
```

### videos_volcengine

```kotlin
// Volcengine Ark content generation task
val body = VolcengineContentGenerationTaskCreateRequest(
    callbackUrl = "callback-url",
    content = listOf(VolcengineContentPart()),
    metadata = linkedMapOf<String, Any>(
    "value" to "value"
),
    model = "model"
)
val result = client.videosVolcengine.createApiV3ContentsGenerationsTask(body)
println(result)
```

## Error Handling

```kotlin
import kotlinx.coroutines.runBlocking

fun main() = runBlocking {
    try {
        val result = client.models.list()
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

- Generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- Each run also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- Apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across regenerations.
- If a generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
