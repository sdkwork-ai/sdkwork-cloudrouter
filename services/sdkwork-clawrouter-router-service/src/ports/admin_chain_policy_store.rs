//! Admin chain-policy store port (management surface).
//!
//! Backs the backend-api global chain-policy endpoints and the per-API-key
//! chain overrides managed from the console. Rows live in
//! `iam_gateway_chain_policy`; the payload is a camelCase
//! `sdkwork_web_chain::ChainPolicy` document.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Wire scope encodings shared with the gateway resolver.
pub const ADMIN_CHAIN_POLICY_SCOPE_GLOBAL: i32 = 0;
pub const ADMIN_CHAIN_POLICY_SCOPE_API_KEY: i32 = 4;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminChainPolicySubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminChainPolicyItem {
    pub id: i64,
    pub scope_type: i32,
    pub scope_id: i64,
    pub policy_name: String,
    pub payload: Value,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct UpsertChainPolicyCommand {
    pub subject: AdminChainPolicySubject,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub policy_name: String,
    pub scope_type: i32,
    pub scope_id: i64,
    pub payload: Value,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AdminChainPolicyStoreErrorKind {
    Conflict,
    System,
}

#[derive(Debug, Clone)]
pub struct AdminChainPolicyStoreError {
    pub kind: AdminChainPolicyStoreErrorKind,
    pub message: String,
}

impl AdminChainPolicyStoreError {
    pub fn conflict(message: impl Into<String>) -> Self {
        Self {
            kind: AdminChainPolicyStoreErrorKind::Conflict,
            message: message.into(),
        }
    }

    pub fn system(message: impl Into<String>) -> Self {
        Self {
            kind: AdminChainPolicyStoreErrorKind::System,
            message: message.into(),
        }
    }

    pub fn is_conflict(&self) -> bool {
        self.kind == AdminChainPolicyStoreErrorKind::Conflict
    }
}

/// Read/write store for chain policy configuration.
#[async_trait]
pub trait AdminChainPolicyStore: Send + Sync {
    /// Active row for the scope, when configured.
    async fn get_chain_policy(&self, scope_type: i32, scope_id: i64)
        -> Option<AdminChainPolicyItem>;

    /// Inserts or updates the active row for the scope, recording an audit
    /// log entry and a config snapshot.
    async fn upsert_chain_policy(
        &self,
        command: UpsertChainPolicyCommand,
    ) -> Result<AdminChainPolicyItem, AdminChainPolicyStoreError>;
}
