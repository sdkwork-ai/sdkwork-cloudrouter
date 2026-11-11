package ai

import (
    "github.com/sdkwork/cloudrouter-open-sdk/api"
    sdkhttp "github.com/sdkwork/cloudrouter-open-sdk/http"
)

type SdkworkAiClient struct {
    http *sdkhttp.Client
    ImagesAlibaba *api.ImagesAlibabaApi
    VideosAlibaba *api.VideosAlibabaApi
    AudioAlibaba *api.AudioAlibabaApi
    FilesAnthropic *api.FilesAnthropicApi
    ChatAnthropic *api.ChatAnthropicApi
    BatchesAnthropic *api.BatchesAnthropicApi
    VideosBlackForestLabs *api.VideosBlackForestLabsApi
    ImagesBlackForestLabs *api.ImagesBlackForestLabsApi
    VideosBytedance *api.VideosBytedanceApi
    ImagesBytedance *api.ImagesBytedanceApi
    AudioBytedance *api.AudioBytedanceApi
    MusicElevenlabs *api.MusicElevenlabsApi
    AudioElevenlabs *api.AudioElevenlabsApi
    ResponsesGoogle *api.ResponsesGoogleApi
    FilesGoogle *api.FilesGoogleApi
    VideosGoogle *api.VideosGoogleApi
    EmbeddingsGoogle *api.EmbeddingsGoogleApi
    ChatGoogle *api.ChatGoogleApi
    ImagesGoogle *api.ImagesGoogleApi
    VideosJimeng *api.VideosJimengApi
    AudioKling *api.AudioKlingApi
    ImagesKling *api.ImagesKlingApi
    VideosKling *api.VideosKlingApi
    VideosLumaAi *api.VideosLumaAiApi
    VideosMinimax *api.VideosMinimaxApi
    ImagesMinimax *api.ImagesMinimaxApi
    MusicMinimax *api.MusicMinimaxApi
    AudioMinimax *api.AudioMinimaxApi
    MusicMureka *api.MusicMurekaApi
    VideosPixverse *api.VideosPixverseApi
    VideosRunway *api.VideosRunwayApi
    ImagesRunway *api.ImagesRunwayApi
    AudioStabilityAi *api.AudioStabilityAiApi
    ImagesStabilityAi *api.ImagesStabilityAiApi
    MusicSuno *api.MusicSunoApi
    ChatTypesafe *api.ChatTypesafeApi
    Assistants *api.AssistantsApi
    Audio *api.AudioApi
    Batches *api.BatchesApi
    Chat *api.ChatApi
    Completion *api.CompletionApi
    Container *api.ContainerApi
    Conversation *api.ConversationApi
    Embeddings *api.EmbeddingsApi
    Files *api.FilesApi
    Images *api.ImagesApi
    Models *api.ModelsApi
    Moderations *api.ModerationsApi
    Realtime *api.RealtimeApi
    Responses *api.ResponsesApi
    Threads *api.ThreadsApi
    Tool *api.ToolApi
    Uploads *api.UploadsApi
    VectorStores *api.VectorStoresApi
    Video *api.VideoApi
    VideosVidu *api.VideosViduApi
    ImagesVidu *api.ImagesViduApi
    AudioVidu *api.AudioViduApi
    AudioVolcengine *api.AudioVolcengineApi
    VideosVolcengine *api.VideosVolcengineApi
    ImagesVolcengine *api.ImagesVolcengineApi
    ImagesXai *api.ImagesXaiApi
    VideosXai *api.VideosXaiApi
    VideosZhipu *api.VideosZhipuApi
    ImagesZhipu *api.ImagesZhipuApi
}

func NewSdkworkAiClient(baseURL string) *SdkworkAiClient {
    cfg := sdkhttp.NewDefaultConfig(baseURL)
    return NewSdkworkAiClientWithConfig(cfg)
}

