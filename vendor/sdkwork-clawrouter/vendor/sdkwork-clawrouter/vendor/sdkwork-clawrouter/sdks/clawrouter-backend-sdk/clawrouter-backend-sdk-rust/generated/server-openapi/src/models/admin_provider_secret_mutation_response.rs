use serde::{Deserialize, Serialize};

use crate::models::{AdminProviderSecretItem};

/// Admin provider secret mutation response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminProviderSecretMutationResponse {
    /// Item field on admin provider secret mutation response.
    pub item: AdminProviderSecretItem,
}
