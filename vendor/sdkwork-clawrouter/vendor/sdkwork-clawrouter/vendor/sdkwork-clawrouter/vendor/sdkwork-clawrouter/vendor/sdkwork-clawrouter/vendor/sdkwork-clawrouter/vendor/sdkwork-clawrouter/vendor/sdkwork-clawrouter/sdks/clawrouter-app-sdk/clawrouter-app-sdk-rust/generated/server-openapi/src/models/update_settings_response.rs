use serde::{Deserialize, Serialize};

/// Update settings response schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UpdateSettingsResponse {
    /// Success field on update settings response.
    pub success: bool,
}
