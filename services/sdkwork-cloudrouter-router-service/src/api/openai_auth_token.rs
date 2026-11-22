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
use crate::domain::{RoutingCapability, SessionAccountGroupModality};
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
    authenticated_context_from_auth_token_identity_with_routing(
        catalog,
        identity,
        capability,
        None,
        None,
    )
}

/// Model-aware variant of
/// [`authenticated_context_from_auth_token_identity`].
///
/// Adds the two user-controlled routing layers in front of the account-level
/// default group:
///
/// 1. `requested_group` — the value of
///    [`crate::domain::ACCOUNT_GROUP_ROUTING_HEADER`] (`x-sdkwork-account-group`),
///    naming a group id or code the subject may use;
/// 2. the user's own model → group rules
///    (`ai_user_account_group_route`) for `requested_model` — model first, then
///    vendor, then modality.
///
/// Both layers only choose among groups that are already in the subject's
/// scope and serve the requested modality; an unknown or unreachable value
/// falls through to the account-level default instead of failing the request.
pub fn authenticated_context_from_auth_token_identity_with_routing<C>(
    catalog: &C,
    identity: OpenAiAuthTokenIdentity,
    capability: Option<RoutingCapability>,
    requested_model: Option<&str>,
    requested_group: Option<&str>,
) -> Result<AuthenticatedApiKeyContext, OpenAiAuthTokenError>
where
    C: UpstreamAccountRouteCatalog,
{
    let modality = capability.and_then(SessionAccountGroupModality::from_capability);
    let groups = catalog.list_session_account_groups();
    let user_routes = catalog.list_user_account_group_routes();
    let requested_model = requested_model
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let mut requested_model_keys = Vec::new();
    let mut requested_vendor_codes = Vec::new();
    if let Some(model) = requested_model {
        requested_model_keys.push(model.to_owned());
        for key in catalog.model_catalog_keys_by_name(model) {
            if !requested_model_keys
                .iter()
                .any(|existing| existing.eq_ignore_ascii_case(&key))
            {
                requested_model_keys.push(key);
            }
        }
        requested_vendor_codes = catalog.model_vendor_codes_by_name(model);
        if requested_vendor_codes.is_empty() {
            if let Some(found) = catalog.find_model(model) {
                requested_vendor_codes.push(found.vendor_code);
            }
        }
    }
    // Restrict one-to-many rules to groups that can actually serve this model,
    // so a configured list is a real failover list instead of pinning a group
    // that has no account for the model.
    let model_support = requested_model.and_then(|model| {
        let found = catalog.find_model(model).or_else(|| {
            requested_model_keys
                .iter()
                .find_map(|key| catalog.find_model(key))
        })?;
        let ids = crate::application::model_supported_group_ids(
            catalog,
            &found,
            identity.tenant_id,
            identity.organization_id,
        );
        // An empty set means the catalog has no route for this model at all.
        // Keep the previous behaviour there (fall through to the account
        // default so the route planner can report the precise model-route gap)
        // instead of masking it as "no default group".
        (!ids.is_empty()).then_some(ids)
    });
    let Some(selection) = crate::domain::select_session_account_group_with_user_routing_and_support(
        &groups,
        &user_routes,
        identity.tenant_id,
        identity.organization_id,
        identity.user_id,
        modality,
        &requested_model_keys,
        &requested_vendor_codes,
        requested_group,
        model_support.as_deref(),
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
    let group = selection.group().clone();
    tracing::debug!(
        account_group_id = group.id,
        account_group_code = %group.code,
        routing_source = selection.reason().as_str(),
        requested_model = requested_model.unwrap_or(""),
        "session account group resolved"
    );
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

/// Applies the explicit account-group header to an **API-key** context.
///
/// An API key is already bound to one or more account groups; the header may
/// only narrow the choice to one of those bindings. Anything else (unknown
/// id/code, a group bound to another key, a blank header) keeps the key's own
/// default group — a header must never let a key escape its authorization
/// scope.
pub fn apply_api_key_account_group_override<C>(
    catalog: &C,
    context: AuthenticatedApiKeyContext,
    requested_group: Option<&str>,
) -> AuthenticatedApiKeyContext
where
    C: UpstreamAccountRouteCatalog,
{
    let Some(raw) = crate::domain::normalize_account_group_header(requested_group) else {
        return context;
    };
    let Some(api_key) = catalog.find_api_key(context.api_key_id) else {
        tracing::warn!(
            api_key_id = context.api_key_id,
            "account-group header ignored: authenticated api key is no longer in the catalog"
        );
        return context;
    };
    let bound_group_ids = api_key
        .effective_account_group_bindings()
        .iter()
        .map(|binding| binding.account_group_id)
        .collect::<Vec<_>>();
    let groups = catalog.list_upstream_account_groups();
    let Some(group) = crate::domain::select_api_key_account_group_override(
        &bound_group_ids,
        &groups,
        Some(raw),
    ) else {
        tracing::warn!(
            api_key_id = context.api_key_id,
            requested = raw,
            "account-group header ignored: the group is not bound to this api key"
        );
        return context;
    };
    AuthenticatedApiKeyContext {
        group_id: group.id,
        group_code: group.code,
        pricing_plan_code: group.pricing_plan_code,
        ..context
    }
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

    #[test]
    fn header_override_selects_the_requested_group() {
        let catalog = catalog_with(&[
            (10, "default-group", "mixed", &[]),
            (20, "video-pool", "video", &["video"]),
        ]);
        let context = authenticated_context_from_auth_token_identity_with_routing(
            &catalog,
            identity(),
            Some(RoutingCapability::Chat),
            Some("gpt-4o"),
            Some("default-group"),
        )
        .expect("header override");
        assert_eq!(10, context.group_id);
    }

    #[test]
    fn user_model_rule_wins_over_the_account_default() {
        let mut catalog = catalog_with(&[
            (10, "default-group", "mixed", &[]),
            (30, "llm-pool", "llm", &["text"]),
        ]);
        // The test catalog has no models; register the routing rule directly.
        catalog.add_user_account_group_route(crate::domain::UserAccountGroupRoute {
            tenant_id: TENANT_ID,
            organization_id: 0,
            user_id: 30,
            scope: crate::domain::AccountGroupRouteScope::Model,
            modality: "text".to_owned(),
            vendor_code: String::new(),
            model: "gpt-4o".to_owned(),
            account_group_id: 30,
            account_group_code: "llm-pool".to_owned(),
            priority: 100,
        });
        let context = authenticated_context_from_auth_token_identity_with_routing(
            &catalog,
            identity(),
            Some(RoutingCapability::Chat),
            Some("gpt-4o"),
            None,
        )
        .expect("user model rule");
        assert_eq!(30, context.group_id);
        assert_eq!("llm-pool", context.group_code);
    }

    #[test]
    fn unknown_header_group_falls_back_to_the_account_default() {
        let catalog = catalog_with(&[(10, "default-group", "mixed", &[])]);
        let context = authenticated_context_from_auth_token_identity_with_routing(
            &catalog,
            identity(),
            Some(RoutingCapability::Chat),
            None,
            Some("does-not-exist"),
        )
        .expect("fallback");
        assert_eq!(10, context.group_id);
    }
}
