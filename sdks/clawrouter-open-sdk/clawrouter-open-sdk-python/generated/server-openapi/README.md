# clawrouter-open-sdk (Python)

SDKWork Claw Router OpenAI-compatible gateway SDK python generated transport SDK

## Installation

```bash
pip install sdkwork-clawrouter-open-sdk
```

## Quick Start

```python
from sdkwork_clawrouter_open_sdk import SdkworkAiClient, SdkConfig

config = SdkConfig(
    base_url="https://api.sdkwork.com",
)

client = SdkworkAiClient(config)
client.set_api_key("your-api-key")

# Use the SDK
result = client.models.list()
```

## Authentication Modes (Mutually Exclusive)

Choose exactly one mode for the same client instance.

### Mode A: API Key

```python
config = SdkConfig(base_url="https://api.sdkwork.com")
client = SdkworkAiClient(config)
client.set_api_key("your-api-key")
# Sends: Authorization: Bearer <apiKey>
```

### Mode B: Dual Token

```python
config = SdkConfig(base_url="https://api.sdkwork.com")
client = SdkworkAiClient(config)
client.set_auth_token("your-auth-token")
client.set_access_token("your-access-token")
# Sends:
# Authorization: Bearer <authToken>
# Access-Token: <accessToken>
```

> Do not call `set_api_key(...)` together with `set_auth_token(...)` + `set_access_token(...)` on the same client.

## Configuration (Non-Auth)

```python
from sdkwork_clawrouter_open_sdk import SdkworkAiClient, SdkConfig

config = SdkConfig(
    base_url="https://api.sdkwork.com",
)

client = SdkworkAiClient(config)
client.set_header('X-Custom-Header', 'value')
```

## API Modules

- `client.files_anthropic` - files_anthropic API
- `client.chat_anthropic` - chat_anthropic API
- `client.batches_anthropic` - batches_anthropic API
- `client.responses_google` - responses_google API
- `client.files_google` - files_google API
- `client.embeddings_google` - embeddings_google API
- `client.chat_google` - chat_google API
- `client.videos_kling` - videos_kling API
- `client.images_midjourney` - images_midjourney API
- `client.images_nano_banana` - images_nano_banana API
- `client.audio_suno` - audio_suno API
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
- `client.vector_stores` - vector_store API
- `client.video` - video API
- `client.videos_vidu` - videos_vidu API
- `client.images_vidu` - images_vidu API
- `client.videos_volcengine` - videos_volcengine API

## Usage Examples

### files_anthropic

```python
# Anthropic list files
params = {
    'before_id': 'before_id',
    'after_id': 'after_id',
    'limit': 3,
}
result = client.files_anthropic.get_list_v1_files(params)
print(result)
```

### chat_anthropic

```python
# Anthropic Claude message
body = {
    'max_tokens': 1,
    'messages': [
        {},
    ],
    'metadata': {
        'value': 'value',
    },
    'model': 'model',
    'stop_sequences': [
        'stop_sequences',
    ],
    'stream': True,
    'system': 'system',
    'temperature': 1,
    'thinking': {
        'budget_tokens': 1,
        'type': 'type',
    },
    'tool_choice': {
        'name': 'name',
        'type': 'type',
    },
    'tools': [
        {},
    ],
    'top_k': 1,
    'top_p': 1,
}
result = client.chat_anthropic.create_v1_message(body)
print(result)
```

### batches_anthropic

```python
# Anthropic list message batches
params = {
    'before_id': 'before_id',
    'after_id': 'after_id',
    'limit': 3,
}
result = client.batches_anthropic.get_list_v1_messages_batches(params)
print(result)
```

### responses_google

```python
# Google Gemini list cached contents
params = {
    'pageSize': 1,
    'pageToken': 'pageToken',
}
result = client.responses_google.get_list_v1beta_cached_contents(params)
print(result)
```

### files_google

```python
# Google Gemini list files
params = {
    'pageSize': 1,
    'pageToken': 'pageToken',
}
result = client.files_google.get_list_v1beta_files(params)
print(result)
```

### embeddings_google

