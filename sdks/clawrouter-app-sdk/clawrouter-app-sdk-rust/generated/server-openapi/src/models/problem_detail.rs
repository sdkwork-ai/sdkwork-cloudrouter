use serde::{Deserialize, Serialize};

use crate::models::{FieldError};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ProblemDetail {
    /// Platform or domain error code per API_SPEC.md §15.3.
    pub code: i64,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub errors: Option<Vec<FieldError>>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instance: Option<String>,

    pub status: i64,

    pub title: String,

    /// Server-owned request correlation id.
    #[serde(rename = "traceId")]
    pub trace_id: String,

    pub r#type: String,
}
