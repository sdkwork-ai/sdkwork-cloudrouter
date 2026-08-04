//! Call-chain policy persistence port.
//!
//! Implementations read `iam_gateway_chain_policy` rows (global or per-API-key
//! scope). The payload JSON is a serialized `sdkwork_web_chain::ChainPolicy`
//! (camelCase): `{"concurrency": {...}, "ipAccess": {...}, "stages": {...}}`.
//! The gateway chain resolver merges these rows over built-in defaults and
//! legacy sources (access-policy IP lists, WAF risk rules).

use async_trait::async_trait;

/// Scope encodings aligned with the gateway risk-rule scope vocabulary:
/// `None`/`0` means platform-global, `API_KEY` matches the risk-rule
/// `SCOPE_TYPE_API_KEY` encoding.
pub const CHAIN_POLICY_SCOPE_GLOBAL: i32 = 0;
pub const CHAIN_POLICY_SCOPE_API_KEY: i32 = 4;

#[derive(Debug, Clone)]
pub struct ChainPolicyRecord {
    pub scope_type: i32,
    pub scope_id: i64,
    /// camelCase `sdkwork_web_chain::ChainPolicy` payload.
    pub payload: serde_json::Value,
}

/// Read model for chain policy configuration rows.
#[async_trait]
pub trait GatewayChainPolicyStore: Send + Sync {
    /// Active (status = 1) row for the given scope, if any.
    async fn find_chain_policy(&self, scope_type: i32, scope_id: i64)
        -> Option<ChainPolicyRecord>;
}
