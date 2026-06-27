# clawrouter-open-sdk (Java)

SDKWork Claw Router OpenAI-compatible gateway SDK java generated transport SDK

## Installation

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>com.sdkwork.clawrouter</groupId>
    <artifactId>clawrouter-open-sdk</artifactId>
    <version>0.1.0</version>
</dependency>
```

Or with Gradle:

```groovy
implementation 'com.sdkwork.clawrouter:clawrouter-open-sdk:0.1.0'
```

## Quick Start

```java
import com.sdkwork.clawrouter.open.SdkworkAiClient;
import com.sdkwork.common.core.Types;
import com.sdkwork.clawrouter.open.model.*;

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

- `client.getFilesAnthropic()` - files_anthropic API
- `client.getChatAnthropic()` - chat_anthropic API
- `client.getBatchesAnthropic()` - batches_anthropic API
- `client.getResponsesGoogle()` - responses_google API
- `client.getFilesGoogle()` - files_google API
- `client.getEmbeddingsGoogle()` - embeddings_google API
- `client.getChatGoogle()` - chat_google API
- `client.getVideosKling()` - videos_kling API
- `client.getImagesMidjourney()` - images_midjourney API
- `client.getImagesNanoBanana()` - images_nano_banana API
- `client.getAudioSuno()` - audio_suno API
- `client.getAssistants()` - assistant API
- `client.getAudio()` - audio API
- `client.getBatches()` - batch API
- `client.getChat()` - chat API
- `client.getCompletion()` - completion API
- `client.getContainer()` - container API
- `client.getConversation()` - conversation API
- `client.getEmbeddings()` - embedding API
- `client.getEval()` - eval API
- `client.getFiles()` - file API
- `client.getFineTuning()` - fine_tuning API
- `client.getImages()` - image API
- `client.getModels()` - model API
- `client.getModerations()` - moderation API
- `client.getOrganization()` - organization API
- `client.getProject()` - project API
- `client.getRealtime()` - realtime API
- `client.getResponses()` - response API
- `client.getSkill()` - skill API
- `client.getThreads()` - thread API
- `client.getUploads()` - upload API
- `client.getVectorStores()` - vector_store API
- `client.getVideo()` - video API
- `client.getVideosVidu()` - videos_vidu API
- `client.getImagesVidu()` - images_vidu API
- `client.getVideosVolcengine()` - videos_volcengine API

## Usage Examples

### files_anthropic

```java
// Anthropic list files
Map<String, Object> params = new LinkedHashMap<>();
params.put("before_id", "1");
params.put("after_id", "1");
params.put("limit", 3);
AnthropicFileListResponse result = client.getFilesAnthropic().getListV1Files(params);
System.out.println(result);
```

### chat_anthropic

```java
// Anthropic Claude message
AnthropicMessageCreateRequest body = new AnthropicMessageCreateRequest();
body.setMaxTokens(1);
body.setMessages(new ArrayList<>(java.util.List.of(new AnthropicMessageParam())));
body.setMetadata(new LinkedHashMap<>());
body.setModel("model");
body.setStopSequences(new ArrayList<>(java.util.List.of("stop-sequences")));
body.setStream(false);
body.setSystem("system");
body.setTemperature(8);
body.setThinking(new LinkedHashMap<>());
body.setToolChoice(new LinkedHashMap<>());
body.setTools(new ArrayList<>(java.util.List.of(new AnthropicTool())));
body.setTopK(12);
body.setTopP(13);
AnthropicMessage result = client.getChatAnthropic().createV1Message(body);
System.out.println(result);
```

### batches_anthropic

