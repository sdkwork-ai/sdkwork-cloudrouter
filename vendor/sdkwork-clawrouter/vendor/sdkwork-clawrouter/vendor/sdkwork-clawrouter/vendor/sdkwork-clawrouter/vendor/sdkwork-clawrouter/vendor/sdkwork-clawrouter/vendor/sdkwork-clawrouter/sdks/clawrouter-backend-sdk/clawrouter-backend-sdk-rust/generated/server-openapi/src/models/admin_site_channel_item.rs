use serde::{Deserialize, Serialize};

/// Admin site channel item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminSiteChannelItem {
    /// Channel code field on admin site channel item.
    #[serde(rename = "channelCode")]
    pub channel_code: String,

    /// Channel name field on admin site channel item.
    #[serde(rename = "channelName")]
    pub channel_name: String,

    /// Health status field on admin site channel item.
    #[serde(rename = "healthStatus")]
    pub health_status: String,

    /// Id field on admin site channel item.
    pub id: String,

    /// Provider code field on admin site channel item.
    #[serde(rename = "providerCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_code: Option<String>,

    /// Site channel role field on admin site channel item.
    #[serde(rename = "siteChannelRole")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub site_channel_role: Option<String>,

    /// Site code field on admin site channel item.
    #[serde(rename = "siteCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub site_code: Option<String>,

    /// Site service code field on admin site channel item.
    #[serde(rename = "siteServiceCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub site_service_code: Option<String>,

    /// Status field on admin site channel item.
    pub status: String,
}
