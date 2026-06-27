use serde::{Deserialize, Serialize};

/// Admin channel credential item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelCredentialItem {
    /// Plaintext provider API key returned only to authenticated admin management responses when available for channel credential relay operations.
    #[serde(rename = "apiKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,

    /// Base url field on admin channel credential item.
    #[serde(rename = "baseUrl")]
    pub base_url: String,

    /// Credential id field on admin channel credential item.
    #[serde(rename = "credentialId")]
    pub credential_id: String,

    /// Errors field on admin channel credential item.
    pub errors: String,

    /// Id field on admin channel credential item.
    pub id: String,

    /// Masked label field on admin channel credential item.
    #[serde(rename = "maskedLabel")]
    pub masked_label: String,

    /// Name field on admin channel credential item.
    pub name: String,

    /// Priority field on admin channel credential item.
    pub priority: String,

    /// Secret ref field on admin channel credential item.
    #[serde(rename = "secretRef")]
    pub secret_ref: String,

    /// Status field on admin channel credential item.
    pub status: String,

    /// Weight field on admin channel credential item.
    pub weight: String,
}
