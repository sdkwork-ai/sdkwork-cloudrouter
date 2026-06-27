use serde::{Deserialize, Serialize};

/// Admin runtime route explain issue schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminRuntimeRouteExplainIssue {
    /// Code field on admin runtime route explain issue.
    pub code: String,

    /// Message field on admin runtime route explain issue.
    pub message: String,

    /// Severity field on admin runtime route explain issue.
    pub severity: String,
}
