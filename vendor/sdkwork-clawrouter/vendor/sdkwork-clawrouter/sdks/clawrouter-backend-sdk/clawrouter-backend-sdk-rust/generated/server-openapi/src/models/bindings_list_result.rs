use serde::{Deserialize, Serialize};

use crate::models::{ServiceProviderCollectionResponse};

/// Bindings list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BindingsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on bindings list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<ServiceProviderCollectionResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
