# cloudrouter-open-sdk

SDKWork Cloud Router OpenAI-compatible gateway SDK

## Installation

```bash
npm install @sdkwork/cloudrouter-open-sdk
# or
yarn add @sdkwork/cloudrouter-open-sdk
# or
pnpm add @sdkwork/cloudrouter-open-sdk
```

## Quick Start

```typescript
import { SdkworkAiClient } from '@sdkwork/cloudrouter-open-sdk';

const client = new SdkworkAiClient({
  baseUrl: 'https://api.sdkwork.com',
  timeout: 30000,
});

// Mode A: API Key (recommended for server-to-server calls)
client.setApiKey('your-api-key');

// Use the SDK
const result = await client.models.list();
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```typescript
const client = new SdkworkAiClient({ baseUrl: 'https://api.sdkwork.com' });
client.setApiKey('your-api-key');
// Sends: Authorization: Bearer <apiKey>
```

### Mode B: Dual Token

```typescript
const client = new SdkworkAiClient({ baseUrl: 'https://api.sdkwork.com' });
client.setAuthToken('your-auth-token');
client.setAccessToken('your-access-token');
// Sends:
// Authorization: Bearer <authToken>
// Access-Token: <accessToken>
```

> Do not call `setApiKey(...)` together with `setAuthToken(...)` + `setAccessToken(...)` on the same client.

## Configuration (Non-Auth)

```typescript
import { SdkworkAiClient } from '@sdkwork/cloudrouter-open-sdk';

const client = new SdkworkAiClient({
  baseUrl: 'https://api.sdkwork.com',
  timeout: 30000, // Request timeout in ms
  headers: {      // Custom headers
    'X-Custom-Header': 'value',
  },
});
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

```typescript
// Alibaba Wanx image generation
const body = {
  input: {
    negative_prompt: 'negative_prompt',
    prompt: 'prompt',
  },
  model: 'model',
  parameters: {
    n: 1,
    prompt_extend: true,
    seed: 1,
    size: 'size',
    watermark: true,
  },
};
const xDashScopeAsync = 'enable';
const params = {
  xDashScopeAsync,
};
const result = await client.imagesAlibaba.api.v1.services.aigc.text2image.imageSynthesis.create(body, params);
```

### videos_alibaba

```typescript
// Alibaba Wan retrieve video generation task
const taskId = '1';
const result = await client.videosAlibaba.api.v1.tasks.retrieve(taskId);
```

### audio_alibaba

```typescript
// Alibaba Qwen TTS speech synthesis
const body = {
  input: {
    instructions: 'instructions',
    language_type: 'Auto',
    optimize_instructions: true,
    text: 'text',
    voice: 'voice',
  },
  model: 'model',
  parameters: {
    value: 'value',
  },
};
const result = await client.audioAlibaba.api.v1.services.audio.tts.speechSynthesizer.create(body);
```

### files_anthropic

```typescript
// Anthropic list files
const anthropicVersion = 'anthropic-version';
const query = {
  before_id: 'before_id',
  after_id: 'after_id',
  limit: 3,
};
const params = {
  ...query,
  anthropicVersion,
};
const result = await client.filesAnthropic.v1.files.list(params);
```

### chat_anthropic

```typescript
// Anthropic Claude message
const body = {
  cache_control: {
    ttl: '5m',
    type: 'ephemeral',
  },
  container: {
    id: 'id',
    skills: [],
  },
  diagnostics: {
    previous_message_id: 'previous_message_id',
  },
  inference_geo: 'inference_geo',
  max_tokens: 1,
  messages: [
    {},
  ],
  metadata: {
    user_id: 'user_id',
  },
  model: 'model',
  output_config: {
    effort: 'low',
    format: {},
  },
  service_tier: 'auto',
  speed: 'standard',
  stop_sequences: [
    'stop_sequences',
  ],
  stream: true,
  system: 'system',
  temperature: 1,
  thinking: {
    budget_tokens: 1,
    display: 'summarized',
    type: 'enabled',
  },
  tool_choice: {
    disable_parallel_tool_use: true,
    name: 'name',
    type: 'auto',
  },
  tools: [
    {},
  ],
  top_k: 1,
  top_p: 1,
};
const anthropicVersion = 'anthropic-version';
const params = {
  anthropicVersion,
};
const result = await client.chatAnthropic.v1.messages.create(body, params);
```

