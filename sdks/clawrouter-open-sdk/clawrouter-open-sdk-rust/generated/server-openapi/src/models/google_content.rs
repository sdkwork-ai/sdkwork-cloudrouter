use serde::{Deserialize, Serialize};

use crate::models::{GooglePart};

/// Google Gemini google content schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleContent {
    /// Ordered content parts.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parts: Option<Vec<GooglePart>>,

    /// Content role, such as user or model.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
}
