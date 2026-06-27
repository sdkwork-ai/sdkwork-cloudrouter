use serde::{Deserialize, Serialize};

/// Admin dashboard recent usage item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminDashboardRecentUsageItem {
    /// Billing mode field on admin dashboard recent usage item.
    #[serde(rename = "billingMode")]
    pub billing_mode: String,

    /// Cost field on admin dashboard recent usage item.
    pub cost: String,

    /// Id field on admin dashboard recent usage item.
    pub id: String,

    /// Is api user field on admin dashboard recent usage item.
    #[serde(rename = "isApiUser")]
    pub is_api_user: bool,

    /// Model field on admin dashboard recent usage item.
    pub model: String,

    /// Status field on admin dashboard recent usage item.
    pub status: String,

    /// Time field on admin dashboard recent usage item.
    pub time: String,

    /// Type field on admin dashboard recent usage item.
    pub r#type: String,

    /// Usage count field on admin dashboard recent usage item.
    #[serde(rename = "usageCount")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_count: Option<f64>,

    /// Usage in field on admin dashboard recent usage item.
    #[serde(rename = "usageIn")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_in: Option<f64>,

    /// Usage out field on admin dashboard recent usage item.
    #[serde(rename = "usageOut")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_out: Option<f64>,

    /// User field on admin dashboard recent usage item.
    pub user: String,
}