```java
// Anthropic list message batches
Map<String, Object> params = new LinkedHashMap<>();
params.put("before_id", "1");
params.put("after_id", "1");
params.put("limit", 3);
AnthropicMessageBatchListResponse result = client.getBatchesAnthropic().getListV1MessagesBatches(params);
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

### videos_kling

```java
// Kling video generation
KlingVideoGenerationRequest body = new KlingVideoGenerationRequest();
body.setAspectRatio("aspect-ratio");
body.setCallbackUrl("callback-url");
body.setCfgScale(3);
body.setDuration(4);
body.setImage("image");
body.setImageTail("image-tail");
body.setMode("mode");
body.setModel("model");
body.setNegativePrompt("negative-prompt");
body.setPrompt("prompt");
KlingVideoGenerationTask result = client.getVideosKling().createV1VideosGeneration(body);
System.out.println(result);
```

### images_midjourney

```java
// Midjourney image generation
MidjourneyImageGenerationRequest body = new MidjourneyImageGenerationRequest();
body.setAspectRatio("aspect-ratio");
body.setCallbackUrl("callback-url");
body.setModel("model");
body.setPrompt("prompt");
body.setSeed(5);
body.setStyle("style");
MidjourneyImageGenerationTask result = client.getImagesMidjourney().createV1ImagesGeneration(body);
System.out.println(result);
```

### images_nano_banana

```java
// Nano Banana image generation
NanoBananaImageGenerationRequest body = new NanoBananaImageGenerationRequest();
body.setAspectRatio("aspect-ratio");
body.setCallbackUrl("callback-url");
body.setImages(new ArrayList<>(java.util.List.of("images")));
body.setModel("model");
body.setPrompt("prompt");
body.setSeed(6);
body.setSize("size");
NanoBananaImageGenerationTask result = client.getImagesNanoBanana().createGeneration(body);
System.out.println(result);
```

### audio_suno

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
SunoMusicGenerationResponse result = client.getAudioSuno().createV1MusicGeneration(body);
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
body.setSuffix("suffix");
body.setTemperature(15);
body.setTopP(16);
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

### eval

```java
// List evals
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiEvalList result = client.getEval().list(params);
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

### fine_tuning

```java
// List fine-tuning jobs
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiFineTuningJobList result = client.getFineTuning().listJob(params);
System.out.println(result);
```

### image

```java
// Create image edit
OpenAiImageEditRequest body = new OpenAiImageEditRequest();
body.setImage("image");
body.setMask("mask");
body.setModel("model");
body.setPrompt("prompt");
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

### organization

```java
// List organization admin API keys
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiOrganizationAdminApiKeyList result = client.getOrganization().getListAdminApiKeys(params);
System.out.println(result);
```

### project

```java
// List project roles
String projectId = "1";
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiRoleList result = client.getProject().getListRoles(projectId, params);
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

### skill

```java
// List skills
Map<String, Object> params = new LinkedHashMap<>();
params.put("limit", 1);
params.put("order", "asc");
params.put("after", "after");
params.put("before", "before");
OpenAiSkillList result = client.getSkill().list(params);
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

### upload

```java
// Create upload
OpenAiUploadCreateRequest body = new OpenAiUploadCreateRequest();
body.setBytes(1);
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
body.setAspectRatio("aspect-ratio");
body.setCallbackUrl("callback-url");
body.setDuration(3);
body.setImages(new ArrayList<>(java.util.List.of("images")));
body.setModel("model");
body.setMovementAmplitude("movement-amplitude");
body.setPayload("payload");
body.setPrompt("prompt");
body.setResolution("resolution");
body.setSeed(10);
ViduVideoGenerationTask result = client.getVideosVidu().createEntV2Img2video(body);
System.out.println(result);
```

### images_vidu

```java
// Vidu reference to image
ViduReferenceToImageRequest body = new ViduReferenceToImageRequest();
body.setAspectRatio("aspect-ratio");
body.setCallbackUrl("callback-url");
body.setImages(new ArrayList<>(java.util.List.of("images")));
body.setModel("model");
body.setPayload("payload");
body.setPrompt("prompt");
body.setSeed(7);
body.setStyle("style");
ViduImageGenerationTask result = client.getImagesVidu().createEntV2Reference2image(body);
System.out.println(result);
```

### videos_volcengine

```java
// Volcengine Ark content generation task
VolcengineContentGenerationTaskCreateRequest body = new VolcengineContentGenerationTaskCreateRequest();
body.setCallbackUrl("callback-url");
body.setContent(new ArrayList<>(java.util.List.of(new VolcengineContentPart())));
body.setMetadata(new LinkedHashMap<>());
body.setModel("model");
VolcengineContentGenerationTaskCreateResponse result = client.getVideosVolcengine().createApiV3ContentsGenerationsTask(body);
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

- Generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- Each run also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- Apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across regenerations.
- If a generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
