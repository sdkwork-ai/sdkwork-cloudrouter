use serde::{Deserialize, Serialize};

use crate::models::{AdminProviderSecretMutationResponse};

/// Provider secrets update result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderSecretsUpdateResult {
    /// Business response code.
    pub code: String,

    /// Data field on provider secrets update result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminProviderSecretMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
