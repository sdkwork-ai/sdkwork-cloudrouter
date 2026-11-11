use std::sync::Arc;

use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{BytedanceImageGenerationRequest, BytedanceImageGenerationResponse};

#[derive(Clone)]
pub struct ImagesBytedanceApi {
    client: Arc<SdkworkHttpClient>,
}

impl ImagesBytedanceApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// ByteDance Seedream image generation
    pub async fn create_api_v3_images_generation(&self, body: &BytedanceImageGenerationRequest) -> Result<BytedanceImageGenerationResponse, SdkworkError> {
        let path = "/bytedance/api/v3/images/generations".to_string();
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

}
