use serde::{Deserialize, Serialize};

use crate::models::GoogleFunctionCallingConfig;

/// Google Gemini google tool config schema exposed by Claw Router vendor routing.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct GoogleToolConfig {
    /// Function calling config field on the google tool config, using the google function calling config module.
    #[serde(rename = "functionCallingConfig")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub function_calling_config: Option<GoogleFunctionCallingConfig>,
}
