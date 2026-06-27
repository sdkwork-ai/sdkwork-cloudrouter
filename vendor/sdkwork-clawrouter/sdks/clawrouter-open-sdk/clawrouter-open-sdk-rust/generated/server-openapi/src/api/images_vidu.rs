use std::sync::Arc;

use crate::api::paths::ai_path;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{ViduImageGenerationTask, ViduReferenceToImageRequest};

#[derive(Clone)]
pub struct ImagesViduApi {
    client: Arc<SdkworkHttpClient>,
}

impl ImagesViduApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Vidu reference to image
    pub async fn create_ent_v2_reference2image(
        &self,
        body: &ViduReferenceToImageRequest,
    ) -> Result<ViduImageGenerationTask, SdkworkError> {
        let path = ai_path(&"/vidu/ent/v2/reference2image".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }
}
