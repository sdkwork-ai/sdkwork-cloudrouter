# cloudrouter-open-sdk (Python)

SDKWork Cloud Router OpenAI-compatible gateway SDK python generated transport SDK

## Installation

```bash
pip install sdkwork-cloudrouter-open-sdk
```

## Quick Start

```python
from sdkwork_cloudrouter_open_sdk import SdkworkAiClient, SdkConfig

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
from sdkwork_cloudrouter_open_sdk import SdkworkAiClient, SdkConfig

config = SdkConfig(
    base_url="https://api.sdkwork.com",
)

client = SdkworkAiClient(config)
client.set_header('X-Custom-Header', 'value')
```

## API Modules

- `client.images_alibaba` - images_alibaba API
- `client.videos_alibaba` - videos_alibaba API
- `client.audio_alibaba` - audio_alibaba API
- `client.files_anthropic` - files_anthropic API
- `client.chat_anthropic` - chat_anthropic API
- `client.batches_anthropic` - batches_anthropic API
- `client.videos_black_forest_labs` - videos_black_forest_labs API
- `client.images_black_forest_labs` - images_black_forest_labs API
- `client.videos_bytedance` - videos_bytedance API
- `client.images_bytedance` - images_bytedance API
- `client.audio_bytedance` - audio_bytedance API
- `client.music_elevenlabs` - music_elevenlabs API
- `client.audio_elevenlabs` - audio_elevenlabs API
- `client.responses_google` - responses_google API
- `client.files_google` - files_google API
- `client.videos_google` - videos_google API
- `client.embeddings_google` - embeddings_google API
- `client.chat_google` - chat_google API
- `client.images_google` - images_google API
- `client.videos_jimeng` - videos_jimeng API
- `client.audio_kling` - audio_kling API
- `client.images_kling` - images_kling API
- `client.videos_kling` - videos_kling API
- `client.videos_luma_ai` - videos_luma_ai API
- `client.videos_minimax` - videos_minimax API
- `client.images_minimax` - images_minimax API
- `client.music_minimax` - music_minimax API
- `client.audio_minimax` - audio_minimax API
- `client.music_mureka` - music_mureka API
- `client.videos_pixverse` - videos_pixverse API
- `client.videos_runway` - videos_runway API
- `client.images_runway` - images_runway API
- `client.audio_stability_ai` - audio_stability_ai API
- `client.images_stability_ai` - images_stability_ai API
- `client.music_suno` - music_suno API
- `client.chat_typesafe` - chat_typesafe API
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
- `client.vector_stores` - vector_store API
- `client.video` - video API
- `client.videos_vidu` - videos_vidu API
- `client.images_vidu` - images_vidu API
- `client.audio_vidu` - audio_vidu API
- `client.audio_volcengine` - audio_volcengine API
- `client.videos_volcengine` - videos_volcengine API
- `client.images_volcengine` - images_volcengine API
- `client.images_xai` - images_xai API
- `client.videos_xai` - videos_xai API
- `client.videos_zhipu` - videos_zhipu API
- `client.images_zhipu` - images_zhipu API

## Usage Examples

### images_alibaba

```python
# Alibaba Wanx image generation
body = {
    'input': {
        'negative_prompt': 'negative_prompt',
        'prompt': 'prompt',
    },
    'model': 'model',
    'parameters': {
        'n': 1,
        'prompt_extend': True,
        'seed': 1,
        'size': 'size',
        'watermark': True,
    },
}
x_dash_scope_async = 'enable'
result = client.images_alibaba.create_api_v1_services_aigc_text2image_image_synthesi(body, x_dash_scope_async)
print(result)
```

### videos_alibaba

```python
# Alibaba Wan retrieve video generation task
task_id = '1'
result = client.videos_alibaba.list_api_v1_tasks(task_id)
print(result)
```

### audio_alibaba

```python
# Alibaba Qwen TTS speech synthesis
body = {
    'input': {
        'instructions': 'instructions',
        'language_type': 'Auto',
        'optimize_instructions': True,
        'text': 'text',
        'voice': 'voice',
    },
    'model': 'model',
    'parameters': {
        'value': 'value',
    },
}
result = client.audio_alibaba.create_api_v1_services_audio_tts_speech_synthesizer(body)
print(result)
```

### files_anthropic

```python
# Anthropic list files
params = {
    'before_id': 'before_id',
    'after_id': 'after_id',
    'limit': 3,
}
anthropic_version = 'anthropic-version'
result = client.files_anthropic.get_list_v1_files(params, anthropic_version)
print(result)
```

### chat_anthropic

