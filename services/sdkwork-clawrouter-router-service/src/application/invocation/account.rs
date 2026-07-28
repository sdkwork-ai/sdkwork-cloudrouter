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
}
