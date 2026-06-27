use serde::{Deserialize, Serialize};

/// Admin mcp server revision item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminMcpServerRevisionItem {
    /// Args json field on admin mcp server revision item.
    #[serde(rename = "argsJson")]
    pub args_json: Vec<String>,

    /// Auth type field on admin mcp server revision item.
    #[serde(rename = "authType")]
    pub auth_type: String,

    /// Command field on admin mcp server revision item.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,

    /// Config hash field on admin mcp server revision item.
    #[serde(rename = "configHash")]
    pub config_hash: String,

    /// Created at field on admin mcp server revision item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Created by field on admin mcp server revision item.
    #[serde(rename = "createdBy")]
    pub created_by: String,

    /// Deprecated at field on admin mcp server revision item.
    #[serde(rename = "deprecatedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deprecated_at: Option<String>,

    /// Endpoint url field on admin mcp server revision item.
    #[serde(rename = "endpointUrl")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub endpoint_url: Option<String>,

    /// Env schema field on admin mcp server revision item.
    #[serde(rename = "envSchema")]
    pub env_schema: std::collections::HashMap<String, String>,

    /// Id field on admin mcp server revision item.
    pub id: String,

    /// Lifecycle status field on admin mcp server revision item.
    #[serde(rename = "lifecycleStatus")]
    pub lifecycle_status: String,

    /// Organization id field on admin mcp server revision item.
    #[serde(rename = "organizationId")]
    pub organization_id: String,

    /// Published at field on admin mcp server revision item.
    #[serde(rename = "publishedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub published_at: Option<String>,

    /// Retry policy field on admin mcp server revision item.
    #[serde(rename = "retryPolicy")]
    pub retry_policy: std::collections::HashMap<String, String>,

    /// Revision no field on admin mcp server revision item.
    #[serde(rename = "revisionNo")]
    pub revision_no: String,

    /// Secret ref field on admin mcp server revision item.
    #[serde(rename = "secretRef")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub secret_ref: Option<String>,

    /// Server id field on admin mcp server revision item.
    #[serde(rename = "serverId")]
    pub server_id: String,

    /// Status field on admin mcp server revision item.
    pub status: String,

    /// Tenant id field on admin mcp server revision item.
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    /// Timeout ms field on admin mcp server revision item.
    #[serde(rename = "timeoutMs")]
    pub timeout_ms: i64,

    /// Transport field on admin mcp server revision item.
    pub transport: String,

    /// Updated at field on admin mcp server revision item.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,

    /// Uuid field on admin mcp server revision item.
    pub uuid: String,
}
