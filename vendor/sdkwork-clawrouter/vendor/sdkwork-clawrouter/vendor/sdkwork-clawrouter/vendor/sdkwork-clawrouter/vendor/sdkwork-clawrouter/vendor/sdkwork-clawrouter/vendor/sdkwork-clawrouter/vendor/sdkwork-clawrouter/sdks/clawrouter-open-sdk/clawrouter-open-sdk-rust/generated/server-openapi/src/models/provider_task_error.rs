use serde::{Deserialize, Serialize};

/// Reusable provider provider task error schema shared by Claw Router vendor modules.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderTaskError {
    /// Provider error code.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,

    /// Provider error message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,

    /// Provider error type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
}
