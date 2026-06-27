use serde::{Deserialize, Serialize};

/// Admin model mapping resolve request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelMappingResolveRequest {
    /// Channel code field on admin model mapping resolve request.
    #[serde(rename = "channelCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub channel_code: Option<String>,

    /// Channel id field on admin model mapping resolve request.
    #[serde(rename = "channelId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub channel_id: Option<String>,

    /// Provider account code field on admin model mapping resolve request.
    #[serde(rename = "providerAccountCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_account_code: Option<String>,

    /// Provider account id field on admin model mapping resolve request.
    #[serde(rename = "providerAccountId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_account_id: Option<String>,

    /// Source model field on admin model mapping resolve request.
    #[serde(rename = "sourceModel")]
    pub source_model: String,

    /// Vendor code field on admin model mapping resolve request.
    #[serde(rename = "vendorCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor_code: Option<String>,
}
