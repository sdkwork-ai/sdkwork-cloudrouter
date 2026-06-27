# clawrouter-open-sdk (Flutter)

SDKWork Claw Router OpenAI-compatible gateway SDK flutter generated transport SDK

## Installation

Add to `pubspec.yaml`:

```yaml
dependencies:
  clawrouter_open_sdk: ^0.1.0
```

## Quick Start

```dart
import 'package:clawrouter_open_sdk/clawrouter_open_sdk.dart';

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
```dart
// Anthropic list files
final params = <String, dynamic>{
  'before_id': '1',
  'after_id': '1',
  'limit': 3,
};
final result = await client.filesAnthropic.getListV1Files(params);
print(result);
```

### chat_anthropic
```dart
// Anthropic Claude message
final body = AnthropicMessageCreateRequest(
  maxTokens: 1,
  messages: [AnthropicMessageParam()],
  metadata: { 'value': 'value' },
  model: 'model',
  stopSequences: ['stop-sequences'],
  stream: false,
  system: 'system',
  temperature: 8.0,
  thinking: { 'budget_tokens': 1, 'type': 'type' },
  toolChoice: { 'name': 'name', 'type': 'type' },
  tools: [AnthropicTool()],
  topK: 12,
  topP: 13.0,
);
final result = await client.chatAnthropic.createV1Message(body);
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
final result = await client.batchesAnthropic.getListV1MessagesBatches(params);
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
  generateContentRequest: { 'cachedContent': 'cachedcontent', 'contents': [GoogleContent()], 'generationConfig': { 'candidateCount': 1, 'maxOutputTokens': 2, 'responseMimeType': 'responsemimetype', 'responseSchema': { 'description': 'description', 'enum': ['enum'], 'format': 'format', 'items': 'items', 'nullable': true, 'properties': { 'value': 'value' }, 'required': ['required'], 'type': 'type' }, 'stopSequences': ['stopsequences'], 'temperature': 6.0, 'thinkingConfig': { 'includeThoughts': true, 'thinkingBudget': 2 }, 'topK': 8, 'topP': 9.0 }, 'safetySettings': [GoogleSafetySetting()], 'systemInstruction': { 'parts': [GooglePart()], 'role': 'role' }, 'toolConfig': { 'functionCallingConfig': { 'allowedFunctionNames': ['name'], 'mode': 'mode' } }, 'tools': [GoogleTool()] },
);
final result = await client.chatGoogle.createV1betaModelsModelCountToken(model, body);
print(result);
```

### videos_kling
```dart
// Kling video generation
final body = KlingVideoGenerationRequest(
  aspectRatio: 'aspect-ratio',
  callbackUrl: 'callback-url',
  cfgScale: 3.0,
  duration: 4,
  image: 'image',
  imageTail: 'image-tail',
  mode: 'mode',
  model: 'model',
  negativePrompt: 'negative-prompt',
  prompt: 'prompt',
);
final result = await client.videosKling.createV1VideosGeneration(body);
print(result);
```

### images_midjourney
```dart
// Midjourney image generation
final body = MidjourneyImageGenerationRequest(
  aspectRatio: 'aspect-ratio',
  callbackUrl: 'callback-url',
  model: 'model',
  prompt: 'prompt',
  seed: 5,
  style: 'style',
);
final result = await client.imagesMidjourney.createV1ImagesGeneration(body);
print(result);
```

### images_nano_banana
```dart
// Nano Banana image generation
final body = NanoBananaImageGenerationRequest(
  aspectRatio: 'aspect-ratio',
  callbackUrl: 'callback-url',
  images: ['images'],
  model: 'model',
  prompt: 'prompt',
  seed: 6,
  size: 'size',
);
final result = await client.imagesNanoBanana.createGeneration(body);
print(result);
```

### audio_suno
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
final result = await client.audioSuno.createV1MusicGeneration(body);
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
  suffix: 'suffix',
  temperature: 15.0,
  topP: 16.0,
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

### eval
```dart
// List evals
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.eval.list(params);
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

### fine_tuning
```dart
// List fine-tuning jobs
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.fineTuning.listJob(params);
print(result);
```

### image
```dart
// Create image edit
final body = OpenAiImageEditRequest(
  image: 'image',
  mask: 'mask',
  model: 'model',
  prompt: 'prompt',
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

### organization
```dart
// List organization admin API keys
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.organization.getListAdminApiKeys(params);
print(result);
```

### project
```dart
// List project roles
final projectId = '1';
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.project.getListRoles(projectId, params);
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

### skill
```dart
// List skills
final params = <String, dynamic>{
  'limit': 1,
  'order': 'asc',
  'after': 'after',
  'before': 'before',
};
final result = await client.skill.list(params);
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

### upload
```dart
// Create upload
final body = OpenAiUploadCreateRequest(
  bytes: 1,
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
  aspectRatio: 'aspect-ratio',
  callbackUrl: 'callback-url',
  duration: 3,
  images: ['images'],
  model: 'model',
  movementAmplitude: 'movement-amplitude',
  payload: 'payload',
  prompt: 'prompt',
  resolution: 'resolution',
  seed: 10,
);
final result = await client.videosVidu.createEntV2Img2video(body);
print(result);
```

### images_vidu
```dart
// Vidu reference to image
final body = ViduReferenceToImageRequest(
  aspectRatio: 'aspect-ratio',
  callbackUrl: 'callback-url',
  images: ['images'],
  model: 'model',
  payload: 'payload',
  prompt: 'prompt',
  seed: 7,
  style: 'style',
);
final result = await client.imagesVidu.createEntV2Reference2image(body);
print(result);
```

### videos_volcengine
```dart
// Volcengine Ark content generation task
final body = VolcengineContentGenerationTaskCreateRequest(
  callbackUrl: 'callback-url',
  content: [VolcengineContentPart()],
  metadata: { 'value': 'value' },
  model: 'model',
);
final result = await client.videosVolcengine.createApiV3ContentsGenerationsTask(body);
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

- Generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- Each run also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- Apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across regenerations.
- If a generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
