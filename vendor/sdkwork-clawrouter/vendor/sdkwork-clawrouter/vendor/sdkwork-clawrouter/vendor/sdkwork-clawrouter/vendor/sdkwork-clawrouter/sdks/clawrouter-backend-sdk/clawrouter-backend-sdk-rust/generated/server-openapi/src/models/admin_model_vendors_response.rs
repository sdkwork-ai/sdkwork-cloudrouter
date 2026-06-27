use serde::{Deserialize, Serialize};

use crate::models::{AdminModelVendorItem};

/// Admin model vendors response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelVendorsResponse {
    /// Model vendor snapshots returned by the backend.
    pub items: Vec<AdminModelVendorItem>,
}
