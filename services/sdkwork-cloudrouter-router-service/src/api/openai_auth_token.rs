//! Auth-token channel for open-api model routes.
//!
//! The open-api is not part of the application login chain: the gateway accepts
//! a single `Authorization: Bearer` credential, and a credential that is not an
//! API key (`sk-`/`sp-` prefixed) is resolved as an SDKWork IAM auth token. The
//! token yields **identity only** (`tenant_id`, `organization_id`, `user_id`) —
//! the account pool is chosen afterwards, from the subject's default account
//! group **for the requested modality**, once the invocation has been
//! classified. See [`authenticated_context_from_auth_token_identity`].
//!
//! Implementations are injected by the gateway assembly (IAM-backed), keeping
//! this router crate stateless and testable.

use async_trait::async_trait;
use axum::http::StatusCode;
use axum::response::Response;

use crate::api::openai_error::openai_error;
use crate::api::AUTH_TOKEN_SESSION_NAME_SNAPSHOT;
use crate::application::AuthenticatedApiKeyContext;
use crate::domain::{
    select_default_session_account_group, RoutingCapability, SessionAccountGroupModality,
};
use crate::ports::UpstreamAccountRouteCatalog;

/// Error type for the auth-token channel (an HTTP response to return).
pub type OpenAiAuthTokenError = Box<Response>;

/// Identity resolved from an SDKWork IAM auth token.
///
/// Deliberately carries **no account group**: the group is the subject's
/// default for the request's modality, which is only known after the invocation
/// has been classified. Resolving a group during authentication is what forced
/// every modality through one mixed pool.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpenAiAuthTokenIdentity {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

/// Resolves an SDKWork auth token into the session identity used by the
/// open-api model routes.
///
/// `access_token` carries the dual-token session access context (API_SPEC
/// §819/§824): when present it MUST belong to the same session as the auth
/// token, and implementations reject mismatches. It is optional —
/// implementations must not require it.
#[async_trait]
pub trait OpenAiAuthTokenAuthenticator: Send + Sync + 'static {
    async fn authenticate(
        &self,
        raw_bearer_token: &str,
        access_token: Option<&str>,
    ) -> Result<OpenAiAuthTokenIdentity, OpenAiAuthTokenError>;
}

/// Materialises the invocation context for a resolved session identity by
/// selecting the subject's default account group for `capability`.
///
/// Selection order (see `domain::select_default_session_account_group`): the
/// subject's default group serving the modality, then its `mixed` default, then
/// the `default-group` code convention, then the only group in scope. A subject
/// with no matching default fails closed with `503 account_group_unavailable`
/// instead of running on an arbitrary pool.
pub fn authenticated_context_from_auth_token_identity<C>(
    catalog: &C,
    identity: OpenAiAuthTokenIdentity,
    capability: Option<RoutingCapability>,
) -> Result<AuthenticatedApiKeyContext, OpenAiAuthTokenError>
where
    C: UpstreamAccountRouteCatalog,
{
    let modality = capability.and_then(SessionAccountGroupModality::from_capability);
    let groups = catalog.list_session_account_groups();
    let Some(selection) = select_default_session_account_group(
        &groups,
        identity.tenant_id,
        identity.organization_id,
        modality,
    ) else {
        let modality_label = modality
            .map(|modality| modality.group_type())
            .unwrap_or("any");
        return Err(Box::new(openai_error(
            StatusCode::SERVICE_UNAVAILABLE,
            "account_group_unavailable",
            "server_error",
            format!(
                "no default upstream account group is configured for the requested \
                 capability ({modality_label}); the tenant must mark a default group \
                 (or keep a mixed default group) before signed-in sessions can route"
            ),
        )));
    };
    let group = selection.group;
    Ok(AuthenticatedApiKeyContext {
        // No gateway API key backs an auth-token session; 0 marks the synthetic
        // identity used for audit/usage attribution.
        api_key_id: 0,
        tenant_id: identity.tenant_id,
        organization_id: identity.organization_id,
        user_id: identity.user_id,
        api_key_name_snapshot: AUTH_TOKEN_SESSION_NAME_SNAPSHOT.to_string(),
        group_id: group.id,
        group_code: group.code,
        pricing_plan_code: group.pricing_plan_code,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{AccountGroupModalityScope, DecimalValue, UpstreamAccountGroup};
    use crate::infrastructure::InMemoryPricingCatalog;

    const TENANT_ID: i64 = 100_001;

    fn catalog_with(group_specs: &[(i64, &str, &str, &[&str])]) -> InMemoryPricingCatalog {
        let mut catalog = InMemoryPricingCatalog::default();
        for (id, code, group_type, modalities) in group_specs {
            let mut group = UpstreamAccountGroup::new(
                *id,
                code,
                "standard",
                DecimalValue::ONE,
                DecimalValue::ONE,
            );
            group.is_default = true;
            catalog.add_upstream_account_group(group);
            catalog.set_upstream_account_group_modality_scope(
                *id,
                AccountGroupModalityScope::new(
                    *group_type,
                    modalities.iter().map(|value| (*value).to_owned()).collect(),
                ),
            );
        }
        catalog
    }

    fn identity() -> OpenAiAuthTokenIdentity {
        OpenAiAuthTokenIdentity {
            tenant_id: TENANT_ID,
            organization_id: 0,
            user_id: 30,
        }
    }

    #[test]
    fn video_capability_selects_the_video_default_pool() {
        let catalog = catalog_with(&[
            (10, "default-group", "mixed", &[]),
            (20, "video-pool", "video", &["video"]),
        ]);
        let context = authenticated_context_from_auth_token_identity(
            &catalog,
            identity(),
            Some(RoutingCapability::Video),
        )
        .expect("video context");
        assert_eq!(20, context.group_id);
        assert_eq!("video-pool", context.group_code);
    }

    #[test]
    fn chat_capability_falls_back_to_the_mixed_default_pool() {
        let catalog = catalog_with(&[
            (10, "default-group", "mixed", &[]),
            (20, "video-pool", "video", &["video"]),
        ]);
        let context = authenticated_context_from_auth_token_identity(
            &catalog,
            identity(),
            Some(RoutingCapability::Chat),
        )
        .expect("chat context");
        assert_eq!(10, context.group_id);
    }

    #[test]
    fn chat_capability_prefers_a_dedicated_llm_default_pool() {
        let catalog = catalog_with(&[
            (10, "default-group", "mixed", &[]),
            (30, "llm-pool", "llm", &["text"]),
        ]);
        let context = authenticated_context_from_auth_token_identity(
            &catalog,
            identity(),
            Some(RoutingCapability::Chat),
        )
        .expect("chat context");
        assert_eq!(30, context.group_id);
    }

    #[test]
    fn missing_modality_default_fails_closed_with_503() {
        // Two modality defaults but no LLM and no mixed default: the chat
        // request must not run on a video/image pool.
        let catalog = catalog_with(&[
            (20, "video-pool", "video", &["video"]),
            (40, "image-pool", "image", &["image"]),
        ]);
        let error = authenticated_context_from_auth_token_identity(
            &catalog,
            identity(),
            Some(RoutingCapability::Chat),
        )
        .expect_err("no chat-capable default");
        assert_eq!(StatusCode::SERVICE_UNAVAILABLE, error.status());
    }
}
