use std::sync::Arc;

use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{ZhipuImageGenerationRequest, ZhipuImageGenerationResponse};

#[derive(Clone)]
pub struct ImagesZhipuApi {
    client: Arc<SdkworkHttpClient>,
}

impl ImagesZhipuApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Zhipu CogView image generation
    pub async fn create_api_paas_v4_images_generation(
        &self,
        body: &ZhipuImageGenerationRequest,
    ) -> Result<ZhipuImageGenerationResponse, SdkworkError> {
        let path = "/zhipu/api/paas/v4/images/generations".to_string();
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }
}
