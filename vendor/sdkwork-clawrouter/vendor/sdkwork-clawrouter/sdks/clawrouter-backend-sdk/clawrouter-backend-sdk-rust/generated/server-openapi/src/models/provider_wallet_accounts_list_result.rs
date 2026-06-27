use serde::{Deserialize, Serialize};

use crate::models::{ServiceProviderCollectionResponse};

/// Provider wallet accounts list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProviderWalletAccountsListResult {
    /// Business response code.
    pub code: String,

    /// Data field on provider wallet accounts list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<ServiceProviderCollectionResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
