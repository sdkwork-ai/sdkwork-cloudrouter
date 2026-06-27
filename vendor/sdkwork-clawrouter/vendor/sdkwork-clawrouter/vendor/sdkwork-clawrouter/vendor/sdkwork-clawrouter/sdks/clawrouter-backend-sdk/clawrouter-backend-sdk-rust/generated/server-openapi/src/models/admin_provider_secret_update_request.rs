use serde::{Deserialize, Serialize};

/// Admin provider secret update request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminProviderSecretUpdateRequest {
    /// Auth type field on admin provider secret update request.
    #[serde(rename = "authType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auth_type: Option<String>,

    /// Id field on admin provider secret update request.
    pub id: String,

    /// Name field on admin provider secret update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Provider code field on admin provider secret update request.
    #[serde(rename = "providerCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_code: Option<String>,

    /// Vault/KMS secret reference. Plaintext provider secrets are forbidden.
    #[serde(rename = "secretRef")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub secret_ref: Option<String>,

    /// Status field on admin provider secret update request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
