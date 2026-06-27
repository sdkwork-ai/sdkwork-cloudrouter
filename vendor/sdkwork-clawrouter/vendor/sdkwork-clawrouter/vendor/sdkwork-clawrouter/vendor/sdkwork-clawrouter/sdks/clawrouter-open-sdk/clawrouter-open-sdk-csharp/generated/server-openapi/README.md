# clawrouter-open-sdk (C#)

SDKWork Claw Router OpenAI-compatible gateway SDK csharp generated transport SDK

## Installation

```bash
dotnet add package Sdkwork.ClawRouter.Open.Sdk
```

Or add to your `.csproj`:

```xml
<PackageReference Include="Sdkwork.ClawRouter.Open.Sdk" Version="0.1.0" />
```

## Quick Start

```csharp
using Sdkwork.ClawRouter.Open.Models;
using Sdkwork.ClawRouter.Open;
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

- `client.FilesAnthropic` - files_anthropic API
- `client.ChatAnthropic` - chat_anthropic API
- `client.BatchesAnthropic` - batches_anthropic API
- `client.ResponsesGoogle` - responses_google API
- `client.FilesGoogle` - files_google API
- `client.EmbeddingsGoogle` - embeddings_google API
- `client.ChatGoogle` - chat_google API
- `client.VideosKling` - videos_kling API
- `client.ImagesMidjourney` - images_midjourney API
- `client.ImagesNanoBanana` - images_nano_banana API
- `client.AudioSuno` - audio_suno API
- `client.Assistants` - assistant API
- `client.Audio` - audio API
- `client.Batches` - batch API
- `client.Chat` - chat API
- `client.Completion` - completion API
- `client.Container` - container API
- `client.Conversation` - conversation API
- `client.Embeddings` - embedding API
- `client.Eval` - eval API
- `client.Files` - file API
- `client.FineTuning` - fine_tuning API
- `client.Images` - image API
- `client.Models` - model API
- `client.Moderations` - moderation API
- `client.Organization` - organization API
- `client.Project` - project API
- `client.Realtime` - realtime API
- `client.Responses` - response API
- `client.Skill` - skill API
- `client.Threads` - thread API
- `client.Uploads` - upload API
- `client.VectorStores` - vector_store API
- `client.Video` - video API
- `client.VideosVidu` - videos_vidu API
- `client.ImagesVidu` - images_vidu API
- `client.VideosVolcengine` - videos_volcengine API

## Usage Examples

### files_anthropic

```csharp
// Anthropic list files
var query = new Dictionary<string, object>
{
    ["before_id"] = "1",
    ["after_id"] = "1",
    ["limit"] = 3,
};
var result = await client.FilesAnthropic.GetListV1FilesAsync(query);
Console.WriteLine(result);
```

### chat_anthropic

```csharp
// Anthropic Claude message
var body = new AnthropicMessageCreateRequest
{
    MaxTokens = 1,
    Messages = new List<object> { new AnthropicMessageParam() },
    Metadata = new Dictionary<string, object>(),
    Model = "model",
    StopSequences = new List<object> { "stop-sequences" },
    Stream = false,
    System = "system",
    Temperature = 8,
    Thinking = new Dictionary<string, object>(),
    ToolChoice = new Dictionary<string, object>(),
    Tools = new List<object> { new AnthropicTool() },
    TopK = 12,
    TopP = 13,
};
var result = await client.ChatAnthropic.CreateV1MessageAsync(body);
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
var result = await client.BatchesAnthropic.GetListV1MessagesBatchesAsync(query);
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

### videos_kling

```csharp
// Kling video generation
var body = new KlingVideoGenerationRequest
{
    AspectRatio = "aspect-ratio",
    CallbackUrl = "callback-url",
    CfgScale = 3,
    Duration = 4,
    Image = "image",
    ImageTail = "image-tail",
    Mode = "mode",
    Model = "model",
    NegativePrompt = "negative-prompt",
    Prompt = "prompt",
};
var result = await client.VideosKling.CreateV1VideosGenerationAsync(body);
Console.WriteLine(result);
```

