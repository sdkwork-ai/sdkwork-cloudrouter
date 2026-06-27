use serde::{Deserialize, Serialize};

/// App channel group schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AppChannelGroup {
    /// Code field on app channel group.
    pub code: String,

    /// Id field on app channel group.
    pub id: String,

    /// Name field on app channel group.
    pub name: String,

    /// Rate field on app channel group.
    pub rate: String,
}
