use serde::{Deserialize, Serialize};

/// Admin prompt render response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptRenderResponse {
    /// Rendered field on admin prompt render response.
    pub rendered: String,
}
