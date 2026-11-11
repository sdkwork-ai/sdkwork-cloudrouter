# cloudrouter-open-sdk (Java)

SDKWork Cloud Router OpenAI-compatible gateway SDK java generated transport SDK

## Installation

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>com.sdkwork.cloudrouter</groupId>
    <artifactId>cloudrouter-open-sdk</artifactId>
    <version>0.1.0</version>
</dependency>
```

Or with Gradle:

```groovy
implementation 'com.sdkwork.cloudrouter:cloudrouter-open-sdk:0.1.0'
```

## Quick Start

```java
import com.sdkwork.cloudrouter.open.SdkworkAiClient;
import com.sdkwork.common.core.Types;
import com.sdkwork.cloudrouter.open.model.*;

public class Main {
    public static void main(String[] args) throws Exception {
        Types.SdkConfig config = new Types.SdkConfig("https://api.sdkwork.com");
        SdkworkAiClient client = new SdkworkAiClient(config);
        client.setApiKey("your-api-key");

        // Use the SDK
        OpenAiModelList result = client.getModels().list();
        System.out.println(result);
    }
}
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```java
Types.SdkConfig config = new Types.SdkConfig("https://api.sdkwork.com");
SdkworkAiClient client = new SdkworkAiClient(config);
client.setApiKey("your-api-key");
// Sends: Authorization: Bearer <apiKey>
```

### Mode B: Dual Token

```java
Types.SdkConfig config = new Types.SdkConfig("https://api.sdkwork.com");
SdkworkAiClient client = new SdkworkAiClient(config);
client.setAuthToken("your-auth-token");
client.setAccessToken("your-access-token");
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `setApiKey(...)` together with `setAuthToken(...)` + `setAccessToken(...)` on the same client.

## Configuration (Non-Auth)

```java
Types.SdkConfig config = new Types.SdkConfig("https://api.sdkwork.com");
SdkworkAiClient client = new SdkworkAiClient(config);

