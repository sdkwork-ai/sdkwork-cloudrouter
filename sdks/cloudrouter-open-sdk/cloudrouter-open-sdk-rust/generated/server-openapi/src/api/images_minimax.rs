use std::sync::Arc;

use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{MinimaxImageGenerationRequest, MinimaxImageGenerationResponse};

#[derive(Clone)]
pub struct ImagesMinimaxApi {
    client: Arc<SdkworkHttpClient>,
}

impl ImagesMinimaxApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// MiniMax image generation
    pub async fn create_v1_image_generation(
        &self,
        body: &MinimaxImageGenerationRequest,
    ) -> Result<MinimaxImageGenerationResponse, SdkworkError> {
        let path = "/minimax/v1/image_generation".to_string();
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }
}
