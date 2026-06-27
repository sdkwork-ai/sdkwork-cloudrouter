use serde::{Deserialize, Serialize};

/// Persisted provider secret account snapshot returned by the backend.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminProviderSecretItem {
    /// Account code field on admin provider secret item.
    #[serde(rename = "accountCode")]
    pub account_code: String,

    /// Auth type field on admin provider secret item.
    #[serde(rename = "authType")]
    pub auth_type: String,

    /// Created at field on admin provider secret item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Id field on admin provider secret item.
    pub id: String,

    /// Masked label field on admin provider secret item.
    #[serde(rename = "maskedLabel")]
    pub masked_label: String,

    /// Name field on admin provider secret item.
    pub name: String,

    /// Provider code field on admin provider secret item.
    #[serde(rename = "providerCode")]
    pub provider_code: String,

    /// Secret ref field on admin provider secret item.
    #[serde(rename = "secretRef")]
    pub secret_ref: String,

    /// Status field on admin provider secret item.
    pub status: String,

    /// Updated at field on admin provider secret item.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}
