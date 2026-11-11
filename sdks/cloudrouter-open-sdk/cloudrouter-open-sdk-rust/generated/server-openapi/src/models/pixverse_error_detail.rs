use serde::{Deserialize, Serialize};

/// PixVerse supplemental error detail.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct PixverseErrorDetail {
    /// Error cause and suggested action.
    #[serde(rename = "Message")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,

    /// Error parameters such as `Fields`, `AllowedValues`, or `RequiredField`.
    #[serde(rename = "Param")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub param: Option<std::collections::HashMap<String, String>>,

    /// Stable error type identifier.
    #[serde(rename = "Type")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
}
