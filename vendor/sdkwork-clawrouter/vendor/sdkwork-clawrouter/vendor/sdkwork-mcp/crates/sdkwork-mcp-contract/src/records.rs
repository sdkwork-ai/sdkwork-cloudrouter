use serde::{Deserialize, Serialize};

use crate::enums::{
    McpAuthKind, McpDataScope, McpHealthStatus, McpInvocationKind, McpLifecycleStatus,
    McpPublishStatus, McpTransportKind, McpVisibility,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct McpServerCategoryRecord {
    pub id: u64,
    pub uuid: String,
    pub tenant_id: u64,
    pub organization_id: u64,
    pub category_code: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: u64,
    pub sort_order: i32,
    pub icon_ref: Option<String>,
    pub lifecycle_status: McpLifecycleStatus,
    pub version: u64,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: u64,
    pub updated_by: u64,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct McpServerRecord {
    pub id: u64,
    pub uuid: String,
    pub tenant_id: u64,
    pub organization_id: u64,
    pub owner_user_id: u64,
    pub server_key: String,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<u64>,
    pub category_code: Option<String>,
    pub transport: McpTransportKind,
    pub visibility: McpVisibility,
    pub data_scope: McpDataScope,
    pub latest_connector_id: Option<u64>,
    pub published_connector_id: Option<u64>,
    pub health_status: McpHealthStatus,
    pub last_checked_at: Option<String>,
    pub last_error_masked: Option<String>,
    pub lifecycle_status: McpLifecycleStatus,
    pub tags: Vec<String>,
    pub icon_ref: Option<String>,
    pub published_at: Option<String>,
    pub deprecated_at: Option<String>,
    pub version: u64,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: u64,
    pub updated_by: u64,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct McpConnectorRecord {
    pub id: u64,
    pub uuid: String,
    pub tenant_id: u64,
    pub organization_id: u64,
    pub server_id: u64,
    pub connector_key: String,
    pub publish_status: McpPublishStatus,
    pub transport: McpTransportKind,
    pub endpoint_url: Option<String>,
    pub command_ref: Option<String>,
    pub args_json: String,
    pub env_schema_json: String,
    pub auth_type: McpAuthKind,
    pub secret_ref: Option<String>,
    pub timeout_ms: u32,
    pub retry_policy_json: String,
    pub config_hash: Option<String>,
    pub lifecycle_status: McpLifecycleStatus,
    pub version: u64,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: u64,
    pub updated_by: u64,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct McpToolRecord {
    pub id: u64,
    pub uuid: String,
    pub tenant_id: u64,
    pub organization_id: u64,
    pub server_id: u64,
    pub connector_id: u64,
    pub tool_key: String,
    pub name: String,
    pub description: Option<String>,
    pub input_schema_json: String,
    pub output_schema_json: String,
    pub risk_level: String,
    pub requires_approval: bool,
    pub enabled: bool,
    pub lifecycle_status: McpLifecycleStatus,
    pub rate_limit_policy_json: String,
    pub schema_hash: Option<String>,
    pub discovered_at: Option<String>,
    pub last_invoked_at: Option<String>,
    pub sort_weight: i32,
    pub version: u64,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: u64,
    pub updated_by: u64,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct McpResourceRecord {
    pub id: u64,
    pub uuid: String,
    pub tenant_id: u64,
    pub organization_id: u64,
    pub server_id: u64,
    pub connector_id: u64,
    pub resource_key: String,
    pub uri: String,
    pub name: String,
    pub description: Option<String>,
    pub mime_type: Option<String>,
    pub enabled: bool,
    pub lifecycle_status: McpLifecycleStatus,
    pub discovered_at: Option<String>,
    pub version: u64,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: u64,
    pub updated_by: u64,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct McpPromptRecord {
    pub id: u64,
    pub uuid: String,
    pub tenant_id: u64,
    pub organization_id: u64,
    pub server_id: u64,
    pub connector_id: u64,
    pub prompt_key: String,
    pub name: String,
    pub description: Option<String>,
    pub arguments_schema_json: String,
    pub enabled: bool,
    pub lifecycle_status: McpLifecycleStatus,
    pub discovered_at: Option<String>,
    pub version: u64,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: u64,
    pub updated_by: u64,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct McpInvocationRecord {
    pub id: u64,
    pub uuid: String,
    pub tenant_id: u64,
    pub organization_id: u64,
    pub user_id: u64,
    pub server_id: u64,
    pub connector_id: Option<u64>,
    pub invocation_kind: McpInvocationKind,
    pub target_key: String,
    pub request_id: Option<String>,
    pub trace_id: Option<String>,
    pub idempotency_key: Option<String>,
    pub request_json: String,
    pub response_json: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub duration_ms: Option<u32>,
    pub invoked_at: String,
    pub created_at: String,
}

impl McpServerRecord {
    pub fn is_enabled(&self) -> bool {
        self.lifecycle_status == McpLifecycleStatus::Active
    }
}
