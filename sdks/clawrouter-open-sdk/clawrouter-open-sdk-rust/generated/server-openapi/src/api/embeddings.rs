use std::sync::Arc;

use crate::api::paths::ai_path;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{OpenAiEmbeddingList, OpenAiEmbeddingsRequest};

#[derive(Clone)]
pub struct EmbeddingsApi {
    client: Arc<SdkworkHttpClient>,
}

impl EmbeddingsApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Create embeddings
    pub async fn create(&self, body: &OpenAiEmbeddingsRequest) -> Result<OpenAiEmbeddingList, SdkworkError> {
        let path = ai_path(&"/embeddings".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

}
