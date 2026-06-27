use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelGroupChannelBindingItem};

/// Admin channel group channel bindings response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelGroupChannelBindingsResponse {
    /// Items field on admin channel group channel bindings response.
    pub items: Vec<AdminChannelGroupChannelBindingItem>,
}
