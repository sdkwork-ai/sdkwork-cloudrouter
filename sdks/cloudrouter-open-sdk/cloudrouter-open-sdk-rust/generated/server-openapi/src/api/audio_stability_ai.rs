use std::sync::Arc;

use reqwest::Method;

use crate::http::{SdkworkError, SdkworkHttpClient, BinaryResponseStream};
use crate::models::{StabilityAudioRequest};

#[derive(Clone)]
pub struct AudioStabilityAiApi {
    client: Arc<SdkworkHttpClient>,
}

impl AudioStabilityAiApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Stability AI text-to-audio (music and sound effects)
    pub async fn create_text_to_audio(&self, body: &StabilityAudioRequest) -> Result<Vec<u8>, SdkworkError> {
        let path = "/stability_ai/v2beta/audio/stable-audio-2/text-to-audio".to_string();
        self.client.request_bytes(Method::POST, &path, Some(body), None, None, Some("multipart/form-data"), false, false).await
    }

    /// Streaming variant of the same operation: yields the binary body in
    /// bounded chunks without materializing the whole payload in memory.
    pub async fn create_text_to_audio_stream(&self, body: &StabilityAudioRequest) -> Result<BinaryResponseStream, SdkworkError> {
        let path = "/stability_ai/v2beta/audio/stable-audio-2/text-to-audio".to_string();
        self.client.request_bytes_stream(Method::POST, &path, Some(body), None, None, Some("multipart/form-data"), false, false).await
    }

}