### batches_anthropic

```typescript
// Anthropic list message batches
const anthropicVersion = 'anthropic-version';
const query = {
  before_id: 'before_id',
  after_id: 'after_id',
  limit: 3,
};
const params = {
  ...query,
  anthropicVersion,
};
const result = await client.batchesAnthropic.v1.messages.batches.list(params);
```

### videos_black_forest_labs

```typescript
// Black Forest Labs FLUX 3 video generation
const body = {
  aspect_ratio: '21:9',
  draft: true,
  draft_cache: 'draft_cache',
  duration: 1,
  generate_audio: true,
  keyframes: 'keyframes',
  mode: 't2v',
  prompt: 'prompt',
  resolution: 'hd',
  safety_tolerance: 1,
  start_video: 'start_video',
  user: 'user',
  version: 'version',
};
const result = await client.videosBlackForestLabs.v1.flux3Video.create(body);
```

### images_black_forest_labs

```typescript
// Black Forest Labs retrieve generation result
const params = {
  id: 'id',
};
const result = await client.imagesBlackForestLabs.v1.getResult.list(params);
```

### videos_bytedance

```typescript
// ByteDance Seedance video generation
const body = {
  callback_url: 'callback_url',
  camera_fixed: true,
  content: [
    {},
  ],
  draft: true,
  duration: 1,
  execution_expires_after: 1,
  frames: 1,
  generate_audio: true,
  model: 'model',
  omni_reference_task_type: 'auto',
  output_format: 'mp4',
  priority: 1,
  ratio: '16:9',
  resolution: '480p',
  return_last_frame: true,
  safety_identifier: 'safety_identifier',
  seed: 1,
  service_tier: 'default',
  tools: [
    {},
  ],
  watermark: true,
};
const result = await client.videosBytedance.api.v3.contents.generations.tasks.create(body);
```

### images_bytedance

```typescript
// ByteDance Seedream image generation
const body = {
  background: 'transparent',
  image: 'image',
  layer_decomposition: true,
  model: 'model',
  optimize_prompt_options: {
    mode: 'standard',
  },
  output_format: 'png',
  prompt: 'prompt',
  response_format: 'url',
  sequential_image_generation: 'auto',
  sequential_image_generation_options: {
    max_images: 1,
  },
  size: 'size',
  stream: true,
  tools: [
    {},
  ],
  watermark: true,
};
const result = await client.imagesBytedance.api.v3.images.generations.create(body);
```

### audio_bytedance

```typescript
// ByteDance Seed TTS speech synthesis
const body = {
  req_params: {
    additions: 'additions',
    audio_params: {},
    model: 'model',
    pronunciation_dict: {},
    speaker: 'speaker',
    ssml: 'ssml',
    text: 'text',
    tone: [],
  },
};
const xApiResourceId = 'seed-tts-2.0';
const xApiRequestId = 'X-Api-Request-Id';
const params = {
  xApiResourceId,
  xApiRequestId,
};
const result = await client.audioBytedance.api.v3.tts.unidirectional.create(body, params);
```

### music_elevenlabs

```typescript
// ElevenLabs music generation
const body = {
  composition_plan: {
    negative_global_styles: [],
    positive_global_styles: [],
    sections: [],
  },
  finetune_id: 'finetune_id',
  finetune_strength: 1,
  force_instrumental: true,
  generation_mode: 'track',
  lyrics_text: 'lyrics_text',
  model_id: 'music_v1',
  music_length_ms: 1,
  music_prompt: {
    negative_global_styles: [],
    positive_global_styles: [],
    sections: [],
  },
  prompt: 'prompt',
  respect_sections_durations: true,
  seed: 1,
  sign_with_c2pa: true,
  store_for_inpainting: true,
  use_phonetic_names: true,
};
const params = {
  output_format: 'output_format',
};
const result = await client.musicElevenlabs.v1.music.create(body, params);
```

