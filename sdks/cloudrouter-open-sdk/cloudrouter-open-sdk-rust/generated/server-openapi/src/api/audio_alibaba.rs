use std::sync::Arc;

use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{AlibabaSpeechRequest, AlibabaSpeechResponse};

#[derive(Clone)]
pub struct AudioAlibabaApi {
    client: Arc<SdkworkHttpClient>,
}

impl AudioAlibabaApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Alibaba Qwen TTS speech synthesis
    pub async fn create_api_v1_services_audio_tts_speech_synthesizer(&self, body: &AlibabaSpeechRequest) -> Result<AlibabaSpeechResponse, SdkworkError> {
        let path = "/alibaba/api/v1/services/audio/tts/SpeechSynthesizer".to_string();
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

}
