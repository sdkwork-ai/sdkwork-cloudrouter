use serde::{Deserialize, Serialize};

use crate::models::{ServiceProviderDownstreamMutationResponse};

/// Downstreams create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DownstreamsCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on downstreams create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<ServiceProviderDownstreamMutationResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
