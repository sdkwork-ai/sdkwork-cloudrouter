# cloudrouter-open-sdk (Swift)

SDKWork Cloud Router OpenAI-compatible gateway SDK swift generated transport SDK

## Installation

Add to `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/sdkwork/CloudRouterOpenSdk", from: "0.1.0")
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

- `client.imagesAlibaba` - images_alibaba API
- `client.videosAlibaba` - videos_alibaba API
- `client.audioAlibaba` - audio_alibaba API
- `client.filesAnthropic` - files_anthropic API
- `client.chatAnthropic` - chat_anthropic API
- `client.batchesAnthropic` - batches_anthropic API
- `client.videosBlackForestLabs` - videos_black_forest_labs API
- `client.imagesBlackForestLabs` - images_black_forest_labs API
- `client.videosBytedance` - videos_bytedance API
- `client.imagesBytedance` - images_bytedance API
- `client.audioBytedance` - audio_bytedance API
- `client.musicElevenlabs` - music_elevenlabs API
- `client.audioElevenlabs` - audio_elevenlabs API
- `client.responsesGoogle` - responses_google API
- `client.filesGoogle` - files_google API
- `client.videosGoogle` - videos_google API
- `client.embeddingsGoogle` - embeddings_google API
- `client.chatGoogle` - chat_google API
- `client.imagesGoogle` - images_google API
- `client.videosJimeng` - videos_jimeng API
- `client.audioKling` - audio_kling API
- `client.imagesKling` - images_kling API
- `client.videosKling` - videos_kling API
- `client.videosLumaAi` - videos_luma_ai API
- `client.videosMinimax` - videos_minimax API
- `client.imagesMinimax` - images_minimax API
- `client.musicMinimax` - music_minimax API
- `client.audioMinimax` - audio_minimax API
- `client.musicMureka` - music_mureka API
- `client.videosPixverse` - videos_pixverse API
- `client.videosRunway` - videos_runway API
- `client.imagesRunway` - images_runway API
- `client.audioStabilityAi` - audio_stability_ai API
- `client.imagesStabilityAi` - images_stability_ai API
- `client.musicSuno` - music_suno API
- `client.chatTypesafe` - chat_typesafe API
- `client.assistants` - assistant API
- `client.audio` - audio API
- `client.batches` - batch API
- `client.chat` - chat API
- `client.completion` - completion API
- `client.container` - container API
- `client.conversation` - conversation API
- `client.embeddings` - embedding API
- `client.files` - file API
- `client.images` - image API
- `client.models` - model API
- `client.moderations` - moderation API
- `client.realtime` - realtime API
- `client.responses` - response API
- `client.threads` - thread API
- `client.tool` - tool API
- `client.uploads` - upload API
- `client.vectorStores` - vector_store API
- `client.video` - video API
- `client.videosVidu` - videos_vidu API
- `client.imagesVidu` - images_vidu API
- `client.audioVidu` - audio_vidu API
- `client.audioVolcengine` - audio_volcengine API
- `client.videosVolcengine` - videos_volcengine API
- `client.imagesVolcengine` - images_volcengine API
- `client.imagesXai` - images_xai API
- `client.videosXai` - videos_xai API
- `client.videosZhipu` - videos_zhipu API
- `client.imagesZhipu` - images_zhipu API

## Usage Examples

### images_alibaba

```swift
// Alibaba Wanx image generation
let body = AlibabaImageGenerationRequest(
    input: [:],
    model: "model",
    parameters: [:]
)
let xDashScopeAsync = "enable"
let result = try await client.imagesAlibaba.createApiV1ServicesAigcText2imageImageSynthesi(body: body, xDashScopeAsync: xDashScopeAsync)
print(result)
```

### videos_alibaba

```swift
// Alibaba Wan retrieve video generation task
let taskId = "1"
let result = try await client.videosAlibaba.listApiV1Tasks(taskId: taskId)
print(result)
```

### audio_alibaba

```swift
// Alibaba Qwen TTS speech synthesis
let body = AlibabaSpeechRequest(
    input: [:],
    model: "model",
    parameters: [:]
)
let result = try await client.audioAlibaba.createApiV1ServicesAudioTtsSpeechSynthesizer(body: body)
print(result)
```

### files_anthropic

```swift
// Anthropic list files
let params: [String: Any] = [
    "before_id": "1",
    "after_id": "1",
    "limit": 3
]
let anthropicVersion = "anthropic-version"
let result = try await client.filesAnthropic.getListV1Files(params: params, anthropicVersion: anthropicVersion)
print(result)
```

### chat_anthropic

```swift
// Anthropic Claude message
let body = AnthropicMessageCreateRequest(
    cacheControl: [:],
    container: [:],
    diagnostics: [:],
    inferenceGeo: "inference-geo",
    maxTokens: 5,
    messages: [AnthropicMessageParam()],
    metadata: [:],
    model: "model",
    outputConfig: [:],
    serviceTier: "auto",
    speed: "standard",
    stopSequences: ["stop-sequences"],
    stream: true,
    system: "system",
    temperature: 15.0,
    thinking: [:],
    toolChoice: [:],
    tools: [[:]],
    topK: 19,
    topP: 20.0
)
let anthropicVersion = "anthropic-version"
let result = try await client.chatAnthropic.createV1Message(body: body, anthropicVersion: anthropicVersion)
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
let anthropicVersion = "anthropic-version"
let result = try await client.batchesAnthropic.getListV1MessagesBatches(params: params, anthropicVersion: anthropicVersion)
print(result)
```

### videos_black_forest_labs

```swift
// Black Forest Labs FLUX 3 video generation
let body = BlackForestLabsVideoGenerationRequest(
    aspectRatio: "21:9",
    draft: false,
    draftCache: "draft-cache",
    duration: 4,
    generateAudio: true,
    keyframes: "keyframes",
    mode: "t2v",
    prompt: "prompt",
    resolution: "hd",
    safetyTolerance: 10,
    startVideo: "start-video",
    user: "user",
    version: "version"
)
let result = try await client.videosBlackForestLabs.createFlux3Video(body: body)
print(result)
```

### images_black_forest_labs

```swift
// Black Forest Labs retrieve generation result
let params: [String: Any] = [
    "id": "1"
]
let result = try await client.imagesBlackForestLabs.listGetResult(params: params)
print(result)
```

### videos_bytedance

```swift
// ByteDance Seedance video generation
let body = BytedanceVideoGenerationRequest(
    callbackUrl: "https://example.com",
    cameraFixed: false,
    content: [ArkContentPart()],
    draft: false,
    duration: 5,
    executionExpiresAfter: 6,
    frames: 7,
    generateAudio: false,
    model: "model",
    omniReferenceTaskType: "auto",
    outputFormat: "mp4",
    priority: 12,
    ratio: "16:9",
    resolution: "480p",
    returnLastFrame: true,
    safetyIdentifier: "safety-identifier",
    seed: 17,
    serviceTier: "default",
    tools: [ArkWebSearchTool()],
    watermark: false
)
let result = try await client.videosBytedance.createApiV3ContentsGenerationsTask(body: body)
print(result)
```

### images_bytedance

```swift
// ByteDance Seedream image generation
let body = BytedanceImageGenerationRequest(
    background: "transparent",
    image: "image",
    layerDecomposition: true,
    model: "model",
    optimizePromptOptions: [:],
    outputFormat: "png",
    prompt: "prompt",
    responseFormat: "url",
    sequentialImageGeneration: "auto",
    sequentialImageGenerationOptions: [:],
    size: "size",
    stream: false,
    tools: [ArkWebSearchTool()],
    watermark: false
)
let result = try await client.imagesBytedance.createApiV3ImagesGeneration(body: body)
print(result)
```

### audio_bytedance

```swift
// ByteDance Seed TTS speech synthesis
let body = BytedanceSpeechRequest(reqParams: [:])
let xApiResourceId = "seed-tts-2.0"
let xApiRequestId = "X-Api-Request-Id"
let result = try await client.audioBytedance.createApiV3TtsUnidirectional(body: body, xApiResourceId: xApiResourceId, xApiRequestId: xApiRequestId)
print(result)
```

### music_elevenlabs

```swift
// ElevenLabs music generation
let body = ElevenLabsMusicGenerationRequest(
    compositionPlan: [:],
    finetuneId: "1",
    finetuneStrength: 3.0,
    forceInstrumental: false,
    generationMode: "track",
    lyricsText: "lyrics-text",
    modelId: "music_v1",
    musicLengthMs: 8,
    musicPrompt: [:],
    prompt: "prompt",
    respectSectionsDurations: true,
    seed: 12,
    signWithC2pa: true,
    storeForInpainting: false,
    usePhoneticNames: true
)
let params: [String: Any] = [
    "output_format": "output-format"
]
let result = try await client.musicElevenlabs.createV1Music(body: body, params: params)
print(result)
```

### audio_elevenlabs

```swift
// Generate sound effect
let body = ElevenLabsSoundGenerationRequest(
    durationSeconds: 1.0,
    loop: false,
    modelId: "eleven_text_to_sound_v2",
    promptInfluence: 4.0,
    text: "text"
)
let params: [String: Any] = [
    "output_format": "output-format"
]
let result = try await client.audioElevenlabs.createV1SoundGeneration(body: body, params: params)
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

