//! App-api SQL read scope resolved from canonical `WebRequestContext` / `TenantAppContext`.
//!
//! Handlers `MUST` consume subject scope through this module instead of legacy
//! `TrustedRequestSubject` projection when running under sdkwork-web-framework.

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::http::{Extensions, HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_iam_bootstrap::{
    is_legacy_opaque_iam_subject_id, parse_iam_sql_organization_id, parse_iam_sql_tenant_id,
    parse_iam_sql_user_id, IamSqlSubjectParseError,
};
use sdkwork_web_core::{TenantAppContext, WebRequestContext};
use sdkwork_claw_http::TrustedRequestSubject;

use sdkwork_clawrouter_app_providers_repository_sqlx::AppProvidersSubject;

use crate::api::response::PlusApiResult;
use crate::api::subject::unauthorized_subject_response;
use crate::ports::{
    AppChatSubject, AppNotificationSubject, AppRoutingStrategySubject, AppRoutingSubject,
    SettingsSubject,
};

/// Default operator type for authenticated app-api users (matches legacy `TrustedRequestSubject` bridge).
pub const APP_USER_OPERATOR_TYPE: i32 = 1;

/// Tenant/user scope for Claw SQL stores that persist BIGINT subject columns.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SqlScopedSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SqlScopedSubjectMappingError {
    InvalidTenantId,
    InvalidOrganizationId,
    InvalidUserId,
}

impl SqlScopedSubject {
    pub fn from_tenant_app(context: &TenantAppContext) -> Result<Self, SqlScopedSubjectMappingError> {
        Ok(Self {
            tenant_id: map_iam_sql_parse_error(
                parse_iam_sql_tenant_id(&context.tenant_id),
                SqlScopedSubjectMappingError::InvalidTenantId,
            )?,
            organization_id: map_iam_sql_parse_error(
                parse_iam_sql_organization_id(
                    context
                        .organization_id
                        .as_deref()
                        .filter(|value| !value.trim().is_empty())
                        .unwrap_or("0"),
                ),
                SqlScopedSubjectMappingError::InvalidOrganizationId,
            )?,
            user_id: map_iam_sql_parse_error(
                parse_iam_sql_user_id(&context.user_id),
                SqlScopedSubjectMappingError::InvalidUserId,
            )?,
        })
    }

    pub fn from_trusted(subject: TrustedRequestSubject) -> Self {
        Self {
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            user_id: subject.user_id,
        }
    }

    /// App-api command audit fields map the authenticated user id to operator id.
    pub fn operator_id(self) -> i64 {
        self.user_id
    }

    pub fn operator_type() -> i32 {
        APP_USER_OPERATOR_TYPE
    }
}

impl From<SqlScopedSubject> for crate::ports::DashboardOverviewSubject {
    fn from(subject: SqlScopedSubject) -> Self {
        Self {
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            user_id: subject.user_id,
        }
    }
}

impl From<SqlScopedSubject> for crate::ports::UsageLogsSubject {
    fn from(subject: SqlScopedSubject) -> Self {
        Self {
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            user_id: subject.user_id,
        }
    }
}

impl From<SqlScopedSubject> for crate::ports::SettlementsDashboardSubject {
    fn from(subject: SqlScopedSubject) -> Self {
        Self {
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            user_id: subject.user_id,
        }
    }
}

impl From<SqlScopedSubject> for crate::ports::AppGatewayTracesSubject {
    fn from(subject: SqlScopedSubject) -> Self {
        Self {
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            user_id: subject.user_id,
        }
    }
}

impl From<SqlScopedSubject> for crate::ports::AppGenerationHistorySubject {
    fn from(subject: SqlScopedSubject) -> Self {
        Self {
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            user_id: subject.user_id,
        }
    }
}

macro_rules! impl_app_user_sql_subject_from {
    ($ty:ty) => {
        impl From<SqlScopedSubject> for $ty {
            fn from(subject: SqlScopedSubject) -> Self {
                Self {
                    tenant_id: subject.tenant_id,
                    organization_id: subject.organization_id,
                    user_id: subject.user_id,
                }
            }
        }
    };
}

