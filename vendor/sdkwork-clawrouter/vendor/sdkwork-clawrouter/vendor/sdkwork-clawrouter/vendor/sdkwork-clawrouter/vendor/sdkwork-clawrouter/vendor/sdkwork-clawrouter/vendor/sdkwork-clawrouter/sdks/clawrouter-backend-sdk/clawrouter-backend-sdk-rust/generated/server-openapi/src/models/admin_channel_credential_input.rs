use serde::{Deserialize, Serialize};

/// Admin channel credential input schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelCredentialInput {
    /// Api key field on admin channel credential input.
    #[serde(rename = "apiKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,

    /// Base url field on admin channel credential input.
    #[serde(rename = "baseUrl")]
    pub base_url: String,

    /// Name field on admin channel credential input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// Priority field on admin channel credential input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub priority: Option<String>,

    /// Secret ref field on admin channel credential input.
    #[serde(rename = "secretRef")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub secret_ref: Option<String>,

    /// Status field on admin channel credential input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Weight field on admin channel credential input.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub weight: Option<String>,
}
