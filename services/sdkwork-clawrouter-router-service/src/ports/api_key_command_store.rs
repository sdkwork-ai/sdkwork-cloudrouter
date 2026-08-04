use std::future::Future;
use std::pin::Pin;

use crate::domain::{
    DecimalValue, DomainResult, GatewayAccessPolicy, GatewayApiKey, QuotaPolicy,
    UpstreamAccountGroup,
};

pub type ApiKeyCommandStoreFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountGroupBindingInput {
    pub group_id: i64,
    pub priority: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateGatewayApiKeyCommand {
    pub api_key_uuid: String,
    pub access_policy_uuid: String,
    pub quota_policy_uuid: String,
    pub audit_log_uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
    pub name: String,
    pub group_id: i64,
    /// Route bindings for `iam_gateway_api_key_account_group` (binding_role='route'),
    /// including the default group; written together with the api key row.
    pub account_group_bindings: Vec<AccountGroupBindingInput>,
    pub key_prefix: String,
    pub key_display_masked: String,
    pub key_hash: String,
    /// Raw key material generated at creation; persisted per the configured
    /// secret storage mode (plaintext by default, ciphertext when enabled).
    pub raw_key: String,
    pub hash_alg: String,
    pub secret_version: i64,
    pub request_id: String,
    pub idempotency_key: String,
    pub created_at: String,
    pub expire_at: Option<String>,
    pub allowed_capabilities: Vec<String>,
    pub ip_allowlist: Vec<String>,
    pub quota_limit: Option<DecimalValue>,
    pub default_for_runtime: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateGatewayApiKeyCommand {
    pub audit_log_uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
    pub api_key_id: i64,
    pub name: Option<String>,
    pub group_id: Option<i64>,
    /// `Some` replaces all route bindings (binding_role='route') for the key.
    pub account_group_bindings: Option<Vec<AccountGroupBindingInput>>,
    pub requested_at: String,
    pub request_id: String,
    pub access_policy_uuid: String,
    pub allowed_capabilities: Option<Vec<String>>,
    pub ip_allowlist: Option<Vec<String>>,
    pub quota_policy_uuid: String,
    pub quota_limit: Option<Option<DecimalValue>>,
    pub expire_at: Option<Option<String>>,
    pub default_for_runtime: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteGatewayApiKeyCommand {
    pub audit_log_uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
    pub api_key_id: i64,
    pub requested_at: String,
    pub request_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteGatewayApiKeyForOrganizationCommand {
    pub audit_log_uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
    pub api_key_id: i64,
    pub requested_at: String,
    pub request_id: String,
}

impl CreateGatewayApiKeyCommand {
    pub fn requires_access_policy(&self) -> bool {
        !self.allowed_capabilities.is_empty() || !self.ip_allowlist.is_empty()
    }

    pub fn requires_quota_policy(&self) -> bool {
        self.quota_limit.is_some()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreatedGatewayApiKey {
    pub api_key: GatewayApiKey,
    pub access_policy: Option<GatewayAccessPolicy>,
    pub quota_policy: Option<QuotaPolicy>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdatedGatewayApiKey {
    pub api_key: GatewayApiKey,
    pub access_policy: Option<GatewayAccessPolicy>,
    pub quota_policy: Option<QuotaPolicy>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EnsureDefaultUpstreamAccountGroupCommand {
    pub group_uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub code: String,
    pub name: String,
    pub pricing_plan_code: String,
    pub cost_multiplier: DecimalValue,
    pub sale_multiplier: DecimalValue,
    pub requested_at: String,
}

pub trait GatewayApiKeyCommandStore {
    fn ensure_default_upstream_account_group<'a>(
        &'a self,
        command: EnsureDefaultUpstreamAccountGroupCommand,
    ) -> ApiKeyCommandStoreFuture<'a, UpstreamAccountGroup>;

    fn create_gateway_api_key<'a>(
        &'a self,
        command: CreateGatewayApiKeyCommand,
    ) -> ApiKeyCommandStoreFuture<'a, CreatedGatewayApiKey>;

    fn update_gateway_api_key<'a>(
        &'a self,
        command: UpdateGatewayApiKeyCommand,
    ) -> ApiKeyCommandStoreFuture<'a, Option<UpdatedGatewayApiKey>>;

    fn delete_gateway_api_key<'a>(
        &'a self,
        command: DeleteGatewayApiKeyCommand,
    ) -> ApiKeyCommandStoreFuture<'a, bool>;

    fn delete_gateway_api_key_for_organization<'a>(
        &'a self,
        command: DeleteGatewayApiKeyForOrganizationCommand,
    ) -> ApiKeyCommandStoreFuture<'a, bool>;
}
