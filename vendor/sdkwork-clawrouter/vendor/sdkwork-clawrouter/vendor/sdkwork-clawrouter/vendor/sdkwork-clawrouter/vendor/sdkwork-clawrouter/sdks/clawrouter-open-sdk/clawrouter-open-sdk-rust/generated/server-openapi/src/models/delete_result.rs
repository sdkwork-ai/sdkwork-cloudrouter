use serde::{Deserialize, Serialize};

/// Delete result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct DeleteResult {
    /// Whether the resource was deleted.
    pub deleted: bool,

    /// Identifier of the deleted resource.
    pub id: String,

    /// Deleted resource object type.
    pub object: String,
}
