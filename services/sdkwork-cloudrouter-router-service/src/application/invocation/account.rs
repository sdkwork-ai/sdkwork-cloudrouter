use crate::domain::{ProviderAuthProfile, ProviderRetryPolicy};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationAccount {
    pub supplier_code: String,
    pub account_id: i64,
    pub region_code: String,
    pub credential_id: Option<i64>,
    pub credential_rotation: Option<String>,
    pub base_url: Option<String>,
    pub secret_ref: Option<String>,
    pub auth_profile: ProviderAuthProfile,
    pub timeout_ms: Option<u64>,
    pub retry_policy: Option<ProviderRetryPolicy>,
    pub provider_model: Option<String>,
    /// Upstream account group through which the account was routed. Pricing,
    /// settlement, and usage attribution must use this group (not the api
    /// key's auth-time default group) so multi-group keys charge the same
    /// group that selected the account.
    pub account_group_id: Option<i64>,
    pub account_group_code: Option<String>,
    pub pricing_plan_code: Option<String>,
}
