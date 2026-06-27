use serde::{Deserialize, Serialize};

use crate::models::{AdminChannelGroupChannelBindingInput};

/// Admin channel group channel bindings replace request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminChannelGroupChannelBindingsReplaceRequest {
    /// Items field on admin channel group channel bindings replace request.
    pub items: Vec<AdminChannelGroupChannelBindingInput>,
}
