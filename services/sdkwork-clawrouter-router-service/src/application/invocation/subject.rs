use crate::application::AuthenticatedApiKeyContext;

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
    pub organization_id: i64,
    pub user_id: i64,
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
            account_group_id: Some(context.group_id),
            account_group_code: Some(context.group_code),
            pricing_plan_code: Some(context.pricing_plan_code),
            roles: Vec::new(),
            scopes: Vec::new(),
        }
    }

    pub fn anonymous_free(tenant_id: i64, organization_id: i64) -> Self {
        Self {
            auth_type: InvocationAuthType::AnonymousFree,
            api_key_id: None,
            api_key_name_snapshot: None,
            tenant_id,
            organization_id,
            user_id: 0,
            account_group_id: None,
            account_group_code: None,
            pricing_plan_code: None,
            roles: Vec::new(),
            scopes: Vec::new(),
        }
    }
}