func NewSdkworkAiClientWithConfig(config sdkhttp.Config) *SdkworkAiClient {
    client := sdkhttp.NewClient(config)
    return &SdkworkAiClient{
        http: client,
        ImagesAlibaba: api.NewImagesAlibabaApi(client),
        VideosAlibaba: api.NewVideosAlibabaApi(client),
        AudioAlibaba: api.NewAudioAlibabaApi(client),
        FilesAnthropic: api.NewFilesAnthropicApi(client),
        ChatAnthropic: api.NewChatAnthropicApi(client),
        BatchesAnthropic: api.NewBatchesAnthropicApi(client),
        VideosBlackForestLabs: api.NewVideosBlackForestLabsApi(client),
        ImagesBlackForestLabs: api.NewImagesBlackForestLabsApi(client),
        VideosBytedance: api.NewVideosBytedanceApi(client),
        ImagesBytedance: api.NewImagesBytedanceApi(client),
        AudioBytedance: api.NewAudioBytedanceApi(client),
        MusicElevenlabs: api.NewMusicElevenlabsApi(client),
        AudioElevenlabs: api.NewAudioElevenlabsApi(client),
        ResponsesGoogle: api.NewResponsesGoogleApi(client),
        FilesGoogle: api.NewFilesGoogleApi(client),
        VideosGoogle: api.NewVideosGoogleApi(client),
        EmbeddingsGoogle: api.NewEmbeddingsGoogleApi(client),
        ChatGoogle: api.NewChatGoogleApi(client),
        ImagesGoogle: api.NewImagesGoogleApi(client),
        VideosJimeng: api.NewVideosJimengApi(client),
        AudioKling: api.NewAudioKlingApi(client),
        ImagesKling: api.NewImagesKlingApi(client),
        VideosKling: api.NewVideosKlingApi(client),
        VideosLumaAi: api.NewVideosLumaAiApi(client),
        VideosMinimax: api.NewVideosMinimaxApi(client),
        ImagesMinimax: api.NewImagesMinimaxApi(client),
        MusicMinimax: api.NewMusicMinimaxApi(client),
        AudioMinimax: api.NewAudioMinimaxApi(client),
        MusicMureka: api.NewMusicMurekaApi(client),
        VideosPixverse: api.NewVideosPixverseApi(client),
        VideosRunway: api.NewVideosRunwayApi(client),
        ImagesRunway: api.NewImagesRunwayApi(client),
        AudioStabilityAi: api.NewAudioStabilityAiApi(client),
        ImagesStabilityAi: api.NewImagesStabilityAiApi(client),
        MusicSuno: api.NewMusicSunoApi(client),
        ChatTypesafe: api.NewChatTypesafeApi(client),
        Assistants: api.NewAssistantsApi(client),
        Audio: api.NewAudioApi(client),
        Batches: api.NewBatchesApi(client),
        Chat: api.NewChatApi(client),
        Completion: api.NewCompletionApi(client),
        Container: api.NewContainerApi(client),
        Conversation: api.NewConversationApi(client),
        Embeddings: api.NewEmbeddingsApi(client),
        Files: api.NewFilesApi(client),
        Images: api.NewImagesApi(client),
        Models: api.NewModelsApi(client),
        Moderations: api.NewModerationsApi(client),
        Realtime: api.NewRealtimeApi(client),
        Responses: api.NewResponsesApi(client),
        Threads: api.NewThreadsApi(client),
        Tool: api.NewToolApi(client),
        Uploads: api.NewUploadsApi(client),
        VectorStores: api.NewVectorStoresApi(client),
        Video: api.NewVideoApi(client),
        VideosVidu: api.NewVideosViduApi(client),
        ImagesVidu: api.NewImagesViduApi(client),
        AudioVidu: api.NewAudioViduApi(client),
        AudioVolcengine: api.NewAudioVolcengineApi(client),
        VideosVolcengine: api.NewVideosVolcengineApi(client),
        ImagesVolcengine: api.NewImagesVolcengineApi(client),
        ImagesXai: api.NewImagesXaiApi(client),
        VideosXai: api.NewVideosXaiApi(client),
        VideosZhipu: api.NewVideosZhipuApi(client),
        ImagesZhipu: api.NewImagesZhipuApi(client),
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
