# cloudrouter-open-sdk (C#)

SDKWork Cloud Router OpenAI-compatible gateway SDK csharp generated transport SDK

## Installation

```bash
dotnet add package Sdkwork.CloudRouter.Open.Sdk
```

Or add to your `.csproj`:

```xml
<PackageReference Include="Sdkwork.CloudRouter.Open.Sdk" Version="0.1.0" />
```

## Quick Start

```csharp
using Sdkwork.CloudRouter.Open.Models;
using Sdkwork.CloudRouter.Open;
using SDKwork.Common.Core;

var config = new SdkConfig("https://api.sdkwork.com");
var client = new SdkworkAiClient(config);
client.SetApiKey("your-api-key");

var result = await client.Models.ListAsync();
Console.WriteLine(result);
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```csharp
var config = new SdkConfig("https://api.sdkwork.com");
var client = new SdkworkAiClient(config);
client.SetApiKey("your-api-key");
// Sends: Authorization: Bearer <apiKey>
```

### Mode B: Dual Token

```csharp
var config = new SdkConfig("https://api.sdkwork.com");
var client = new SdkworkAiClient(config);
client.SetAuthToken("your-auth-token");
client.SetAccessToken("your-access-token");
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `SetApiKey(...)` together with `SetAuthToken(...)` + `SetAccessToken(...)` on the same client.

## Configuration (Non-Auth)

