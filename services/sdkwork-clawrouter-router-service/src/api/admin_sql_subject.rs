//! Backend-api SQL admin scope resolved from canonical `WebRequestContext` / `TenantAppContext`.

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use axum::http::{Extensions, HeaderMap};
use axum::response::{IntoResponse, Response};

use crate::api::app_sql_subject::{resolve_optional_app_sql_subject, SqlScopedSubject};
use crate::api::response::ApiResponseError;
use crate::api::subject::unauthorized_subject_response;

/// Operator scope for Claw SQL admin stores that persist BIGINT subject columns.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SqlScopedAdminSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

impl From<SqlScopedSubject> for SqlScopedAdminSubject {
    fn from(subject: SqlScopedSubject) -> Self {
        Self {
            tenant_id: subject.tenant_id,
            organization_id: subject.organization_id,
            operator_id: subject.operator_id(),
            operator_type: SqlScopedSubject::operator_type(),
        }
    }
}

macro_rules! impl_admin_port_subject_from_sql_scope {
    ($ty:ty) => {
        impl From<SqlScopedAdminSubject> for $ty {
            fn from(subject: SqlScopedAdminSubject) -> Self {
                Self {
                    tenant_id: subject.tenant_id,
                    organization_id: subject.organization_id,
                    operator_id: subject.operator_id,
                    operator_type: subject.operator_type,
                }
            }
        }
    };
}

impl_admin_port_subject_from_sql_scope!(crate::ports::AdminRecordSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminUserSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminStorageSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminTransactionCenterSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminServiceNodeSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminModelRateLimitSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminMcpSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminMarketingSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminIpRateLimitSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminInventorySubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminFirewallRuleSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminFinanceSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminCatalogSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminAuthSettingsSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminApiKeyRateLimitSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminAnnouncementSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminDashboardSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminAnalyticsSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::AdminMonitorSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::RuntimeRegionSettingsSubject);
impl_admin_port_subject_from_sql_scope!(crate::ports::SiteSettingsSubject);

/// Required admin SQL scope for backend handlers.
pub struct RequiredAdminSqlScopedSubject(pub SqlScopedAdminSubject);

impl<S> FromRequestParts<S> for SqlScopedAdminSubject
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        match resolve_optional_admin_sql_subject(&parts.headers, &parts.extensions, true)
            .map_err(IntoResponse::into_response)?
        {
            Some(subject) => Ok(subject),
            None => Err(unauthorized_subject_response()),
        }
    }
}

impl<S> FromRequestParts<S> for RequiredAdminSqlScopedSubject
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        SqlScopedAdminSubject::from_request_parts(parts, state)
            .await
            .map(RequiredAdminSqlScopedSubject)
    }
}

pub(crate) fn resolve_optional_admin_sql_subject(
    headers: &HeaderMap,
    extensions: &Extensions,
    require_subject: bool,
) -> Result<Option<SqlScopedAdminSubject>, ApiResponseError> {
    resolve_optional_app_sql_subject(headers, extensions, require_subject)
        .map(|subject| subject.map(SqlScopedAdminSubject::from))
}

pub fn map_required_admin_sql_subject<T>(
    subject: SqlScopedAdminSubject,
    map: impl FnOnce(SqlScopedAdminSubject) -> T,
) -> T {
    map(subject)
}

pub fn trusted_request_subject_from_admin_scope(
    subject: SqlScopedAdminSubject,
) -> sdkwork_claw_http::TrustedRequestSubject {
    sdkwork_claw_http::TrustedRequestSubject {
        tenant_id: subject.tenant_id,
        organization_id: subject.organization_id,
        user_id: subject.operator_id,
        operator_id: subject.operator_id,
        operator_type: subject.operator_type,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::app_sql_subject::{SqlScopedSubject, APP_USER_OPERATOR_TYPE};

    #[test]
    fn admin_scope_maps_from_app_sql_scope() {
        let admin = SqlScopedAdminSubject::from(SqlScopedSubject {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
        });
        assert_eq!(100001, admin.tenant_id);
        assert_eq!(0, admin.organization_id);
        assert_eq!(30, admin.operator_id);
        assert_eq!(APP_USER_OPERATOR_TYPE, admin.operator_type);
    }
}
