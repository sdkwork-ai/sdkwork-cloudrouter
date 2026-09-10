use crate::application::AuthenticatedApiKeyContext;
use crate::domain::BillingOwnerKind;
use crate::ports::{BillingSubjectSource, ResolvedBillingSubject};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InvocationAuthType {
    GatewayApiKey,
    AppSession,
    AdminSubject,
    InternalService,
    AnonymousFree,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationSubject {
    pub auth_type: InvocationAuthType,
    pub api_key_id: Option<i64>,
    pub api_key_name_snapshot: Option<String>,
    pub tenant_id: i64,
    /// 授权主体组织（key 自身归属），驱动路由授权 scope；计费判定不改写。
    pub organization_id: i64,
    pub user_id: i64,
    /// 计费主体组织：团队计费时为团队 org id，个人计费时为 0。
    pub billing_organization_id: i64,
    /// 计费主体类型（钱包定位与 usage 归因依据）。
    pub billing_owner: BillingOwnerKind,
    pub account_group_id: Option<i64>,
    pub account_group_code: Option<String>,
    pub pricing_plan_code: Option<String>,
    pub roles: Vec<String>,
    pub scopes: Vec<String>,
}

impl InvocationSubject {
    pub fn from_api_key_context(context: AuthenticatedApiKeyContext) -> Self {
        Self {
            auth_type: InvocationAuthType::GatewayApiKey,
            api_key_id: Some(context.api_key_id),
            api_key_name_snapshot: Some(context.api_key_name_snapshot),
            tenant_id: context.tenant_id,
            organization_id: context.organization_id,
            user_id: context.user_id,
            // 默认保持既有行为：个人主体、钱包按 key 自身 org/user 定位。
            // 计费主体解析（BillingSubjectResolver）成功后由
            // apply_billing_resolution 覆盖。
            billing_organization_id: 0,
            billing_owner: BillingOwnerKind::Personal,
            account_group_id: Some(context.group_id),
            account_group_code: Some(context.group_code),
            pricing_plan_code: Some(context.pricing_plan_code),
            roles: Vec::new(),
            scopes: Vec::new(),
        }
    }

    /// 应用计费主体解析结果。
    ///
    /// 仅当解析为团队主体时改写计费组织；个人主体维持默认值（钱包定位
    /// 与既有行为完全一致）。
    pub fn apply_billing_resolution(&mut self, resolution: &ResolvedBillingSubject) {
        match resolution.kind {
            BillingOwnerKind::Organization => {
                self.billing_owner = BillingOwnerKind::Organization;
                self.billing_organization_id = resolution.organization_id;
            }
            BillingOwnerKind::Personal => {
                self.billing_owner = BillingOwnerKind::Personal;
                self.billing_organization_id = 0;
            }
        }
    }

    /// 计费主体来源标签（usage 归因审计用；个人默认行为无解析来源）。
    pub fn billing_source_label(&self) -> &'static str {
        match self.billing_owner {
            BillingOwnerKind::Personal => "default_personal",
            BillingOwnerKind::Organization => BillingSubjectSource::KeyBound.as_str(),
        }
    }

    /// 内部网关请求的 subject：与外部 API Key 同源，但 auth_type 标记为
    /// InternalService，供管道区分内部/外部调用以应用差异化策略。
    pub fn from_internal_api_key_context(context: AuthenticatedApiKeyContext) -> Self {
        let mut subject = Self::from_api_key_context(context);
        subject.auth_type = InvocationAuthType::InternalService;
        subject
    }

    pub fn anonymous_free(tenant_id: i64, organization_id: i64) -> Self {
        Self {
            auth_type: InvocationAuthType::AnonymousFree,
            api_key_id: None,
            api_key_name_snapshot: None,
            tenant_id,
            organization_id,
            user_id: 0,
            billing_organization_id: 0,
            billing_owner: BillingOwnerKind::Personal,
            account_group_id: None,
            account_group_code: None,
            pricing_plan_code: None,
            roles: Vec::new(),
            scopes: Vec::new(),
        }
    }
}
