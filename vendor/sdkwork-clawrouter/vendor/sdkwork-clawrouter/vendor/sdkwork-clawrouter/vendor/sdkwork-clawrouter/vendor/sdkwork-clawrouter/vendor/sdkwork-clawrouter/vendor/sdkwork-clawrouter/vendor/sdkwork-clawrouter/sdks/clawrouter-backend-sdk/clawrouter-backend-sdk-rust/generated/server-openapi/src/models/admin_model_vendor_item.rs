use serde::{Deserialize, Serialize};

/// Admin model vendor item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelVendorItem {
    /// Color field on admin model vendor item.
    pub color: String,

    /// Description field on admin model vendor item.
    pub description: String,

    /// Id field on admin model vendor item.
    pub id: String,

    /// Name field on admin model vendor item.
    pub name: String,

    /// Status field on admin model vendor item.
    pub status: String,

    /// Vendor code field on admin model vendor item.
    #[serde(rename = "vendorCode")]
    pub vendor_code: String,
}
