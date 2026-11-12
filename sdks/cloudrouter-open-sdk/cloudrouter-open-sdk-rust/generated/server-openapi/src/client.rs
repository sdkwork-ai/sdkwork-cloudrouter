use std::sync::Arc;

use crate::api::{
    AssistantsApi, AudioAlibabaApi, AudioApi, AudioBytedanceApi, AudioElevenlabsApi, AudioKlingApi,
    AudioMinimaxApi, AudioStabilityAiApi, AudioViduApi, AudioVolcengineApi, BatchesAnthropicApi,
    BatchesApi, ChatAnthropicApi, ChatApi, ChatGoogleApi, ChatTypesafeApi, CompletionApi,
    ContainerApi, ConversationApi, EmbeddingsApi, EmbeddingsGoogleApi, FilesAnthropicApi, FilesApi,
    FilesGoogleApi, ImagesAlibabaApi, ImagesApi, ImagesBlackForestLabsApi, ImagesBytedanceApi,
    ImagesGoogleApi, ImagesKlingApi, ImagesMinimaxApi, ImagesRunwayApi, ImagesStabilityAiApi,
    ImagesViduApi, ImagesVolcengineApi, ImagesXaiApi, ImagesZhipuApi, ModelsApi, ModerationsApi,
    MusicElevenlabsApi, MusicMinimaxApi, MusicMurekaApi, MusicSunoApi, RealtimeApi, ResponsesApi,
    ResponsesGoogleApi, ThreadsApi, ToolApi, UploadsApi, VectorStoresApi, VideoApi,
    VideosAlibabaApi, VideosBlackForestLabsApi, VideosBytedanceApi, VideosGoogleApi,
    VideosJimengApi, VideosKlingApi, VideosLumaAiApi, VideosMinimaxApi, VideosPixverseApi,
    VideosRunwayApi, VideosViduApi, VideosVolcengineApi, VideosXaiApi, VideosZhipuApi,
};
use crate::http::{SdkworkConfig, SdkworkError, SdkworkHttpClient};

#[derive(Clone)]
pub struct SdkworkAiClient {
    http: Arc<SdkworkHttpClient>,
}

impl SdkworkAiClient {
    pub fn new(config: SdkworkConfig) -> Result<Self, SdkworkError> {
        Ok(Self {
            http: Arc::new(SdkworkHttpClient::new(config)?),
        })
    }

    pub fn new_with_base_url(base_url: impl Into<String>) -> Result<Self, SdkworkError> {
        Self::new(SdkworkConfig::new(base_url))
    }

    pub fn set_api_key(&self, api_key: impl Into<String>) -> &Self {
        self.http.set_api_key(api_key);
        self
    }

    pub fn set_auth_token(&self, token: impl Into<String>) -> &Self {
        self.http.set_auth_token(token);
        self
    }

    pub fn set_access_token(&self, token: impl Into<String>) -> &Self {
        self.http.set_access_token(token);
        self
    }

    pub fn set_header(&self, key: impl Into<String>, value: impl Into<String>) -> &Self {
        self.http.set_header(key, value);
        self
    }

    pub fn http_client(&self) -> Arc<SdkworkHttpClient> {
        Arc::clone(&self.http)
    }

    pub fn images_alibaba(&self) -> ImagesAlibabaApi {
        ImagesAlibabaApi::new(Arc::clone(&self.http))
    }

    pub fn videos_alibaba(&self) -> VideosAlibabaApi {
        VideosAlibabaApi::new(Arc::clone(&self.http))
    }

    pub fn audio_alibaba(&self) -> AudioAlibabaApi {
        AudioAlibabaApi::new(Arc::clone(&self.http))
    }

    pub fn files_anthropic(&self) -> FilesAnthropicApi {
        FilesAnthropicApi::new(Arc::clone(&self.http))
    }

    pub fn chat_anthropic(&self) -> ChatAnthropicApi {
        ChatAnthropicApi::new(Arc::clone(&self.http))
    }

    pub fn batches_anthropic(&self) -> BatchesAnthropicApi {
        BatchesAnthropicApi::new(Arc::clone(&self.http))
    }

