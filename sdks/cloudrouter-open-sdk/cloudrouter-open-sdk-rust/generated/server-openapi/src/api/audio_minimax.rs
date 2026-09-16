use std::sync::Arc;

use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{MiniMaxMusicGenerationRequest, MiniMaxMusicGenerationResponse};

#[derive(Clone)]
pub struct AudioMinimaxApi {
    client: Arc<SdkworkHttpClient>,
}

impl AudioMinimaxApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Minimax create music generation
    pub async fn create_v1_music_generation(&self, body: &MiniMaxMusicGenerationRequest) -> Result<MiniMaxMusicGenerationResponse, SdkworkError> {
        let path = "/minimax/v1/music_generation".to_string();
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

}
