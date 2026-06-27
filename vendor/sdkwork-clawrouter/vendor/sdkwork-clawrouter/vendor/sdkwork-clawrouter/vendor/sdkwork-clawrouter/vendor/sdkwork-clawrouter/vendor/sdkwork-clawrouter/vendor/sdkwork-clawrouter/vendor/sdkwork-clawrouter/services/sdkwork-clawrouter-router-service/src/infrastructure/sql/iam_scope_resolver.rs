pub use sdkwork_iam_bootstrap::{
    effective_iam_organization_code, effective_iam_tenant_code,
    resolve_postgres_iam_organization_id_string, resolve_postgres_iam_scope,
    resolve_postgres_iam_tenant_id_string, resolve_sqlite_iam_organization_id_string,
    resolve_sqlite_iam_scope, resolve_sqlite_iam_tenant_id_string, IamScopeResolveOptions,
};

use sqlx::{PgPool, SqlitePool};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::store_error::redacted_store_error;

pub async fn resolve_sqlite_iam_scope_domain(
    pool: &SqlitePool,
    tenant_code: Option<&str>,
    organization_code: Option<&str>,
    options: IamScopeResolveOptions,
    tenant_context: &str,
    organization_context: &str,
) -> DomainResult<(i64, i64)> {
    resolve_sqlite_iam_scope(pool, tenant_code, organization_code, options)
        .await
        .map_err(|error| scope_store_error(tenant_context, organization_context, error))
}

pub async fn resolve_postgres_iam_scope_domain(
    pool: &PgPool,
    tenant_code: Option<&str>,
    organization_code: Option<&str>,
    options: IamScopeResolveOptions,
    tenant_context: &str,
    organization_context: &str,
) -> DomainResult<(i64, i64)> {
    resolve_postgres_iam_scope(pool, tenant_code, organization_code, options)
        .await
        .map_err(|error| scope_store_error(tenant_context, organization_context, error))
}

fn scope_store_error(
    tenant_context: &str,
    organization_context: &str,
    error: sqlx::Error,
) -> DomainError {
    match error {
        sqlx::Error::Protocol(message) if message.contains("active IAM tenant was not found") => {
            DomainError::not_found("active IAM tenant was not found")
        }
        sqlx::Error::Protocol(message)
            if message.contains("active IAM organization was not found") =>
        {
            DomainError::not_found("active IAM organization was not found")
        }
        error if tenant_context.contains("tenant") => redacted_store_error(tenant_context, error),
        error => redacted_store_error(organization_context, error),
    }
}