    pub fn videos_black_forest_labs(&self) -> VideosBlackForestLabsApi {
        VideosBlackForestLabsApi::new(Arc::clone(&self.http))
    }

    pub fn images_black_forest_labs(&self) -> ImagesBlackForestLabsApi {
        ImagesBlackForestLabsApi::new(Arc::clone(&self.http))
    }

    pub fn videos_bytedance(&self) -> VideosBytedanceApi {
        VideosBytedanceApi::new(Arc::clone(&self.http))
    }

    pub fn images_bytedance(&self) -> ImagesBytedanceApi {
        ImagesBytedanceApi::new(Arc::clone(&self.http))
    }

    pub fn audio_bytedance(&self) -> AudioBytedanceApi {
        AudioBytedanceApi::new(Arc::clone(&self.http))
    }

    pub fn music_elevenlabs(&self) -> MusicElevenlabsApi {
        MusicElevenlabsApi::new(Arc::clone(&self.http))
    }

    pub fn audio_elevenlabs(&self) -> AudioElevenlabsApi {
        AudioElevenlabsApi::new(Arc::clone(&self.http))
    }

    pub fn responses_google(&self) -> ResponsesGoogleApi {
        ResponsesGoogleApi::new(Arc::clone(&self.http))
    }

    pub fn files_google(&self) -> FilesGoogleApi {
        FilesGoogleApi::new(Arc::clone(&self.http))
    }

    pub fn videos_google(&self) -> VideosGoogleApi {
        VideosGoogleApi::new(Arc::clone(&self.http))
    }

    pub fn embeddings_google(&self) -> EmbeddingsGoogleApi {
        EmbeddingsGoogleApi::new(Arc::clone(&self.http))
    }

    pub fn chat_google(&self) -> ChatGoogleApi {
        ChatGoogleApi::new(Arc::clone(&self.http))
    }

    pub fn images_google(&self) -> ImagesGoogleApi {
        ImagesGoogleApi::new(Arc::clone(&self.http))
    }

    pub fn videos_jimeng(&self) -> VideosJimengApi {
        VideosJimengApi::new(Arc::clone(&self.http))
    }

    pub fn audio_kling(&self) -> AudioKlingApi {
        AudioKlingApi::new(Arc::clone(&self.http))
    }

    pub fn images_kling(&self) -> ImagesKlingApi {
        ImagesKlingApi::new(Arc::clone(&self.http))
    }

    pub fn videos_kling(&self) -> VideosKlingApi {
        VideosKlingApi::new(Arc::clone(&self.http))
    }

    pub fn videos_luma_ai(&self) -> VideosLumaAiApi {
        VideosLumaAiApi::new(Arc::clone(&self.http))
    }

    pub fn videos_minimax(&self) -> VideosMinimaxApi {
        VideosMinimaxApi::new(Arc::clone(&self.http))
    }

    pub fn images_minimax(&self) -> ImagesMinimaxApi {
        ImagesMinimaxApi::new(Arc::clone(&self.http))
    }

    pub fn music_minimax(&self) -> MusicMinimaxApi {
        MusicMinimaxApi::new(Arc::clone(&self.http))
    }

    pub fn audio_minimax(&self) -> AudioMinimaxApi {
        AudioMinimaxApi::new(Arc::clone(&self.http))
    }

    pub fn music_mureka(&self) -> MusicMurekaApi {
        MusicMurekaApi::new(Arc::clone(&self.http))
    }

    pub fn videos_pixverse(&self) -> VideosPixverseApi {
        VideosPixverseApi::new(Arc::clone(&self.http))
    }

    pub fn videos_runway(&self) -> VideosRunwayApi {
        VideosRunwayApi::new(Arc::clone(&self.http))
    }

    pub fn images_runway(&self) -> ImagesRunwayApi {
        ImagesRunwayApi::new(Arc::clone(&self.http))
    }

    pub fn audio_stability_ai(&self) -> AudioStabilityAiApi {
        AudioStabilityAiApi::new(Arc::clone(&self.http))
    }

