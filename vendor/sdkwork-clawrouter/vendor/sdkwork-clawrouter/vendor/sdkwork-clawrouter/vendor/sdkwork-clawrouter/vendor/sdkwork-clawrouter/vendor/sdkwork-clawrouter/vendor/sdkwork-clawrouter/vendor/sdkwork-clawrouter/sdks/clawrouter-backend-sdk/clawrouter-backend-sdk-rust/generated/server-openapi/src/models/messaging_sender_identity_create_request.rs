use serde::{Deserialize, Serialize};

/// Messaging sender identity create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MessagingSenderIdentityCreateRequest {
    /// Channel field on messaging sender identity create request.
    pub channel: String,

    /// Country code field on messaging sender identity create request.
    #[serde(rename = "countryCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub country_code: Option<String>,

    /// Display name field on messaging sender identity create request.
    #[serde(rename = "displayName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,

    /// Domain name field on messaging sender identity create request.
    #[serde(rename = "domainName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub domain_name: Option<String>,

    /// From email field on messaging sender identity create request.
    #[serde(rename = "fromEmail")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub from_email: Option<String>,

    /// From name field on messaging sender identity create request.
    #[serde(rename = "fromName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub from_name: Option<String>,

    /// Identity code field on messaging sender identity create request.
    #[serde(rename = "identityCode")]
    pub identity_code: String,

    /// Provider account id field on messaging sender identity create request.
    #[serde(rename = "providerAccountId")]
    pub provider_account_id: String,

    /// Reply to field on messaging sender identity create request.
    #[serde(rename = "replyTo")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reply_to: Option<String>,

    /// Sender id field on messaging sender identity create request.
    #[serde(rename = "senderId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sender_id: Option<String>,

    /// Sign name field on messaging sender identity create request.
    #[serde(rename = "signName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sign_name: Option<String>,
}
