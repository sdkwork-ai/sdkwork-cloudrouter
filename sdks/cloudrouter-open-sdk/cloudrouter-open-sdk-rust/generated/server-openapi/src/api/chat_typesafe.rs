use std::sync::Arc;

use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{TypeSafeSystemOneRequest, TypeSafeSystemOneResponse};

#[derive(Clone)]
pub struct ChatTypesafeApi {
    client: Arc<SdkworkHttpClient>,
}

impl ChatTypesafeApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// TypeSafe AI System One decision
    pub async fn create_v1_systemone(
        &self,
        body: &TypeSafeSystemOneRequest,
    ) -> Result<TypeSafeSystemOneResponse, SdkworkError> {
        let path = "/typesafe/v1/systemone".to_string();
        self.client
            .post(&path, Some(body), None, None, Some("application/json"))
            .await
    }
}
