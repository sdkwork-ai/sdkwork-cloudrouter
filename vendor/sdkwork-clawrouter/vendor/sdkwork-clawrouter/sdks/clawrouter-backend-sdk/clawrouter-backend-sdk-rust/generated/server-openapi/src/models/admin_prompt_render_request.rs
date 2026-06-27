use serde::{Deserialize, Serialize};

/// Admin prompt render request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptRenderRequest {
    /// Variables field on admin prompt render request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variables: Option<std::collections::HashMap<String, String>>,
}
