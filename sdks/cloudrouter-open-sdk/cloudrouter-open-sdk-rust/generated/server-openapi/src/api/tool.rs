use std::sync::Arc;

use crate::api::paths::ai_path;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{OpenAiDeepSeekWebFetchRequest, OpenAiDeepSeekWebFetchResponse, OpenAiDeepSeekWebSearchRequest, OpenAiDeepSeekWebSearchResponse};

#[derive(Clone)]
pub struct ToolApi {
    client: Arc<SdkworkHttpClient>,
}

impl ToolApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Fetch a web page
    pub async fn create_fetch(&self, body: &OpenAiDeepSeekWebFetchRequest) -> Result<OpenAiDeepSeekWebFetchResponse, SdkworkError> {
        let path = ai_path(&"/tools/fetch".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Search the web
    pub async fn search(&self, body: &OpenAiDeepSeekWebSearchRequest) -> Result<OpenAiDeepSeekWebSearchResponse, SdkworkError> {
        let path = ai_path(&"/tools/search".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

}