```python
# Google Gemini batch embed contents
model = 'model'
body = {
    'requests': [
        {},
    ],
}
result = client.embeddings_google.create_v1beta_models_model_batch_embed_content(model, body)
print(result)
```

### chat_google

```python
# Google Gemini count tokens
model = 'model'
body = {
    'contents': [
        {},
    ],
    'generateContentRequest': {
        'cachedContent': 'cachedContent',
        'contents': [],
        'generationConfig': {},
        'safetySettings': [],
        'systemInstruction': {},
        'toolConfig': {},
        'tools': [],
    },
}
result = client.chat_google.create_v1beta_models_model_count_token(model, body)
print(result)
```

### videos_kling

```python
# Kling video generation
body = {
    'aspect_ratio': 'aspect_ratio',
    'callback_url': 'callback_url',
    'cfg_scale': 1,
    'duration': 1,
    'image': 'image',
    'image_tail': 'image_tail',
    'mode': 'mode',
    'model': 'model',
    'negative_prompt': 'negative_prompt',
    'prompt': 'prompt',
}
result = client.videos_kling.create_v1_videos_generation(body)
print(result)
```

### images_midjourney

```python
# Midjourney image generation
body = {
    'aspect_ratio': 'aspect_ratio',
    'callback_url': 'callback_url',
    'model': 'model',
    'prompt': 'prompt',
    'seed': 1,
    'style': 'style',
}
result = client.images_midjourney.create_v1_images_generation(body)
print(result)
```

### images_nano_banana

```python
# Nano Banana image generation
body = {
    'aspect_ratio': 'aspect_ratio',
    'callback_url': 'callback_url',
    'images': [
        'images',
    ],
    'model': 'model',
    'prompt': 'prompt',
    'seed': 1,
    'size': 'size',
}
result = client.images_nano_banana.create_generations(body)
print(result)
```

### audio_suno

```python
# Suno music generation
body = {
    'callback_url': 'callback_url',
    'duration': 1,
    'model': 'model',
    'negative_tags': 'negative_tags',
    'prompt': 'prompt',
    'tags': 'tags',
    'title': 'title',
}
result = client.audio_suno.create_v1_music_generation(body)
print(result)
```

### assistant

```python
# List assistants
params = {
    'limit': 1,
    'order': 'asc',
    'after': 'after',
    'before': 'before',
}
result = client.assistants.list(params)
print(result)
```

### audio

```python
# List voice consents
params = {
    'limit': 1,
    'order': 'asc',
    'after': 'after',
    'before': 'before',
}
result = client.audio.get_list_voice_consents(params)
print(result)
```

### batch

```python
# List batches
params = {
    'limit': 1,
    'order': 'asc',
    'after': 'after',
    'before': 'before',
}
result = client.batches.list(params)
print(result)
```

### chat

```python
# List stored chat completions
params = {
    'limit': 1,
    'order': 'asc',
    'after': 'after',
    'before': 'before',
    'model': 'model',
    'metadata': 'metadata',
}
result = client.chat.list(params)
print(result)
```

### completion

```python
# Create completion
body = {
    'best_of': 1,
    'echo': True,
    'frequency_penalty': 1,
    'logit_bias': {
        'value': 1,
    },
    'logprobs': 1,
    'max_tokens': 1,
    'model': 'model',
    'n': 1,
    'presence_penalty': 1,
    'prompt': 'prompt',
    'seed': 1,
    'stop': 'stop',
    'stream': True,
    'suffix': 'suffix',
    'temperature': 1,
    'top_p': 1,
    'user': 'user',
}
result = client.completion.create(body)
print(result)
```

### container

```python
# List containers
params = {
    'limit': 1,
    'order': 'asc',
    'after': 'after',
    'before': 'before',
}
result = client.container.list(params)
print(result)
```

### conversation

```python
# List conversations
params = {
    'limit': 1,
    'order': 'asc',
    'after': 'after',
    'before': 'before',
}
result = client.conversation.list(params)
print(result)
```

### embedding

```python
# Create embeddings
body = {
    'dimensions': 1,
    'encoding_format': 'float',
    'input': 'input',
    'model': 'model',
    'user': 'user',
}
result = client.embeddings.create(body)
print(result)
```

