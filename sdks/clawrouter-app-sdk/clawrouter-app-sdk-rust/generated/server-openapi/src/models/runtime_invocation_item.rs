use serde::{Deserialize, Serialize};

/// Runtime invocation item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeInvocationItem {
    /// Agent run id field on runtime invocation item.
    #[serde(rename = "agentRunId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_run_id: Option<String>,

    /// Agent run step id field on runtime invocation item.
    #[serde(rename = "agentRunStepId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_run_step_id: Option<String>,

    /// Agent session id field on runtime invocation item.
    #[serde(rename = "agentSessionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_session_id: Option<String>,

    /// Approval policy field on runtime invocation item.
    #[serde(rename = "approvalPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub approval_policy: Option<String>,

    /// Attempt no field on runtime invocation item.
    #[serde(rename = "attemptNo")]
    pub attempt_no: String,

    /// Chat item id field on runtime invocation item.
    #[serde(rename = "chatItemId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chat_item_id: Option<String>,

    /// Chat turn id field on runtime invocation item.
    #[serde(rename = "chatTurnId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chat_turn_id: Option<String>,

    /// Completed at field on runtime invocation item.
    #[serde(rename = "completedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<String>,

    /// Conversation id field on runtime invocation item.
    #[serde(rename = "conversationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub conversation_id: Option<String>,

    /// Created at field on runtime invocation item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Cwd field on runtime invocation item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,

    /// Endpoint field on runtime invocation item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub endpoint: Option<String>,

    /// Error code field on runtime invocation item.
    #[serde(rename = "errorCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,

    /// Error message masked field on runtime invocation item.
    #[serde(rename = "errorMessageMasked")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error_message_masked: Option<String>,

    /// Error type field on runtime invocation item.
    #[serde(rename = "errorType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error_type: Option<String>,

    /// Exit code field on runtime invocation item.
    #[serde(rename = "exitCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<String>,

    /// Finish reason field on runtime invocation item.
    #[serde(rename = "finishReason")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub finish_reason: Option<String>,

    /// Id field on runtime invocation item.
    pub id: String,

    /// Invocation no field on runtime invocation item.
    #[serde(rename = "invocationNo")]
    pub invocation_no: String,

    /// Invocation type field on runtime invocation item.
    #[serde(rename = "invocationType")]
    pub invocation_type: String,

    /// Latency ms field on runtime invocation item.
    #[serde(rename = "latencyMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<String>,

    /// Model field on runtime invocation item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Permission mode field on runtime invocation item.
    #[serde(rename = "permissionMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub permission_mode: Option<String>,

    /// Provider field on runtime invocation item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,

    /// Provider conversation id field on runtime invocation item.
    #[serde(rename = "providerConversationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_conversation_id: Option<String>,

    /// Provider response id field on runtime invocation item.
    #[serde(rename = "providerResponseId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_response_id: Option<String>,

    /// Provider session id field on runtime invocation item.
    #[serde(rename = "providerSessionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_session_id: Option<String>,

    /// Provider step id field on runtime invocation item.
    #[serde(rename = "providerStepId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider_step_id: Option<String>,

    /// Request id field on runtime invocation item.
    #[serde(rename = "requestId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,

    /// Runtime field on runtime invocation item.
    pub runtime: String,

    /// Sandbox policy field on runtime invocation item.
    #[serde(rename = "sandboxPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sandbox_policy: Option<String>,

    /// Started at field on runtime invocation item.
    #[serde(rename = "startedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub started_at: Option<String>,

    /// Status field on runtime invocation item.
    pub status: String,

    /// Streaming field on runtime invocation item.
    pub streaming: bool,

    /// Tool call id field on runtime invocation item.
    #[serde(rename = "toolCallId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,

    /// Tool name field on runtime invocation item.
    #[serde(rename = "toolName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,

    /// Trace id field on runtime invocation item.
    #[serde(rename = "traceId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,

    /// Ttft ms field on runtime invocation item.
    #[serde(rename = "ttftMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ttft_ms: Option<String>,
}