```python
# Anthropic Claude message
body = {
    'cache_control': {
        'ttl': '5m',
        'type': 'ephemeral',
    },
    'container': {
        'id': 'id',
        'skills': [],
    },
    'diagnostics': {
        'previous_message_id': 'previous_message_id',
    },
    'inference_geo': 'inference_geo',
    'max_tokens': 1,
    'messages': [
        {},
    ],
    'metadata': {
        'user_id': 'user_id',
    },
    'model': 'model',
    'output_config': {
        'effort': 'low',
        'format': {},
    },
    'service_tier': 'auto',
    'speed': 'standard',
    'stop_sequences': [
        'stop_sequences',
    ],
    'stream': True,
    'system': 'system',
    'temperature': 1,
    'thinking': {
        'budget_tokens': 1,
        'display': 'summarized',
        'type': 'enabled',
    },
    'tool_choice': {
        'disable_parallel_tool_use': True,
        'name': 'name',
        'type': 'auto',
    },
    'tools': [
        {},
    ],
    'top_k': 1,
    'top_p': 1,
}
anthropic_version = 'anthropic-version'
result = client.chat_anthropic.create_v1_message(body, anthropic_version)
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
anthropic_version = 'anthropic-version'
result = client.batches_anthropic.get_list_v1_messages_batches(params, anthropic_version)
print(result)
```

### videos_black_forest_labs

```python
# Black Forest Labs FLUX 3 video generation
body = {
    'aspect_ratio': '21:9',
    'draft': True,
    'draft_cache': 'draft_cache',
    'duration': 1,
    'generate_audio': True,
    'keyframes': 'keyframes',
    'mode': 't2v',
    'prompt': 'prompt',
    'resolution': 'hd',
    'safety_tolerance': 1,
    'start_video': 'start_video',
    'user': 'user',
    'version': 'version',
}
result = client.videos_black_forest_labs.create_flux_3_video(body)
print(result)
```

### images_black_forest_labs

```python
# Black Forest Labs retrieve generation result
params = {
    'id': 'id',
}
result = client.images_black_forest_labs.list_get_result(params)
print(result)
```

### videos_bytedance

```python
# ByteDance Seedance video generation
body = {
    'callback_url': 'callback_url',
    'camera_fixed': True,
    'content': [
        {},
    ],
    'draft': True,
    'duration': 1,
    'execution_expires_after': 1,
    'frames': 1,
    'generate_audio': True,
    'model': 'model',
    'omni_reference_task_type': 'auto',
    'output_format': 'mp4',
    'priority': 1,
    'ratio': '16:9',
    'resolution': '480p',
    'return_last_frame': True,
    'safety_identifier': 'safety_identifier',
    'seed': 1,
    'service_tier': 'default',
    'tools': [
        {},
    ],
    'watermark': True,
}
result = client.videos_bytedance.create_api_v3_contents_generations_task(body)
print(result)
```

### images_bytedance

```python
# ByteDance Seedream image generation
body = {
    'background': 'transparent',
    'image': 'image',
    'layer_decomposition': True,
    'model': 'model',
    'optimize_prompt_options': {
        'mode': 'standard',
    },
    'output_format': 'png',
    'prompt': 'prompt',
    'response_format': 'url',
    'sequential_image_generation': 'auto',
    'sequential_image_generation_options': {
        'max_images': 1,
    },
    'size': 'size',
    'stream': True,
    'tools': [
        {},
    ],
    'watermark': True,
}
result = client.images_bytedance.create_api_v3_images_generation(body)
print(result)
```

### audio_bytedance

```python
# ByteDance Seed TTS speech synthesis
body = {
    'req_params': {
        'additions': 'additions',
        'audio_params': {},
        'model': 'model',
        'pronunciation_dict': {},
        'speaker': 'speaker',
        'ssml': 'ssml',
        'text': 'text',
        'tone': [],
    },
}
x_api_resource_id = 'seed-tts-2.0'
x_api_request_id = 'X-Api-Request-Id'
result = client.audio_bytedance.create_api_v3_tts_unidirectional(body, x_api_resource_id, x_api_request_id)
print(result)
```

### music_elevenlabs

```python
# ElevenLabs music generation
body = {
    'composition_plan': {
        'negative_global_styles': [],
        'positive_global_styles': [],
        'sections': [],
    },
    'finetune_id': 'finetune_id',
    'finetune_strength': 1,
    'force_instrumental': True,
    'generation_mode': 'track',
    'lyrics_text': 'lyrics_text',
    'model_id': 'music_v1',
    'music_length_ms': 1,
    'music_prompt': {
        'negative_global_styles': [],
        'positive_global_styles': [],
        'sections': [],
    },
    'prompt': 'prompt',
    'respect_sections_durations': True,
    'seed': 1,
    'sign_with_c2pa': True,
    'store_for_inpainting': True,
    'use_phonetic_names': True,
}
params = {
    'output_format': 'output_format',
}
result = client.music_elevenlabs.create_v1_music(body, params)
print(result)
```

