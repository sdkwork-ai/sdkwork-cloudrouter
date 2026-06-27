package ai

import (
    "github.com/sdkwork/clawrouter-open-sdk/api"
    sdkhttp "github.com/sdkwork/clawrouter-open-sdk/http"
)

type SdkworkAiClient struct {
    http *sdkhttp.Client
    FilesAnthropic *api.FilesAnthropicApi
    ChatAnthropic *api.ChatAnthropicApi
    BatchesAnthropic *api.BatchesAnthropicApi
    ResponsesGoogle *api.ResponsesGoogleApi
    FilesGoogle *api.FilesGoogleApi
    EmbeddingsGoogle *api.EmbeddingsGoogleApi
    ChatGoogle *api.ChatGoogleApi
    VideosKling *api.VideosKlingApi
    ImagesMidjourney *api.ImagesMidjourneyApi
    ImagesNanoBanana *api.ImagesNanoBananaApi
    AudioSuno *api.AudioSunoApi
    Assistants *api.AssistantsApi
    Audio *api.AudioApi
    Batches *api.BatchesApi
    Chat *api.ChatApi
    Completion *api.CompletionApi
    Container *api.ContainerApi
    Conversation *api.ConversationApi
    Embeddings *api.EmbeddingsApi
    Eval *api.EvalApi
    Files *api.FilesApi
    FineTuning *api.FineTuningApi
    Images *api.ImagesApi
    Models *api.ModelsApi
    Moderations *api.ModerationsApi
    Organization *api.OrganizationApi
    Project *api.ProjectApi
    Realtime *api.RealtimeApi
    Responses *api.ResponsesApi
    Skill *api.SkillApi
    Threads *api.ThreadsApi
    Uploads *api.UploadsApi
    VectorStores *api.VectorStoresApi
    Video *api.VideoApi
    VideosVidu *api.VideosViduApi
    ImagesVidu *api.ImagesViduApi
    VideosVolcengine *api.VideosVolcengineApi
}

func NewSdkworkAiClient(baseURL string) *SdkworkAiClient {
    cfg := sdkhttp.NewDefaultConfig(baseURL)
    return NewSdkworkAiClientWithConfig(cfg)
}

func NewSdkworkAiClientWithConfig(config sdkhttp.Config) *SdkworkAiClient {
    client := sdkhttp.NewClient(config)
    return &SdkworkAiClient{
        http: client,
        FilesAnthropic: api.NewFilesAnthropicApi(client),
        ChatAnthropic: api.NewChatAnthropicApi(client),
        BatchesAnthropic: api.NewBatchesAnthropicApi(client),
        ResponsesGoogle: api.NewResponsesGoogleApi(client),
        FilesGoogle: api.NewFilesGoogleApi(client),
        EmbeddingsGoogle: api.NewEmbeddingsGoogleApi(client),
        ChatGoogle: api.NewChatGoogleApi(client),
        VideosKling: api.NewVideosKlingApi(client),
        ImagesMidjourney: api.NewImagesMidjourneyApi(client),
        ImagesNanoBanana: api.NewImagesNanoBananaApi(client),
        AudioSuno: api.NewAudioSunoApi(client),
        Assistants: api.NewAssistantsApi(client),
        Audio: api.NewAudioApi(client),
        Batches: api.NewBatchesApi(client),
        Chat: api.NewChatApi(client),
        Completion: api.NewCompletionApi(client),
        Container: api.NewContainerApi(client),
        Conversation: api.NewConversationApi(client),
        Embeddings: api.NewEmbeddingsApi(client),
        Eval: api.NewEvalApi(client),
        Files: api.NewFilesApi(client),
        FineTuning: api.NewFineTuningApi(client),
        Images: api.NewImagesApi(client),
        Models: api.NewModelsApi(client),
        Moderations: api.NewModerationsApi(client),
        Organization: api.NewOrganizationApi(client),
        Project: api.NewProjectApi(client),
        Realtime: api.NewRealtimeApi(client),
        Responses: api.NewResponsesApi(client),
        Skill: api.NewSkillApi(client),
        Threads: api.NewThreadsApi(client),
        Uploads: api.NewUploadsApi(client),
        VectorStores: api.NewVectorStoresApi(client),
        Video: api.NewVideoApi(client),
        VideosVidu: api.NewVideosViduApi(client),
        ImagesVidu: api.NewImagesViduApi(client),
        VideosVolcengine: api.NewVideosVolcengineApi(client),
    }
}

func (c *SdkworkAiClient) SetApiKey(apiKey string) *SdkworkAiClient {
    c.http.SetApiKey(apiKey)
    return c
}

func (c *SdkworkAiClient) SetAuthToken(token string) *SdkworkAiClient {
    c.http.SetAuthToken(token)
    return c
}

func (c *SdkworkAiClient) SetAccessToken(token string) *SdkworkAiClient {
    c.http.SetAccessToken(token)
    return c
}

func (c *SdkworkAiClient) SetHeader(key string, value string) *SdkworkAiClient {
    c.http.SetHeader(key, value)
    return c
}

func (c *SdkworkAiClient) Http() *sdkhttp.Client {
    return c.http
}
