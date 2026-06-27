use serde::{Deserialize, Serialize};

use crate::models::{RuntimeEventItem};

/// Runtime event response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeEventResponse {
    /// Item field on runtime event response.
    pub item: RuntimeEventItem,
}