### audio_elevenlabs

```python
# Generate sound effect
body = {
    'duration_seconds': 1,
    'loop': True,
    'model_id': 'eleven_text_to_sound_v2',
    'prompt_influence': 1,
    'text': 'text',
}
params = {
    'output_format': 'output_format',
}
result = client.audio_elevenlabs.create_v1_sound_generation(body, params)
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

### videos_google

```python
# Google Gemini retrieve video operation (Veo)
model = 'model'
operation_id = '1'
result = client.videos_google.list_v1beta_models_operations(model, operation_id)
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
        'continuationToken': 'continuationToken',
        'generationConfig': {},
        'labels': {},
        'model': 'model',
        'safetySettings': [],
        'serviceTier': 'unspecified',
        'store': True,
        'systemInstruction': {},
        'toolConfig': {},
        'tools': [],
    },
}
result = client.chat_google.create_v1beta_models_model_count_token(model, body)
print(result)
```

### images_google

```python
# Google Gemini image generation
model = 'model'
body = {
    'instances': [
        {},
    ],
    'parameters': {
        'aspectRatio': 'aspectRatio',
        'personGeneration': 'personGeneration',
        'sampleCount': 1,
    },
}
result = client.images_google.create_v1beta_models_model_generate_image(model, body)
print(result)
```

### videos_jimeng

```python
# Jimeng retrieve video generation task
task_id = '1'
result = client.videos_jimeng.list_v1_tasks(task_id)
print(result)
```

### audio_kling

```python
# Kling text to audio
body = {
    'callback_url': 'callback_url',
    'duration': 1,
    'external_task_id': 'external_task_id',
    'prompt': 'prompt',
}
result = client.audio_kling.create_v1_audio_text_to_audio(body)
print(result)
```

### images_kling

```python
# Kling image generation
body = {
    'aspect_ratio': '16:9',
    'callback_url': 'callback_url',
    'element_list': [
        {},
    ],
    'external_task_id': 'external_task_id',
    'human_fidelity': 1,
    'image': 'image',
    'image_fidelity': 1,
    'image_reference': 'subject',
    'model_name': 'kling-v2-1',
    'n': 1,
    'negative_prompt': 'negative_prompt',
    'prompt': 'prompt',
    'resolution': '1k',
    'watermark_info': {
        'enabled': True,
    },
}
result = client.images_kling.create_v1_images_generation(body)
print(result)
```

### videos_kling

```python
# Kling create avatar video
body = {
    'audio_url': 'audio_url',
    'callback_url': 'callback_url',
    'human_image': 'human_image',
    'model_name': 'model_name',
    'prompt': 'prompt',
    'text': 'text',
    'voice_id': 'voice_id',
    'voice_language': 'voice_language',
    'voice_mode': 'voice_mode',
}
result = client.videos_kling.create_v1_videos_avatar(body)
print(result)
```

### videos_luma_ai

```python
# Luma Dream Machine video generation
body = {
    'aspect_ratio': '1:1',
    'callback_url': 'callback_url',
    'concepts': [
        {},
    ],
    'duration': 'duration',
    'generation_type': 'video',
    'keyframes': {
        'frame0': {},
        'frame1': {},
    },
    'loop': True,
    'model': 'ray-2',
    'prompt': 'prompt',
    'resolution': 'resolution',
}
result = client.videos_luma_ai.create_generations(body)
print(result)
```

### videos_minimax

```python
# MiniMax retrieve video file
params = {
    'file_id': 'file_id',
}
result = client.videos_minimax.list_v1_files_retrieve(params)
print(result)
```

### images_minimax

```python
# MiniMax image generation
body = {
    'aspect_ratio': '1:1',
    'height': 1,
    'model': 'image-01',
    'n': 1,
    'prompt': 'prompt',
    'prompt_optimizer': True,
    'response_format': 'url',
    'seed': 1,
    'subject_reference': [
        {},
    ],
    'width': 1,
}
result = client.images_minimax.create_v1_image_generation(body)
print(result)
```

### music_minimax

```python
# Minimax create music generation
body = {
    'audio_base64': 'audio_base64',
    'audio_setting': {
        'bitrate': 32000,
        'format': 'mp3',
        'sample_rate': 16000,
    },
    'audio_url': 'audio_url',
    'cover_feature_id': 'cover_feature_id',
    'is_instrumental': True,
    'lyrics': 'lyrics',
    'lyrics_optimizer': True,
    'model': 'music-3.0',
    'output_format': 'url',
    'prompt': 'prompt',
    'stream': True,
}
result = client.music_minimax.create_v1_music_generation(body)
print(result)
```

### audio_minimax

```python
# MiniMax speech synthesis
body = {
    'audio_setting': {
        'value': 'value',
    },
    'language_boost': 'language_boost',
    'model': 'speech-2.8-hd',
    'output_format': 'url',
    'pronunciation_dict': {
        'value': 'value',
    },
    'stream': True,
    'stream_options': {
        'exclude_aggregated_audio': True,
    },
    'subtitle_enable': True,
    'subtitle_type': 'sentence',
    'text': 'text',
    'text_normalization_mode': 'basic',
    'timbre_weights': [
        {},
    ],
    'voice_modify': {
        'intensity': 1,
        'pitch': 1,
        'sound_effects': 'spacious_echo',
        'timbre': 1,
    },
    'voice_setting': {
        'value': 'value',
    },
}
result = client.audio_minimax.create_v1_t2a_v(body)
print(result)
```

### music_mureka

```python
# Mureka song generation
body = {
    'callback_url': 'callback_url',
    'duration': 1,
    'lyrics': 'lyrics',
    'model': 'model',
    'prompt': 'prompt',
    'reference_audio_url': 'reference_audio_url',
    'tags': [
        'tags',
    ],
    'title': 'title',
}
result = client.music_mureka.create_v1_song_generate(body)
print(result)
```

### videos_pixverse

```python
# PixVerse retrieve video generation
video_id = '1'
ai_trace_id = 'Ai-trace-id'
result = client.videos_pixverse.list_openapi_v2_video_result(video_id, ai_trace_id)
print(result)
```

### videos_runway

```python
# Runway image to video
body = {
    'audio': True,
    'bitrate': 'standard',
    'cfgScale': 1,
    'contentModeration': {
        'value': 'value',
    },
    'draft': True,
    'duration': 1,
    'model': 'model',
    'negativePrompt': 'negativePrompt',
    'outputFormat': 'mp4',
    'promptExpansionMode': 'disabled',
    'promptImage': 'promptImage',
    'promptText': 'promptText',
    'proresProfile': '422',
    'providerSettings': {
        'value': 'value',
    },
    'ratio': 'ratio',
    'referenceAudio': [
        {},
    ],
    'referenceVideos': [
        {},
    ],
    'references': [
        {},
    ],
    'resolution': '480p',
    'seed': 1,
}
x_runway_version = '2024-11-06'
result = client.videos_runway.create_v1_image_to_video(body, x_runway_version)
print(result)
```

### images_runway

```python
# Runway retrieve task
task_id = '1'
x_runway_version = '2024-11-06'
result = client.images_runway.list_v1_tasks(task_id, x_runway_version)
print(result)
```

### audio_stability_ai

```python
# Stability AI text-to-audio (music and sound effects)
body = {}
result = client.audio_stability_ai.create_text_to_audio(body)
print(result)
```

### images_stability_ai

```python
# Stability AI image generation
mode = 'mode'
body = {}
accept = 'application/json'
result = client.images_stability_ai.create_generate(mode, body, accept)
print(result)
```

### music_suno

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
result = client.music_suno.create_v1_music_generation(body)
print(result)
```

