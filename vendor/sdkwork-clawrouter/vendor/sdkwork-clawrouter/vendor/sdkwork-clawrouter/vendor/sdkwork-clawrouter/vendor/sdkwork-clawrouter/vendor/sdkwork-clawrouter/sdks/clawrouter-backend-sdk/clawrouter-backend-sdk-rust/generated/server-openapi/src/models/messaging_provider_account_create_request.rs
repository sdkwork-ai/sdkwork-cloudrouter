use serde::{Deserialize, Serialize};

/// Messaging provider account create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MessagingProviderAccountCreateRequest {
    /// Account code field on messaging provider account create request.
    #[serde(rename = "accountCode")]
    pub account_code: String,

    /// Account name field on messaging provider account create request.
    #[serde(rename = "accountName")]
    pub account_name: String,

    /// Base url field on messaging provider account create request.
    #[serde(rename = "baseUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,

    /// Capability schema field on messaging provider account create request.
    #[serde(rename = "capabilitySchema")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capability_schema: Option<std::collections::HashMap<String, String>>,

    /// Channel field on messaging provider account create request.
    pub channel: String,

    /// Credential field on messaging provider account create request.
    pub credential: serde_json::Value,

    /// Delivery purpose field on messaging provider account create request.
    #[serde(rename = "deliveryPurpose")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub delivery_purpose: Option<String>,

    /// Provider code field on messaging provider account create request.
    #[serde(rename = "providerCode")]
    pub provider_code: String,
}
