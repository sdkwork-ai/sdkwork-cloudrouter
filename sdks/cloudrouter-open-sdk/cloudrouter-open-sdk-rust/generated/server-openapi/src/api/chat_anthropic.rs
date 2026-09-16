use std::sync::Arc;

use crate::api::paths::ai_path;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{AnthropicCountMessageTokensRequest, AnthropicCountMessageTokensResponse, AnthropicMessage, AnthropicMessageCreateRequest};

#[derive(Clone)]
pub struct ChatAnthropicApi {
    client: Arc<SdkworkHttpClient>,
}

impl ChatAnthropicApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Anthropic Claude message
    pub async fn create_v1_message(&self, body: &AnthropicMessageCreateRequest) -> Result<AnthropicMessage, SdkworkError> {
        let path = ai_path(&"/anthropic/v1/messages".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Anthropic count message tokens
    pub async fn create_v1_messages_count_token(&self, body: &AnthropicCountMessageTokensRequest) -> Result<AnthropicCountMessageTokensResponse, SdkworkError> {
        let path = ai_path(&"/anthropic/v1/messages/count_tokens".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

}
