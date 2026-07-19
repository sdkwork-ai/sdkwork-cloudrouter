use std::sync::Arc;

use crate::api::paths::ai_path;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{OpenAiCompletion, OpenAiCompletionCreateRequest};

#[derive(Clone)]
pub struct CompletionApi {
    client: Arc<SdkworkHttpClient>,
}

impl CompletionApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Create completion
    pub async fn create(
        &self,
        body: &OpenAiCompletionCreateRequest,
    ) -> Result<OpenAiCompletion, SdkworkError> {
        let path = ai_path(&"/completions".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }
}
