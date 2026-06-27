use serde::{Deserialize, Serialize};

use crate::models::{MessagingCollectionResponse};

/// Templates list result schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct TemplatesListResult {
    /// Business response code.
    pub code: String,

    /// Data field on templates list result.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<MessagingCollectionResponse>,

    /// Human-readable response message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
}