    pub fn images_stability_ai(&self) -> ImagesStabilityAiApi {
        ImagesStabilityAiApi::new(Arc::clone(&self.http))
    }

    pub fn music_suno(&self) -> MusicSunoApi {
        MusicSunoApi::new(Arc::clone(&self.http))
    }

    pub fn chat_typesafe(&self) -> ChatTypesafeApi {
        ChatTypesafeApi::new(Arc::clone(&self.http))
    }

    pub fn assistants(&self) -> AssistantsApi {
        AssistantsApi::new(Arc::clone(&self.http))
    }

    pub fn audio(&self) -> AudioApi {
        AudioApi::new(Arc::clone(&self.http))
    }

    pub fn batches(&self) -> BatchesApi {
        BatchesApi::new(Arc::clone(&self.http))
    }

    pub fn chat(&self) -> ChatApi {
        ChatApi::new(Arc::clone(&self.http))
    }

    pub fn completion(&self) -> CompletionApi {
        CompletionApi::new(Arc::clone(&self.http))
    }

    pub fn container(&self) -> ContainerApi {
        ContainerApi::new(Arc::clone(&self.http))
    }

    pub fn conversation(&self) -> ConversationApi {
        ConversationApi::new(Arc::clone(&self.http))
    }

    pub fn embeddings(&self) -> EmbeddingsApi {
        EmbeddingsApi::new(Arc::clone(&self.http))
    }

    pub fn files(&self) -> FilesApi {
        FilesApi::new(Arc::clone(&self.http))
    }

    pub fn images(&self) -> ImagesApi {
        ImagesApi::new(Arc::clone(&self.http))
    }

    pub fn models(&self) -> ModelsApi {
        ModelsApi::new(Arc::clone(&self.http))
    }

    pub fn moderations(&self) -> ModerationsApi {
        ModerationsApi::new(Arc::clone(&self.http))
    }

    pub fn realtime(&self) -> RealtimeApi {
        RealtimeApi::new(Arc::clone(&self.http))
    }

    pub fn responses(&self) -> ResponsesApi {
        ResponsesApi::new(Arc::clone(&self.http))
    }

    pub fn threads(&self) -> ThreadsApi {
        ThreadsApi::new(Arc::clone(&self.http))
    }

    pub fn tool(&self) -> ToolApi {
        ToolApi::new(Arc::clone(&self.http))
    }

    pub fn uploads(&self) -> UploadsApi {
        UploadsApi::new(Arc::clone(&self.http))
    }

    pub fn vector_stores(&self) -> VectorStoresApi {
        VectorStoresApi::new(Arc::clone(&self.http))
    }

    pub fn video(&self) -> VideoApi {
        VideoApi::new(Arc::clone(&self.http))
    }

    pub fn videos_vidu(&self) -> VideosViduApi {
        VideosViduApi::new(Arc::clone(&self.http))
    }

    pub fn images_vidu(&self) -> ImagesViduApi {
        ImagesViduApi::new(Arc::clone(&self.http))
    }

    pub fn audio_vidu(&self) -> AudioViduApi {
        AudioViduApi::new(Arc::clone(&self.http))
    }

    pub fn audio_volcengine(&self) -> AudioVolcengineApi {
        AudioVolcengineApi::new(Arc::clone(&self.http))
    }

    pub fn videos_volcengine(&self) -> VideosVolcengineApi {
        VideosVolcengineApi::new(Arc::clone(&self.http))
    }

    pub fn images_volcengine(&self) -> ImagesVolcengineApi {
        ImagesVolcengineApi::new(Arc::clone(&self.http))
    }

    pub fn images_xai(&self) -> ImagesXaiApi {
        ImagesXaiApi::new(Arc::clone(&self.http))
    }

    pub fn videos_xai(&self) -> VideosXaiApi {
        VideosXaiApi::new(Arc::clone(&self.http))
    }

    pub fn videos_zhipu(&self) -> VideosZhipuApi {
        VideosZhipuApi::new(Arc::clone(&self.http))
    }

    pub fn images_zhipu(&self) -> ImagesZhipuApi {
        ImagesZhipuApi::new(Arc::clone(&self.http))
    }
}