### audio_elevenlabs

```typescript
// Generate sound effect
const body = {
  duration_seconds: 1,
  loop: true,
  model_id: 'eleven_text_to_sound_v2',
  prompt_influence: 1,
  text: 'text',
};
const params = {
  output_format: 'output_format',
};
const result = await client.audioElevenlabs.v1.soundGeneration.create(body, params);
```

### responses_google

```typescript
// Google Gemini list cached contents
const params = {
  pageSize: 1,
  pageToken: 'pageToken',
};
const result = await client.responsesGoogle.v1beta.cachedContents.list(params);
```

### files_google

```typescript
// Google Gemini list files
const params = {
  pageSize: 1,
  pageToken: 'pageToken',
};
const result = await client.filesGoogle.v1beta.files.list(params);
```

### videos_google

```typescript
// Google Gemini retrieve video operation (Veo)
const model = 'model';
const operationId = '1';
const result = await client.videosGoogle.v1beta.models.operations.retrieve(model, operationId);
```

### embeddings_google

```typescript
// Google Gemini batch embed contents
const model = 'model';
const body = {
  requests: [
    {},
  ],
};
const result = await client.embeddingsGoogle.v1beta.models.modelBatchEmbedContents.create(model, body);
```

### chat_google

```typescript
// Google Gemini count tokens
const model = 'model';
const body = {
  contents: [
    {},
  ],
  generateContentRequest: {
    cachedContent: 'cachedContent',
    contents: [],
    continuationToken: 'continuationToken',
    generationConfig: {},
    labels: {},
    model: 'model',
    safetySettings: [],
    serviceTier: 'unspecified',
    store: true,
    systemInstruction: {},
    toolConfig: {},
    tools: [],
  },
};
const result = await client.chatGoogle.v1beta.models.modelCountTokens.create(model, body);
```

### images_google

```typescript
// Google Gemini image generation
const model = 'model';
const body = {
  instances: [
    {},
  ],
  parameters: {
    aspectRatio: 'aspectRatio',
    personGeneration: 'personGeneration',
    sampleCount: 1,
  },
};
const result = await client.imagesGoogle.v1beta.models.modelGenerateImages.create(model, body);
```

### videos_jimeng

```typescript
// Jimeng retrieve video generation task
const taskId = '1';
const result = await client.videosJimeng.v1.tasks.retrieve(taskId);
```

### audio_kling

```typescript
// Kling text to audio
const body = {
  callback_url: 'callback_url',
  duration: 1,
  external_task_id: 'external_task_id',
  prompt: 'prompt',
};
const result = await client.audioKling.v1.audio.textToAudio.create(body);
```

### images_kling

```typescript
// Kling image generation
const body = {
  aspect_ratio: '16:9',
  callback_url: 'callback_url',
  element_list: [
    {},
  ],
  external_task_id: 'external_task_id',
  human_fidelity: 1,
  image: 'image',
  image_fidelity: 1,
  image_reference: 'subject',
  model_name: 'kling-v2-1',
  n: 1,
  negative_prompt: 'negative_prompt',
  prompt: 'prompt',
  resolution: '1k',
  watermark_info: {
    enabled: true,
  },
};
const result = await client.imagesKling.v1.images.generations.create(body);
```

### videos_kling

```typescript
// Kling create avatar video
const body = {
  audio_url: 'audio_url',
  callback_url: 'callback_url',
  human_image: 'human_image',
  model_name: 'model_name',
  prompt: 'prompt',
  text: 'text',
  voice_id: 'voice_id',
  voice_language: 'voice_language',
  voice_mode: 'voice_mode',
};
const result = await client.videosKling.v1.videos.avatar.create(body);
```

