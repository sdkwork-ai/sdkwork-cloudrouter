use std::sync::Arc;

use crate::api::paths::ai_path;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{
    OpenAiImageEditRequest, OpenAiImageGenerationRequest, OpenAiImageList,
    OpenAiImageVariationRequest,
};

#[derive(Clone)]
pub struct ImagesApi {
    client: Arc<SdkworkHttpClient>,
}

impl ImagesApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Create image edit
    pub async fn create_edit(
        &self,
        body: &OpenAiImageEditRequest,
    ) -> Result<OpenAiImageList, SdkworkError> {
        let path = ai_path(&"/images/edits".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Create image
    pub async fn create_generation(
        &self,
        body: &OpenAiImageGenerationRequest,
    ) -> Result<OpenAiImageList, SdkworkError> {
        let path = ai_path(&"/images/generations".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }

    /// Create image variation
    pub async fn create_variation(
        &self,
        body: &OpenAiImageVariationRequest,
    ) -> Result<OpenAiImageList, SdkworkError> {
        let path = ai_path(&"/images/variations".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }
}