// Set custom headers
client.getHttpClient().setHeader("X-Custom-Header", "value");
```

## API Modules

- `client.getImagesAlibaba()` - images_alibaba API
- `client.getVideosAlibaba()` - videos_alibaba API
- `client.getAudioAlibaba()` - audio_alibaba API
- `client.getFilesAnthropic()` - files_anthropic API
- `client.getChatAnthropic()` - chat_anthropic API
- `client.getBatchesAnthropic()` - batches_anthropic API
- `client.getVideosBlackForestLabs()` - videos_black_forest_labs API
- `client.getImagesBlackForestLabs()` - images_black_forest_labs API
- `client.getVideosBytedance()` - videos_bytedance API
- `client.getImagesBytedance()` - images_bytedance API
- `client.getAudioBytedance()` - audio_bytedance API
- `client.getMusicElevenlabs()` - music_elevenlabs API
- `client.getAudioElevenlabs()` - audio_elevenlabs API
- `client.getResponsesGoogle()` - responses_google API
- `client.getFilesGoogle()` - files_google API
- `client.getVideosGoogle()` - videos_google API
- `client.getEmbeddingsGoogle()` - embeddings_google API
- `client.getChatGoogle()` - chat_google API
- `client.getImagesGoogle()` - images_google API
- `client.getVideosJimeng()` - videos_jimeng API
- `client.getAudioKling()` - audio_kling API
- `client.getImagesKling()` - images_kling API
- `client.getVideosKling()` - videos_kling API
- `client.getVideosLumaAi()` - videos_luma_ai API
- `client.getVideosMinimax()` - videos_minimax API
- `client.getImagesMinimax()` - images_minimax API
- `client.getMusicMinimax()` - music_minimax API
- `client.getAudioMinimax()` - audio_minimax API
- `client.getMusicMureka()` - music_mureka API
- `client.getVideosPixverse()` - videos_pixverse API
- `client.getVideosRunway()` - videos_runway API
- `client.getImagesRunway()` - images_runway API
- `client.getAudioStabilityAi()` - audio_stability_ai API
- `client.getImagesStabilityAi()` - images_stability_ai API
- `client.getMusicSuno()` - music_suno API
- `client.getChatTypesafe()` - chat_typesafe API
- `client.getAssistants()` - assistant API
- `client.getAudio()` - audio API
- `client.getBatches()` - batch API
- `client.getChat()` - chat API
- `client.getCompletion()` - completion API
- `client.getContainer()` - container API
- `client.getConversation()` - conversation API
- `client.getEmbeddings()` - embedding API
- `client.getFiles()` - file API
- `client.getImages()` - image API
- `client.getModels()` - model API
- `client.getModerations()` - moderation API
- `client.getRealtime()` - realtime API
- `client.getResponses()` - response API
- `client.getThreads()` - thread API
- `client.getTool()` - tool API
- `client.getUploads()` - upload API
- `client.getVectorStores()` - vector_store API
- `client.getVideo()` - video API
- `client.getVideosVidu()` - videos_vidu API
- `client.getImagesVidu()` - images_vidu API
- `client.getAudioVidu()` - audio_vidu API
- `client.getAudioVolcengine()` - audio_volcengine API
- `client.getVideosVolcengine()` - videos_volcengine API
- `client.getImagesVolcengine()` - images_volcengine API
- `client.getImagesXai()` - images_xai API
- `client.getVideosXai()` - videos_xai API
- `client.getVideosZhipu()` - videos_zhipu API
- `client.getImagesZhipu()` - images_zhipu API

## Usage Examples

### images_alibaba

```java
// Alibaba Wanx image generation
AlibabaImageGenerationRequest body = new AlibabaImageGenerationRequest();
body.setInput(new LinkedHashMap<>());
body.setModel("model");
body.setParameters(new LinkedHashMap<>());
String xDashScopeAsync = "enable";
AlibabaImageGenerationResponse result = client.getImagesAlibaba().createApiV1ServicesAigcText2imageImageSynthesi(body, xDashScopeAsync);
System.out.println(result);
```

### videos_alibaba

```java
// Alibaba Wan retrieve video generation task
String taskId = "1";
AlibabaVideoGenerationTask result = client.getVideosAlibaba().listApiV1Tasks(taskId);
System.out.println(result);
```

### audio_alibaba

```java
// Alibaba Qwen TTS speech synthesis
AlibabaSpeechRequest body = new AlibabaSpeechRequest();
body.setInput(new LinkedHashMap<>());
body.setModel("model");
body.setParameters(new LinkedHashMap<>());
AlibabaSpeechResponse result = client.getAudioAlibaba().createApiV1ServicesAudioTtsSpeechSynthesizer(body);
System.out.println(result);
```

### files_anthropic

```java
// Anthropic list files
Map<String, Object> params = new LinkedHashMap<>();
params.put("before_id", "1");
params.put("after_id", "1");
params.put("limit", 3);
String anthropicVersion = "anthropic-version";
AnthropicFileListResponse result = client.getFilesAnthropic().getListV1Files(params, anthropicVersion);
System.out.println(result);
```

### chat_anthropic

```java
// Anthropic Claude message
AnthropicMessageCreateRequest body = new AnthropicMessageCreateRequest();
body.setCacheControl(new LinkedHashMap<>());
body.setContainer(new LinkedHashMap<>());
body.setDiagnostics(new LinkedHashMap<>());
body.setInferenceGeo("inference-geo");
body.setMaxTokens(5);
body.setMessages(new ArrayList<>(java.util.List.of(new AnthropicMessageParam())));
body.setMetadata(new LinkedHashMap<>());
body.setModel("model");
body.setOutputConfig(new LinkedHashMap<>());
body.setServiceTier("auto");
body.setSpeed("standard");
body.setStopSequences(new ArrayList<>(java.util.List.of("stop-sequences")));
body.setStream(true);
body.setSystem("system");
body.setTemperature(15);
body.setThinking(new LinkedHashMap<>());
body.setToolChoice(new LinkedHashMap<>());
body.setTools(new ArrayList<>(java.util.List.of(new LinkedHashMap<>())));
body.setTopK(19);
body.setTopP(20);
String anthropicVersion = "anthropic-version";
AnthropicMessage result = client.getChatAnthropic().createV1Message(body, anthropicVersion);
System.out.println(result);
```

### batches_anthropic

```java
// Anthropic list message batches
Map<String, Object> params = new LinkedHashMap<>();
params.put("before_id", "1");
params.put("after_id", "1");
params.put("limit", 3);
String anthropicVersion = "anthropic-version";
AnthropicMessageBatchListResponse result = client.getBatchesAnthropic().getListV1MessagesBatches(params, anthropicVersion);
System.out.println(result);
```

### videos_black_forest_labs

```java
// Black Forest Labs FLUX 3 video generation
BlackForestLabsVideoGenerationRequest body = new BlackForestLabsVideoGenerationRequest();
body.setAspectRatio("21:9");
body.setDraft(false);
body.setDraftCache("draft-cache");
body.setDuration(4);
body.setGenerateAudio(true);
body.setKeyframes("keyframes");
body.setMode("t2v");
body.setPrompt("prompt");
body.setResolution("hd");
body.setSafetyTolerance(10);
body.setStartVideo("start-video");
body.setUser("user");
body.setVersion("version");
BlackForestLabsVideoGenerationTask result = client.getVideosBlackForestLabs().createFlux3Video(body);
System.out.println(result);
```

### images_black_forest_labs

```java
// Black Forest Labs retrieve generation result
Map<String, Object> params = new LinkedHashMap<>();
params.put("id", "1");
BlackForestLabsImageGenerationTask result = client.getImagesBlackForestLabs().listGetResult(params);
System.out.println(result);
```

### videos_bytedance

```java
// ByteDance Seedance video generation
BytedanceVideoGenerationRequest body = new BytedanceVideoGenerationRequest();
body.setCallbackUrl("https://example.com");
body.setCameraFixed(false);
body.setContent(new ArrayList<>(java.util.List.of(new ArkContentPart())));
body.setDraft(false);
body.setDuration(5);
body.setExecutionExpiresAfter(6);
body.setFrames(7);
body.setGenerateAudio(false);
body.setModel("model");
body.setOmniReferenceTaskType("auto");
body.setOutputFormat("mp4");
body.setPriority(12);
body.setRatio("16:9");
body.setResolution("480p");
body.setReturnLastFrame(true);
body.setSafetyIdentifier("safety-identifier");
body.setSeed(17);
body.setServiceTier("default");
body.setTools(new ArrayList<>(java.util.List.of(new ArkWebSearchTool())));
body.setWatermark(false);
BytedanceVideoGenerationTask result = client.getVideosBytedance().createApiV3ContentsGenerationsTask(body);
System.out.println(result);
```

### images_bytedance

```java
// ByteDance Seedream image generation
BytedanceImageGenerationRequest body = new BytedanceImageGenerationRequest();
body.setBackground("transparent");
body.setImage("image");
body.setLayerDecomposition(true);
body.setModel("model");
body.setOptimizePromptOptions(new LinkedHashMap<>());
body.setOutputFormat("png");
body.setPrompt("prompt");
body.setResponseFormat("url");
body.setSequentialImageGeneration("auto");
body.setSequentialImageGenerationOptions(new LinkedHashMap<>());
body.setSize("size");
body.setStream(false);
body.setTools(new ArrayList<>(java.util.List.of(new ArkWebSearchTool())));
body.setWatermark(false);
BytedanceImageGenerationResponse result = client.getImagesBytedance().createApiV3ImagesGeneration(body);
System.out.println(result);
```

### audio_bytedance

```java
// ByteDance Seed TTS speech synthesis
BytedanceSpeechRequest body = new BytedanceSpeechRequest();
body.setReqParams(new LinkedHashMap<>());
String xApiResourceId = "seed-tts-2.0";
String xApiRequestId = "X-Api-Request-Id";
BytedanceSpeechChunk result = client.getAudioBytedance().createApiV3TtsUnidirectional(body, xApiResourceId, xApiRequestId);
System.out.println(result);
```

### music_elevenlabs

```java
// ElevenLabs music generation
ElevenLabsMusicGenerationRequest body = new ElevenLabsMusicGenerationRequest();
body.setCompositionPlan(new LinkedHashMap<>());
body.setFinetuneId("1");
body.setFinetuneStrength(3);
body.setForceInstrumental(false);
body.setGenerationMode("track");
body.setLyricsText("lyrics-text");
body.setModelId("music_v1");
body.setMusicLengthMs(8);
body.setMusicPrompt(new LinkedHashMap<>());
body.setPrompt("prompt");
body.setRespectSectionsDurations(true);
body.setSeed(12);
body.setSignWithC2pa(true);
body.setStoreForInpainting(false);
body.setUsePhoneticNames(true);
Map<String, Object> params = new LinkedHashMap<>();
params.put("output_format", "output-format");
byte[] result = client.getMusicElevenlabs().createV1Music(body, params);
System.out.println(result);
```

### audio_elevenlabs

```java
// Generate sound effect
ElevenLabsSoundGenerationRequest body = new ElevenLabsSoundGenerationRequest();
body.setDurationSeconds(1);
body.setLoop(false);
body.setModelId("eleven_text_to_sound_v2");
body.setPromptInfluence(4);
body.setText("text");
Map<String, Object> params = new LinkedHashMap<>();
params.put("output_format", "output-format");
ElevenLabsSoundGenerationResponse result = client.getAudioElevenlabs().createV1SoundGeneration(body, params);
System.out.println(result);
```

### responses_google

```java
// Google Gemini list cached contents
Map<String, Object> params = new LinkedHashMap<>();
params.put("pageSize", 1);
params.put("pageToken", "token");
GoogleCachedContentListResponse result = client.getResponsesGoogle().getListV1betaCachedContents(params);
System.out.println(result);
```

### files_google

```java
// Google Gemini list files
Map<String, Object> params = new LinkedHashMap<>();
params.put("pageSize", 1);
params.put("pageToken", "token");
GoogleFileListResponse result = client.getFilesGoogle().getListV1betaFiles(params);
System.out.println(result);
```

### videos_google

```java
// Google Gemini retrieve video operation (Veo)
String model = "model";
String operationId = "1";
GeminiVideoOperation result = client.getVideosGoogle().listV1betaModelsOperations(model, operationId);
System.out.println(result);
```

### embeddings_google

```java
// Google Gemini batch embed contents
String model = "model";
GoogleBatchEmbedContentsRequest body = new GoogleBatchEmbedContentsRequest();
body.setRequests(new ArrayList<>(java.util.List.of(new GoogleEmbedContentRequest())));
GoogleBatchEmbedContentsResponse result = client.getEmbeddingsGoogle().createV1betaModelsModelBatchEmbedContent(model, body);
System.out.println(result);
```

### chat_google

```java
// Google Gemini count tokens
String model = "model";
GoogleCountTokensRequest body = new GoogleCountTokensRequest();
body.setContents(new ArrayList<>(java.util.List.of(new GoogleContent())));
body.setGenerateContentRequest(new LinkedHashMap<>());
GoogleCountTokensResponse result = client.getChatGoogle().createV1betaModelsModelCountToken(model, body);
System.out.println(result);
```

### images_google

```java
// Google Gemini image generation
String model = "model";
GeminiImageGenerationRequest body = new GeminiImageGenerationRequest();
body.setInstances(new ArrayList<>(java.util.List.of(new LinkedHashMap<>())));
body.setParameters(new LinkedHashMap<>());
GeminiImageGenerationResponse result = client.getImagesGoogle().createV1betaModelsModelGenerateImage(model, body);
System.out.println(result);
```

### videos_jimeng

```java
// Jimeng retrieve video generation task
String taskId = "1";
JimengVideoGenerationTask result = client.getVideosJimeng().listV1Tasks(taskId);
System.out.println(result);
```

### audio_kling

```java
// Kling text to audio
KlingSoundGenerationRequest body = new KlingSoundGenerationRequest();
body.setCallbackUrl("callback-url");
body.setDuration(2);
body.setExternalTaskId("1");
body.setPrompt("prompt");
KlingAudioTask result = client.getAudioKling().createV1AudioTextToAudio(body);
System.out.println(result);
```

### images_kling

```java
// Kling image generation
KlingImageGenerationRequest body = new KlingImageGenerationRequest();
body.setAspectRatio("16:9");
body.setCallbackUrl("callback-url");
body.setElementList(new ArrayList<>(java.util.List.of(new KlingElementReference())));
body.setExternalTaskId("1");
body.setHumanFidelity(5);
body.setImage("image");
body.setImageFidelity(7);
body.setImageReference("subject");
body.setModelName("kling-v2-1");
body.setN(10);
body.setNegativePrompt("negative-prompt");
body.setPrompt("prompt");
body.setResolution("1k");
body.setWatermarkInfo(new LinkedHashMap<>());
KlingImageGenerationTask result = client.getImagesKling().createV1ImagesGeneration(body);
System.out.println(result);
```

### videos_kling

```java
// Kling create avatar video
KlingAvatarCreateRequest body = new KlingAvatarCreateRequest();
body.setAudioUrl("audio-url");
body.setCallbackUrl("callback-url");
body.setHumanImage("human-image");
body.setModelName("name");
body.setPrompt("prompt");
body.setText("text");
body.setVoiceId("1");
body.setVoiceLanguage("voice-language");
body.setVoiceMode("voice-mode");
KlingVideoGenerationTask result = client.getVideosKling().createV1VideosAvatar(body);
System.out.println(result);
```

### videos_luma_ai

```java
// Luma Dream Machine video generation
LumaVideoGenerationRequest body = new LumaVideoGenerationRequest();
body.setAspectRatio("1:1");
body.setCallbackUrl("https://example.com");
body.setConcepts(new ArrayList<>(java.util.List.of(new LumaConcept())));
body.setDuration("duration");
body.setGenerationType("video");
body.setKeyframes(new LinkedHashMap<>());
body.setLoop(true);
body.setModel("ray-2");
body.setPrompt("prompt");
body.setResolution("resolution");
LumaVideoGenerationTask result = client.getVideosLumaAi().createGeneration(body);
System.out.println(result);
```

### videos_minimax

```java
// MiniMax retrieve video file
Map<String, Object> params = new LinkedHashMap<>();
params.put("file_id", "1");
MinimaxFileRetrieveResponse result = client.getVideosMinimax().listV1FilesRetrieve(params);
System.out.println(result);
```

### images_minimax

```java
// MiniMax image generation
MinimaxImageGenerationRequest body = new MinimaxImageGenerationRequest();
body.setAspectRatio("1:1");
body.setHeight(2);
body.setModel("image-01");
body.setN(4);
body.setPrompt("prompt");
body.setPromptOptimizer(false);
body.setResponseFormat("url");
body.setSeed(8);
body.setSubjectReference(new ArrayList<>(java.util.List.of(new LinkedHashMap<>())));
body.setWidth(10);
MinimaxImageGenerationResponse result = client.getImagesMinimax().createV1ImageGeneration(body);
System.out.println(result);
```

### music_minimax

```java
// Minimax create music generation
MiniMaxMusicGenerationRequest body = new MiniMaxMusicGenerationRequest();
body.setAudioBase64("audio-base64");
body.setAudioSetting(new LinkedHashMap<>());
body.setAudioUrl("audio-url");
body.setCoverFeatureId("1");
body.setIsInstrumental(true);
body.setLyrics("lyrics");
body.setLyricsOptimizer(true);
body.setModel("music-3.0");
body.setOutputFormat("url");
body.setPrompt("prompt");
body.setStream(true);
MiniMaxMusicGenerationResponse result = client.getMusicMinimax().createV1MusicGeneration(body);
System.out.println(result);
```

### audio_minimax

```java
// MiniMax speech synthesis
MinimaxTextToSpeechRequest body = new MinimaxTextToSpeechRequest();
body.setAudioSetting(new LinkedHashMap<>());
body.setLanguageBoost("language-boost");
body.setModel("speech-2.8-hd");
body.setOutputFormat("url");
body.setPronunciationDict(new LinkedHashMap<>());
body.setStream(false);
body.setStreamOptions(new LinkedHashMap<>());
body.setSubtitleEnable(false);
body.setSubtitleType("sentence");
body.setText("text");
body.setTextNormalizationMode("basic");
body.setTimbreWeights(new ArrayList<>(java.util.List.of(new MinimaxTimbreWeight())));
body.setVoiceModify(new LinkedHashMap<>());
body.setVoiceSetting(new LinkedHashMap<>());
MinimaxTextToSpeechResponse result = client.getAudioMinimax().createV1T2aV(body);
System.out.println(result);
```

### music_mureka

```java
// Mureka song generation
MurekaMusicGenerationRequest body = new MurekaMusicGenerationRequest();
body.setCallbackUrl("callback-url");
body.setDuration(2);
body.setLyrics("lyrics");
body.setModel("model");
body.setPrompt("prompt");
body.setReferenceAudioUrl("reference-audio-url");
body.setTags(new ArrayList<>(java.util.List.of("tags")));
body.setTitle("title");
MurekaMusicGenerationTask result = client.getMusicMureka().createV1SongGenerate(body);
System.out.println(result);
```

### videos_pixverse

```java
// PixVerse retrieve video generation
String videoId = "1";
String aiTraceId = "Ai-trace-id";
PixverseVideoGenerationTask result = client.getVideosPixverse().listOpenapiV2VideoResult(videoId, aiTraceId);
System.out.println(result);
```

### videos_runway

```java
// Runway image to video
RunwayImageToVideoRequest body = new RunwayImageToVideoRequest();
body.setAudio(true);
body.setBitrate("standard");
body.setCfgScale(3);
body.setContentModeration(new LinkedHashMap<>());
body.setDraft(true);
body.setDuration(6);
body.setModel("model");
body.setNegativePrompt("negativeprompt");
body.setOutputFormat("mp4");
body.setPromptExpansionMode("disabled");
body.setPromptImage("promptimage");
body.setPromptText("prompttext");
body.setProresProfile("422");
body.setProviderSettings(new LinkedHashMap<>());
body.setRatio("ratio");
body.setReferenceAudio(new ArrayList<>(java.util.List.of(new LinkedHashMap<>())));
body.setReferenceVideos(new ArrayList<>(java.util.List.of(new LinkedHashMap<>())));
body.setReferences(new ArrayList<>(java.util.List.of(new LinkedHashMap<>())));
body.setResolution("480p");
body.setSeed(20);
String xRunwayVersion = "2024-11-06";
RunwayTaskAccepted result = client.getVideosRunway().createV1ImageToVideo(body, xRunwayVersion);
System.out.println(result);
```

### images_runway

```java
// Runway retrieve task
String taskId = "1";
String xRunwayVersion = "2024-11-06";
RunwayTask result = client.getImagesRunway().listV1Tasks(taskId, xRunwayVersion);
System.out.println(result);
```

### audio_stability_ai

```java
// Stability AI text-to-audio (music and sound effects)
StabilityAudioRequest body = new StabilityAudioRequest();
body.setCfgScale(1);
body.setDuration(2);
body.setModel("stable-audio-2");
body.setOutputFormat("mp3");
body.setPrompt("prompt");
body.setSeed(6);
body.setSteps(7);
byte[] result = client.getAudioStabilityAi().createTextToAudio(body);
System.out.println(result);
```

### images_stability_ai

```java
// Stability AI image generation
String mode = "mode";
StabilityImageGenerationRequest body = new StabilityImageGenerationRequest();
body.setAspectRatio("21:9");
body.setCfgScale(2);
body.setImage("image");
body.setMode("text-to-image");
body.setModel("sd3.5-large");
body.setNegativePrompt("negative-prompt");
body.setOutputFormat("png");
body.setPrompt("prompt");
body.setSeed(9);
body.setStrength(10);
body.setStylePreset("style-preset");
String accept = "application/json";
StabilityImageGenerationResponse result = client.getImagesStabilityAi().createGenerate(mode, body, accept);
System.out.println(result);
```

### music_suno

```java
// Suno music generation
SunoMusicGenerationRequest body = new SunoMusicGenerationRequest();
body.setCallbackUrl("callback-url");
body.setDuration(2);
body.setModel("model");
body.setNegativeTags("negative-tags");
body.setPrompt("prompt");
body.setTags("tags");
body.setTitle("title");
SunoMusicGenerationResponse result = client.getMusicSuno().createV1MusicGeneration(body);
System.out.println(result);
```

### chat_typesafe

```java
// TypeSafe AI System One decision
TypeSafeSystemOneRequest body = new TypeSafeSystemOneRequest();
body.setModel("model");
body.setQuestions(new LinkedHashMap<>());
body.setState("state");
TypeSafeSystemOneResponse result = client.getChatTypesafe().createV1Systemone(body);
System.out.println(result);
```

### assistant

```java
// List assistants
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiAssistantList result = client.getAssistants().list(params);
System.out.println(result);
```

### audio

```java
// List voice consents
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiVoiceConsentList result = client.getAudio().getListVoiceConsents(params);
System.out.println(result);
```

### batch

```java
// List batches
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiBatchList result = client.getBatches().list(params);
System.out.println(result);
```

### chat

```java
// List stored chat completions
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
params.put("model", "model");
params.put("metadata", "metadata");
OpenAiChatCompletionList result = client.getChat().list(params);
System.out.println(result);
```

### completion

```java
// Create completion
OpenAiCompletionCreateRequest body = new OpenAiCompletionCreateRequest();
body.setBestOf(1);
body.setEcho(false);
body.setFrequencyPenalty(3);
body.setLogitBias(new LinkedHashMap<>());
body.setLogprobs(5);
body.setMaxTokens(6);
body.setModel("model");
body.setN(8);
body.setPresencePenalty(9);
body.setPrompt("prompt");
body.setSeed(11);
body.setStop("stop");
body.setStream(true);
body.setStreamOptions(new LinkedHashMap<>());
body.setSuffix("suffix");
body.setTemperature(16);
body.setTopP(17);
body.setUser("user");
OpenAiCompletion result = client.getCompletion().create(body);
System.out.println(result);
```

### container

```java
// List containers
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiContainerList result = client.getContainer().list(params);
System.out.println(result);
```

### conversation

```java
// List conversations
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiConversationList result = client.getConversation().list(params);
System.out.println(result);
```

### embedding

```java
// Create embeddings
OpenAiEmbeddingsRequest body = new OpenAiEmbeddingsRequest();
body.setDimensions(1);
body.setEncodingFormat("float");
body.setInput("input");
body.setModel("model");
body.setUser("user");
OpenAiEmbeddingList result = client.getEmbeddings().create(body);
System.out.println(result);
```

### file

```java
// List files
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiFileList result = client.getFiles().list(params);
System.out.println(result);
```

### image

```java
// Create image edit
OpenAiImageEditRequest body = new OpenAiImageEditRequest();
body.setBackground("transparent");
body.setComplexity("low");
body.setFrameCount(3);
body.setFrameDurationMs(4);
body.setImages(new ArrayList<>(java.util.List.of(new OpenAiImageReferenceInput())));
body.setInputFidelity("high");
body.setMarkup(new LinkedHashMap<>());
body.setMask(new LinkedHashMap<>());
body.setModel("model");
body.setModeration("low");
body.setN(11);
body.setOutputCompression(12);
body.setOutputFormat("png");
body.setPartialImages(14);
body.setPrompt("prompt");
body.setQuality("low");
body.setSafetyIdentifier("safety-identifier");
body.setSize("size");
body.setStream(true);
body.setSvg(new LinkedHashMap<>());
body.setUser("user");
OpenAiImageList result = client.getImages().createEdit(body);
System.out.println(result);
```

### model

```java
// List models
OpenAiModelList result = client.getModels().list();
System.out.println(result);
```

### moderation

```java
// Create moderation
OpenAiModerationCreateRequest body = new OpenAiModerationCreateRequest();
body.setInput("input");
body.setModel("model");
OpenAiModeration result = client.getModerations().create(body);
System.out.println(result);
```

### realtime

```java
// Create realtime call
OpenAiRealtimeCallCreateRequest body = new OpenAiRealtimeCallCreateRequest();
body.setMetadata(new LinkedHashMap<>());
body.setSdp("sdp");
body.setSession("session");
String result = client.getRealtime().createCall(body);
System.out.println(result);
```

### response

```java
// Create response
OpenAiResponsesRequest body = new OpenAiResponsesRequest();
body.setBackground(true);
body.setConversation("conversation");
body.setInclude(new ArrayList<>(java.util.List.of("include")));
body.setInput("input");
body.setInstructions("instructions");
body.setMaxOutputTokens(6);
body.setMaxToolCalls(7);
body.setMetadata(new LinkedHashMap<>());
body.setModel("model");
body.setParallelToolCalls(false);
body.setPreviousResponseId("1");
body.setPrompt(new LinkedHashMap<>());
body.setPromptCacheKey("prompt-cache-key");
body.setReasoning(new LinkedHashMap<>());
body.setServiceTier("auto");
body.setStore(false);
body.setStream(true);
body.setTemperature(18);
body.setText(new LinkedHashMap<>());
body.setToolChoice("tool-choice");
body.setTools(new ArrayList<>(java.util.List.of(new OpenAiTool())));
body.setTopLogprobs(22);
body.setTopP(23);
body.setTruncation("auto");
body.setUser("user");
OpenAiResponse result = client.getResponses().create(body);
System.out.println(result);
```

### thread

```java
// Create thread
OpenAiThreadCreateRequest body = new OpenAiThreadCreateRequest();
body.setMessages(new ArrayList<>(java.util.List.of(new OpenAiThreadMessageCreateRequest())));
body.setMetadata(new LinkedHashMap<>());
body.setToolResources("tool-resources");
OpenAiThread result = client.getThreads().create(body);
System.out.println(result);
```

### tool

```java
// Fetch a web page
OpenAiDeepSeekWebFetchRequest body = new OpenAiDeepSeekWebFetchRequest();
body.setUrl("https://example.com");
OpenAiDeepSeekWebFetchResponse result = client.getTool().createFetch(body);
System.out.println(result);
```

### upload

```java
// Create upload
OpenAiUploadCreateRequest body = new OpenAiUploadCreateRequest();
body.setBytes(1);
body.setExpiresAfter(new LinkedHashMap<>());
body.setFilename("name");
body.setMimeType("mime-type");
body.setPurpose("purpose");
OpenAiUpload result = client.getUploads().create(body);
System.out.println(result);
```

### vector_store

```java
// List vector stores
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiVectorStoreList result = client.getVectorStores().listVectorStore(params);
System.out.println(result);
```

### video

```java
// List videos
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiVideoList result = client.getVideo().list(params);
System.out.println(result);
```

### videos_vidu

```java
// Vidu image to video
ViduImageToVideoRequest body = new ViduImageToVideoRequest();
body.setAudio(true);
body.setCallbackUrl("callback-url");
body.setDuration(3);
body.setImages(new ArrayList<>(java.util.List.of("images")));
body.setIsRec(true);
body.setMetaData("meta-data");
body.setModel("model");
body.setOffPeak(false);
body.setPayload("payload");
body.setPrompt("prompt");
body.setResolution("resolution");
body.setSeed(12);
body.setWatermark(true);
body.setWmPosition(14);
body.setWmUrl("wm-url");
ViduVideoGenerationTask result = client.getVideosVidu().createEntV2Img2video(body);
System.out.println(result);
```

### images_vidu

```java
// Vidu reference to image
ViduReferenceToImageRequest body = new ViduReferenceToImageRequest();
body.setAspectRatio("aspect-ratio");
body.setBgm(false);
body.setCallbackUrl("callback-url");
body.setImages(new ArrayList<>(java.util.List.of("images")));
body.setModel("model");
body.setOffPeak(false);
body.setPayload("payload");
body.setPrompt("prompt");
body.setResolution("resolution");
body.setSeed(10);
ViduImageGenerationTask result = client.getImagesVidu().createEntV2Reference2image(body);
System.out.println(result);
```

### audio_vidu

```java
// Vidu text to audio
ViduTextToAudioRequest body = new ViduTextToAudioRequest();
body.setBgm(true);
body.setCallbackUrl("callback-url");
body.setDuration(3);
body.setModel("model");
body.setOffPeak(true);
body.setPayload("payload");
body.setPrompt("prompt");
body.setSeed(8);
ViduAudioGenerationTask result = client.getAudioVidu().createEntV2Text2audio(body);
System.out.println(result);
```

### audio_volcengine

```java
// Volcengine create speech
OpenAiSpeechCreateRequest body = new OpenAiSpeechCreateRequest();
body.setInput("input");
body.setInstructions("instructions");
body.setModel("model");
body.setResponseFormat("mp3");
body.setSpeed(5);
body.setStreamFormat("sse");
body.setVoice("voice");
byte[] result = client.getAudioVolcengine().createApiV3AudioSpeech(body);
System.out.println(result);
```

### videos_volcengine

```java
// Volcengine Ark content generation task
VolcengineContentGenerationTaskCreateRequest body = new VolcengineContentGenerationTaskCreateRequest();
body.setCallbackUrl("https://example.com");
body.setCameraFixed(false);
body.setContent(new ArrayList<>(java.util.List.of(new VolcengineContentPart())));
body.setDraft(false);
body.setDuration(5);
body.setExecutionExpiresAfter(6);
body.setFrames(7);
body.setGenerateAudio(false);
body.setModel("model");
body.setOmniReferenceTaskType("auto");
body.setOutputFormat("mp4");
body.setPriority(12);
body.setRatio("16:9");
body.setResolution("480p");
body.setReturnLastFrame(true);
body.setSafetyIdentifier("safety-identifier");
body.setSeed(17);
body.setServiceTier("default");
body.setTools(new ArrayList<>(java.util.List.of(new ArkWebSearchTool())));
body.setWatermark(false);
VolcengineContentGenerationTaskCreateResponse result = client.getVideosVolcengine().createApiV3ContentsGenerationsTask(body);
System.out.println(result);
```

### images_volcengine

```java
// Volcengine Ark image generation
VolcengineImageGenerationRequest body = new VolcengineImageGenerationRequest();
body.setBackground("transparent");
body.setImage("image");
body.setLayerDecomposition(true);
body.setModel("model");
body.setOptimizePromptOptions(new LinkedHashMap<>());
body.setOutputFormat("png");
body.setPrompt("prompt");
body.setResponseFormat("url");
body.setSequentialImageGeneration("auto");
body.setSequentialImageGenerationOptions(new LinkedHashMap<>());
body.setSize("size");
body.setStream(false);
body.setTools(new ArrayList<>(java.util.List.of(new ArkWebSearchTool())));
body.setWatermark(false);
VolcengineImageGenerationResponse result = client.getImagesVolcengine().createApiV3ImagesGeneration(body);
System.out.println(result);
```

### images_xai

```java
// xAI Grok Imagine image edit
XaiImageEditRequest body = new XaiImageEditRequest();
body.setAspectRatio("1:1");
body.setDeferred(false);
body.setImage(new LinkedHashMap<>());
body.setImages(new ArrayList<>(java.util.List.of(new XaiImageUrl())));
body.setModel("model");
body.setN(6);
body.setOutput(new LinkedHashMap<>());
body.setPrompt("prompt");
body.setResolution("1k");
body.setResponseFormat("url");
body.setStorageOptions(new LinkedHashMap<>());
body.setUser("user");
XaiImageGenerationResponse result = client.getImagesXai().createV1ImagesEdit(body);
System.out.println(result);
```

### videos_xai

```java
// xAI Grok Imagine video edit
XaiVideoEditRequest body = new XaiVideoEditRequest();
body.setModel("model");
body.setOutput(new LinkedHashMap<>());
body.setPrompt("prompt");
body.setStorageOptions(new LinkedHashMap<>());
body.setUser("user");
body.setVideo(new LinkedHashMap<>());
XaiVideoStartResponse result = client.getVideosXai().createV1VideosEdit(body);
System.out.println(result);
```

### videos_zhipu

```java
// Zhipu retrieve video generation task
String taskId = "1";
ZhipuVideoGenerationTask result = client.getVideosZhipu().listApiPaasV4AsyncResult(taskId);
System.out.println(result);
```

### images_zhipu

```java
// Zhipu CogView image generation
ZhipuImageGenerationRequest body = new ZhipuImageGenerationRequest();
body.setModel("glm-image");
body.setPrompt("prompt");
body.setQuality("hd");
body.setSize("size");
body.setUserId("1");
body.setWatermarkEnabled(false);
ZhipuImageGenerationResponse result = client.getImagesZhipu().createApiPaasV4ImagesGeneration(body);
System.out.println(result);
```

## Error Handling

```java
try {
    OpenAiModelList result = client.getModels().list();
    System.out.println(result);
} catch (Exception e) {
    System.err.println("Error: " + e.getMessage());
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

> Use Maven `settings.xml` credentials and optional `MAVEN_PUBLISH_PROFILE`.

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
