use serde::{Deserialize, Serialize};

use crate::models::{AdminModelVendorItem};

/// Admin model vendor mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminModelVendorMutationResponse {
    /// Item field on admin model vendor mutation response.
    pub item: AdminModelVendorItem,
}
