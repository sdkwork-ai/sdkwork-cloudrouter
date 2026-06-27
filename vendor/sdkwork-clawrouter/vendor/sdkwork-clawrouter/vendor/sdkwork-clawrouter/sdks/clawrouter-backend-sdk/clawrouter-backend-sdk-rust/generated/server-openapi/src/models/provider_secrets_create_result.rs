use serde::{Deserialize, Serialize};

use crate::models::{AdminProviderSecretMutationResponse};

/// Provider secrets create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderSecretsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on provider secrets create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminProviderSecretMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
