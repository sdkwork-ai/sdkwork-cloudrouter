use serde::{Deserialize, Serialize};

/// Messaging suppression create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MessagingSuppressionCreateRequest {
    /// Channel field on messaging suppression create request.
    pub channel: String,

    /// Ends at field on messaging suppression create request.
    #[serde(rename = "endsAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ends_at: Option<String>,

    /// Note field on messaging suppression create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,

    /// Reason code field on messaging suppression create request.
    #[serde(rename = "reasonCode")]
    pub reason_code: String,

    /// Scope id field on messaging suppression create request.
    #[serde(rename = "scopeId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scope_id: Option<String>,

    /// Scope type field on messaging suppression create request.
    #[serde(rename = "scopeType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scope_type: Option<String>,

    /// Source field on messaging suppression create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,

    /// Starts at field on messaging suppression create request.
    #[serde(rename = "startsAt")]
    pub starts_at: String,

    /// Target hash field on messaging suppression create request.
    #[serde(rename = "targetHash")]
    pub target_hash: String,

    /// Target masked field on messaging suppression create request.
    #[serde(rename = "targetMasked")]
    pub target_masked: String,
}
