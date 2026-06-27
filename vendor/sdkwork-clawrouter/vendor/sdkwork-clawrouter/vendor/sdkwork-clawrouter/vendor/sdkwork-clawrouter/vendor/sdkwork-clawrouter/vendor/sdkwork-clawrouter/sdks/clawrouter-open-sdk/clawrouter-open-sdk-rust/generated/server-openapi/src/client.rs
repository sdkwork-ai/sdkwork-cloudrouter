use std::sync::Arc;

use crate::api::{
    AssistantsApi, AudioApi, AudioSunoApi, BatchesAnthropicApi, BatchesApi, ChatAnthropicApi,
    ChatApi, ChatGoogleApi, CompletionApi, ContainerApi, ConversationApi, EmbeddingsApi,
    EmbeddingsGoogleApi, EvalApi, FilesAnthropicApi, FilesApi, FilesGoogleApi, FineTuningApi,
    ImagesApi, ImagesMidjourneyApi, ImagesNanoBananaApi, ImagesViduApi, ModelsApi, ModerationsApi,
    OrganizationApi, ProjectApi, RealtimeApi, ResponsesApi, ResponsesGoogleApi, SkillApi,
    ThreadsApi, UploadsApi, VectorStoresApi, VideoApi, VideosKlingApi, VideosViduApi,
    VideosVolcengineApi,
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

    pub fn files_anthropic(&self) -> FilesAnthropicApi {
        FilesAnthropicApi::new(Arc::clone(&self.http))
    }

    pub fn chat_anthropic(&self) -> ChatAnthropicApi {
        ChatAnthropicApi::new(Arc::clone(&self.http))
    }

    pub fn batches_anthropic(&self) -> BatchesAnthropicApi {
        BatchesAnthropicApi::new(Arc::clone(&self.http))
    }

    pub fn responses_google(&self) -> ResponsesGoogleApi {
        ResponsesGoogleApi::new(Arc::clone(&self.http))
    }

    pub fn files_google(&self) -> FilesGoogleApi {
        FilesGoogleApi::new(Arc::clone(&self.http))
    }

    pub fn embeddings_google(&self) -> EmbeddingsGoogleApi {
        EmbeddingsGoogleApi::new(Arc::clone(&self.http))
    }

    pub fn chat_google(&self) -> ChatGoogleApi {
        ChatGoogleApi::new(Arc::clone(&self.http))
    }

    pub fn videos_kling(&self) -> VideosKlingApi {
        VideosKlingApi::new(Arc::clone(&self.http))
    }

    pub fn images_midjourney(&self) -> ImagesMidjourneyApi {
        ImagesMidjourneyApi::new(Arc::clone(&self.http))
    }

    pub fn images_nano_banana(&self) -> ImagesNanoBananaApi {
        ImagesNanoBananaApi::new(Arc::clone(&self.http))
    }

    pub fn audio_suno(&self) -> AudioSunoApi {
        AudioSunoApi::new(Arc::clone(&self.http))
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

    pub fn eval(&self) -> EvalApi {
        EvalApi::new(Arc::clone(&self.http))
    }

    pub fn files(&self) -> FilesApi {
        FilesApi::new(Arc::clone(&self.http))
    }

    pub fn fine_tuning(&self) -> FineTuningApi {
        FineTuningApi::new(Arc::clone(&self.http))
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

    pub fn organization(&self) -> OrganizationApi {
        OrganizationApi::new(Arc::clone(&self.http))
    }

    pub fn project(&self) -> ProjectApi {
        ProjectApi::new(Arc::clone(&self.http))
    }

    pub fn realtime(&self) -> RealtimeApi {
        RealtimeApi::new(Arc::clone(&self.http))
    }

    pub fn responses(&self) -> ResponsesApi {
        ResponsesApi::new(Arc::clone(&self.http))
    }

    pub fn skill(&self) -> SkillApi {
        SkillApi::new(Arc::clone(&self.http))
    }

    pub fn threads(&self) -> ThreadsApi {
        ThreadsApi::new(Arc::clone(&self.http))
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

    pub fn videos_volcengine(&self) -> VideosVolcengineApi {
        VideosVolcengineApi::new(Arc::clone(&self.http))
    }
}
