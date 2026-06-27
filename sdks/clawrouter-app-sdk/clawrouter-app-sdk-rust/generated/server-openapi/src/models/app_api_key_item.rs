use serde::{Deserialize, Serialize};

/// Updated API key metadata. Authenticated owner management responses include copyableKey for console copy actions.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AppApiKeyItem {
    /// Channel group field on app api key item.
    #[serde(rename = "channelGroup")]
    pub channel_group: String,

    /// Display name snapshot for the bound channel group so the list view does not need to preload selectable groups.
    #[serde(rename = "channelGroupName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub channel_group_name: Option<String>,

    /// Full plaintext API key returned only by authenticated owner management responses; public catalog responses omit this field.
    #[serde(rename = "copyableKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub copyable_key: Option<String>,

    /// Created field on app api key item.
    pub created: String,

    /// Whether this key is the current console default for backend runtime API key selection.
    #[serde(rename = "defaultForRuntime")]
    pub default_for_runtime: bool,

    /// Expires field on app api key item.
    pub expires: String,

    /// Id field on app api key item.
    pub id: String,

    /// Ip limit field on app api key item.
    #[serde(rename = "ipLimit")]
    pub ip_limit: String,

    /// Masked key field on app api key item.
    #[serde(rename = "maskedKey")]
    pub masked_key: String,

    /// Modalities field on app api key item.
    pub modalities: Vec<String>,

    /// Name field on app api key item.
    pub name: String,

    /// Quota field on app api key item.
    pub quota: String,

    /// Rate field on app api key item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rate: Option<String>,

    /// Status field on app api key item.
    pub status: String,

    /// Used quota field on app api key item.
    #[serde(rename = "usedQuota")]
    pub used_quota: String,
}