impl_app_user_sql_subject_from!(AppNotificationSubject);
impl_app_user_sql_subject_from!(SettingsSubject);
impl_app_user_sql_subject_from!(AppProvidersSubject);
impl_app_user_sql_subject_from!(AppChatSubject);
impl_app_user_sql_subject_from!(AppRoutingSubject);
impl_app_user_sql_subject_from!(AppRoutingStrategySubject);
impl_app_user_sql_subject_from!(crate::ports::AppRuntimeSubject);

/// Resolved SQL scope for app-api read handlers (mapping failures reject with `Response`).
pub struct ResolvedAppSqlScopedSubject(pub Option<SqlScopedSubject>);

/// Required SQL scope for app-api command handlers (missing auth rejects with `4010`).
pub struct RequiredAppSqlScopedSubject(pub SqlScopedSubject);

impl<S> FromRequestParts<S> for ResolvedAppSqlScopedSubject
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        Ok(Self(resolve_optional_app_sql_subject(
            &parts.headers,
            &parts.extensions,
            false,
        )?))
    }
}

impl<S> FromRequestParts<S> for RequiredAppSqlScopedSubject
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        match resolve_optional_app_sql_subject(&parts.headers, &parts.extensions, true)? {
            Some(subject) => Ok(Self(subject)),
            None => Err(unauthorized_subject_response()),
        }
    }
}

pub fn map_optional_app_sql_subject<T>(
    subject: Option<SqlScopedSubject>,
    require_subject: bool,
    map: impl FnOnce(SqlScopedSubject) -> T,
) -> Result<Option<T>, Response> {
    match subject {
        Some(subject) => Ok(Some(map(subject))),
        None if require_subject => Err(unauthorized_subject_response()),
        None => Ok(None),
    }
}

pub fn map_required_app_sql_subject<T>(
    subject: SqlScopedSubject,
    map: impl FnOnce(SqlScopedSubject) -> T,
) -> T {
    map(subject)
}

pub fn resolve_optional_app_sql_subject(
    headers: &HeaderMap,
    extensions: &Extensions,
    require_subject: bool,
) -> Result<Option<SqlScopedSubject>, Response> {
    if let Some(context) = extensions.get::<WebRequestContext>() {
        if let Some(principal) = context.principal.as_ref() {
            let tenant_app = TenantAppContext::try_from_request_context(context)
                .map_err(|_| {
                    subject_mapping_failed_response(
                        principal.tenant_id(),
                        principal.user_id(),
                        SqlScopedSubjectMappingError::InvalidUserId,
                    )
                })?;
            return match SqlScopedSubject::from_tenant_app(&tenant_app) {
                Ok(subject) => Ok(Some(subject)),
                Err(error) => {
                    tracing::warn!(
                        tenant_id = principal.tenant_id(),
                        organization_id = ?principal.organization_id(),
                        user_id = principal.user_id(),
                        ?error,
                        "failed to map TenantAppContext into SqlScopedSubject"
                    );
                    Err(subject_mapping_failed_response(
                        principal.tenant_id(),
                        principal.user_id(),
                        error,
                    ))
                }
            };
        }
    }

    if let Some(subject) = TrustedRequestSubject::resolve_optional(headers, extensions) {
        return Ok(Some(SqlScopedSubject::from_trusted(subject)));
    }

    if require_subject {
        return Err(unauthorized_subject_response());
    }
    Ok(None)
}

pub fn subject_mapping_failed_response(
    tenant_id: &str,
    user_id: &str,
    error: SqlScopedSubjectMappingError,
) -> Response {
    let legacy = is_legacy_opaque_iam_subject_id(tenant_id)
        || is_legacy_opaque_iam_subject_id(user_id);
    let message = if legacy {
        "authenticated principal uses a legacy opaque IAM id; restart the application to repair IAM subject ids or sign in again with a snowflake-backed account"
    } else {
        match error {
            SqlScopedSubjectMappingError::InvalidTenantId => {
                "authenticated principal tenant id is not a positive numeric SQL subject"
            }
            SqlScopedSubjectMappingError::InvalidOrganizationId => {
                "authenticated principal organization id is not a valid numeric SQL subject"
            }
            SqlScopedSubjectMappingError::InvalidUserId => {
                "authenticated principal user id is not a positive numeric SQL subject"
            }
        }
    };
    PlusApiResult::error("4220", message)).into_response()
}

