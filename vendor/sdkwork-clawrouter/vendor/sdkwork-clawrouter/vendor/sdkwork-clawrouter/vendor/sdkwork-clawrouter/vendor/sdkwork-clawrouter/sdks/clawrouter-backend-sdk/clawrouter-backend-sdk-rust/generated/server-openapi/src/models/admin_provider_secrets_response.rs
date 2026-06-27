use serde::{Deserialize, Serialize};

use crate::models::{AdminProviderSecretItem};

/// Admin provider secrets response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminProviderSecretsResponse {
    /// Items field on admin provider secrets response.
    pub items: Vec<AdminProviderSecretItem>,
}
