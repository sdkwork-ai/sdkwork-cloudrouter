use serde::{Deserialize, Serialize};

use crate::models::OpenAiProjectApiKey;

/// OpenAI-compatible project service account object.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiProjectServiceAccount {
    /// Api key field on the open ai project service account, using the open ai project api key module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_key: Option<OpenAiProjectApiKey>,

    /// Unix timestamp in seconds when the service account was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Service account identifier.
    pub id: String,

    /// Human-readable service account name.
    pub name: String,

    /// Object type, normally project.service_account.
    pub object: String,

    /// Project role identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
}
