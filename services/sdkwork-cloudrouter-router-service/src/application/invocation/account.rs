use crate::domain::{ProviderAuthProfile, ProviderRetryPolicy};

/// 账号级计费模式，与 `ai_upstream_account.billing_mode` 对齐。
///
/// - `Prepay`：调用前预扣估算金额，成功后按实际用量结算差额，失败释放预扣（默认）。
/// - `Postpay`：调用完成后按真实用量结算。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum AccountBillingMode {
    #[default]
    Prepay,
    Postpay,
}

impl AccountBillingMode {
    pub fn from_code(value: &str) -> Self {
        match value.trim().to_ascii_lowercase().as_str() {
            "postpay" | "post_paid" | "after" => Self::Postpay,
            _ => Self::Prepay,
        }
    }

    pub fn as_code(self) -> &'static str {
        match self {
            Self::Prepay => "prepay",
            Self::Postpay => "postpay",
        }
    }
}

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
    /// 账号级计费模式：prepay 预扣 / postpay 后扣。路由解析时从
    /// `ai_upstream_account.billing_mode` 读取，缺省 prepay。
    pub billing_mode: AccountBillingMode,
    /// Upstream account group through which the account was routed. Pricing,
    /// settlement, and usage attribution must use this group (not the api
    /// key's auth-time default group) so multi-group keys charge the same
    /// group that selected the account.
    pub account_group_id: Option<i64>,
    pub account_group_code: Option<String>,
    pub pricing_plan_code: Option<String>,
}
