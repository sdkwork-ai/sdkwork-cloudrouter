use serde::{Deserialize, Serialize};

/// Runtime invocation create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct RuntimeInvocationCreateRequest {
    /// Agent run id field on runtime invocation create request.
    #[serde(rename = "agentRunId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_run_id: Option<String>,

    /// Agent run step id field on runtime invocation create request.
    #[serde(rename = "agentRunStepId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_run_step_id: Option<String>,

    /// Agent session id field on runtime invocation create request.
    #[serde(rename = "agentSessionId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agent_session_id: Option<String>,

    /// Approval policy field on runtime invocation create request.
    #[serde(rename = "approvalPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub approval_policy: Option<String>,

    /// Chat item id field on runtime invocation create request.
    #[serde(rename = "chatItemId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chat_item_id: Option<String>,

    /// Chat turn id field on runtime invocation create request.
    #[serde(rename = "chatTurnId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub chat_turn_id: Option<String>,

    /// Conversation id field on runtime invocation create request.
    #[serde(rename = "conversationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub conversation_id: Option<String>,

    /// Cwd field on runtime invocation create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,

    /// Endpoint field on runtime invocation create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub endpoint: Option<String>,

    /// Invocation type field on runtime invocation create request.
    #[serde(rename = "invocationType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub invocation_type: Option<String>,

    /// Metadata field on runtime invocation create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Model field on runtime invocation create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Permission mode field on runtime invocation create request.
    #[serde(rename = "permissionMode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub permission_mode: Option<String>,

    /// Provider field on runtime invocation create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,

    /// Request json field on runtime invocation create request.
    #[serde(rename = "requestJson")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request_json: Option<std::collections::HashMap<String, String>>,

    /// Runtime field on runtime invocation create request.
    pub runtime: String,

    /// Sandbox policy field on runtime invocation create request.
    #[serde(rename = "sandboxPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sandbox_policy: Option<String>,

    /// Status field on runtime invocation create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Streaming field on runtime invocation create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub streaming: Option<bool>,

    /// Tool call id field on runtime invocation create request.
    #[serde(rename = "toolCallId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,

    /// Tool name field on runtime invocation create request.
    #[serde(rename = "toolName")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,

    /// Trace id field on runtime invocation create request.
    #[serde(rename = "traceId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,
}
