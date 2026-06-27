use serde::{Deserialize, Serialize};

use crate::models::{AdminSiteConnectionCheckResponse};

/// Health check create result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct HealthCheckCreateResult {
    /// Business response code.
    pub code: String,

    /// Data field on health check create result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<AdminSiteConnectionCheckResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
