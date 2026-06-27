use serde::{Deserialize, Serialize};

/// Admin provider secret create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminProviderSecretCreateRequest {
    /// Auth type field on admin provider secret create request.
    #[serde(rename = "authType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auth_type: Option<String>,

    /// Name field on admin provider secret create request.
    pub name: String,

    /// Provider code field on admin provider secret create request.
    #[serde(rename = "providerCode")]
    pub provider_code: String,

    /// Vault/KMS secret reference. Plaintext provider secrets are forbidden.
    #[serde(rename = "secretRef")]
    pub secret_ref: String,

    /// Status field on admin provider secret create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
