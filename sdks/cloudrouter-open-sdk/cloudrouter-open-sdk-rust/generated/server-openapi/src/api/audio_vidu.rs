use std::sync::Arc;

use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{ViduAudioGenerationTask, ViduTextToAudioRequest, ViduTimingToAudioRequest};

#[derive(Clone)]
pub struct AudioViduApi {
    client: Arc<SdkworkHttpClient>,
}

impl AudioViduApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Vidu text to audio
    pub async fn create_ent_v2_text2audio(
        &self,
        body: &ViduTextToAudioRequest,
    ) -> Result<ViduAudioGenerationTask, SdkworkError> {
        let path = "/vidu/ent/v2/text2audio".to_string();
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Vidu timing to audio
    pub async fn create_ent_v2_timing2audio(
        &self,
        body: &ViduTimingToAudioRequest,
    ) -> Result<ViduAudioGenerationTask, SdkworkError> {
        let path = "/vidu/ent/v2/timing2audio".to_string();
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }
}