### videos_google

```swift
// Google Gemini retrieve video operation (Veo)
let model = "model"
let operationId = "1"
let result = try await client.videosGoogle.listV1betaModelsOperations(model: model, operationId: operationId)
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

### images_google

```swift
// Google Gemini image generation
let model = "model"
let body = GeminiImageGenerationRequest(
    instances: [[:]],
    parameters: [:]
)
let result = try await client.imagesGoogle.createV1betaModelsModelGenerateImage(model: model, body: body)
print(result)
```

### videos_jimeng

```swift
// Jimeng retrieve video generation task
let taskId = "1"
let result = try await client.videosJimeng.listV1Tasks(taskId: taskId)
print(result)
```

### audio_kling

```swift
// Kling text to audio
let body = KlingSoundGenerationRequest(
    callbackUrl: "callback-url",
    duration: 2.0,
    externalTaskId: "1",
    prompt: "prompt"
)
let result = try await client.audioKling.createV1AudioTextToAudio(body: body)
print(result)
```

### images_kling

```swift
// Kling image generation
let body = KlingImageGenerationRequest(
    aspectRatio: "16:9",
    callbackUrl: "callback-url",
    elementList: [KlingElementReference()],
    externalTaskId: "1",
    humanFidelity: 5.0,
    image: "image",
    imageFidelity: 7.0,
    imageReference: "subject",
    modelName: "kling-v2-1",
    n: 10,
    negativePrompt: "negative-prompt",
    prompt: "prompt",
    resolution: "1k",
    watermarkInfo: [:]
)
let result = try await client.imagesKling.createV1ImagesGeneration(body: body)
print(result)
```

### videos_kling

```swift
// Kling create avatar video
let body = KlingAvatarCreateRequest(
    audioUrl: "audio-url",
    callbackUrl: "callback-url",
    humanImage: "human-image",
    modelName: "name",
    prompt: "prompt",
    text: "text",
    voiceId: "1",
    voiceLanguage: "voice-language",
    voiceMode: "voice-mode"
)
let result = try await client.videosKling.createV1VideosAvatar(body: body)
print(result)
```

### videos_luma_ai

```swift
// Luma Dream Machine video generation
let body = LumaVideoGenerationRequest(
    aspectRatio: "1:1",
    callbackUrl: "https://example.com",
    concepts: [LumaConcept()],
    duration: "duration",
    generationType: "video",
    keyframes: [:],
    loop: true,
    model: "ray-2",
    prompt: "prompt",
    resolution: "resolution"
)
let result = try await client.videosLumaAi.createGeneration(body: body)
print(result)
```

### videos_minimax

```swift
// MiniMax retrieve video file
let params: [String: Any] = [
    "file_id": "1"
]
let result = try await client.videosMinimax.listV1FilesRetrieve(params: params)
print(result)
```

### images_minimax

```swift
// MiniMax image generation
let body = MinimaxImageGenerationRequest(
    aspectRatio: "1:1",
    height: 2,
    model: "image-01",
    n: 4,
    prompt: "prompt",
    promptOptimizer: false,
    responseFormat: "url",
    seed: 8,
    subjectReference: [[:]],
    width: 10
)
let result = try await client.imagesMinimax.createV1ImageGeneration(body: body)
print(result)
```

### music_minimax

```swift
// Minimax create music generation
let body = MiniMaxMusicGenerationRequest(
    audioBase64: "audio-base64",
    audioSetting: [:],
    audioUrl: "audio-url",
    coverFeatureId: "1",
    isInstrumental: true,
    lyrics: "lyrics",
    lyricsOptimizer: true,
    model: "music-3.0",
    outputFormat: "url",
    prompt: "prompt",
    stream: true
)
let result = try await client.musicMinimax.createV1MusicGeneration(body: body)
print(result)
```

### audio_minimax

```swift
// MiniMax speech synthesis
let body = MinimaxTextToSpeechRequest(
    audioSetting: [:],
    languageBoost: "language-boost",
    model: "speech-2.8-hd",
    outputFormat: "url",
    pronunciationDict: [:],
    stream: false,
    streamOptions: [:],
    subtitleEnable: false,
    subtitleType: "sentence",
    text: "text",
    textNormalizationMode: "basic",
    timbreWeights: [MinimaxTimbreWeight()],
    voiceModify: [:],
    voiceSetting: [:]
)
let result = try await client.audioMinimax.createV1T2aV(body: body)
print(result)
```

### music_mureka

```swift
// Mureka song generation
let body = MurekaMusicGenerationRequest(
    callbackUrl: "callback-url",
    duration: 2,
    lyrics: "lyrics",
    model: "model",
    prompt: "prompt",
    referenceAudioUrl: "reference-audio-url",
    tags: ["tags"],
    title: "title"
)
let result = try await client.musicMureka.createV1SongGenerate(body: body)
print(result)
```

### videos_pixverse

```swift
// PixVerse retrieve video generation
let videoId = "1"
let aiTraceId = "Ai-trace-id"
let result = try await client.videosPixverse.listOpenapiV2VideoResult(videoId: videoId, aiTraceId: aiTraceId)
print(result)
```

### videos_runway

```swift
// Runway image to video
let body = RunwayImageToVideoRequest(
    audio: true,
    bitrate: "standard",
    cfgScale: 3.0,
    contentModeration: [:],
    draft: true,
    duration: 6,
    model: "model",
    negativePrompt: "negativeprompt",
    outputFormat: "mp4",
    promptExpansionMode: "disabled",
    promptImage: "promptimage",
    promptText: "prompttext",
    proresProfile: "422",
    providerSettings: [:],
    ratio: "ratio",
    referenceAudio: [[:]],
    referenceVideos: [[:]],
    references: [[:]],
    resolution: "480p",
    seed: 20
)
let xRunwayVersion = "2024-11-06"
let result = try await client.videosRunway.createV1ImageToVideo(body: body, xRunwayVersion: xRunwayVersion)
print(result)
```

### images_runway

```swift
// Runway retrieve task
let taskId = "1"
let xRunwayVersion = "2024-11-06"
let result = try await client.imagesRunway.listV1Tasks(taskId: taskId, xRunwayVersion: xRunwayVersion)
print(result)
```

### audio_stability_ai

```swift
// Stability AI text-to-audio (music and sound effects)
let body = StabilityAudioRequest(
    cfgScale: 1.0,
    duration: 2.0,
    model: "stable-audio-2",
    outputFormat: "mp3",
    prompt: "prompt",
    seed: 6,
    steps: 7
)
let result = try await client.audioStabilityAi.createTextToAudio(body: body)
print(result)
```

### images_stability_ai

```swift
// Stability AI image generation
let mode = "mode"
let body = StabilityImageGenerationRequest(
    aspectRatio: "21:9",
    cfgScale: 2.0,
    image: "image",
    mode: "text-to-image",
    model: "sd3.5-large",
    negativePrompt: "negative-prompt",
    outputFormat: "png",
    prompt: "prompt",
    seed: 9,
    strength: 10.0,
    stylePreset: "style-preset"
)
let accept = "application/json"
let result = try await client.imagesStabilityAi.createGenerate(mode: mode, body: body, accept: accept)
print(result)
```

### music_suno

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
let result = try await client.musicSuno.createV1MusicGeneration(body: body)
print(result)
```

