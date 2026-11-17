//! IAM-backed auth-token authenticator for the open-api model routes.
//!
//! The open-api is deliberately independent of the application login chain: a
//! single `Authorization: Bearer` credential that is not an API key
//! (non `sk-`/`sp-` prefixed) is resolved against the IAM identity store into
//! the bare session identity — `tenant_id`, `organization_id`, `user_id`.
//!
//! The account pool is **not** chosen here. The group depends on the modality
//! of the request (`chat`/image/video/audio/music), which is only known after
//! the invocation has been classified; `authenticated_context_from_auth_token_identity`
//! selects the subject's default group for that modality afterwards. Resolving
//! a group during authentication is what previously forced every signed-in user
//! through one mixed pool and made per-modality pools impossible.
//!
//! # Credential pair
//!
//! SDKWork login sessions issue a dual-token pair (auth + access) persisted on
//! the `iam_session` row (`auth_token_hash` / `access_token_hash`). When the
//! caller also presents `Access-Token`, the pair is verified together; when the
//! pair is absent or fails, the auth token alone is still resolved through the
//! single-token channel. A stale or unrelated access token must never fail an
//! otherwise valid auth token.

use std::sync::Arc;

use axum::http::StatusCode;
use axum::response::IntoResponse;
use sha2::Digest;

use sdkwork_cloudrouter_router_service::api::{
    OpenAiAuthTokenAuthenticator, OpenAiAuthTokenError, OpenAiAuthTokenIdentity,
};
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_iam_web_adapter::{
    resolve_iam_app_context_from_auth_token, resolve_iam_app_context_from_dual_tokens_pool,
};

use crate::iam_auth_token_cache::{AuthTokenCache, CachedAuthTokenIdentity};

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

/// Stable numeric surrogate for a non-numeric verified-session user id (for
/// example the bootstrap `system` principal). Numeric ids are preserved as-is;
/// non-numeric ids are folded into a stable i64 so audit/usage attribution
/// stays consistent across requests without failing the whole auth-token
/// login. Mirrors the `organization_id`/`api_key_id = 0` precedents: the
/// user value is attribution-only, never used for routing.
fn synthesize_numeric_user_id(user_id: &str) -> i64 {
    user_id
        .parse::<i64>()
        .ok()
        .or_else(|| {
            // Deterministic 63-bit fold (always non-negative) so the same
            // session/principal maps to the same attribution id every time.
            let digest = sha2::Sha256::digest(user_id.as_bytes());
            let bytes = digest.as_slice();
            let mut value: u64 = 0;
            for byte in bytes.iter().take(8) {
                value = (value << 8) | u64::from(*byte);
            }
            Some((value & (u64::MAX >> 1)) as i64)
        })
        .unwrap_or(0)
}

/// Resolves SDKWork auth tokens against the IAM database into the session
/// identity consumed by the open-api routing pipeline.
///
/// The optional [`AuthTokenCache`] short-circuits the per-request IAM database
/// round-trip for repeat sessions; only the identity is cached, so the
/// modality-dependent group selection always runs against the fresh catalog
/// snapshot (`iam_auth_token_cache` module contract).
pub struct IamAuthTokenAuthenticator {
    iam_pool: DatabasePool,
    cache: Option<Arc<dyn AuthTokenCache>>,
}

impl IamAuthTokenAuthenticator {
    pub fn new(iam_pool: DatabasePool) -> Self {
        Self {
            iam_pool,
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

    /// Resolves the credential pair, preferring the dual-token channel when an
    /// access token is present and falling back to the single auth token.
    async fn resolve_context(
        &self,
        raw_bearer_token: &str,
        access_token: Option<&str>,
    ) -> Result<
        Option<sdkwork_cloudrouter_router_service::api::OpenAiAuthTokenIdentity>,
        OpenAiAuthTokenError,
    > {
        let context = if let Some(access_token) = access_token {
            if let Some(context) = resolve_iam_app_context_from_dual_tokens_pool(
                &self.iam_pool,
                raw_bearer_token,
                access_token,
            )
            .await
            {
                Some(context)
            } else if let Some(pg) = self.iam_pool.as_postgres() {
                // Fall back to the auth token alone: the access token may be
                // stale while the auth token is still valid. On non-PostgreSQL
                // pools the single-token channel is unavailable, so the
                // dual-token failure is authoritative.
                resolve_iam_app_context_from_auth_token(pg, raw_bearer_token).await
            } else {
                None
            }
        } else {
            let pg = self.iam_pool.as_postgres().ok_or_else(|| {
                auth_token_error(
                    "invalid_auth_token",
                    "IAM database is not available for auth token resolution",
                )
            })?;
            resolve_iam_app_context_from_auth_token(pg, raw_bearer_token).await
        };
        let Some(context) = context else {
            return Ok(None);
        };

        let tenant_id = context.tenant_id.parse::<i64>().map_err(|_| {
            auth_token_error("invalid_auth_token", "auth token tenant is not numeric")
        })?;
        let organization_id = context
            .organization_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(|value| {
                value.parse::<i64>().map_err(|_| {
                    auth_token_error(
                        "invalid_auth_token",
                        "auth token organization is not numeric",
                    )
                })
            })
            .transpose()?
            .unwrap_or(0);
        // The verified session's `user_id` may be a non-numeric synthetic
        // principal (e.g. the bootstrap `system` user issued by
        // `issue_standalone_bootstrap_access_credential` for portal login). The
        // auth-token channel has already vetted the session, so a non-numeric
        // user id must not fail the whole login: fall back to a stable synthetic
        // numeric id for audit/usage attribution, exactly like the
        // `api_key_id == 0` precedent.
        let user_id = context
            .user_id
            .parse::<i64>()
            .unwrap_or_else(|_| synthesize_numeric_user_id(&context.user_id));
        Ok(Some(
            sdkwork_cloudrouter_router_service::api::OpenAiAuthTokenIdentity {
                tenant_id,
                organization_id,
                user_id,
            },
        ))
    }
}

#[async_trait::async_trait]
impl OpenAiAuthTokenAuthenticator for IamAuthTokenAuthenticator {
    async fn authenticate(
        &self,
        raw_bearer_token: &str,
        access_token: Option<&str>,
    ) -> Result<OpenAiAuthTokenIdentity, OpenAiAuthTokenError> {
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
                let identity = self
                    .resolve_context(raw_bearer_token, access_token)
                    .await?
                    .ok_or_else(|| {
                        auth_token_error("invalid_auth_token", "invalid or expired auth token")
                    })?;

                if let Some(cache) = &self.cache {
                    cache
                        .set(
                            raw_bearer_token,
                            access_token,
                            &CachedAuthTokenIdentity {
                                tenant_id: identity.tenant_id,
                                organization_id: identity.organization_id,
                                user_id: identity.user_id,
                            },
                        )
                        .await;
                }
                (
                    identity.tenant_id,
                    identity.organization_id,
                    identity.user_id,
                )
            }
        };

        Ok(OpenAiAuthTokenIdentity {
            tenant_id,
            organization_id,
            user_id,
        })
    }
}