### images_midjourney

```csharp
// Midjourney image generation
var body = new MidjourneyImageGenerationRequest
{
    AspectRatio = "aspect-ratio",
    CallbackUrl = "callback-url",
    Model = "model",
    Prompt = "prompt",
    Seed = 5,
    Style = "style",
};
var result = await client.ImagesMidjourney.CreateV1ImagesGenerationAsync(body);
Console.WriteLine(result);
```

### images_nano_banana

```csharp
// Nano Banana image generation
var body = new NanoBananaImageGenerationRequest
{
    AspectRatio = "aspect-ratio",
    CallbackUrl = "callback-url",
    Images = new List<object> { "images" },
    Model = "model",
    Prompt = "prompt",
    Seed = 6,
    Size = "size",
};
var result = await client.ImagesNanoBanana.CreateGenerationAsync(body);
Console.WriteLine(result);
```

### audio_suno

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
var result = await client.AudioSuno.CreateV1MusicGenerationAsync(body);
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
    Suffix = "suffix",
    Temperature = 15,
    TopP = 16,
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

### eval

```csharp
// List evals
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.Eval.ListAsync(query);
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

### fine_tuning

```csharp
// List fine-tuning jobs
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.FineTuning.ListJobAsync(query);
Console.WriteLine(result);
```

### image

```csharp
// Create image edit
var body = new OpenAiImageEditRequest
{
    Image = "image",
    Mask = "mask",
    Model = "model",
    Prompt = "prompt",
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

### organization

```csharp
// List organization admin API keys
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.Organization.GetListAdminApiKeysAsync(query);
Console.WriteLine(result);
```

### project

```csharp
// List project roles
var projectId = "1";
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.Project.GetListRolesAsync(projectId, query);
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

### skill

```csharp
// List skills
var query = new Dictionary<string, object>
{
    ["limit"] = 1,
    ["order"] = "asc",
    ["after"] = "after",
    ["before"] = "before",
};
var result = await client.Skill.ListAsync(query);
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

### upload

```csharp
// Create upload
var body = new OpenAiUploadCreateRequest
{
    Bytes = 1,
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
    AspectRatio = "aspect-ratio",
    CallbackUrl = "callback-url",
    Duration = 3,
    Images = new List<object> { "images" },
    Model = "model",
    MovementAmplitude = "movement-amplitude",
    Payload = "payload",
    Prompt = "prompt",
    Resolution = "resolution",
    Seed = 10,
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
    CallbackUrl = "callback-url",
    Images = new List<object> { "images" },
    Model = "model",
    Payload = "payload",
    Prompt = "prompt",
    Seed = 7,
    Style = "style",
};
var result = await client.ImagesVidu.CreateEntV2Reference2imageAsync(body);
Console.WriteLine(result);
```

### videos_volcengine

```csharp
// Volcengine Ark content generation task
var body = new VolcengineContentGenerationTaskCreateRequest
{
    CallbackUrl = "callback-url",
    Content = new List<object> { new VolcengineContentPart() },
    Metadata = new Dictionary<string, object>(),
    Model = "model",
};
var result = await client.VideosVolcengine.CreateApiV3ContentsGenerationsTaskAsync(body);
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

- Generator-owned files are tracked in `.sdkwork/sdkwork-generator-manifest.json`.
- Each run also writes `.sdkwork/sdkwork-generator-changes.json` so automation can inspect created, updated, deleted, unchanged, scaffolded, and backed-up files plus the classified impact areas, verification plan, and execution decision for the latest generation.
- Apply mode also writes `.sdkwork/sdkwork-generator-report.json` with the full execution report, including `schemaVersion`, `generator`, stable artifact paths, and the execution handoff commands that match CLI `--json` output.
- CLI JSON output also includes an execution handoff with concrete next commands, including reviewed apply commands for dry-run flows.
- Put hand-written wrappers, adapters, and orchestration in `custom/`.
- Files scaffolded under `custom/` are created once and preserved across regenerations.
- If a generated-owned file was modified locally, its previous content is copied to `.sdkwork/manual-backups/` before overwrite or removal.
