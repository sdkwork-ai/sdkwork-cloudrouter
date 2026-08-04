use serde::{Deserialize, Serialize};

/// Closed empty payload for operations that complete without business data.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct NoData {
    #[serde(flatten)]
    pub additional_properties: std::collections::HashMap<String, serde_json::Value>,
}
