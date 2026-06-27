use serde::{Deserialize, Serialize};

/// Google Gemini google safety setting schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleSafetySetting {
    /// Safety harm category.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,

    /// Blocking threshold.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub threshold: Option<String>,
}
