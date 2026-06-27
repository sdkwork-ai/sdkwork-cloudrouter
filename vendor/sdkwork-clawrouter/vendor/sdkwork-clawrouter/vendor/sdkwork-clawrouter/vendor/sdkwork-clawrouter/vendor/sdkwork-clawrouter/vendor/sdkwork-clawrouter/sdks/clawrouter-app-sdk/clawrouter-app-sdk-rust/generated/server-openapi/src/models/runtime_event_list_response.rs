use serde::{Deserialize, Serialize};

use crate::models::{RuntimeEventItem};

/// Runtime event list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeEventListResponse {
    /// Items field on runtime event list response.
    pub items: Vec<RuntimeEventItem>,
}
