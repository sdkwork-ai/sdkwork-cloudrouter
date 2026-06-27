use serde::{Deserialize, Serialize};

use crate::models::{AdminProviderSecretsResponse};

/// Provider secrets list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderSecretsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on provider secrets list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminProviderSecretsResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
