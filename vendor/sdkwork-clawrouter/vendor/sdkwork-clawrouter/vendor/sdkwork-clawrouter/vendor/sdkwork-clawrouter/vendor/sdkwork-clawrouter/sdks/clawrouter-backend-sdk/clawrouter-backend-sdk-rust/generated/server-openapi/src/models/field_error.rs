use serde::{Deserialize, Serialize};

/// Field-level validation problem detail.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct FieldError {
    /// Machine-readable field validation code.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,

    /// Problem field path.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,

    /// Human-readable field validation message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}