### file

```python
# List files
params = {
    'limit': 1,
    'order': 'asc',
    'after': 'after',
    'before': 'before',
}
result = client.files.list(params)
print(result)
```

### image

```python
# Create image edit
body = {
    'image': 'image',
    'mask': 'mask',
    'model': 'model',
    'prompt': 'prompt',
}
result = client.images.create_edit(body)
print(result)
```

### model

```python
# List models
result = client.models.list()
print(result)
```

### moderation

```python
# Create moderation
body = {
    'input': 'input',
    'model': 'model',
}
result = client.moderations.create(body)
print(result)
```

### realtime

```python
# Create realtime call
body = {
    'metadata': {
        'value': 'value',
    },
    'sdp': 'sdp',
    'session': 'session',
}
result = client.realtime.create_call(body)
print(result)
```

### response

```python
# Create response
body = {
    'background': True,
    'conversation': 'conversation',
    'include': [
        'include',
    ],
    'input': 'input',
    'instructions': 'instructions',
    'max_output_tokens': 1,
    'max_tool_calls': 1,
    'metadata': {
        'value': 'value',
    },
    'model': 'model',
    'parallel_tool_calls': True,
    'previous_response_id': 'previous_response_id',
    'prompt': {
        'id': 'id',
        'variables': {},
        'version': 'version',
    },
    'prompt_cache_key': 'prompt_cache_key',
    'reasoning': {
        'effort': 'minimal',
        'summary': 'auto',
    },
    'service_tier': 'auto',
    'store': True,
    'stream': True,
    'temperature': 1,
    'text': {
        'format': {},
    },
    'tool_choice': 'tool_choice',
    'tools': [
        {},
    ],
    'top_logprobs': 1,
    'top_p': 1,
    'truncation': 'auto',
    'user': 'user',
}
result = client.responses.create(body)
print(result)
```

### thread

```python
# Create thread
body = {
    'messages': [
        {},
    ],
    'metadata': {
        'value': 'value',
    },
    'tool_resources': 'tool_resources',
}
result = client.threads.create(body)
print(result)
```

### upload

```python
# Create upload
body = {
    'bytes': 1,
    'filename': 'filename',
    'mime_type': 'mime_type',
    'purpose': 'purpose',
}
result = client.uploads.create(body)
print(result)
```

### vector_store

```python
# List vector stores
params = {
    'limit': 1,
    'order': 'asc',
    'after': 'after',
    'before': 'before',
}
result = client.vector_stores.list_vector_stores(params)
print(result)
```

### video

```python
# List videos
params = {
    'limit': 1,
    'order': 'asc',
    'after': 'after',
    'before': 'before',
}
result = client.video.list(params)
print(result)
```

### videos_vidu

```python
# Vidu image to video
body = {
    'aspect_ratio': 'aspect_ratio',
    'callback_url': 'callback_url',
    'duration': 1,
    'images': [
        'images',
    ],
    'model': 'model',
    'movement_amplitude': 'movement_amplitude',
    'payload': 'payload',
    'prompt': 'prompt',
    'resolution': 'resolution',
    'seed': 1,
}
result = client.videos_vidu.create_ent_v2_img2video(body)
print(result)
```

### images_vidu

```python
# Vidu reference to image
body = {
    'aspect_ratio': 'aspect_ratio',
    'callback_url': 'callback_url',
    'images': [
        'images',
    ],
    'model': 'model',
    'payload': 'payload',
    'prompt': 'prompt',
    'seed': 1,
    'style': 'style',
}
result = client.images_vidu.create_ent_v2_reference2image(body)
print(result)
```

### videos_volcengine

```python
# Volcengine Ark content generation task
body = {
    'callback_url': 'callback_url',
    'content': [
        {},
    ],
    'metadata': {
        'value': 'value',
    },
    'model': 'model',
}
result = client.videos_volcengine.create_api_v3_contents_generations_task(body)
print(result)
```

## Error Handling

```python
try:
    client.models.list()
except Exception as error:
    print(f"Error: {error}")
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

> Set `PYPI_TOKEN` for release (or `TEST_PYPI_TOKEN` for test channel).

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
