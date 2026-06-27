use serde::{Deserialize, Serialize};

/// Admin mcp server revision create request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpServerRevisionCreateRequest {
    /// Args json field on admin mcp server revision create request.
    #[serde(rename = "argsJson")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub args_json: Option<Vec<String>>,

    /// Auth type field on admin mcp server revision create request.
    #[serde(rename = "authType")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub auth_type: Option<String>,

    /// Command field on admin mcp server revision create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,

    /// Endpoint url field on admin mcp server revision create request.
    #[serde(rename = "endpointUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub endpoint_url: Option<String>,

    /// Env schema field on admin mcp server revision create request.
    #[serde(rename = "envSchema")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub env_schema: Option<std::collections::HashMap<String, String>>,

    /// Retry policy field on admin mcp server revision create request.
    #[serde(rename = "retryPolicy")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub retry_policy: Option<std::collections::HashMap<String, String>>,

    /// Revision no field on admin mcp server revision create request.
    #[serde(rename = "revisionNo")]
    pub revision_no: String,

    /// Secret ref field on admin mcp server revision create request.
    #[serde(rename = "secretRef")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub secret_ref: Option<String>,

    /// Timeout ms field on admin mcp server revision create request.
    #[serde(rename = "timeoutMs")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<i64>,

    /// Transport field on admin mcp server revision create request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub transport: Option<String>,
}