### videos_luma_ai

```typescript
// Luma Dream Machine video generation
const body = {
  aspect_ratio: '1:1',
  callback_url: 'callback_url',
  concepts: [
    {},
  ],
  duration: 'duration',
  generation_type: 'video',
  keyframes: {
    frame0: {},
    frame1: {},
  },
  loop: true,
  model: 'ray-2',
  prompt: 'prompt',
  resolution: 'resolution',
};
const result = await client.videosLumaAi.dreamMachine.v1.generations.create(body);
```

### videos_minimax

```typescript
// MiniMax retrieve video file
const params = {
  file_id: 'file_id',
};
const result = await client.videosMinimax.v1.files.retrieve.list(params);
```

### images_minimax

```typescript
// MiniMax image generation
const body = {
  aspect_ratio: '1:1',
  height: 1,
  model: 'image-01',
  n: 1,
  prompt: 'prompt',
  prompt_optimizer: true,
  response_format: 'url',
  seed: 1,
  subject_reference: [
    {},
  ],
  width: 1,
};
const result = await client.imagesMinimax.v1.imageGeneration.create(body);
```

### music_minimax

```typescript
// Minimax create music generation
const body = {
  audio_base64: 'audio_base64',
  audio_setting: {
    bitrate: 32000,
    format: 'mp3',
    sample_rate: 16000,
  },
  audio_url: 'audio_url',
  cover_feature_id: 'cover_feature_id',
  is_instrumental: true,
  lyrics: 'lyrics',
  lyrics_optimizer: true,
  model: 'music-3.0',
  output_format: 'url',
  prompt: 'prompt',
  stream: true,
};
const result = await client.musicMinimax.v1.musicGeneration.create(body);
```

### audio_minimax

```typescript
// MiniMax speech synthesis
const body = {
  audio_setting: {
    value: 'value',
  },
  language_boost: 'language_boost',
  model: 'speech-2.8-hd',
  output_format: 'url',
  pronunciation_dict: {
    value: 'value',
  },
  stream: true,
  stream_options: {
    exclude_aggregated_audio: true,
  },
  subtitle_enable: true,
  subtitle_type: 'sentence',
  text: 'text',
  text_normalization_mode: 'basic',
  timbre_weights: [
    {},
  ],
  voice_modify: {
    intensity: 1,
    pitch: 1,
    sound_effects: 'spacious_echo',
    timbre: 1,
  },
  voice_setting: {
    value: 'value',
  },
};
const result = await client.audioMinimax.v1.t2aV2.create(body);
```

### music_mureka

```typescript
// Mureka song generation
const body = {
  callback_url: 'callback_url',
  duration: 1,
  lyrics: 'lyrics',
  model: 'model',
  prompt: 'prompt',
  reference_audio_url: 'reference_audio_url',
  tags: [
    'tags',
  ],
  title: 'title',
};
const result = await client.musicMureka.v1.song.generate.create(body);
```

### videos_pixverse

```typescript
// PixVerse retrieve video generation
const videoId = '1';
const aiTraceId = 'Ai-trace-id';
const params = {
  aiTraceId,
};
const result = await client.videosPixverse.openapi.v2.video.result.retrieve(videoId, params);
```

### videos_runway

```typescript
// Runway image to video
const body = {
  audio: true,
  bitrate: 'standard',
  cfgScale: 1,
  contentModeration: {
    value: 'value',
  },
  draft: true,
  duration: 1,
  model: 'model',
  negativePrompt: 'negativePrompt',
  outputFormat: 'mp4',
  promptExpansionMode: 'disabled',
  promptImage: 'promptImage',
  promptText: 'promptText',
  proresProfile: '422',
  providerSettings: {
    value: 'value',
  },
  ratio: 'ratio',
  referenceAudio: [
    {},
  ],
  referenceVideos: [
    {},
  ],
  references: [
    {},
  ],
  resolution: '480p',
  seed: 1,
};
const xRunwayVersion = '2024-11-06';
const params = {
  xRunwayVersion,
};
const result = await client.videosRunway.v1.imageToVideo.create(body, params);
```