### chat_typesafe

```python
# TypeSafe AI System One decision
body = {
    'model': 'model',
    'questions': {
        'value': {},
    },
    'state': 'state',
}
result = client.chat_typesafe.create_v1_systemone(body)
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
    'stream_options': {
        'include_usage': True,
    },
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
    'background': 'transparent',
    'complexity': 'low',
    'frame_count': 1,
    'frame_duration_ms': 1,
    'images': [
        'images',
    ],
    'input_fidelity': 'high',
    'markup': {
        'value': 'value',
    },
    'mask': {
        'value': 'value',
    },
    'model': 'model',
    'moderation': 'low',
    'n': 1,
    'output_compression': 1,
    'output_format': 'png',
    'partial_images': 1,
    'prompt': 'prompt',
    'quality': 'low',
    'safety_identifier': 'safety_identifier',
    'size': 'size',
    'stream': True,
    'svg': {
        'value': 'value',
    },
    'user': 'user',
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

### tool

```python
# Fetch a web page
body = {
    'url': 'url',
}
result = client.tool.create_fetch(body)
print(result)
```

### upload

```python
# Create upload
body = {
    'bytes': 1,
    'expires_after': {
        'value': 'value',
    },
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
    'audio': True,
    'callback_url': 'callback_url',
    'duration': 1,
    'images': [
        'images',
    ],
    'is_rec': True,
    'meta_data': 'meta_data',
    'model': 'model',
    'off_peak': True,
    'payload': 'payload',
    'prompt': 'prompt',
    'resolution': 'resolution',
    'seed': 1,
    'watermark': True,
    'wm_position': 1,
    'wm_url': 'wm_url',
}
result = client.videos_vidu.create_ent_v2_img2video(body)
print(result)
```

### images_vidu

```python
# Vidu reference to image
body = {
    'aspect_ratio': 'aspect_ratio',
    'bgm': True,
    'callback_url': 'callback_url',
    'images': [
        'images',
    ],
    'model': 'model',
    'off_peak': True,
    'payload': 'payload',
    'prompt': 'prompt',
    'resolution': 'resolution',
    'seed': 1,
}
result = client.images_vidu.create_ent_v2_reference2image(body)
print(result)
```

### audio_vidu

```python
# Vidu text to audio
body = {
    'bgm': True,
    'callback_url': 'callback_url',
    'duration': 1,
    'model': 'model',
    'off_peak': True,
    'payload': 'payload',
    'prompt': 'prompt',
    'seed': 1,
}
result = client.audio_vidu.create_ent_v2_text2audio(body)
print(result)
```

### audio_volcengine

```python
# Volcengine create speech
body = {
    'input': 'input',
    'instructions': 'instructions',
    'model': 'model',
    'response_format': 'mp3',
    'speed': 1,
    'stream_format': 'sse',
    'voice': 'voice',
}
result = client.audio_volcengine.create_api_v3_audio_speech(body)
print(result)
```

### videos_volcengine

```python
# Volcengine Ark content generation task
body = {
    'callback_url': 'callback_url',
    'camera_fixed': True,
    'content': [
        {},
    ],
    'draft': True,
    'duration': 1,
    'execution_expires_after': 1,
    'frames': 1,
    'generate_audio': True,
    'model': 'model',
    'omni_reference_task_type': 'auto',
    'output_format': 'mp4',
    'priority': 1,
    'ratio': '16:9',
    'resolution': '480p',
    'return_last_frame': True,
    'safety_identifier': 'safety_identifier',
    'seed': 1,
    'service_tier': 'default',
    'tools': [
        {},
    ],
    'watermark': True,
}
result = client.videos_volcengine.create_api_v3_contents_generations_task(body)
print(result)
```

### images_volcengine

```python
# Volcengine Ark image generation
body = {
    'background': 'transparent',
    'image': 'image',
    'layer_decomposition': True,
    'model': 'model',
    'optimize_prompt_options': {
        'mode': 'standard',
    },
    'output_format': 'png',
    'prompt': 'prompt',
    'response_format': 'url',
    'sequential_image_generation': 'auto',
    'sequential_image_generation_options': {
        'max_images': 1,
    },
    'size': 'size',
    'stream': True,
    'tools': [
        {},
    ],
    'watermark': True,
}
result = client.images_volcengine.create_api_v3_images_generation(body)
print(result)
```

### images_xai

```python
# xAI Grok Imagine image edit
body = {
    'aspect_ratio': '1:1',
    'deferred': True,
    'image': {
        'file_id': 'file_id',
        'url': 'url',
    },
    'images': [
        {},
    ],
    'model': 'model',
    'n': 1,
    'output': {
        'value': 'value',
    },
    'prompt': 'prompt',
    'resolution': '1k',
    'response_format': 'url',
    'storage_options': {
        'value': 'value',
    },
    'user': 'user',
}
result = client.images_xai.create_v1_images_edit(body)
print(result)
```

### videos_xai

```python
# xAI Grok Imagine video edit
body = {
    'model': 'model',
    'output': {
        'value': 'value',
    },
    'prompt': 'prompt',
    'storage_options': {
        'value': 'value',
    },
    'user': 'user',
    'video': {
        'file_id': 'file_id',
        'url': 'url',
    },
}
result = client.videos_xai.create_v1_videos_edit(body)
print(result)
```

### videos_zhipu

```python
# Zhipu retrieve video generation task
task_id = '1'
result = client.videos_zhipu.list_api_paas_v4_async_result(task_id)
print(result)
```

### images_zhipu

```python
# Zhipu CogView image generation
body = {
    'model': 'glm-image',
    'prompt': 'prompt',
    'quality': 'hd',
    'size': 'size',
    'user_id': 'user_id',
    'watermark_enabled': True,
}
result = client.images_zhipu.create_api_paas_v4_images_generation(body)
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
