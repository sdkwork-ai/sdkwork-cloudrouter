use serde::{Deserialize, Serialize};

use crate::models::{UsageSnapshot};

/// Runtime invocation complete request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeInvocationCompleteRequest {
    /// Error code field on runtime invocation complete request.
    #[serde(rename = "errorCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,

    /// Error message masked field on runtime invocation complete request.
    #[serde(rename = "errorMessageMasked")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error_message_masked: Option<String>,

    /// Error type field on runtime invocation complete request.
    #[serde(rename = "errorType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error_type: Option<String>,

    /// Exit code field on runtime invocation complete request.
    #[serde(rename = "exitCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<String>,

    /// Finish reason field on runtime invocation complete request.
    #[serde(rename = "finishReason")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,

    /// Latency ms field on runtime invocation complete request.
    #[serde(rename = "latencyMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<String>,

    /// Metadata field on runtime invocation complete request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Provider conversation id field on runtime invocation complete request.
    #[serde(rename = "providerConversationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_conversation_id: Option<String>,

    /// Provider response id field on runtime invocation complete request.
    #[serde(rename = "providerResponseId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_response_id: Option<String>,

    /// Provider session id field on runtime invocation complete request.
    #[serde(rename = "providerSessionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_session_id: Option<String>,

    /// Provider step id field on runtime invocation complete request.
    #[serde(rename = "providerStepId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_step_id: Option<String>,

    /// Response json field on runtime invocation complete request.
    #[serde(rename = "responseJson")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_json: Option<std::collections::HashMap<String, String>>,

    /// Status field on runtime invocation complete request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Ttft ms field on runtime invocation complete request.
    #[serde(rename = "ttftMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ttft_ms: Option<String>,

    /// Usage json field on runtime invocation complete request.
    #[serde(rename = "usageJson")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_json: Option<UsageSnapshot>,
}
