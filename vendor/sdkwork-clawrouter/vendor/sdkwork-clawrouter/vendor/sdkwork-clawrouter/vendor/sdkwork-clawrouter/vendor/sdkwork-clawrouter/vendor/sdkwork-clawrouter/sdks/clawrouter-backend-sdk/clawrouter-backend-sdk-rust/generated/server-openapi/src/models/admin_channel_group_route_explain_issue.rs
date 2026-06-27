use serde::{Deserialize, Serialize};

/// Admin channel group route explain issue schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelGroupRouteExplainIssue {
    /// Code field on admin channel group route explain issue.
    pub code: String,

    /// Details field on admin channel group route explain issue.
    pub details: Vec<String>,

    /// Severity field on admin channel group route explain issue.
    pub severity: String,
}
