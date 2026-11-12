use std::sync::Arc;

use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{BlackForestLabsVideoGenerationRequest, BlackForestLabsVideoGenerationTask};

#[derive(Clone)]
pub struct VideosBlackForestLabsApi {
    client: Arc<SdkworkHttpClient>,
}

impl VideosBlackForestLabsApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Black Forest Labs FLUX 3 video generation
    pub async fn create_flux_3_video(
        &self,
        body: &BlackForestLabsVideoGenerationRequest,
    ) -> Result<BlackForestLabsVideoGenerationTask, SdkworkError> {
        let path = "/black_forest_labs/v1/flux-3-video".to_string();
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }
}
