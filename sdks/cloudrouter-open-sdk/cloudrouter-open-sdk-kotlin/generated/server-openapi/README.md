# cloudrouter-open-sdk (Kotlin)

SDKWork Cloud Router OpenAI-compatible gateway SDK kotlin generated transport SDK

## Installation

Add to your `build.gradle.kts`:

```kotlin
implementation("com.sdkwork.cloudrouter:cloudrouter-open-sdk:0.1.0")
```

Or with Gradle Groovy:

```groovy
implementation 'com.sdkwork.cloudrouter:cloudrouter-open-sdk:0.1.0'
```

## Quick Start

```kotlin
import com.sdkwork.cloudrouter.open.SdkworkAiClient
import com.sdkwork.cloudrouter.open.*
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

```kotlin
// Alibaba Wanx image generation
val body = AlibabaImageGenerationRequest(
    input = linkedMapOf<String, Any>(
    "negative_prompt" to "negative-prompt",
    "prompt" to "prompt"
),
    model = "model",
    parameters = linkedMapOf<String, Any>(
    "n" to 1,
    "prompt_extend" to false,
    "seed" to 3,
    "size" to "size",
    "watermark" to true
)
)
val xDashScopeAsync = "enable"
val result = client.imagesAlibaba.createApiV1ServicesAigcText2imageImageSynthesi(body, xDashScopeAsync)
println(result)
```

### videos_alibaba

```kotlin
// Alibaba Wan retrieve video generation task
val taskId = "1"
val result = client.videosAlibaba.listApiV1Tasks(taskId)
println(result)
```

### audio_alibaba

```kotlin
// Alibaba Qwen TTS speech synthesis
val body = AlibabaSpeechRequest(
    input = linkedMapOf<String, Any>(
    "instructions" to "instructions",
    "language_type" to "Auto",
    "optimize_instructions" to true,
    "text" to "text",
    "voice" to "voice"
),
    model = "model",
    parameters = linkedMapOf<String, Any>(
    "value" to "value"
)
)
val result = client.audioAlibaba.createApiV1ServicesAudioTtsSpeechSynthesizer(body)
println(result)
```

### files_anthropic

```kotlin
// Anthropic list files
val params = linkedMapOf<String, Any>(
    "before_id" to "1",
    "after_id" to "1",
    "limit" to 3
)
val anthropicVersion = "anthropic-version"
val result = client.filesAnthropic.getListV1Files(params, anthropicVersion)
println(result)
```

### chat_anthropic

```kotlin
// Anthropic Claude message
val body = AnthropicMessageCreateRequest(
    cacheControl = linkedMapOf<String, Any>(
    "ttl" to "5m",
    "type" to "ephemeral"
),
    container = linkedMapOf<String, Any>(
    "id" to "1",
    "skills" to listOf(AnthropicSkill())
),
    diagnostics = linkedMapOf<String, Any>(
    "previous_message_id" to "1"
),
    inferenceGeo = "inference-geo",
    maxTokens = 5,
    messages = listOf(AnthropicMessageParam()),
    metadata = linkedMapOf<String, Any>(
    "user_id" to "1"
),
    model = "model",
    outputConfig = linkedMapOf<String, Any>(
    "effort" to "low",
    "format" to linkedMapOf<String, Any>(
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
    "type" to "json_schema"
)
),
    serviceTier = "auto",
    speed = "standard",
    stopSequences = listOf("stop-sequences"),
    stream = true,
    system = "system",
    temperature = 15,
    thinking = linkedMapOf<String, Any>(
    "budget_tokens" to 1,
    "display" to "summarized",
    "type" to "enabled"
),
    toolChoice = linkedMapOf<String, Any>(
    "disable_parallel_tool_use" to true,
    "name" to "name",
    "type" to "auto"
),
    tools = listOf(linkedMapOf<String, Any>(
    "allowed_callers" to listOf("direct"),
    "cache_control" to linkedMapOf<String, Any>(
    "ttl" to "5m",
    "type" to "ephemeral"
),
    "defer_loading" to true,
    "description" to "description",
    "eager_input_streaming" to true,
    "input_examples" to listOf(linkedMapOf<String, Any>(
    "value" to "value"
)),
    "input_schema" to linkedMapOf<String, Any>(
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
    "name" to "name",
    "strict" to true,
    "type" to "custom"
)),
    topK = 19,
    topP = 20
)
val anthropicVersion = "anthropic-version"
val result = client.chatAnthropic.createV1Message(body, anthropicVersion)
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
val anthropicVersion = "anthropic-version"
val result = client.batchesAnthropic.getListV1MessagesBatches(params, anthropicVersion)
println(result)
```

### videos_black_forest_labs

```kotlin
// Black Forest Labs FLUX 3 video generation
val body = BlackForestLabsVideoGenerationRequest(
    aspectRatio = "21:9",
    draft = false,
    draftCache = "draft-cache",
    duration = 4,
    generateAudio = true,
    keyframes = "keyframes",
    mode = "t2v",
    prompt = "prompt",
    resolution = "hd",
    safetyTolerance = 10,
    startVideo = "start-video",
    user = "user",
    version = "version"
)
val result = client.videosBlackForestLabs.createFlux3Video(body)
println(result)
```

### images_black_forest_labs

```kotlin
// Black Forest Labs retrieve generation result
val params = linkedMapOf<String, Any>(
    "id" to "1"
)
val result = client.imagesBlackForestLabs.listGetResult(params)
println(result)
```

### videos_bytedance

```kotlin
// ByteDance Seedance video generation
val body = BytedanceVideoGenerationRequest(
    callbackUrl = "https://example.com",
    cameraFixed = false,
    content = listOf(ArkContentPart()),
    draft = false,
    duration = 5,
    executionExpiresAfter = 6,
    frames = 7,
    generateAudio = false,
    model = "model",
    omniReferenceTaskType = "auto",
    outputFormat = "mp4",
    priority = 12,
    ratio = "16:9",
    resolution = "480p",
    returnLastFrame = true,
    safetyIdentifier = "safety-identifier",
    seed = 17,
    serviceTier = "default",
    tools = listOf(ArkWebSearchTool()),
    watermark = false
)
val result = client.videosBytedance.createApiV3ContentsGenerationsTask(body)
println(result)
```

### images_bytedance

```kotlin
// ByteDance Seedream image generation
val body = BytedanceImageGenerationRequest(
    background = "transparent",
    image = "image",
    layerDecomposition = true,
    model = "model",
    optimizePromptOptions = linkedMapOf<String, Any>(
    "mode" to "standard"
),
    outputFormat = "png",
    prompt = "prompt",
    responseFormat = "url",
    sequentialImageGeneration = "auto",
    sequentialImageGenerationOptions = linkedMapOf<String, Any>(
    "max_images" to 1
),
    size = "size",
    stream = false,
    tools = listOf(ArkWebSearchTool()),
    watermark = false
)
val result = client.imagesBytedance.createApiV3ImagesGeneration(body)
println(result)
```

### audio_bytedance

```kotlin
// ByteDance Seed TTS speech synthesis
val body = BytedanceSpeechRequest(
    reqParams = linkedMapOf<String, Any>(
    "additions" to "additions",
    "audio_params" to linkedMapOf<String, Any>(
    "format" to "mp3",
    "loudness_rate" to 2,
    "sample_rate" to 3,
    "speech_rate" to 4
),
    "model" to "model",
    "pronunciation_dict" to linkedMapOf<String, Any>(
    "value" to "value"
),
    "speaker" to "speaker",
    "ssml" to "ssml",
    "text" to "text",
    "tone" to listOf("tone")
)
)
val xApiResourceId = "seed-tts-2.0"
val xApiRequestId = "X-Api-Request-Id"
val result = client.audioBytedance.createApiV3TtsUnidirectional(body, xApiResourceId, xApiRequestId)
println(result)
```

### music_elevenlabs

```kotlin
// ElevenLabs music generation
val body = ElevenLabsMusicGenerationRequest(
    compositionPlan = linkedMapOf<String, Any>(
    "negative_global_styles" to listOf("negative-global-styles"),
    "positive_global_styles" to listOf("positive-global-styles"),
    "sections" to listOf(linkedMapOf<String, Any>(
    "value" to "value"
))
),
    finetuneId = "1",
    finetuneStrength = 3,
    forceInstrumental = false,
    generationMode = "track",
    lyricsText = "lyrics-text",
    modelId = "music_v1",
    musicLengthMs = 8,
    musicPrompt = linkedMapOf<String, Any>(
    "negative_global_styles" to listOf("negative-global-styles"),
    "positive_global_styles" to listOf("positive-global-styles"),
    "sections" to listOf(linkedMapOf<String, Any>(
    "value" to "value"
))
),
    prompt = "prompt",
    respectSectionsDurations = true,
    seed = 12,
    signWithC2pa = true,
    storeForInpainting = false,
    usePhoneticNames = true
)
val params = linkedMapOf<String, Any>(
    "output_format" to "output-format"
)
val result = client.musicElevenlabs.createV1Music(body, params)
println(result)
```

### audio_elevenlabs

```kotlin
// Generate sound effect
val body = ElevenLabsSoundGenerationRequest(
    durationSeconds = 1,
    loop = false,
    modelId = "eleven_text_to_sound_v2",
    promptInfluence = 4,
    text = "text"
)
val params = linkedMapOf<String, Any>(
    "output_format" to "output-format"
)
val result = client.audioElevenlabs.createV1SoundGeneration(body, params)
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

### videos_google

```kotlin
// Google Gemini retrieve video operation (Veo)
val model = "model"
val operationId = "1"
val result = client.videosGoogle.listV1betaModelsOperations(model, operationId)
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
    "continuationToken" to "token",
    "generationConfig" to linkedMapOf<String, Any>(
    "audioTranscriptionConfig" to linkedMapOf<String, Any>(
    "value" to "value"
),
    "candidateCount" to 2,
    "enableAffectiveDialog" to true,
    "enableEnhancedCivicAnswers" to false,
    "frequencyPenalty" to 5,
    "imageConfig" to linkedMapOf<String, Any>(
    "value" to "value"
),
    "logprobs" to 7,
    "maxOutputTokens" to 8,
    "mediaResolution" to "MEDIA_RESOLUTION_UNSPECIFIED",
    "presencePenalty" to 10,
    "responseFormat" to linkedMapOf<String, Any>(
    "value" to "value"
),
    "responseJsonSchema" to "responsejsonschema",
    "responseLogprobs" to true,
    "responseMimeType" to "responsemimetype",
    "responseModalities" to listOf("responsemodalities"),
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
    "seed" to 17,
    "speechConfig" to linkedMapOf<String, Any>(
    "value" to "value"
),
    "stopSequences" to listOf("stopsequences"),
    "temperature" to 20,
    "thinkingConfig" to linkedMapOf<String, Any>(
    "includeThoughts" to true,
    "thinkingBudget" to 2
),
    "topK" to 22,
    "topP" to 23,
    "translationConfig" to linkedMapOf<String, Any>(
    "value" to "value"
)
),
    "labels" to linkedMapOf<String, Any>(
    "value" to "value"
),
    "model" to "model",
    "safetySettings" to listOf(GoogleSafetySetting()),
    "serviceTier" to "unspecified",
    "store" to true,
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

### images_google

```kotlin
// Google Gemini image generation
val model = "model"
val body = GeminiImageGenerationRequest(
    instances = listOf(linkedMapOf<String, Any>(
    "image" to linkedMapOf<String, Any>(
    "value" to "value"
),
    "prompt" to "prompt"
)),
    parameters = linkedMapOf<String, Any>(
    "aspectRatio" to "aspectratio",
    "personGeneration" to "persongeneration",
    "sampleCount" to 3
)
)
val result = client.imagesGoogle.createV1betaModelsModelGenerateImage(model, body)
println(result)
```

### videos_jimeng

```kotlin
// Jimeng retrieve video generation task
val taskId = "1"
val result = client.videosJimeng.listV1Tasks(taskId)
println(result)
```

### audio_kling

```kotlin
// Kling text to audio
val body = KlingSoundGenerationRequest(
    callbackUrl = "callback-url",
    duration = 2,
    externalTaskId = "1",
    prompt = "prompt"
)
val result = client.audioKling.createV1AudioTextToAudio(body)
println(result)
```

### images_kling

```kotlin
// Kling image generation
val body = KlingImageGenerationRequest(
    aspectRatio = "16:9",
    callbackUrl = "callback-url",
    elementList = listOf(KlingElementReference()),
    externalTaskId = "1",
    humanFidelity = 5,
    image = "image",
    imageFidelity = 7,
    imageReference = "subject",
    modelName = "kling-v2-1",
    n = 10,
    negativePrompt = "negative-prompt",
    prompt = "prompt",
    resolution = "1k",
    watermarkInfo = linkedMapOf<String, Any>(
    "enabled" to true
)
)
val result = client.imagesKling.createV1ImagesGeneration(body)
println(result)
```

### videos_kling

```kotlin
// Kling create avatar video
val body = KlingAvatarCreateRequest(
    audioUrl = "audio-url",
    callbackUrl = "callback-url",
    humanImage = "human-image",
    modelName = "name",
    prompt = "prompt",
    text = "text",
    voiceId = "1",
    voiceLanguage = "voice-language",
    voiceMode = "voice-mode"
)
val result = client.videosKling.createV1VideosAvatar(body)
println(result)
```

### videos_luma_ai

```kotlin
// Luma Dream Machine video generation
val body = LumaVideoGenerationRequest(
    aspectRatio = "1:1",
    callbackUrl = "https://example.com",
    concepts = listOf(LumaConcept()),
    duration = "duration",
    generationType = "video",
    keyframes = linkedMapOf<String, Any>(
    "frame0" to linkedMapOf<String, Any>(
    "id" to "00000000-0000-0000-0000-000000000001",
    "type" to "image",
    "url" to "https://example.com"
),
    "frame1" to linkedMapOf<String, Any>(
    "id" to "00000000-0000-0000-0000-000000000001",
    "type" to "image",
    "url" to "https://example.com"
)
),
    loop = true,
    model = "ray-2",
    prompt = "prompt",
    resolution = "resolution"
)
val result = client.videosLumaAi.createGeneration(body)
println(result)
```

### videos_minimax

```kotlin
// MiniMax retrieve video file
val params = linkedMapOf<String, Any>(
    "file_id" to "1"
)
val result = client.videosMinimax.listV1FilesRetrieve(params)
println(result)
```

### images_minimax

```kotlin
// MiniMax image generation
val body = MinimaxImageGenerationRequest(
    aspectRatio = "1:1",
    height = 2,
    model = "image-01",
    n = 4,
    prompt = "prompt",
    promptOptimizer = false,
    responseFormat = "url",
    seed = 8,
    subjectReference = listOf(linkedMapOf<String, Any>(
    "value" to "value"
)),
    width = 10
)
val result = client.imagesMinimax.createV1ImageGeneration(body)
println(result)
```

### music_minimax

```kotlin
// Minimax create music generation
val body = MiniMaxMusicGenerationRequest(
    audioBase64 = "audio-base64",
    audioSetting = linkedMapOf<String, Any>(
    "bitrate" to 32000,
    "format" to "mp3",
    "sample_rate" to 16000
),
    audioUrl = "audio-url",
    coverFeatureId = "1",
    isInstrumental = true,
    lyrics = "lyrics",
    lyricsOptimizer = true,
    model = "music-3.0",
    outputFormat = "url",
    prompt = "prompt",
    stream = true
)
val result = client.musicMinimax.createV1MusicGeneration(body)
println(result)
```

### audio_minimax

```kotlin
// MiniMax speech synthesis
val body = MinimaxTextToSpeechRequest(
    audioSetting = linkedMapOf<String, Any>(
    "value" to "value"
),
    languageBoost = "language-boost",
    model = "speech-2.8-hd",
    outputFormat = "url",
    pronunciationDict = linkedMapOf<String, Any>(
    "value" to "value"
),
    stream = false,
    streamOptions = linkedMapOf<String, Any>(
    "exclude_aggregated_audio" to true
),
    subtitleEnable = false,
    subtitleType = "sentence",
    text = "text",
    textNormalizationMode = "basic",
    timbreWeights = listOf(MinimaxTimbreWeight()),
    voiceModify = linkedMapOf<String, Any>(
    "intensity" to 1,
    "pitch" to 2,
    "sound_effects" to "spacious_echo",
    "timbre" to 4
),
    voiceSetting = linkedMapOf<String, Any>(
    "value" to "value"
)
)
val result = client.audioMinimax.createV1T2aV(body)
println(result)
```

### music_mureka

```kotlin
// Mureka song generation
val body = MurekaMusicGenerationRequest(
    callbackUrl = "callback-url",
    duration = 2,
    lyrics = "lyrics",
    model = "model",
    prompt = "prompt",
    referenceAudioUrl = "reference-audio-url",
    tags = listOf("tags"),
    title = "title"
)
val result = client.musicMureka.createV1SongGenerate(body)
println(result)
```

### videos_pixverse

```kotlin
// PixVerse retrieve video generation
val videoId = "1"
val aiTraceId = "Ai-trace-id"
val result = client.videosPixverse.listOpenapiV2VideoResult(videoId, aiTraceId)
println(result)
```

### videos_runway

```kotlin
// Runway image to video
val body = RunwayImageToVideoRequest(
    audio = true,
    bitrate = "standard",
    cfgScale = 3,
    contentModeration = linkedMapOf<String, Any>(
    "value" to "value"
),
    draft = true,
    duration = 6,
    model = "model",
    negativePrompt = "negativeprompt",
    outputFormat = "mp4",
    promptExpansionMode = "disabled",
    promptImage = "promptimage",
    promptText = "prompttext",
    proresProfile = "422",
    providerSettings = linkedMapOf<String, Any>(
    "value" to "value"
),
    ratio = "ratio",
    referenceAudio = listOf(linkedMapOf<String, Any>(
    "value" to "value"
)),
    referenceVideos = listOf(linkedMapOf<String, Any>(
    "value" to "value"
)),
    references = listOf(linkedMapOf<String, Any>(
    "value" to "value"
)),
    resolution = "480p",
    seed = 20
)
val xRunwayVersion = "2024-11-06"
val result = client.videosRunway.createV1ImageToVideo(body, xRunwayVersion)
println(result)
```

### images_runway

```kotlin
// Runway retrieve task
val taskId = "1"
val xRunwayVersion = "2024-11-06"
val result = client.imagesRunway.listV1Tasks(taskId, xRunwayVersion)
println(result)
```

### audio_stability_ai

```kotlin
// Stability AI text-to-audio (music and sound effects)
val body = StabilityAudioRequest(
    cfgScale = 1,
    duration = 2,
    model = "stable-audio-2",
    outputFormat = "mp3",
    prompt = "prompt",
    seed = 6,
    steps = 7
)
val result = client.audioStabilityAi.createTextToAudio(body)
println(result)
```

### images_stability_ai

```kotlin
// Stability AI image generation
val mode = "mode"
val body = StabilityImageGenerationRequest(
    aspectRatio = "21:9",
    cfgScale = 2,
    image = "image",
    mode = "text-to-image",
    model = "sd3.5-large",
    negativePrompt = "negative-prompt",
    outputFormat = "png",
    prompt = "prompt",
    seed = 9,
    strength = 10,
    stylePreset = "style-preset"
)
val accept = "application/json"
val result = client.imagesStabilityAi.createGenerate(mode, body, accept)
println(result)
```

### music_suno

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
val result = client.musicSuno.createV1MusicGeneration(body)
println(result)
```

### chat_typesafe

```kotlin
// TypeSafe AI System One decision
val body = TypeSafeSystemOneRequest(
    model = "model",
    questions = linkedMapOf<String, Any>(
    "value" to linkedMapOf<String, Any>(
    "criteria" to "criteria",
    "instructions" to "instructions",
    "type" to "choice"
)
),
    state = "state"
)
val result = client.chatTypesafe.createV1Systemone(body)
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
    streamOptions = linkedMapOf<String, Any>(
    "include_usage" to true
),
    suffix = "suffix",
    temperature = 16,
    topP = 17,
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

### image

```kotlin
// Create image edit
val body = OpenAiImageEditRequest(
    background = "transparent",
    complexity = "low",
    frameCount = 3,
    frameDurationMs = 4,
    images = listOf(OpenAiImageReferenceInput()),
    inputFidelity = "high",
    markup = linkedMapOf<String, Any>(
    "value" to "value"
),
    mask = linkedMapOf<String, Any>(
    "value" to "value"
),
    model = "model",
    moderation = "low",
    n = 11,
    outputCompression = 12,
    outputFormat = "png",
    partialImages = 14,
    prompt = "prompt",
    quality = "low",
    safetyIdentifier = "safety-identifier",
    size = "size",
    stream = true,
    svg = linkedMapOf<String, Any>(
    "value" to "value"
),
    user = "user"
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

### tool

```kotlin
// Fetch a web page
val body = OpenAiDeepSeekWebFetchRequest(
    url = "https://example.com"
)
val result = client.tool.createFetch(body)
println(result)
```

### upload

```kotlin
// Create upload
val body = OpenAiUploadCreateRequest(
    bytes = 1,
    expiresAfter = linkedMapOf<String, Any>(
    "value" to "value"
),
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
    audio = true,
    callbackUrl = "callback-url",
    duration = 3,
    images = listOf("images"),
    isRec = true,
    metaData = "meta-data",
    model = "model",
    offPeak = false,
    payload = "payload",
    prompt = "prompt",
    resolution = "resolution",
    seed = 12,
    watermark = true,
    wmPosition = 14,
    wmUrl = "wm-url"
)
val result = client.videosVidu.createEntV2Img2video(body)
println(result)
```

### images_vidu

```kotlin
// Vidu reference to image
val body = ViduReferenceToImageRequest(
    aspectRatio = "aspect-ratio",
    bgm = false,
    callbackUrl = "callback-url",
    images = listOf("images"),
    model = "model",
    offPeak = false,
    payload = "payload",
    prompt = "prompt",
    resolution = "resolution",
    seed = 10
)
val result = client.imagesVidu.createEntV2Reference2image(body)
println(result)
```

### audio_vidu

```kotlin
// Vidu text to audio
val body = ViduTextToAudioRequest(
    bgm = true,
    callbackUrl = "callback-url",
    duration = 3,
    model = "model",
    offPeak = true,
    payload = "payload",
    prompt = "prompt",
    seed = 8
)
val result = client.audioVidu.createEntV2Text2audio(body)
println(result)
```

### audio_volcengine

```kotlin
// Volcengine create speech
val body = OpenAiSpeechCreateRequest(
    input = "input",
    instructions = "instructions",
    model = "model",
    responseFormat = "mp3",
    speed = 5,
    streamFormat = "sse",
    voice = "voice"
)
val result = client.audioVolcengine.createApiV3AudioSpeech(body)
println(result)
```

### videos_volcengine

```kotlin
// Volcengine Ark content generation task
val body = VolcengineContentGenerationTaskCreateRequest(
    callbackUrl = "https://example.com",
    cameraFixed = false,
    content = listOf(VolcengineContentPart()),
    draft = false,
    duration = 5,
    executionExpiresAfter = 6,
    frames = 7,
    generateAudio = false,
    model = "model",
    omniReferenceTaskType = "auto",
    outputFormat = "mp4",
    priority = 12,
    ratio = "16:9",
    resolution = "480p",
    returnLastFrame = true,
    safetyIdentifier = "safety-identifier",
    seed = 17,
    serviceTier = "default",
    tools = listOf(ArkWebSearchTool()),
    watermark = false
)
val result = client.videosVolcengine.createApiV3ContentsGenerationsTask(body)
println(result)
```

### images_volcengine

```kotlin
// Volcengine Ark image generation
val body = VolcengineImageGenerationRequest(
    background = "transparent",
    image = "image",
    layerDecomposition = true,
    model = "model",
    optimizePromptOptions = linkedMapOf<String, Any>(
    "mode" to "standard"
),
    outputFormat = "png",
    prompt = "prompt",
    responseFormat = "url",
    sequentialImageGeneration = "auto",
    sequentialImageGenerationOptions = linkedMapOf<String, Any>(
    "max_images" to 1
),
    size = "size",
    stream = false,
    tools = listOf(ArkWebSearchTool()),
    watermark = false
)
val result = client.imagesVolcengine.createApiV3ImagesGeneration(body)
println(result)
```

### images_xai

```kotlin
// xAI Grok Imagine image edit
val body = XaiImageEditRequest(
    aspectRatio = "1:1",
    deferred = false,
    image = linkedMapOf<String, Any>(
    "file_id" to "1",
    "url" to "url"
),
    images = listOf(XaiImageUrl()),
    model = "model",
    n = 6,
    output = linkedMapOf<String, Any>(
    "value" to "value"
),
    prompt = "prompt",
    resolution = "1k",
    responseFormat = "url",
    storageOptions = linkedMapOf<String, Any>(
    "value" to "value"
),
    user = "user"
)
val result = client.imagesXai.createV1ImagesEdit(body)
println(result)
```

### videos_xai

```kotlin
// xAI Grok Imagine video edit
val body = XaiVideoEditRequest(
    model = "model",
    output = linkedMapOf<String, Any>(
    "value" to "value"
),
    prompt = "prompt",
    storageOptions = linkedMapOf<String, Any>(
    "value" to "value"
),
    user = "user",
    video = linkedMapOf<String, Any>(
    "file_id" to "1",
    "url" to "url"
)
)
val result = client.videosXai.createV1VideosEdit(body)
println(result)
```

### videos_zhipu

```kotlin
// Zhipu retrieve video generation task
val taskId = "1"
val result = client.videosZhipu.listApiPaasV4AsyncResult(taskId)
println(result)
```

### images_zhipu

```kotlin
// Zhipu CogView image generation
val body = ZhipuImageGenerationRequest(
    model = "glm-image",
    prompt = "prompt",
    quality = "hd",
    size = "size",
    userId = "1",
    watermarkEnabled = false
)
val result = client.imagesZhipu.createApiPaasV4ImagesGeneration(body)
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

- HTTP/OpenAPI generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- HTTP/OpenAPI generation also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- HTTP/OpenAPI apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put HTTP/OpenAPI hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across HTTP/OpenAPI regenerations.
- If an HTTP/OpenAPI generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
- RPC SDK source workspaces use convention-first evidence by default: RPC SDK family naming, language workspace naming, `rpc/*.manifest.json`, proto source references, generated client source, and native package manifests.
- Use `sdkgen inspect --protocol rpc` to verify RPC convention evidence. Request persisted generator evidence only with `--emit-control-plane` for release, CI, audit, or migration workflows; evidence paths are derived by generator convention.