### images_runway

```typescript
// Runway retrieve task
const taskId = '1';
const xRunwayVersion = '2024-11-06';
const params = {
  xRunwayVersion,
};
const result = await client.imagesRunway.v1.tasks.retrieve(taskId, params);
```

### audio_stability_ai

```typescript
// Stability AI text-to-audio (music and sound effects)
const body = new FormData();
const result = await client.audioStabilityAi.v2beta.audio.stableAudio2.textToAudio.create(body);
```

### images_stability_ai

```typescript
// Stability AI image generation
const mode = 'mode';
const body = new FormData();
const accept = 'application/json';
const params = {
  accept,
};
const result = await client.imagesStabilityAi.v2beta.stableImage.generate.update(mode, body, params);
```

### music_suno

```typescript
// Suno music generation
const body = {
  callback_url: 'callback_url',
  duration: 1,
  model: 'model',
  negative_tags: 'negative_tags',
  prompt: 'prompt',
  tags: 'tags',
  title: 'title',
};
const result = await client.musicSuno.v1.music.generations.create(body);
```

### chat_typesafe

```typescript
// TypeSafe AI System One decision
const body = {
  model: 'model',
  questions: {
    value: {},
  },
  state: 'state',
};
const result = await client.chatTypesafe.v1.systemone.create(body);
```

### assistant

```typescript
// List assistants
const params = {
  limit: 1,
  order: 'asc',
  after: 'after',
  before: 'before',
};
const result = await client.assistants.list(params);
```

### audio

```typescript
// List voice consents
const params = {
  limit: 1,
  order: 'asc',
  after: 'after',
  before: 'before',
};
const result = await client.audio.voiceConsents.list(params);
```

### batch

```typescript
// List batches
const params = {
  limit: 1,
  order: 'asc',
  after: 'after',
  before: 'before',
};
const result = await client.batches.list(params);
```

### chat

```typescript
// List stored chat completions
const params = {
  limit: 1,
  order: 'asc',
  after: 'after',
  before: 'before',
  model: 'model',
  metadata: 'metadata',
};
const result = await client.chat.completions.list(params);
```

### completion

```typescript
// Create completion
const body = {
  best_of: 1,
  echo: true,
  frequency_penalty: 1,
  logit_bias: {
    value: 1,
  },
  logprobs: 1,
  max_tokens: 1,
  model: 'model',
  n: 1,
  presence_penalty: 1,
  prompt: 'prompt',
  seed: 1,
  stop: 'stop',
  stream: true,
  stream_options: {
    include_usage: true,
  },
  suffix: 'suffix',
  temperature: 1,
  top_p: 1,
  user: 'user',
};
const result = await client.completion.create(body);
```

### container

```typescript
// List containers
const params = {
  limit: 1,
  order: 'asc',
  after: 'after',
  before: 'before',
};
const result = await client.container.list(params);
```

### conversation

```typescript
// List conversations
const params = {
  limit: 1,
  order: 'asc',
  after: 'after',
  before: 'before',
};
const result = await client.conversation.list(params);
```

### embedding

```typescript
// Create embeddings
const body = {
  dimensions: 1,
  encoding_format: 'float',
  input: 'input',
  model: 'model',
  user: 'user',
};
const result = await client.embeddings.create(body);
```

### file

```typescript
// List files
const params = {
  limit: 1,
  order: 'asc',
  after: 'after',
  before: 'before',
};
const result = await client.files.list(params);
```

### image

```typescript
// Create image edit
const body = {
  background: 'transparent',
  complexity: 'low',
  frame_count: 1,
  frame_duration_ms: 1,
  images: [
    'images',
  ],
  input_fidelity: 'high',
  markup: {
    value: 'value',
  },
  mask: {
    value: 'value',
  },
  model: 'model',
  moderation: 'low',
  n: 1,
  output_compression: 1,
  output_format: 'png',
  partial_images: 1,
  prompt: 'prompt',
  quality: 'low',
  safety_identifier: 'safety_identifier',
  size: 'size',
  stream: true,
  svg: {
    value: 'value',
  },
  user: 'user',
};
const result = await client.images.edits.create(body);
```