```csharp
var config = new SdkConfig("https://api.sdkwork.com");
var client = new SdkworkAiClient(config);

// Set custom headers
client.SetHeader("X-Custom-Header", "value");
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

```csharp
// Alibaba Wanx image generation
var body = new AlibabaImageGenerationRequest
{
    Input = new Dictionary<string, object>(),
    Model = "model",
    Parameters = new Dictionary<string, object>(),
};
var xDashScopeAsync = "enable";
var result = await client.ImagesAlibaba.CreateApiV1ServicesAigcText2imageImageSynthesiAsync(body, xDashScopeAsync);
Console.WriteLine(result);
```

### videos_alibaba

```csharp
// Alibaba Wan retrieve video generation task
var taskId = "1";
var result = await client.VideosAlibaba.ListApiV1TasksAsync(taskId);
Console.WriteLine(result);
```

### audio_alibaba

```csharp
// Alibaba Qwen TTS speech synthesis
var body = new AlibabaSpeechRequest
{
    Input = new Dictionary<string, object>(),
    Model = "model",
    Parameters = new Dictionary<string, object>(),
};
var result = await client.AudioAlibaba.CreateApiV1ServicesAudioTtsSpeechSynthesizerAsync(body);
Console.WriteLine(result);
```

### files_anthropic

```csharp
// Anthropic list files
var query = new Dictionary<string, object>
{
    ["before_id"] = "1",
    ["after_id"] = "1",
    ["limit"] = 3,
};
var anthropicVersion = "anthropic-version";
var result = await client.FilesAnthropic.GetListV1FilesAsync(query, anthropicVersion);
Console.WriteLine(result);
```

### chat_anthropic

```csharp
// Anthropic Claude message
var body = new AnthropicMessageCreateRequest
{
    CacheControl = new Dictionary<string, object>(),
    Container = new Dictionary<string, object>(),
    Diagnostics = new Dictionary<string, object>(),
    InferenceGeo = "inference-geo",
    MaxTokens = 5,
    Messages = new List<object> { new AnthropicMessageParam() },
    Metadata = new Dictionary<string, object>(),
    Model = "model",
    OutputConfig = new Dictionary<string, object>(),
    ServiceTier = "auto",
    Speed = "standard",
    StopSequences = new List<object> { "stop-sequences" },
    Stream = true,
    System = "system",
    Temperature = 15,
    Thinking = new Dictionary<string, object>(),
    ToolChoice = new Dictionary<string, object>(),
    Tools = new List<object> { new Dictionary<string, object>() },
    TopK = 19,
    TopP = 20,
};
var anthropicVersion = "anthropic-version";
var result = await client.ChatAnthropic.CreateV1MessageAsync(body, anthropicVersion);
Console.WriteLine(result);
```

### batches_anthropic

```csharp
// Anthropic list message batches
var query = new Dictionary<string, object>
{
    ["before_id"] = "1",
    ["after_id"] = "1",
    ["limit"] = 3,
};
var anthropicVersion = "anthropic-version";
var result = await client.BatchesAnthropic.GetListV1MessagesBatchesAsync(query, anthropicVersion);
Console.WriteLine(result);
```

### videos_black_forest_labs

```csharp
// Black Forest Labs FLUX 3 video generation
var body = new BlackForestLabsVideoGenerationRequest
{
    AspectRatio = "21:9",
    Draft = false,
    DraftCache = "draft-cache",
    Duration = 4,
    GenerateAudio = true,
    Keyframes = "keyframes",
    Mode = "t2v",
    Prompt = "prompt",
    Resolution = "hd",
    SafetyTolerance = 10,
    StartVideo = "start-video",
    User = "user",
    Version = "version",
};
var result = await client.VideosBlackForestLabs.CreateFlux3VideoAsync(body);
Console.WriteLine(result);
```

### images_black_forest_labs

```csharp
// Black Forest Labs retrieve generation result
var query = new Dictionary<string, object>
{
    ["id"] = "1",
};
var result = await client.ImagesBlackForestLabs.ListGetResultAsync(query);
Console.WriteLine(result);
```

### videos_bytedance

```csharp
// ByteDance Seedance video generation
var body = new BytedanceVideoGenerationRequest
{
    CallbackUrl = "https://example.com",
    CameraFixed = false,
    Content = new List<object> { new ArkContentPart() },
    Draft = false,
    Duration = 5,
    ExecutionExpiresAfter = 6,
    Frames = 7,
    GenerateAudio = false,
    Model = "model",
    OmniReferenceTaskType = "auto",
    OutputFormat = "mp4",
    Priority = 12,
    Ratio = "16:9",
    Resolution = "480p",
    ReturnLastFrame = true,
    SafetyIdentifier = "safety-identifier",
    Seed = 17,
    ServiceTier = "default",
    Tools = new List<object> { new ArkWebSearchTool() },
    Watermark = false,
};
var result = await client.VideosBytedance.CreateApiV3ContentsGenerationsTaskAsync(body);
Console.WriteLine(result);
```

### images_bytedance

```csharp
// ByteDance Seedream image generation
var body = new BytedanceImageGenerationRequest
{
    Background = "transparent",
    Image = "image",
    LayerDecomposition = true,
    Model = "model",
    OptimizePromptOptions = new Dictionary<string, object>(),
    OutputFormat = "png",
    Prompt = "prompt",
    ResponseFormat = "url",
    SequentialImageGeneration = "auto",
    SequentialImageGenerationOptions = new Dictionary<string, object>(),
    Size = "size",
    Stream = false,
    Tools = new List<object> { new ArkWebSearchTool() },
    Watermark = false,
};
var result = await client.ImagesBytedance.CreateApiV3ImagesGenerationAsync(body);
Console.WriteLine(result);
```

### audio_bytedance

```csharp
// ByteDance Seed TTS speech synthesis
var body = new BytedanceSpeechRequest
{
    ReqParams = new Dictionary<string, object>(),
};
var xApiResourceId = "seed-tts-2.0";
var xApiRequestId = "X-Api-Request-Id";
var result = await client.AudioBytedance.CreateApiV3TtsUnidirectionalAsync(body, xApiResourceId, xApiRequestId);
Console.WriteLine(result);
```

### music_elevenlabs

```csharp
// ElevenLabs music generation
var body = new ElevenLabsMusicGenerationRequest
{
    CompositionPlan = new Dictionary<string, object>(),
    FinetuneId = "1",
    FinetuneStrength = 3,
    ForceInstrumental = false,
    GenerationMode = "track",
    LyricsText = "lyrics-text",
    ModelId = "music_v1",
    MusicLengthMs = 8,
    MusicPrompt = new Dictionary<string, object>(),
    Prompt = "prompt",
    RespectSectionsDurations = true,
    Seed = 12,
    SignWithC2pa = true,
    StoreForInpainting = false,
    UsePhoneticNames = true,
};
var query = new Dictionary<string, object>
{
    ["output_format"] = "output-format",
};
var result = await client.MusicElevenlabs.CreateV1MusicAsync(body, query);
Console.WriteLine(result);
```

### audio_elevenlabs

```csharp
// Generate sound effect
var body = new ElevenLabsSoundGenerationRequest
{
    DurationSeconds = 1,
    Loop = false,
    ModelId = "eleven_text_to_sound_v2",
    PromptInfluence = 4,
    Text = "text",
};
var query = new Dictionary<string, object>
{
    ["output_format"] = "output-format",
};
var result = await client.AudioElevenlabs.CreateV1SoundGenerationAsync(body, query);
Console.WriteLine(result);
```

### responses_google

```csharp
// Google Gemini list cached contents
var query = new Dictionary<string, object>
{
    ["pageSize"] = 1,
    ["pageToken"] = "token",
};
var result = await client.ResponsesGoogle.GetListV1betaCachedContentsAsync(query);
Console.WriteLine(result);
```

### files_google

```csharp
// Google Gemini list files
var query = new Dictionary<string, object>
{
    ["pageSize"] = 1,
    ["pageToken"] = "token",
};
var result = await client.FilesGoogle.GetListV1betaFilesAsync(query);
Console.WriteLine(result);
```

### videos_google

```csharp
// Google Gemini retrieve video operation (Veo)
var model = "model";
var operationId = "1";
var result = await client.VideosGoogle.ListV1betaModelsOperationsAsync(model, operationId);
Console.WriteLine(result);
```

### embeddings_google

```csharp
// Google Gemini batch embed contents
var model = "model";
var body = new GoogleBatchEmbedContentsRequest
{
    Requests = new List<object> { new GoogleEmbedContentRequest() },
};
var result = await client.EmbeddingsGoogle.CreateV1betaModelsModelBatchEmbedContentAsync(model, body);
Console.WriteLine(result);
```

### chat_google

```csharp
// Google Gemini count tokens
var model = "model";
var body = new GoogleCountTokensRequest
{
    Contents = new List<object> { new GoogleContent() },
    GenerateContentRequest = new Dictionary<string, object>(),
};
var result = await client.ChatGoogle.CreateV1betaModelsModelCountTokenAsync(model, body);
Console.WriteLine(result);
```

### images_google

```csharp
// Google Gemini image generation
var model = "model";
var body = new GeminiImageGenerationRequest
{
    Instances = new List<object> { new Dictionary<string, object>() },
    Parameters = new Dictionary<string, object>(),
};
var result = await client.ImagesGoogle.CreateV1betaModelsModelGenerateImageAsync(model, body);
Console.WriteLine(result);
```

### videos_jimeng

```csharp
// Jimeng retrieve video generation task
var taskId = "1";
var result = await client.VideosJimeng.ListV1TasksAsync(taskId);
Console.WriteLine(result);
```

### audio_kling

```csharp
// Kling text to audio
var body = new KlingSoundGenerationRequest
{
    CallbackUrl = "callback-url",
    Duration = 2,
    ExternalTaskId = "1",
    Prompt = "prompt",
};
var result = await client.AudioKling.CreateV1AudioTextToAudioAsync(body);
Console.WriteLine(result);
```

### images_kling

```csharp
// Kling image generation
var body = new KlingImageGenerationRequest
{
    AspectRatio = "16:9",
    CallbackUrl = "callback-url",
    ElementList = new List<object> { new KlingElementReference() },
    ExternalTaskId = "1",
    HumanFidelity = 5,
    Image = "image",
    ImageFidelity = 7,
    ImageReference = "subject",
    ModelName = "kling-v2-1",
    N = 10,
    NegativePrompt = "negative-prompt",
    Prompt = "prompt",
    Resolution = "1k",
    WatermarkInfo = new Dictionary<string, object>(),
};
var result = await client.ImagesKling.CreateV1ImagesGenerationAsync(body);
Console.WriteLine(result);
```

### videos_kling

```csharp
// Kling create avatar video
var body = new KlingAvatarCreateRequest
{
    AudioUrl = "audio-url",
    CallbackUrl = "callback-url",
    HumanImage = "human-image",
    ModelName = "name",
    Prompt = "prompt",
    Text = "text",
    VoiceId = "1",
    VoiceLanguage = "voice-language",
    VoiceMode = "voice-mode",
};
var result = await client.VideosKling.CreateV1VideosAvatarAsync(body);
Console.WriteLine(result);
```

### videos_luma_ai

```csharp
// Luma Dream Machine video generation
var body = new LumaVideoGenerationRequest
{
    AspectRatio = "1:1",
    CallbackUrl = "https://example.com",
    Concepts = new List<object> { new LumaConcept() },
    Duration = "duration",
    GenerationType = "video",
    Keyframes = new Dictionary<string, object>(),
    Loop = true,
    Model = "ray-2",
    Prompt = "prompt",
    Resolution = "resolution",
};
var result = await client.VideosLumaAi.CreateGenerationAsync(body);
Console.WriteLine(result);
```

### videos_minimax

```csharp
// MiniMax retrieve video file
var query = new Dictionary<string, object>
{
    ["file_id"] = "1",
};
var result = await client.VideosMinimax.ListV1FilesRetrieveAsync(query);
Console.WriteLine(result);
```

### images_minimax

```csharp
// MiniMax image generation
var body = new MinimaxImageGenerationRequest
{
    AspectRatio = "1:1",
    Height = 2,
    Model = "image-01",
    N = 4,
    Prompt = "prompt",
    PromptOptimizer = false,
    ResponseFormat = "url",
    Seed = 8,
    SubjectReference = new List<object> { new Dictionary<string, object>() },
    Width = 10,
};
var result = await client.ImagesMinimax.CreateV1ImageGenerationAsync(body);
Console.WriteLine(result);
```

### music_minimax

```csharp
// Minimax create music generation
var body = new MiniMaxMusicGenerationRequest
{
    AudioBase64 = "audio-base64",
    AudioSetting = new Dictionary<string, object>(),
    AudioUrl = "audio-url",
    CoverFeatureId = "1",
    IsInstrumental = true,
    Lyrics = "lyrics",
    LyricsOptimizer = true,
    Model = "music-3.0",
    OutputFormat = "url",
    Prompt = "prompt",
    Stream = true,
};
var result = await client.MusicMinimax.CreateV1MusicGenerationAsync(body);
Console.WriteLine(result);
```

### audio_minimax

```csharp
// MiniMax speech synthesis
var body = new MinimaxTextToSpeechRequest
{
    AudioSetting = new Dictionary<string, object>(),
    LanguageBoost = "language-boost",
    Model = "speech-2.8-hd",
    OutputFormat = "url",
    PronunciationDict = new Dictionary<string, object>(),
    Stream = false,
    StreamOptions = new Dictionary<string, object>(),
    SubtitleEnable = false,
    SubtitleType = "sentence",
    Text = "text",
    TextNormalizationMode = "basic",
    TimbreWeights = new List<object> { new MinimaxTimbreWeight() },
    VoiceModify = new Dictionary<string, object>(),
    VoiceSetting = new Dictionary<string, object>(),
};
var result = await client.AudioMinimax.CreateV1T2aVAsync(body);
Console.WriteLine(result);
```

### music_mureka

```csharp
// Mureka song generation
var body = new MurekaMusicGenerationRequest
{
    CallbackUrl = "callback-url",
    Duration = 2,
    Lyrics = "lyrics",
    Model = "model",
    Prompt = "prompt",
    ReferenceAudioUrl = "reference-audio-url",
    Tags = new List<object> { "tags" },
    Title = "title",
};
var result = await client.MusicMureka.CreateV1SongGenerateAsync(body);
Console.WriteLine(result);
```

### videos_pixverse

```csharp
// PixVerse retrieve video generation
var videoId = "1";
var aiTraceId = "Ai-trace-id";
var result = await client.VideosPixverse.ListOpenapiV2VideoResultAsync(videoId, aiTraceId);
Console.WriteLine(result);
```

### videos_runway

```csharp
// Runway image to video
var body = new RunwayImageToVideoRequest
{
    Audio = true,
    Bitrate = "standard",
    CfgScale = 3,
    ContentModeration = new Dictionary<string, object>(),
    Draft = true,
    Duration = 6,
    Model = "model",
    NegativePrompt = "negativeprompt",
    OutputFormat = "mp4",
    PromptExpansionMode = "disabled",
    PromptImage = "promptimage",
    PromptText = "prompttext",
    ProresProfile = "422",
    ProviderSettings = new Dictionary<string, object>(),
    Ratio = "ratio",
    ReferenceAudio = new List<object> { new Dictionary<string, object>() },
    ReferenceVideos = new List<object> { new Dictionary<string, object>() },
    References = new List<object> { new Dictionary<string, object>() },
    Resolution = "480p",
    Seed = 20,
};
var xRunwayVersion = "2024-11-06";
var result = await client.VideosRunway.CreateV1ImageToVideoAsync(body, xRunwayVersion);
Console.WriteLine(result);
```

### images_runway

```csharp
// Runway retrieve task
var taskId = "1";
var xRunwayVersion = "2024-11-06";
var result = await client.ImagesRunway.ListV1TasksAsync(taskId, xRunwayVersion);
Console.WriteLine(result);
```

### audio_stability_ai

```csharp
// Stability AI text-to-audio (music and sound effects)
var body = new StabilityAudioRequest
{
    CfgScale = 1,
    Duration = 2,
    Model = "stable-audio-2",
    OutputFormat = "mp3",
    Prompt = "prompt",
    Seed = 6,
    Steps = 7,
};
var result = await client.AudioStabilityAi.CreateTextToAudioAsync(body);
Console.WriteLine(result);
```

### images_stability_ai

```csharp
// Stability AI image generation
var mode = "mode";
var body = new StabilityImageGenerationRequest
{
    AspectRatio = "21:9",
    CfgScale = 2,
    Image = "image",
    Mode = "text-to-image",
    Model = "sd3.5-large",
    NegativePrompt = "negative-prompt",
    OutputFormat = "png",
    Prompt = "prompt",
    Seed = 9,
    Strength = 10,
    StylePreset = "style-preset",
};
var accept = "application/json";
var result = await client.ImagesStabilityAi.CreateGenerateAsync(mode, body, accept);
Console.WriteLine(result);
```

### music_suno

```csharp
// Suno music generation
var body = new SunoMusicGenerationRequest
{
    CallbackUrl = "callback-url",
    Duration = 2,
    Model = "model",
    NegativeTags = "negative-tags",
    Prompt = "prompt",
    Tags = "tags",
    Title = "title",
};
var result = await client.MusicSuno.CreateV1MusicGenerationAsync(body);
Console.WriteLine(result);
```

### chat_typesafe

```csharp
// TypeSafe AI System One decision
var body = new TypeSafeSystemOneRequest
{
    Model = "model",
    Questions = new Dictionary<string, object>(),
    State = "state",
};
var result = await client.ChatTypesafe.CreateV1SystemoneAsync(body);
Console.WriteLine(result);
```

### assistant

```csharp
// List assistants
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.Assistants.ListAsync(query);
Console.WriteLine(result);
```

### audio

```csharp
// List voice consents
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.Audio.GetListVoiceConsentsAsync(query);
Console.WriteLine(result);
```

### batch

```csharp
// List batches
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.Batches.ListAsync(query);
Console.WriteLine(result);
```

### chat

```csharp
// List stored chat completions
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
    ["model"] = "model",
    ["metadata"] = "metadata",
};
var result = await client.Chat.ListAsync(query);
Console.WriteLine(result);
```

### completion

```csharp
// Create completion
var body = new OpenAiCompletionCreateRequest
{
    BestOf = 1,
    Echo = false,
    FrequencyPenalty = 3,
    LogitBias = new Dictionary<string, object>(),
    Logprobs = 5,
    MaxTokens = 6,
    Model = "model",
    N = 8,
    PresencePenalty = 9,
    Prompt = "prompt",
    Seed = 11,
    Stop = "stop",
    Stream = true,
    StreamOptions = new Dictionary<string, object>(),
    Suffix = "suffix",
    Temperature = 16,
    TopP = 17,
    User = "user",
};
var result = await client.Completion.CreateAsync(body);
Console.WriteLine(result);
```

### container

```csharp
// List containers
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.Container.ListAsync(query);
Console.WriteLine(result);
```

### conversation

```csharp
// List conversations
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.Conversation.ListAsync(query);
Console.WriteLine(result);
```

### embedding

```csharp
// Create embeddings
var body = new OpenAiEmbeddingsRequest
{
    Dimensions = 1,
    EncodingFormat = "float",
    Input = "input",
    Model = "model",
    User = "user",
};
var result = await client.Embeddings.CreateAsync(body);
Console.WriteLine(result);
```

### file

```csharp
// List files
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.Files.ListAsync(query);
Console.WriteLine(result);
```

### image

```csharp
// Create image edit
var body = new OpenAiImageEditRequest
{
    Background = "transparent",
    Complexity = "low",
    FrameCount = 3,
    FrameDurationMs = 4,
    Images = new List<object> { new OpenAiImageReferenceInput() },
    InputFidelity = "high",
    Markup = new Dictionary<string, object>(),
    Mask = new Dictionary<string, object>(),
    Model = "model",
    Moderation = "low",
    N = 11,
    OutputCompression = 12,
    OutputFormat = "png",
    PartialImages = 14,
    Prompt = "prompt",
    Quality = "low",
    SafetyIdentifier = "safety-identifier",
    Size = "size",
    Stream = true,
    Svg = new Dictionary<string, object>(),
    User = "user",
};
var result = await client.Images.CreateEditAsync(body);
Console.WriteLine(result);
```

### model

```csharp
// List models
var result = await client.Models.ListAsync();
Console.WriteLine(result);
```

### moderation

```csharp
// Create moderation
var body = new OpenAiModerationCreateRequest
{
    Input = "input",
    Model = "model",
};
var result = await client.Moderations.CreateAsync(body);
Console.WriteLine(result);
```

### realtime

```csharp
// Create realtime call
var body = new OpenAiRealtimeCallCreateRequest
{
    Metadata = new Dictionary<string, object>(),
    Sdp = "sdp",
    Session = "session",
};
var result = await client.Realtime.CreateCallAsync(body);
Console.WriteLine(result);
```

### response

```csharp
// Create response
var body = new OpenAiResponsesRequest
{
    Background = true,
    Conversation = "conversation",
    Include = new List<object> { "include" },
    Input = "input",
    Instructions = "instructions",
    MaxOutputTokens = 6,
    MaxToolCalls = 7,
    Metadata = new Dictionary<string, object>(),
    Model = "model",
    ParallelToolCalls = false,
    PreviousResponseId = "1",
    Prompt = new Dictionary<string, object>(),
    PromptCacheKey = "prompt-cache-key",
    Reasoning = new Dictionary<string, object>(),
    ServiceTier = "auto",
    Store = false,
    Stream = true,
    Temperature = 18,
    Text = new Dictionary<string, object>(),
    ToolChoice = "tool-choice",
    Tools = new List<object> { new OpenAiTool() },
    TopLogprobs = 22,
    TopP = 23,
    Truncation = "auto",
    User = "user",
};
var result = await client.Responses.CreateAsync(body);
Console.WriteLine(result);
```

### thread

```csharp
// Create thread
var body = new OpenAiThreadCreateRequest
{
    Messages = new List<object> { new OpenAiThreadMessageCreateRequest() },
    Metadata = new Dictionary<string, object>(),
    ToolResources = "tool-resources",
};
var result = await client.Threads.CreateAsync(body);
Console.WriteLine(result);
```

### tool

```csharp
// Fetch a web page
var body = new OpenAiDeepSeekWebFetchRequest
{
    Url = "https://example.com",
};
var result = await client.Tool.CreateFetchAsync(body);
Console.WriteLine(result);
```

### upload

```csharp
// Create upload
var body = new OpenAiUploadCreateRequest
{
    Bytes = 1,
    ExpiresAfter = new Dictionary<string, object>(),
    Filename = "name",
    MimeType = "mime-type",
    Purpose = "purpose",
};
var result = await client.Uploads.CreateAsync(body);
Console.WriteLine(result);
```

### vector_store

```csharp
// List vector stores
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.VectorStores.ListVectorStoreAsync(query);
Console.WriteLine(result);
```

### video

```csharp
// List videos
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.Video.ListAsync(query);
Console.WriteLine(result);
```

### videos_vidu

```csharp
// Vidu image to video
var body = new ViduImageToVideoRequest
{
    Audio = true,
    CallbackUrl = "callback-url",
    Duration = 3,
    Images = new List<object> { "images" },
    IsRec = true,
    MetaData = "meta-data",
    Model = "model",
    OffPeak = false,
    Payload = "payload",
    Prompt = "prompt",
    Resolution = "resolution",
    Seed = 12,
    Watermark = true,
    WmPosition = 14,
    WmUrl = "wm-url",
};
var result = await client.VideosVidu.CreateEntV2Img2videoAsync(body);
Console.WriteLine(result);
```

### images_vidu

```csharp
// Vidu reference to image
var body = new ViduReferenceToImageRequest
{
    AspectRatio = "aspect-ratio",
    Bgm = false,
    CallbackUrl = "callback-url",
    Images = new List<object> { "images" },
    Model = "model",
    OffPeak = false,
    Payload = "payload",
    Prompt = "prompt",
    Resolution = "resolution",
    Seed = 10,
};
var result = await client.ImagesVidu.CreateEntV2Reference2imageAsync(body);
Console.WriteLine(result);
```

### audio_vidu

```csharp
// Vidu text to audio
var body = new ViduTextToAudioRequest
{
    Bgm = true,
    CallbackUrl = "callback-url",
    Duration = 3,
    Model = "model",
    OffPeak = true,
    Payload = "payload",
    Prompt = "prompt",
    Seed = 8,
};
var result = await client.AudioVidu.CreateEntV2Text2audioAsync(body);
Console.WriteLine(result);
```

### audio_volcengine

```csharp
// Volcengine create speech
var body = new OpenAiSpeechCreateRequest
{
    Input = "input",
    Instructions = "instructions",
    Model = "model",
    ResponseFormat = "mp3",
    Speed = 5,
    StreamFormat = "sse",
    Voice = "voice",
};
var result = await client.AudioVolcengine.CreateApiV3AudioSpeechAsync(body);
Console.WriteLine(result);
```

### videos_volcengine

```csharp
// Volcengine Ark content generation task
var body = new VolcengineContentGenerationTaskCreateRequest
{
    CallbackUrl = "https://example.com",
    CameraFixed = false,
    Content = new List<object> { new VolcengineContentPart() },
    Draft = false,
    Duration = 5,
    ExecutionExpiresAfter = 6,
    Frames = 7,
    GenerateAudio = false,
    Model = "model",
    OmniReferenceTaskType = "auto",
    OutputFormat = "mp4",
    Priority = 12,
    Ratio = "16:9",
    Resolution = "480p",
    ReturnLastFrame = true,
    SafetyIdentifier = "safety-identifier",
    Seed = 17,
    ServiceTier = "default",
    Tools = new List<object> { new ArkWebSearchTool() },
    Watermark = false,
};
var result = await client.VideosVolcengine.CreateApiV3ContentsGenerationsTaskAsync(body);
Console.WriteLine(result);
```

### images_volcengine

```csharp
// Volcengine Ark image generation
var body = new VolcengineImageGenerationRequest
{
    Background = "transparent",
    Image = "image",
    LayerDecomposition = true,
    Model = "model",
    OptimizePromptOptions = new Dictionary<string, object>(),
    OutputFormat = "png",
    Prompt = "prompt",
    ResponseFormat = "url",
    SequentialImageGeneration = "auto",
    SequentialImageGenerationOptions = new Dictionary<string, object>(),
    Size = "size",
    Stream = false,
    Tools = new List<object> { new ArkWebSearchTool() },
    Watermark = false,
};
var result = await client.ImagesVolcengine.CreateApiV3ImagesGenerationAsync(body);
Console.WriteLine(result);
```

### images_xai

```csharp
// xAI Grok Imagine image edit
var body = new XaiImageEditRequest
{
    AspectRatio = "1:1",
    Deferred = false,
    Image = new Dictionary<string, object>(),
    Images = new List<object> { new XaiImageUrl() },
    Model = "model",
    N = 6,
    Output = new Dictionary<string, object>(),
    Prompt = "prompt",
    Resolution = "1k",
    ResponseFormat = "url",
    StorageOptions = new Dictionary<string, object>(),
    User = "user",
};
var result = await client.ImagesXai.CreateV1ImagesEditAsync(body);
Console.WriteLine(result);
```

### videos_xai

```csharp
// xAI Grok Imagine video edit
var body = new XaiVideoEditRequest
{
    Model = "model",
    Output = new Dictionary<string, object>(),
    Prompt = "prompt",
    StorageOptions = new Dictionary<string, object>(),
    User = "user",
    Video = new Dictionary<string, object>(),
};
var result = await client.VideosXai.CreateV1VideosEditAsync(body);
Console.WriteLine(result);
```

### videos_zhipu

```csharp
// Zhipu retrieve video generation task
var taskId = "1";
var result = await client.VideosZhipu.ListApiPaasV4AsyncResultAsync(taskId);
Console.WriteLine(result);
```

### images_zhipu

```csharp
// Zhipu CogView image generation
var body = new ZhipuImageGenerationRequest
{
    Model = "glm-image",
    Prompt = "prompt",
    Quality = "hd",
    Size = "size",
    UserId = "1",
    WatermarkEnabled = false,
};
var result = await client.ImagesZhipu.CreateApiPaasV4ImagesGenerationAsync(body);
Console.WriteLine(result);
```

## Error Handling

```csharp
try
{
    await client.Models.ListAsync();
}
catch (HttpRequestException ex)
{
    Console.WriteLine($"Error: {ex.Message}");
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

> Set `NUGET_API_KEY` for release (or `NUGET_TEST_API_KEY` for test channel).

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
