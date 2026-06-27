use serde::{Deserialize, Serialize};

/// Google Gemini google safety rating schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleSafetyRating {
    /// Whether content was blocked.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub blocked: Option<bool>,

    /// Safety harm category.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,

    /// Estimated harm probability.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub probability: Option<String>,
}
