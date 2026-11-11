# cloudrouter-open-sdk (Flutter)

SDKWork Cloud Router OpenAI-compatible gateway SDK flutter generated transport SDK

## Installation

Add to `pubspec.yaml`:

```yaml
dependencies:
  cloudrouter_open_sdk: ^0.1.0
```

## Quick Start

```dart
import 'package:cloudrouter_open_sdk/cloudrouter_open_sdk.dart';

final client = SdkworkAiClient.withBaseUrl(baseUrl: 'https://api.sdkwork.com');
client.setApiKey('your-api-key');

// Use the SDK
final result = await client.models.list();
print(result);
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```dart
final client = SdkworkAiClient.withBaseUrl(baseUrl: 'https://api.sdkwork.com');
client.setApiKey('your-api-key');
// Sends: Authorization: Bearer <apiKey>
```

### Mode B: Dual Token

```dart
final client = SdkworkAiClient.withBaseUrl(baseUrl: 'https://api.sdkwork.com');
client.setAuthToken('your-auth-token');
client.setAccessToken('your-access-token');
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `setApiKey(...)` together with `setAuthToken(...)` + `setAccessToken(...)` on the same client.

## Configuration (Non-Auth)

```dart
final client = SdkworkAiClient.withBaseUrl(baseUrl: 'https://api.sdkwork.com');

// Set custom headers
client.setHeader('X-Custom-Header', 'value');
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
```dart
// Alibaba Wanx image generation
final body = AlibabaImageGenerationRequest(
  input: { 'negative_prompt': 'negative-prompt', 'prompt': 'prompt' },
  model: 'model',
  parameters: { 'n': 1, 'prompt_extend': false, 'seed': 3, 'size': 'size', 'watermark': true },
);
final xDashScopeAsync = 'enable';
final result = await client.imagesAlibaba.createApiV1ServicesAigcText2imageImageSynthesi(body, xDashScopeAsync);
print(result);
```

### videos_alibaba
```dart
// Alibaba Wan retrieve video generation task
final taskId = '1';
final result = await client.videosAlibaba.listApiV1Tasks(taskId);
print(result);
```

### audio_alibaba
```dart
// Alibaba Qwen TTS speech synthesis
final body = AlibabaSpeechRequest(
  input: { 'instructions': 'instructions', 'language_type': 'Auto', 'optimize_instructions': true, 'text': 'text', 'voice': 'voice' },
  model: 'model',
  parameters: { 'value': 'value' },
);
final result = await client.audioAlibaba.createApiV1ServicesAudioTtsSpeechSynthesizer(body);
print(result);
```

### files_anthropic
```dart
// Anthropic list files
final params = <String, dynamic>{
  'before_id': '1',
  'after_id': '1',
  'limit': 3,
};
final anthropicVersion = 'anthropic-version';
final result = await client.filesAnthropic.getListV1Files(params, anthropicVersion);
print(result);
```

### chat_anthropic
```dart
// Anthropic Claude message
final body = AnthropicMessageCreateRequest(
  cacheControl: { 'ttl': '5m', 'type': 'ephemeral' },
  container: { 'id': '1', 'skills': [AnthropicSkill()] },
  diagnostics: { 'previous_message_id': '1' },
  inferenceGeo: 'inference-geo',
  maxTokens: 5,
  messages: [AnthropicMessageParam()],
  metadata: { 'user_id': '1' },
  model: 'model',
  outputConfig: { 'effort': 'low', 'format': { 'schema': { 'additionalProperties': true, 'description': 'description', 'enum': ['enum'], 'items': 'items', 'properties': { 'value': 'value' }, 'required': ['required'], 'type': 'type' }, 'type': 'json_schema' } },
  serviceTier: 'auto',
  speed: 'standard',
  stopSequences: ['stop-sequences'],
  stream: true,
  system: 'system',
  temperature: 15.0,
  thinking: { 'budget_tokens': 1, 'display': 'summarized', 'type': 'enabled' },
  toolChoice: { 'disable_parallel_tool_use': true, 'name': 'name', 'type': 'auto' },
  tools: [{ 'allowed_callers': ['direct'], 'cache_control': { 'ttl': '5m', 'type': 'ephemeral' }, 'defer_loading': true, 'description': 'description', 'eager_input_streaming': true, 'input_examples': [{ 'value': 'value' }], 'input_schema': { 'additionalProperties': true, 'description': 'description', 'enum': ['enum'], 'items': 'items', 'properties': { 'value': 'value' }, 'required': ['required'], 'type': 'type' }, 'name': 'name', 'strict': true, 'type': 'custom' }],
  topK: 19,
  topP: 20.0,
);
final anthropicVersion = 'anthropic-version';
final result = await client.chatAnthropic.createV1Message(body, anthropicVersion);
print(result);
```

### batches_anthropic
```dart
// Anthropic list message batches
final params = <String, dynamic>{
  'before_id': '1',
  'after_id': '1',
  'limit': 3,
};
final anthropicVersion = 'anthropic-version';
final result = await client.batchesAnthropic.getListV1MessagesBatches(params, anthropicVersion);
print(result);
```

### videos_black_forest_labs
```dart
// Black Forest Labs FLUX 3 video generation
final body = BlackForestLabsVideoGenerationRequest(
  aspectRatio: '21:9',
  draft: false,
  draftCache: 'draft-cache',
  duration: 4,
  generateAudio: true,
  keyframes: 'keyframes',
  mode: 't2v',
  prompt: 'prompt',
  resolution: 'hd',
  safetyTolerance: 10,
  startVideo: 'start-video',
  user: 'user',
  version: 'version',
);
final result = await client.videosBlackForestLabs.createFlux3Video(body);
print(result);
```

### images_black_forest_labs
```dart
// Black Forest Labs retrieve generation result
final params = <String, dynamic>{
  'id': '1',
};
final result = await client.imagesBlackForestLabs.listGetResult(params);
print(result);
```

### videos_bytedance
```dart
// ByteDance Seedance video generation
final body = BytedanceVideoGenerationRequest(
  callbackUrl: 'https://example.com',
  cameraFixed: false,
  content: [ArkContentPart()],
  draft: false,
  duration: 5,
  executionExpiresAfter: 6,
  frames: 7,
  generateAudio: false,
  model: 'model',
  omniReferenceTaskType: 'auto',
  outputFormat: 'mp4',
  priority: 12,
  ratio: '16:9',
  resolution: '480p',
  returnLastFrame: true,
  safetyIdentifier: 'safety-identifier',
  seed: 17,
  serviceTier: 'default',
  tools: [ArkWebSearchTool()],
  watermark: false,
);
final result = await client.videosBytedance.createApiV3ContentsGenerationsTask(body);
print(result);
```

### images_bytedance
```dart
// ByteDance Seedream image generation
final body = BytedanceImageGenerationRequest(
  background: 'transparent',
  image: 'image',
  layerDecomposition: true,
  model: 'model',
  optimizePromptOptions: { 'mode': 'standard' },
  outputFormat: 'png',
  prompt: 'prompt',
  responseFormat: 'url',
  sequentialImageGeneration: 'auto',
  sequentialImageGenerationOptions: { 'max_images': 1 },
  size: 'size',
  stream: false,
  tools: [ArkWebSearchTool()],
  watermark: false,
);
final result = await client.imagesBytedance.createApiV3ImagesGeneration(body);
print(result);
```

### audio_bytedance
```dart
// ByteDance Seed TTS speech synthesis
final body = BytedanceSpeechRequest(
  reqParams: { 'additions': 'additions', 'audio_params': { 'format': 'mp3', 'loudness_rate': 2, 'sample_rate': 3, 'speech_rate': 4 }, 'model': 'model', 'pronunciation_dict': { 'value': 'value' }, 'speaker': 'speaker', 'ssml': 'ssml', 'text': 'text', 'tone': ['tone'] },
);
final xApiResourceId = 'seed-tts-2.0';
final xApiRequestId = 'X-Api-Request-Id';
final result = await client.audioBytedance.createApiV3TtsUnidirectional(body, xApiResourceId, xApiRequestId);
print(result);
```

### music_elevenlabs
```dart
// ElevenLabs music generation
final body = ElevenLabsMusicGenerationRequest(
  compositionPlan: { 'negative_global_styles': ['negative-global-styles'], 'positive_global_styles': ['positive-global-styles'], 'sections': [{ 'value': 'value' }] },
  finetuneId: '1',
  finetuneStrength: 3.0,
  forceInstrumental: false,
  generationMode: 'track',
  lyricsText: 'lyrics-text',
  modelId: 'music_v1',
  musicLengthMs: 8,
  musicPrompt: { 'negative_global_styles': ['negative-global-styles'], 'positive_global_styles': ['positive-global-styles'], 'sections': [{ 'value': 'value' }] },
  prompt: 'prompt',
  respectSectionsDurations: true,
  seed: 12,
  signWithC2pa: true,
  storeForInpainting: false,
  usePhoneticNames: true,
);
final params = <String, dynamic>{
  'output_format': 'output-format',
};
final result = await client.musicElevenlabs.createV1Music(body, params);
print(result);
```

### audio_elevenlabs
```dart
// Generate sound effect
final body = ElevenLabsSoundGenerationRequest(
  durationSeconds: 1.0,
  loop: false,
  modelId: 'eleven_text_to_sound_v2',
  promptInfluence: 4.0,
  text: 'text',
);
final params = <String, dynamic>{
  'output_format': 'output-format',
};
final result = await client.audioElevenlabs.createV1SoundGeneration(body, params);
print(result);
```

### responses_google
```dart
// Google Gemini list cached contents
final params = <String, dynamic>{
  'pageSize': 1,
  'pageToken': 'token',
};
final result = await client.responsesGoogle.getListV1betaCachedContents(params);
print(result);
```

### files_google
```dart
// Google Gemini list files
final params = <String, dynamic>{
  'pageSize': 1,
  'pageToken': 'token',
};
final result = await client.filesGoogle.getListV1betaFiles(params);
print(result);
```

### videos_google
```dart
// Google Gemini retrieve video operation (Veo)
final model = 'model';
final operationId = '1';
final result = await client.videosGoogle.listV1betaModelsOperations(model, operationId);
print(result);
```

### embeddings_google
```dart
// Google Gemini batch embed contents
final model = 'model';
final body = GoogleBatchEmbedContentsRequest(
  requests: [GoogleEmbedContentRequest()],
);
final result = await client.embeddingsGoogle.createV1betaModelsModelBatchEmbedContent(model, body);
print(result);
```

### chat_google
```dart
// Google Gemini count tokens
final model = 'model';
final body = GoogleCountTokensRequest(
  contents: [GoogleContent()],
  generateContentRequest: { 'cachedContent': 'cachedcontent', 'contents': [GoogleContent()], 'continuationToken': 'token', 'generationConfig': { 'audioTranscriptionConfig': { 'value': 'value' }, 'candidateCount': 2, 'enableAffectiveDialog': true, 'enableEnhancedCivicAnswers': false, 'frequencyPenalty': 5.0, 'imageConfig': { 'value': 'value' }, 'logprobs': 7, 'maxOutputTokens': 8, 'mediaResolution': 'MEDIA_RESOLUTION_UNSPECIFIED', 'presencePenalty': 10.0, 'responseFormat': { 'value': 'value' }, 'responseJsonSchema': 'responsejsonschema', 'responseLogprobs': true, 'responseMimeType': 'responsemimetype', 'responseModalities': ['responsemodalities'], 'responseSchema': { 'description': 'description', 'enum': ['enum'], 'format': 'format', 'items': 'items', 'nullable': true, 'properties': { 'value': 'value' }, 'required': ['required'], 'type': 'type' }, 'seed': 17, 'speechConfig': { 'value': 'value' }, 'stopSequences': ['stopsequences'], 'temperature': 20.0, 'thinkingConfig': { 'includeThoughts': true, 'thinkingBudget': 2 }, 'topK': 22, 'topP': 23.0, 'translationConfig': { 'value': 'value' } }, 'labels': { 'value': 'value' }, 'model': 'model', 'safetySettings': [GoogleSafetySetting()], 'serviceTier': 'unspecified', 'store': true, 'systemInstruction': { 'parts': [GooglePart()], 'role': 'role' }, 'toolConfig': { 'functionCallingConfig': { 'allowedFunctionNames': ['name'], 'mode': 'mode' } }, 'tools': [GoogleTool()] },
);
final result = await client.chatGoogle.createV1betaModelsModelCountToken(model, body);
print(result);
```

### images_google
```dart
// Google Gemini image generation
final model = 'model';
final body = GeminiImageGenerationRequest(
  instances: [{ 'image': { 'value': 'value' }, 'prompt': 'prompt' }],
  parameters: { 'aspectRatio': 'aspectratio', 'personGeneration': 'persongeneration', 'sampleCount': 3 },
);
final result = await client.imagesGoogle.createV1betaModelsModelGenerateImage(model, body);
print(result);
```

### videos_jimeng
```dart
// Jimeng retrieve video generation task
final taskId = '1';
final result = await client.videosJimeng.listV1Tasks(taskId);
print(result);
```

### audio_kling
```dart
// Kling text to audio
final body = KlingSoundGenerationRequest(
  callbackUrl: 'callback-url',
  duration: 2.0,
  externalTaskId: '1',
  prompt: 'prompt',
);
final result = await client.audioKling.createV1AudioTextToAudio(body);
print(result);
```

### images_kling
```dart
// Kling image generation
final body = KlingImageGenerationRequest(
  aspectRatio: '16:9',
  callbackUrl: 'callback-url',
  elementList: [KlingElementReference()],
  externalTaskId: '1',
  humanFidelity: 5.0,
  image: 'image',
  imageFidelity: 7.0,
  imageReference: 'subject',
  modelName: 'kling-v2-1',
  n: 10,
  negativePrompt: 'negative-prompt',
  prompt: 'prompt',
  resolution: '1k',
  watermarkInfo: { 'enabled': true },
);
final result = await client.imagesKling.createV1ImagesGeneration(body);
print(result);
```

### videos_kling
```dart
// Kling create avatar video
final body = KlingAvatarCreateRequest(
  audioUrl: 'audio-url',
  callbackUrl: 'callback-url',
  humanImage: 'human-image',
  modelName: 'name',
  prompt: 'prompt',
  text: 'text',
  voiceId: '1',
  voiceLanguage: 'voice-language',
  voiceMode: 'voice-mode',
);
final result = await client.videosKling.createV1VideosAvatar(body);
print(result);
```

### videos_luma_ai
```dart
// Luma Dream Machine video generation
final body = LumaVideoGenerationRequest(
  aspectRatio: '1:1',
  callbackUrl: 'https://example.com',
  concepts: [LumaConcept()],
  duration: 'duration',
  generationType: 'video',
  keyframes: { 'frame0': { 'id': '00000000-0000-0000-0000-000000000001', 'type': 'image', 'url': 'https://example.com' }, 'frame1': { 'id': '00000000-0000-0000-0000-000000000001', 'type': 'image', 'url': 'https://example.com' } },
  loop: true,
  model: 'ray-2',
  prompt: 'prompt',
  resolution: 'resolution',
);
final result = await client.videosLumaAi.createGeneration(body);
print(result);
```

### videos_minimax
```dart
// MiniMax retrieve video file
final params = <String, dynamic>{
  'file_id': '1',
};
final result = await client.videosMinimax.listV1FilesRetrieve(params);
print(result);
```

### images_minimax
```dart
// MiniMax image generation
final body = MinimaxImageGenerationRequest(
  aspectRatio: '1:1',
  height: 2,
  model: 'image-01',
  n: 4,
  prompt: 'prompt',
  promptOptimizer: false,
  responseFormat: 'url',
  seed: 8,
  subjectReference: [{ 'value': 'value' }],
  width: 10,
);
final result = await client.imagesMinimax.createV1ImageGeneration(body);
print(result);
```

### music_minimax
```dart
// Minimax create music generation
final body = MiniMaxMusicGenerationRequest(
  audioBase64: 'audio-base64',
  audioSetting: { 'bitrate': 32000, 'format': 'mp3', 'sample_rate': 16000 },
  audioUrl: 'audio-url',
  coverFeatureId: '1',
  isInstrumental: true,
  lyrics: 'lyrics',
  lyricsOptimizer: true,
  model: 'music-3.0',
  outputFormat: 'url',
  prompt: 'prompt',
  stream: true,
);
final result = await client.musicMinimax.createV1MusicGeneration(body);
print(result);
```

### audio_minimax
```dart
// MiniMax speech synthesis
final body = MinimaxTextToSpeechRequest(
  audioSetting: { 'value': 'value' },
  languageBoost: 'language-boost',
  model: 'speech-2.8-hd',
  outputFormat: 'url',
  pronunciationDict: { 'value': 'value' },
  stream: false,
  streamOptions: { 'exclude_aggregated_audio': true },
  subtitleEnable: false,
  subtitleType: 'sentence',
  text: 'text',
  textNormalizationMode: 'basic',
  timbreWeights: [MinimaxTimbreWeight()],
  voiceModify: { 'intensity': 1, 'pitch': 2, 'sound_effects': 'spacious_echo', 'timbre': 4 },
  voiceSetting: { 'value': 'value' },
);
final result = await client.audioMinimax.createV1T2aV(body);
print(result);
```

### music_mureka
```dart
// Mureka song generation
final body = MurekaMusicGenerationRequest(
  callbackUrl: 'callback-url',
  duration: 2,
  lyrics: 'lyrics',
  model: 'model',
  prompt: 'prompt',
  referenceAudioUrl: 'reference-audio-url',
  tags: ['tags'],
  title: 'title',
);
final result = await client.musicMureka.createV1SongGenerate(body);
print(result);
```

### videos_pixverse
```dart
// PixVerse retrieve video generation
final videoId = '1';
final aiTraceId = 'Ai-trace-id';
final result = await client.videosPixverse.listOpenapiV2VideoResult(videoId, aiTraceId);
print(result);
```

### videos_runway
```dart
// Runway image to video
final body = RunwayImageToVideoRequest(
  audio: true,
  bitrate: 'standard',
  cfgScale: 3.0,
  contentModeration: { 'value': 'value' },
  draft: true,
  duration: 6,
  model: 'model',
  negativePrompt: 'negativeprompt',
  outputFormat: 'mp4',
  promptExpansionMode: 'disabled',
  promptImage: 'promptimage',
  promptText: 'prompttext',
  proresProfile: '422',
  providerSettings: { 'value': 'value' },
  ratio: 'ratio',
  referenceAudio: [{ 'value': 'value' }],
  referenceVideos: [{ 'value': 'value' }],
  references: [{ 'value': 'value' }],
  resolution: '480p',
  seed: 20,
);
final xRunwayVersion = '2024-11-06';
final result = await client.videosRunway.createV1ImageToVideo(body, xRunwayVersion);
print(result);
```

### images_runway
```dart
// Runway retrieve task
final taskId = '1';
final xRunwayVersion = '2024-11-06';
final result = await client.imagesRunway.listV1Tasks(taskId, xRunwayVersion);
print(result);
```

### audio_stability_ai
```dart
// Stability AI text-to-audio (music and sound effects)
final body = StabilityAudioRequest(
  cfgScale: 1.0,
  duration: 2.0,
  model: 'stable-audio-2',
  outputFormat: 'mp3',
  prompt: 'prompt',
  seed: 6,
  steps: 7,
);
final result = await client.audioStabilityAi.createTextToAudio(body);
print(result);
```

### images_stability_ai
```dart
// Stability AI image generation
final mode = 'mode';
final body = StabilityImageGenerationRequest(
  aspectRatio: '21:9',
  cfgScale: 2.0,
  image: 'image',
  mode: 'text-to-image',
  model: 'sd3.5-large',
  negativePrompt: 'negative-prompt',
  outputFormat: 'png',
  prompt: 'prompt',
  seed: 9,
  strength: 10.0,
  stylePreset: 'style-preset',
);
final accept = 'application/json';
final result = await client.imagesStabilityAi.createGenerate(mode, body, accept);
print(result);
```

### music_suno
```dart
// Suno music generation
final body = SunoMusicGenerationRequest(
  callbackUrl: 'callback-url',
  duration: 2.0,
  model: 'model',
  negativeTags: 'negative-tags',
  prompt: 'prompt',
  tags: 'tags',
  title: 'title',
);
final result = await client.musicSuno.createV1MusicGeneration(body);
print(result);
```

### chat_typesafe
```dart
// TypeSafe AI System One decision
final body = TypeSafeSystemOneRequest(
  model: 'model',
  questions: { 'value': { 'criteria': 'criteria', 'instructions': 'instructions', 'type': 'choice' } },
  state: 'state',
);
final result = await client.chatTypesafe.createV1Systemone(body);
print(result);
```

### assistant
```dart
// List assistants
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.assistants.list(params);
print(result);
```

### audio
```dart
// List voice consents
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.audio.getListVoiceConsents(params);
print(result);
```

### batch
```dart
// List batches
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.batches.list(params);
print(result);
```

### chat
```dart
// List stored chat completions
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
  'model': 'model',
  'metadata': 'metadata',
};
final result = await client.chat.list(params);
print(result);
```

### completion
```dart
// Create completion
final body = OpenAiCompletionCreateRequest(
  bestOf: 1,
  echo: false,
  frequencyPenalty: 3.0,
  logitBias: { 'value': 1.0 },
  logprobs: 5,
  maxTokens: 6,
  model: 'model',
  n: 8,
  presencePenalty: 9.0,
  prompt: 'prompt',
  seed: 11,
  stop: 'stop',
  stream: true,
  streamOptions: { 'include_usage': true },
  suffix: 'suffix',
  temperature: 16.0,
  topP: 17.0,
  user: 'user',
);
final result = await client.completion.create(body);
print(result);
```

### container
```dart
// List containers
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.container.list(params);
print(result);
```

### conversation
```dart
// List conversations
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.conversation.list(params);
print(result);
```

### embedding
```dart
// Create embeddings
final body = OpenAiEmbeddingsRequest(
  dimensions: 1,
  encodingFormat: 'float',
  input: 'input',
  model: 'model',
  user: 'user',
);
final result = await client.embeddings.create(body);
print(result);
```

### file
```dart
// List files
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.files.list(params);
print(result);
```

### image
```dart
// Create image edit
final body = OpenAiImageEditRequest(
  background: 'transparent',
  complexity: 'low',
  frameCount: 3,
  frameDurationMs: 4,
  images: [OpenAiImageReferenceInput()],
  inputFidelity: 'high',
  markup: { 'value': 'value' },
  mask: { 'value': 'value' },
  model: 'model',
  moderation: 'low',
  n: 11,
  outputCompression: 12,
  outputFormat: 'png',
  partialImages: 14,
  prompt: 'prompt',
  quality: 'low',
  safetyIdentifier: 'safety-identifier',
  size: 'size',
  stream: true,
  svg: { 'value': 'value' },
  user: 'user',
);
final result = await client.images.createEdit(body);
print(result);
```

### model
```dart
// List models
final result = await client.models.list();
print(result);
```

### moderation
```dart
// Create moderation
final body = OpenAiModerationCreateRequest(
  input: 'input',
  model: 'model',
);
final result = await client.moderations.create(body);
print(result);
```

### realtime
```dart
// Create realtime call
final body = OpenAiRealtimeCallCreateRequest(
  metadata: { 'value': 'value' },
  sdp: 'sdp',
  session: 'session',
);
final result = await client.realtime.createCall(body);
print(result);
```

### response
```dart
// Create response
final body = OpenAiResponsesRequest(
  background: true,
  conversation: 'conversation',
  include: ['include'],
  input: 'input',
  instructions: 'instructions',
  maxOutputTokens: 6,
  maxToolCalls: 7,
  metadata: { 'value': 'value' },
  model: 'model',
  parallelToolCalls: false,
  previousResponseId: '1',
  prompt: { 'id': '1', 'variables': { 'value': 'value' }, 'version': 'version' },
  promptCacheKey: 'prompt-cache-key',
  reasoning: { 'effort': 'minimal', 'summary': 'auto' },
  serviceTier: 'auto',
  store: false,
  stream: true,
  temperature: 18.0,
  text: { 'format': { 'json_schema': { 'description': 'description', 'name': 'name', 'schema': { 'additionalProperties': true, 'description': 'description', 'enum': ['enum'], 'items': 'items', 'properties': { 'value': 'value' }, 'required': ['required'], 'type': 'type' }, 'strict': false }, 'type': 'text' } },
  toolChoice: 'tool-choice',
  tools: [OpenAiTool()],
  topLogprobs: 22,
  topP: 23.0,
  truncation: 'auto',
  user: 'user',
);
final result = await client.responses.create(body);
print(result);
```

### thread
```dart
// Create thread
final body = OpenAiThreadCreateRequest(
  messages: [OpenAiThreadMessageCreateRequest()],
  metadata: { 'value': 'value' },
  toolResources: 'tool-resources',
);
final result = await client.threads.create(body);
print(result);
```

### tool
```dart
// Fetch a web page
final body = OpenAiDeepSeekWebFetchRequest(
  url: 'https://example.com',
);
final result = await client.tool.createFetch(body);
print(result);
```

### upload
```dart
// Create upload
final body = OpenAiUploadCreateRequest(
  bytes: 1,
  expiresAfter: { 'value': 'value' },
  filename: 'name',
  mimeType: 'mime-type',
  purpose: 'purpose',
);
final result = await client.uploads.create(body);
print(result);
```

### vector_store
```dart
// List vector stores
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.vectorStores.listVectorStore(params);
print(result);
```

### video
```dart
// List videos
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.video.list(params);
print(result);
```

### videos_vidu
```dart
// Vidu image to video
final body = ViduImageToVideoRequest(
  audio: true,
  callbackUrl: 'callback-url',
  duration: 3,
  images: ['images'],
  isRec: true,
  metaData: 'meta-data',
  model: 'model',
  offPeak: false,
  payload: 'payload',
  prompt: 'prompt',
  resolution: 'resolution',
  seed: 12,
  watermark: true,
  wmPosition: 14,
  wmUrl: 'wm-url',
);
final result = await client.videosVidu.createEntV2Img2video(body);
print(result);
```

### images_vidu
```dart
// Vidu reference to image
final body = ViduReferenceToImageRequest(
  aspectRatio: 'aspect-ratio',
  bgm: false,
  callbackUrl: 'callback-url',
  images: ['images'],
  model: 'model',
  offPeak: false,
  payload: 'payload',
  prompt: 'prompt',
  resolution: 'resolution',
  seed: 10,
);
final result = await client.imagesVidu.createEntV2Reference2image(body);
print(result);
```

### audio_vidu
```dart
// Vidu text to audio
final body = ViduTextToAudioRequest(
  bgm: true,
  callbackUrl: 'callback-url',
  duration: 3.0,
  model: 'model',
  offPeak: true,
  payload: 'payload',
  prompt: 'prompt',
  seed: 8,
);
final result = await client.audioVidu.createEntV2Text2audio(body);
print(result);
```

### audio_volcengine
```dart
// Volcengine create speech
final body = OpenAiSpeechCreateRequest(
  input: 'input',
  instructions: 'instructions',
  model: 'model',
  responseFormat: 'mp3',
  speed: 5.0,
  streamFormat: 'sse',
  voice: 'voice',
);
final result = await client.audioVolcengine.createApiV3AudioSpeech(body);
print(result);
```

### videos_volcengine
```dart
// Volcengine Ark content generation task
final body = VolcengineContentGenerationTaskCreateRequest(
  callbackUrl: 'https://example.com',
  cameraFixed: false,
  content: [VolcengineContentPart()],
  draft: false,
  duration: 5,
  executionExpiresAfter: 6,
  frames: 7,
  generateAudio: false,
  model: 'model',
  omniReferenceTaskType: 'auto',
  outputFormat: 'mp4',
  priority: 12,
  ratio: '16:9',
  resolution: '480p',
  returnLastFrame: true,
  safetyIdentifier: 'safety-identifier',
  seed: 17,
  serviceTier: 'default',
  tools: [ArkWebSearchTool()],
  watermark: false,
);
final result = await client.videosVolcengine.createApiV3ContentsGenerationsTask(body);
print(result);
```

### images_volcengine
```dart
// Volcengine Ark image generation
final body = VolcengineImageGenerationRequest(
  background: 'transparent',
  image: 'image',
  layerDecomposition: true,
  model: 'model',
  optimizePromptOptions: { 'mode': 'standard' },
  outputFormat: 'png',
  prompt: 'prompt',
  responseFormat: 'url',
  sequentialImageGeneration: 'auto',
  sequentialImageGenerationOptions: { 'max_images': 1 },
  size: 'size',
  stream: false,
  tools: [ArkWebSearchTool()],
  watermark: false,
);
final result = await client.imagesVolcengine.createApiV3ImagesGeneration(body);
print(result);
```

### images_xai
```dart
// xAI Grok Imagine image edit
final body = XaiImageEditRequest(
  aspectRatio: '1:1',
  deferred_: false,
  image: { 'file_id': '1', 'url': 'url' },
  images: [XaiImageUrl()],
  model: 'model',
  n: 6,
  output: { 'value': 'value' },
  prompt: 'prompt',
  resolution: '1k',
  responseFormat: 'url',
  storageOptions: { 'value': 'value' },
  user: 'user',
);
final result = await client.imagesXai.createV1ImagesEdit(body);
print(result);
```

### videos_xai
```dart
// xAI Grok Imagine video edit
final body = XaiVideoEditRequest(
  model: 'model',
  output: { 'value': 'value' },
  prompt: 'prompt',
  storageOptions: { 'value': 'value' },
  user: 'user',
  video: { 'file_id': '1', 'url': 'url' },
);
final result = await client.videosXai.createV1VideosEdit(body);
print(result);
```

### videos_zhipu
```dart
// Zhipu retrieve video generation task
final taskId = '1';
final result = await client.videosZhipu.listApiPaasV4AsyncResult(taskId);
print(result);
```

### images_zhipu
```dart
// Zhipu CogView image generation
final body = ZhipuImageGenerationRequest(
  model: 'glm-image',
  prompt: 'prompt',
  quality: 'hd',
  size: 'size',
  userId: '1',
  watermarkEnabled: false,
);
final result = await client.imagesZhipu.createApiPaasV4ImagesGeneration(body);
print(result);
```

## Error Handling

```dart
try {
  final result = await client.models.list();
  print(result);
} catch (e) {
  print('Error: $e');
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

> Ensure `dart pub publish --dry-run` passes before release publish.

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
