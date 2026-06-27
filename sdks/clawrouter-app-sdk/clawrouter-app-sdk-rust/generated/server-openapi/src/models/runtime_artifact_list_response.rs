use serde::{Deserialize, Serialize};

use crate::models::{RuntimeArtifactItem};

/// Runtime artifact list response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeArtifactListResponse {
    /// Items field on runtime artifact list response.
    pub items: Vec<RuntimeArtifactItem>,
}