### chat_typesafe

```swift
// TypeSafe AI System One decision
let body = TypeSafeSystemOneRequest(
    model: "model",
    questions: [:],
    state: "state"
)
let result = try await client.chatTypesafe.createV1Systemone(body: body)
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
    streamOptions: [:],
    suffix: "suffix",
    temperature: 16.0,
    topP: 17.0,
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

### image

```swift
// Create image edit
let body = OpenAiImageEditRequest(
    background: "transparent",
    complexity: "low",
    frameCount: 3,
    frameDurationMs: 4,
    images: [OpenAiImageReferenceInput()],
    inputFidelity: "high",
    markup: [:],
    mask: [:],
    model: "model",
    moderation: "low",
    n: 11,
    outputCompression: 12,
    outputFormat: "png",
    partialImages: 14,
    prompt: "prompt",
    quality: "low",
    safetyIdentifier: "safety-identifier",
    size: "size",
    stream: true,
    svg: [:],
    user: "user"
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

### tool

```swift
// Fetch a web page
let body = OpenAiDeepSeekWebFetchRequest(url: "https://example.com")
let result = try await client.tool.createFetch(body: body)
print(result)
```

### upload

```swift
// Create upload
let body = OpenAiUploadCreateRequest(
    bytes: 1,
    expiresAfter: [:],
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
    audio: true,
    callbackUrl: "callback-url",
    duration: 3,
    images: ["images"],
    isRec: true,
    metaData: "meta-data",
    model: "model",
    offPeak: false,
    payload: "payload",
    prompt: "prompt",
    resolution: "resolution",
    seed: 12,
    watermark: true,
    wmPosition: 14,
    wmUrl: "wm-url"
)
let result = try await client.videosVidu.createEntV2Img2video(body: body)
print(result)
```

### images_vidu

```swift
// Vidu reference to image
let body = ViduReferenceToImageRequest(
    aspectRatio: "aspect-ratio",
    bgm: false,
    callbackUrl: "callback-url",
    images: ["images"],
    model: "model",
    offPeak: false,
    payload: "payload",
    prompt: "prompt",
    resolution: "resolution",
    seed: 10
)
let result = try await client.imagesVidu.createEntV2Reference2image(body: body)
print(result)
```

### audio_vidu

```swift
// Vidu text to audio
let body = ViduTextToAudioRequest(
    bgm: true,
    callbackUrl: "callback-url",
    duration: 3.0,
    model: "model",
    offPeak: true,
    payload: "payload",
    prompt: "prompt",
    seed: 8
)
let result = try await client.audioVidu.createEntV2Text2audio(body: body)
print(result)
```

### audio_volcengine

```swift
// Volcengine create speech
let body = OpenAiSpeechCreateRequest(
    input: "input",
    instructions: "instructions",
    model: "model",
    responseFormat: "mp3",
    speed: 5.0,
    streamFormat: "sse",
    voice: "voice"
)
let result = try await client.audioVolcengine.createApiV3AudioSpeech(body: body)
print(result)
```

### videos_volcengine

```swift
// Volcengine Ark content generation task
let body = VolcengineContentGenerationTaskCreateRequest(
    callbackUrl: "https://example.com",
    cameraFixed: false,
    content: [VolcengineContentPart()],
    draft: false,
    duration: 5,
    executionExpiresAfter: 6,
    frames: 7,
    generateAudio: false,
    model: "model",
    omniReferenceTaskType: "auto",
    outputFormat: "mp4",
    priority: 12,
    ratio: "16:9",
    resolution: "480p",
    returnLastFrame: true,
    safetyIdentifier: "safety-identifier",
    seed: 17,
    serviceTier: "default",
    tools: [ArkWebSearchTool()],
    watermark: false
)
let result = try await client.videosVolcengine.createApiV3ContentsGenerationsTask(body: body)
print(result)
```

### images_volcengine

```swift
// Volcengine Ark image generation
let body = VolcengineImageGenerationRequest(
    background: "transparent",
    image: "image",
    layerDecomposition: true,
    model: "model",
    optimizePromptOptions: [:],
    outputFormat: "png",
    prompt: "prompt",
    responseFormat: "url",
    sequentialImageGeneration: "auto",
    sequentialImageGenerationOptions: [:],
    size: "size",
    stream: false,
    tools: [ArkWebSearchTool()],
    watermark: false
)
let result = try await client.imagesVolcengine.createApiV3ImagesGeneration(body: body)
print(result)
```

### images_xai

```swift
// xAI Grok Imagine image edit
let body = XaiImageEditRequest(
    aspectRatio: "1:1",
    deferred: false,
    image: [:],
    images: [XaiImageUrl()],
    model: "model",
    n: 6,
    output: [:],
    prompt: "prompt",
    resolution: "1k",
    responseFormat: "url",
    storageOptions: [:],
    user: "user"
)
let result = try await client.imagesXai.createV1ImagesEdit(body: body)
print(result)
```

### videos_xai

```swift
// xAI Grok Imagine video edit
let body = XaiVideoEditRequest(
    model: "model",
    output: [:],
    prompt: "prompt",
    storageOptions: [:],
    user: "user",
    video: [:]
)
let result = try await client.videosXai.createV1VideosEdit(body: body)
print(result)
```

### videos_zhipu

```swift
// Zhipu retrieve video generation task
let taskId = "1"
let result = try await client.videosZhipu.listApiPaasV4AsyncResult(taskId: taskId)
print(result)
```

### images_zhipu

```swift
// Zhipu CogView image generation
let body = ZhipuImageGenerationRequest(
    model: "glm-image",
    prompt: "prompt",
    quality: "hd",
    size: "size",
    userId: "1",
    watermarkEnabled: false
)
let result = try await client.imagesZhipu.createApiPaasV4ImagesGeneration(body: body)
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

- HTTP/OpenAPI generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- HTTP/OpenAPI generation also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- HTTP/OpenAPI apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put HTTP/OpenAPI hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across HTTP/OpenAPI regenerations.
- If an HTTP/OpenAPI generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
- RPC SDK source workspaces use convention-first evidence by default: RPC SDK family naming, language workspace naming, `rpc/*.manifest.json`, proto source references, generated client source, and native package manifests.
- Use `sdkgen inspect --protocol rpc` to verify RPC convention evidence. Request persisted generator evidence only with `--emit-control-plane` for release, CI, audit, or migration workflows; evidence paths are derived by generator convention.
