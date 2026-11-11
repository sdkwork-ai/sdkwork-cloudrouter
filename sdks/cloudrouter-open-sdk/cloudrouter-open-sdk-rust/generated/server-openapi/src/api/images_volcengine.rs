use std::sync::Arc;

use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{VolcengineImageGenerationRequest, VolcengineImageGenerationResponse};

#[derive(Clone)]
pub struct ImagesVolcengineApi {
    client: Arc<SdkworkHttpClient>,
}

impl ImagesVolcengineApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Volcengine Ark image generation
    pub async fn create_api_v3_images_generation(&self, body: &VolcengineImageGenerationRequest) -> Result<VolcengineImageGenerationResponse, SdkworkError> {
        let path = "/volcengine/api/v3/images/generations".to_string();
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

}
