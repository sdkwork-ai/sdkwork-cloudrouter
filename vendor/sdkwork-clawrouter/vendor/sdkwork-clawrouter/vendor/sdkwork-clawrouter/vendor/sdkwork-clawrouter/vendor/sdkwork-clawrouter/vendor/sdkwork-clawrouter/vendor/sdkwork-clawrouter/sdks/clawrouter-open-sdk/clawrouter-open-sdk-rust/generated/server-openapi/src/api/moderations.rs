use std::sync::Arc;

use crate::api::paths::ai_path;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{OpenAiModeration, OpenAiModerationCreateRequest};

#[derive(Clone)]
pub struct ModerationsApi {
    client: Arc<SdkworkHttpClient>,
}

impl ModerationsApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Create moderation
    pub async fn create(
        &self,
        body: &OpenAiModerationCreateRequest,
    ) -> Result<OpenAiModeration, SdkworkError> {
        let path = ai_path(&"/moderations".to_string());
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }
}
