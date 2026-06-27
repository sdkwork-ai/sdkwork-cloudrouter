use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AdapterTaskStatus {
    Queued,
    Running,
    Succeeded,
    Failed,
    Cancelled,
    Expired,
    Unknown,
}
