use serde::{Deserialize, Serialize};

use crate::models::{GoogleSchema};

/// Google Gemini google function declaration schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleFunctionDeclaration {
    /// Function description.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Function name.
    pub name: String,

    /// Parameters field on the google function declaration, using the google schema module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parameters: Option<GoogleSchema>,

    /// Response field on the google function declaration, using the google schema module.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response: Option<GoogleSchema>,
}
