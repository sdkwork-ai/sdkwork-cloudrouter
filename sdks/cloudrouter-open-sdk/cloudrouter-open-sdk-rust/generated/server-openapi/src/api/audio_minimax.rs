use std::sync::Arc;

use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{MinimaxTextToSpeechRequest, MinimaxTextToSpeechResponse};

#[derive(Clone)]
pub struct AudioMinimaxApi {
    client: Arc<SdkworkHttpClient>,
}

impl AudioMinimaxApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// MiniMax speech synthesis
    pub async fn create_v1_t2a_v(
        &self,
        body: &MinimaxTextToSpeechRequest,
    ) -> Result<MinimaxTextToSpeechResponse, SdkworkError> {
        let path = "/minimax/v1/t2a_v2".to_string();
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }
}
