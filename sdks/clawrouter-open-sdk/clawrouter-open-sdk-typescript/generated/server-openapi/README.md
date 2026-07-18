# clawrouter-open-sdk

SDKWork Claw Router OpenAI-compatible gateway SDK

## Installation

```bash
npm install @sdkwork/clawrouter-open-sdk
# or
yarn add @sdkwork/clawrouter-open-sdk
# or
pnpm add @sdkwork/clawrouter-open-sdk
```

## Quick Start

```typescript
import { SdkworkAiClient } from '@sdkwork/clawrouter-open-sdk';

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
import { SdkworkAiClient } from '@sdkwork/clawrouter-open-sdk';

const client = new SdkworkAiClient({
  baseUrl: 'https://api.sdkwork.com',
  timeout: 30000, // Request timeout in ms
  headers: {      // Custom headers
    'X-Custom-Header': 'value',
  },
});
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
- `client.files` - file API
- `client.images` - image API
- `client.models` - model API
- `client.moderations` - moderation API
- `client.realtime` - realtime API
- `client.responses` - response API
- `client.threads` - thread API
- `client.uploads` - upload API
- `client.vectorStores` - vector_store API
- `client.video` - video API
- `client.videosVidu` - videos_vidu API
- `client.imagesVidu` - images_vidu API
- `client.videosVolcengine` - videos_volcengine API

## Usage Examples

### files_anthropic

```typescript
// Anthropic list files
const params = {
  before_id: 'before_id',
  after_id: 'after_id',
  limit: 3,
};
const result = await client.filesAnthropic.v1.files.list(params);
```

### chat_anthropic

```typescript
// Anthropic Claude message
const body = {
  max_tokens: 1,
  messages: [
    {},
  ],
  metadata: {
    value: 'value',
  },
  model: 'model',
  stop_sequences: [
    'stop_sequences',
  ],
  stream: true,
  system: 'system',
  temperature: 1,
  thinking: {
    budget_tokens: 1,
    type: 'type',
  },
  tool_choice: {
    name: 'name',
    type: 'type',
  },
  tools: [
    {},
  ],
  top_k: 1,
  top_p: 1,
};
const result = await client.chatAnthropic.v1.messages.create(body);
```

### batches_anthropic

```typescript
// Anthropic list message batches
const params = {
  before_id: 'before_id',
  after_id: 'after_id',
  limit: 3,
};
const result = await client.batchesAnthropic.v1.messages.batches.list(params);
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
    generationConfig: {},
    safetySettings: [],
    systemInstruction: {},
    toolConfig: {},
    tools: [],
  },
};
const result = await client.chatGoogle.v1beta.models.modelCountTokens.create(model, body);
```

### videos_kling

```typescript
// Kling video generation
const body = {
  aspect_ratio: 'aspect_ratio',
  callback_url: 'callback_url',
  cfg_scale: 1,
  duration: 1,
  image: 'image',
  image_tail: 'image_tail',
  mode: 'mode',
  model: 'model',
  negative_prompt: 'negative_prompt',
  prompt: 'prompt',
};
const result = await client.videosKling.v1.videos.generations.create(body);
```

### images_midjourney

```typescript
// Midjourney image generation
const body = {
  aspect_ratio: 'aspect_ratio',
  callback_url: 'callback_url',
  model: 'model',
  prompt: 'prompt',
  seed: 1,
  style: 'style',
};
const result = await client.imagesMidjourney.v1.images.generations.create(body);
```

### images_nano_banana

```typescript
// Nano Banana image generation
const body = {
  aspect_ratio: 'aspect_ratio',
  callback_url: 'callback_url',
  images: [
    'images',
  ],
  model: 'model',
  prompt: 'prompt',
  seed: 1,
  size: 'size',
};
const result = await client.imagesNanoBanana.v1.images.generations.create(body);
```

### audio_suno

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
const result = await client.audioSuno.v1.music.generations.create(body);
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
  image: 'image',
  mask: 'mask',
  model: 'model',
  prompt: 'prompt',
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

### upload

```typescript
// Create upload
const body = {
  bytes: 1,
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
  aspect_ratio: 'aspect_ratio',
  callback_url: 'callback_url',
  duration: 1,
  images: [
    'images',
  ],
  model: 'model',
  movement_amplitude: 'movement_amplitude',
  payload: 'payload',
  prompt: 'prompt',
  resolution: 'resolution',
  seed: 1,
};
const result = await client.videosVidu.ent.v2.img2video.create(body);
```

### images_vidu

```typescript
// Vidu reference to image
const body = {
  aspect_ratio: 'aspect_ratio',
  callback_url: 'callback_url',
  images: [
    'images',
  ],
  model: 'model',
  payload: 'payload',
  prompt: 'prompt',
  seed: 1,
  style: 'style',
};
const result = await client.imagesVidu.ent.v2.reference2image.create(body);
```

### videos_volcengine

```typescript
// Volcengine Ark content generation task
const body = {
  callback_url: 'callback_url',
  content: [
    {},
  ],
  metadata: {
    value: 'value',
  },
  model: 'model',
};
const result = await client.videosVolcengine.api.v3.contents.generations.tasks.create(body);
```

## Error Handling

```typescript
import { SdkworkAiClient, NetworkError, TimeoutError, AuthenticationError } from '@sdkwork/clawrouter-open-sdk';

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