fn map_iam_sql_parse_error<T>(
    result: Result<T, IamSqlSubjectParseError>,
    error: SqlScopedSubjectMappingError,
) -> Result<T, SqlScopedSubjectMappingError> {
    result.map_err(|_| error)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_web_core::{
        WebApiSurface, WebAuthLevel, WebAuthMode, WebDeploymentMode, WebEnvironment,
        WebLoginScope, WebRequestPrincipal, WebTransportFacts,
    };
    use sdkwork_web_core::{ServerRequestId, WebRequestContext};

    #[test]
    fn from_tenant_app_maps_numeric_snowflake_ids() {
        let context = TenantAppContext {
            tenant_id: "100001".to_owned(),
            organization_id: Some("30002".to_owned()),
            app_id: "sdkwork-clawrouter".to_owned(),
            user_id: "40003".to_owned(),
            session_id: Some("session-1".to_owned()),
            environment: WebEnvironment::Dev,
            login_scope: WebLoginScope::Organization,
        };
        let subject = SqlScopedSubject::from_tenant_app(&context).expect("subject");
        assert_eq!(100_001, subject.tenant_id);
        assert_eq!(30_002, subject.organization_id);
        assert_eq!(40_003, subject.user_id);
    }

    #[test]
    fn from_tenant_app_rejects_legacy_opaque_ids() {
        let context = TenantAppContext {
            tenant_id: "100001".to_owned(),
            organization_id: Some("0".to_owned()),
            app_id: "sdkwork-clawrouter".to_owned(),
            user_id: "iamu_0192ab3c-4d5e-7890-abcd-ef1234567890".to_owned(),
            session_id: Some("session-1".to_owned()),
            environment: WebEnvironment::Dev,
            login_scope: WebLoginScope::Tenant,
        };
        assert_eq!(
            Err(SqlScopedSubjectMappingError::InvalidUserId),
            SqlScopedSubject::from_tenant_app(&context)
        );
    }

    #[test]
    fn from_tenant_app_rejects_non_numeric_tenant_ids() {
        let context = TenantAppContext {
            tenant_id: "tenant-bootstrap".to_owned(),
            organization_id: Some("0".to_owned()),
            app_id: "sdkwork-clawrouter".to_owned(),
            user_id: "system".to_owned(),
            session_id: Some("session-1".to_owned()),
            environment: WebEnvironment::Dev,
            login_scope: WebLoginScope::Tenant,
        };
        assert_eq!(
            Err(SqlScopedSubjectMappingError::InvalidTenantId),
            SqlScopedSubject::from_tenant_app(&context)
        );
    }

    #[test]
    fn resolve_optional_prefers_web_request_context_over_legacy_headers() {
        let principal = WebRequestPrincipal::builder()
            .tenant_id("100001")
            .organization_id(Some("30002".to_owned()))
            .user_id("40003")
            .login_scope(WebLoginScope::Organization)
            .session_id(Some("session-1".to_owned()))
            .app_id("sdkwork-clawrouter")
            .environment(WebEnvironment::Dev)
            .deployment_mode(WebDeploymentMode::Private)
            .auth_level(WebAuthLevel::Password)
            .build();
        let context = WebRequestContext {
            request_id: ServerRequestId("test-request".to_owned()),
            trace_id: None,
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            transport: WebTransportFacts {
                path: "/app/v3/api/ai/dashboard/overview".to_owned(),
                method: "GET".to_owned(),
                auth_token_present: true,
                access_token_present: true,
                api_key_present: false,
                oauth_bearer_present: false,
                agent_token_present: false,
            },
            principal: Some(principal),
            locale: None,
            client_kind: None,
            operation: None,
        };
        let mut extensions = Extensions::new();
        extensions.insert(context);
        let subject = resolve_optional_app_sql_subject(&HeaderMap::new(), &extensions, true)
            .expect("subject")
            .expect("mapped");
        assert_eq!(100_001, subject.tenant_id);
        assert_eq!(30_002, subject.organization_id);
        assert_eq!(40_003, subject.user_id);
    }
}
