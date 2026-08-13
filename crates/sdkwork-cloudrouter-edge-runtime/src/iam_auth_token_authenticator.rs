//! IAM-backed auth-token authenticator for the open-api chat completions route.
//!
//! Resolves a single bearer credential that is not an API key (non `sk-`/`sp-`
//! prefixed) into the upstream account route context: the credential is
//! validated against the IAM database as an SDKWork login auth token, then the
//! tenant's default upstream account group (`code = "default"`) is selected so
//! the existing account-pool routing pipeline applies unchanged.

use std::sync::Arc;

use axum::http::StatusCode;
use axum::response::IntoResponse;
use sdkwork_cloudrouter_router_service::api::{OpenAiAuthTokenAuthenticator, OpenAiAuthTokenError};
use sdkwork_cloudrouter_router_service::application::AuthenticatedApiKeyContext;
use sdkwork_cloudrouter_router_service::ports::UpstreamAccountRouteCatalog;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_iam_web_adapter::resolve_iam_app_context_from_oauth_bearer_pool;

/// Default upstream account group code selected for auth-token sessions
/// (mirrors the gateway API key default group convention).
pub const DEFAULT_ACCOUNT_GROUP_CODE: &str = "default-group";

/// Error body for the auth-token channel (OpenAI-compatible error envelope).
fn auth_token_error(code: &str, message: &str) -> OpenAiAuthTokenError {
    let body = serde_json::json!({
        "error": {
            "type": "invalid_request_error",
            "code": code,
            "message": message,
        }
    });
    Box::new((StatusCode::UNAUTHORIZED, axum::Json(body)).into_response())
}

/// Resolves SDKWork auth tokens against the IAM database and maps them to the
/// tenant default upstream account group.
pub struct IamAuthTokenAuthenticator<C> {
    iam_pool: DatabasePool,
    catalog: Arc<C>,
}

impl<C> IamAuthTokenAuthenticator<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    pub fn new(iam_pool: DatabasePool, catalog: Arc<C>) -> Self {
        Self { iam_pool, catalog }
    }
}

#[async_trait::async_trait]
impl<C> OpenAiAuthTokenAuthenticator for IamAuthTokenAuthenticator<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    async fn authenticate(
        &self,
        raw_bearer_token: &str,
        access_token: Option<&str>,
    ) -> Result<AuthenticatedApiKeyContext, OpenAiAuthTokenError> {
        let context =
            resolve_iam_app_context_from_oauth_bearer_pool(&self.iam_pool, raw_bearer_token)
                .await
                .ok_or_else(|| {
                    auth_token_error("invalid_auth_token", "invalid or expired auth token")
                })?;

        // Dual-token check (API_SPEC §819/§824): when the caller supplies an
        // Access-Token it must resolve to the same IAM session as the auth
        // token; a mismatched pair is rejected instead of silently using the
        // auth token alone.
        if let Some(access_token) = access_token {
            let access_context =
                resolve_iam_app_context_from_oauth_bearer_pool(&self.iam_pool, access_token)
                    .await
                    .ok_or_else(|| {
                        auth_token_error(
                            "invalid_access_token",
                            "invalid or expired access token",
                        )
                    })?;
            if access_context.session_id != context.session_id
                || access_context.tenant_id != context.tenant_id
                || access_context.user_id != context.user_id
            {
                return Err(auth_token_error(
                    "access_token_mismatch",
                    "access token does not match the auth token session",
                ));
            }
        }

        let tenant_id = context.tenant_id.parse::<i64>().map_err(|_| {
            auth_token_error("invalid_auth_token", "auth token tenant is not numeric")
        })?;
        let organization_id = context
            .organization_id
            .as_deref()
            .and_then(|value| value.parse::<i64>().ok())
            .unwrap_or(0);
        let user_id = context.user_id.parse::<i64>().map_err(|_| {
            auth_token_error("invalid_auth_token", "auth token user is not numeric")
        })?;

        let group = self
            .catalog
            .list_upstream_account_groups()
            .into_iter()
            .find(|group| group.tenant_id == tenant_id && group.code == DEFAULT_ACCOUNT_GROUP_CODE)
            // Seeded tenants mark their default group with `is_default`
            // (code `default-group`); the fallback keeps legacy or
            // custom-named default groups routable for auth-token sessions.
            .or_else(|| {
                self.catalog
                    .list_upstream_account_groups()
                    .into_iter()
                    .find(|group| group.tenant_id == tenant_id && group.is_default)
            })
            .ok_or_else(|| {
                auth_token_error(
                    "account_group_unavailable",
                    "tenant default account group is not available",
                )
            })?;

        Ok(AuthenticatedApiKeyContext {
            // No gateway API key backs an auth-token session; 0 marks the
            // synthetic identity used for audit/usage attribution.
            api_key_id: 0,
            tenant_id,
            organization_id,
            user_id,
            api_key_name_snapshot: "auth-token-session".to_string(),
            group_id: group.id,
            group_code: group.code,
            pricing_plan_code: group.pricing_plan_code,
        })
    }
}
