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

use sdkwork_cloudrouter_router_service::api::{
    OpenAiAuthTokenAuthenticator, OpenAiAuthTokenError, AUTH_TOKEN_SESSION_NAME_SNAPSHOT,
};
use sdkwork_cloudrouter_router_service::application::AuthenticatedApiKeyContext;
use sdkwork_cloudrouter_router_service::ports::UpstreamAccountRouteCatalog;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_iam_web_adapter::{
    resolve_iam_app_context_from_auth_token, resolve_iam_app_context_from_dual_tokens_pool,
};

use crate::iam_auth_token_cache::{AuthTokenCache, CachedAuthTokenIdentity};

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
///
/// The optional [`AuthTokenCache`] short-circuits the per-request IAM database
/// round-trip for repeat sessions while the in-memory catalog group lookup
/// still runs fresh on every request (`iam_auth_token_cache` module contract).
pub struct IamAuthTokenAuthenticator<C> {
    iam_pool: DatabasePool,
    catalog: Arc<C>,
    cache: Option<Arc<dyn AuthTokenCache>>,
}

impl<C> IamAuthTokenAuthenticator<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    pub fn new(iam_pool: DatabasePool, catalog: Arc<C>) -> Self {
        Self {
            iam_pool,
            catalog,
            cache: None,
        }
    }

    /// Enables the optional short-TTL identity cache. Callers pass `Some` when
    /// Redis is configured (production deployments) and `None` otherwise;
    /// `None` keeps the authenticator on per-request database resolution.
    pub fn with_cache(mut self, cache: Option<Arc<dyn AuthTokenCache>>) -> Self {
        self.cache = cache;
        self
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
        // Resolve the credential identity through the short-TTL cache first so
        // repeat sessions skip the IAM database round-trip. Only successful
        // resolutions are cached; a cache miss, expired entry, or Redis error
        // always falls back to the authoritative IAM database resolution
        // (`iam_auth_token_cache` module safety contract).
        let cached = match &self.cache {
            Some(cache) => cache.get(raw_bearer_token, access_token).await,
            None => None,
        };
        let (tenant_id, organization_id, user_id) = match cached {
            Some(identity) => (
                identity.tenant_id,
                identity.organization_id,
                identity.user_id,
            ),
            None => {
                // SDKWork login sessions issue a dual-token pair (auth +
                // access) persisted on the `iam_session` row
                // (`auth_token_hash` / `access_token_hash`). Resolve through
                // the dual-token channel so the pair is verified together;
                // without an access token, fall back to the single auth-token
                // channel. The OAuth bearer pool channel must NOT be used
                // here: it only recognizes access-token columns and OAuth
                // JWTs, so a valid auth token always failed as "invalid or
                // expired".
                let context = match access_token {
                    Some(access) => {
                        resolve_iam_app_context_from_dual_tokens_pool(
                            &self.iam_pool,
                            raw_bearer_token,
                            access,
                        )
                        .await
                    }
                    None => {
                        let pg = self.iam_pool.as_postgres().ok_or_else(|| {
                            auth_token_error(
                                "invalid_auth_token",
                                "IAM database is not available for auth token resolution",
                            )
                        })?;
                        resolve_iam_app_context_from_auth_token(pg, raw_bearer_token).await
                    }
                }
                .ok_or_else(|| {
                    auth_token_error("invalid_auth_token", "invalid or expired auth token")
                })?;

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

                if let Some(cache) = &self.cache {
                    cache
                        .set(
                            raw_bearer_token,
                            access_token,
                            &CachedAuthTokenIdentity {
                                tenant_id,
                                organization_id,
                                user_id,
                            },
                        )
                        .await;
                }
                (tenant_id, organization_id, user_id)
            }
        };

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
            api_key_name_snapshot: AUTH_TOKEN_SESSION_NAME_SNAPSHOT.to_string(),
            group_id: group.id,
            group_code: group.code,
            pricing_plan_code: group.pricing_plan_code,
        })
    }
}
