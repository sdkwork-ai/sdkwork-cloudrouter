use std::sync::Arc;

use reqwest::Method;

use crate::http::{SdkworkError, SdkworkHttpClient, BinaryResponseStream};
use crate::models::{OpenAiSpeechCreateRequest};

#[derive(Clone)]
pub struct AudioVolcengineApi {
    client: Arc<SdkworkHttpClient>,
}

impl AudioVolcengineApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Volcengine create speech
    pub async fn create_api_v3_audio_speech(&self, body: &OpenAiSpeechCreateRequest) -> Result<Vec<u8>, SdkworkError> {
        let path = "/volcengine/api/v3/audio/speech".to_string();
        self.client.request_bytes(Method::POST, &path, Some(body), None, None, Some("application/json"), false, false).await
    }

    /// Streaming variant of the same operation: yields the binary body in
    /// bounded chunks without materializing the whole payload in memory.
    pub async fn create_api_v3_audio_speech_stream(&self, body: &OpenAiSpeechCreateRequest) -> Result<BinaryResponseStream, SdkworkError> {
        let path = "/volcengine/api/v3/audio/speech".to_string();
        self.client.request_bytes_stream(Method::POST, &path, Some(body), None, None, Some("application/json"), false, false).await
    }

}