### model

```typescript
// List models
const result = await client.models.list();
```

### moderation

```typescript
// Create moderation
const body = {
  input: 'input',
  model: 'model',
};
const result = await client.moderations.create(body);
```

### realtime

```typescript
// Create realtime call
const body = {
  metadata: {
    value: 'value',
  },
  sdp: 'sdp',
  session: 'session',
};
const result = await client.realtime.calls.create(body);
```

### response

```typescript
// Create response
const body = {
  background: true,
  conversation: 'conversation',
  include: [
    'include',
  ],
  input: 'input',
  instructions: 'instructions',
  max_output_tokens: 1,
  max_tool_calls: 1,
  metadata: {
    value: 'value',
  },
  model: 'model',
  parallel_tool_calls: true,
  previous_response_id: 'previous_response_id',
  prompt: {
    id: 'id',
    variables: {},
    version: 'version',
  },
  prompt_cache_key: 'prompt_cache_key',
  reasoning: {
    effort: 'minimal',
    summary: 'auto',
  },
  service_tier: 'auto',
  store: true,
  stream: true,
  temperature: 1,
  text: {
    format: {},
  },
  tool_choice: 'tool_choice',
  tools: [
    {},
  ],
  top_logprobs: 1,
  top_p: 1,
  truncation: 'auto',
  user: 'user',
};
const result = await client.responses.create(body);
```

### thread

```typescript
// Create thread
const body = {
  messages: [
    {},
  ],
  metadata: {
    value: 'value',
  },
  tool_resources: 'tool_resources',
};
const result = await client.threads.create(body);
```

### tool

```typescript
// Fetch a web page
const body = {
  url: 'url',
};
const result = await client.tool.fetch.create(body);
```

### upload

```typescript
// Create upload
const body = {
  bytes: 1,
  expires_after: {
    value: 'value',
  },
  filename: 'filename',
  mime_type: 'mime_type',
  purpose: 'purpose',
};
const result = await client.uploads.create(body);
```

### vector_store

```typescript
// List vector stores
const params = {
  limit: 1,
  order: 'asc',
  after: 'after',
  before: 'before',
};
const result = await client.vectorStores.list(params);
```

### video

```typescript
// List videos
const params = {
  limit: 1,
  order: 'asc',
  after: 'after',
  before: 'before',
};
const result = await client.video.list(params);
```

### videos_vidu

```typescript
// Vidu image to video
const body = {
  audio: true,
  callback_url: 'callback_url',
  duration: 1,
  images: [
    'images',
  ],
  is_rec: true,
  meta_data: 'meta_data',
  model: 'model',
  off_peak: true,
  payload: 'payload',
  prompt: 'prompt',
  resolution: 'resolution',
  seed: 1,
  watermark: true,
  wm_position: 1,
  wm_url: 'wm_url',
};
const result = await client.videosVidu.ent.v2.img2video.create(body);
```

### images_vidu

```typescript
// Vidu reference to image
const body = {
  aspect_ratio: 'aspect_ratio',
  bgm: true,
  callback_url: 'callback_url',
  images: [
    'images',
  ],
  model: 'model',
  off_peak: true,
  payload: 'payload',
  prompt: 'prompt',
  resolution: 'resolution',
  seed: 1,
};
const result = await client.imagesVidu.ent.v2.reference2image.create(body);
```

### audio_vidu

```typescript
// Vidu text to audio
const body = {
  bgm: true,
  callback_url: 'callback_url',
  duration: 1,
  model: 'model',
  off_peak: true,
  payload: 'payload',
  prompt: 'prompt',
  seed: 1,
};
const result = await client.audioVidu.ent.v2.text2audio.create(body);
```

