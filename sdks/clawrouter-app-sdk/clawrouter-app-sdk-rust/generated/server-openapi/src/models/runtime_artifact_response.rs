use serde::{Deserialize, Serialize};

use crate::models::{RuntimeArtifactItem};

/// Runtime artifact response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeArtifactResponse {
    /// Item field on runtime artifact response.
    pub item: RuntimeArtifactItem,
}
