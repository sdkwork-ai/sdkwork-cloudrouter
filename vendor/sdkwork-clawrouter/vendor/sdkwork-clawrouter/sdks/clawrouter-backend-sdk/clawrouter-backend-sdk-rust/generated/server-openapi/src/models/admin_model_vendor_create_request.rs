use serde::{Deserialize, Serialize};

/// Admin model vendor create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelVendorCreateRequest {
    /// Safe style token used by the admin console.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,

    /// Vendor description shown in the admin console.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Human-readable vendor display name.
    pub name: String,

    /// Status field on admin model vendor create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Optional normalized vendor code; generated from name when omitted.
    #[serde(rename = "vendorCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vendor_code: Option<String>,
}