### audio_volcengine

```typescript
// Volcengine create speech
const body = {
  input: 'input',
  instructions: 'instructions',
  model: 'model',
  response_format: 'mp3',
  speed: 1,
  stream_format: 'sse',
  voice: 'voice',
};
const result = await client.audioVolcengine.api.v3.audio.speech.create(body);
```

### videos_volcengine

```typescript
// Volcengine Ark content generation task
const body = {
  callback_url: 'callback_url',
  camera_fixed: true,
  content: [
    {},
  ],
  draft: true,
  duration: 1,
  execution_expires_after: 1,
  frames: 1,
  generate_audio: true,
  model: 'model',
  omni_reference_task_type: 'auto',
  output_format: 'mp4',
  priority: 1,
  ratio: '16:9',
  resolution: '480p',
  return_last_frame: true,
  safety_identifier: 'safety_identifier',
  seed: 1,
  service_tier: 'default',
  tools: [
    {},
  ],
  watermark: true,
};
const result = await client.videosVolcengine.api.v3.contents.generations.tasks.create(body);
```

### images_volcengine

```typescript
// Volcengine Ark image generation
const body = {
  background: 'transparent',
  image: 'image',
  layer_decomposition: true,
  model: 'model',
  optimize_prompt_options: {
    mode: 'standard',
  },
  output_format: 'png',
  prompt: 'prompt',
  response_format: 'url',
  sequential_image_generation: 'auto',
  sequential_image_generation_options: {
    max_images: 1,
  },
  size: 'size',
  stream: true,
  tools: [
    {},
  ],
  watermark: true,
};
const result = await client.imagesVolcengine.api.v3.images.generations.create(body);
```

### images_xai

```typescript
// xAI Grok Imagine image edit
const body = {
  aspect_ratio: '1:1',
  deferred: true,
  image: {
    file_id: 'file_id',
    url: 'url',
  },
  images: [
    {},
  ],
  model: 'model',
  n: 1,
  output: {
    value: 'value',
  },
  prompt: 'prompt',
  resolution: '1k',
  response_format: 'url',
  storage_options: {
    value: 'value',
  },
  user: 'user',
};
const result = await client.imagesXai.v1.images.edits.create(body);
```

### videos_xai

```typescript
// xAI Grok Imagine video edit
const body = {
  model: 'model',
  output: {
    value: 'value',
  },
  prompt: 'prompt',
  storage_options: {
    value: 'value',
  },
  user: 'user',
  video: {
    file_id: 'file_id',
    url: 'url',
  },
};
const result = await client.videosXai.v1.videos.edits.create(body);
```

### videos_zhipu

```typescript
// Zhipu retrieve video generation task
const taskId = '1';
const result = await client.videosZhipu.api.paas.v4.asyncResult.retrieve(taskId);
```

### images_zhipu

```typescript
// Zhipu CogView image generation
const body = {
  model: 'glm-image',
  prompt: 'prompt',
  quality: 'hd',
  size: 'size',
  user_id: 'user_id',
  watermark_enabled: true,
};
const result = await client.imagesZhipu.api.paas.v4.images.generations.create(body);
```

## Error Handling

```typescript
import { SdkworkAiClient, NetworkError, TimeoutError, AuthenticationError } from '@sdkwork/cloudrouter-open-sdk';

try {
  const result = await client.models.list();
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  } else if (error instanceof TimeoutError) {
    console.error('Request timed out:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    throw error;
  }
}
```

## Publishing

This SDK includes cross-platform publish scripts in `bin/`:
- `bin/publish-core.mjs`
- `bin/publish.sh`
- `bin/publish.ps1`

TypeScript check and publish commands materialize workspace dependency versions in a temporary tarball with pnpm. They reject local-only dependency protocols before npm publication and do not rewrite the source `package.json`.

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

> Set `NPM_TOKEN` (and optional `NPM_REGISTRY_URL`) before release publish.

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
