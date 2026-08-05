//! Gateway-native token bank balance endpoint (`GET /v1/user/balance`).
//!
//! Cloud Router is the relay, so it can answer "how much balance does this
//! key's owner have" itself instead of shipping a user-authored query script.
//! The endpoint authenticates the relay API key (same path as `/v1/models`)
//! and reads the owner's Token Bank wallet balance through the
//! [`GatewayBalanceStore`] port, which the edge runtime implements on top of
//! the account-domain wallet store.
//!
//! Response shape is CC Switch `UsageData`-compatible: the deeplink import
//! ships a small extractor that maps `balance` → `remaining` and `unit` →
//! `unit`, so the balance shows up in CC Switch without any script editing.
//! Amounts are returned as stored (minor-unit strings), matching the account
//! platform's own wallet API convention.

use std::sync::Arc;

use axum::extract::State;
use axum::http::{HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_cloudrouter_http::ApiKeyIdentity;
use serde::{Deserialize, Serialize};

use crate::api::openai_error::openai_error;
use crate::application::{
    ApiKeyAuthenticator, ApiKeySecretHasher, AuthenticateApiKeyQuery, AuthenticatedApiKeyContext,
};
use crate::ports::PricingCatalog;

type GatewayBalanceError = Box<Response>;

/// Token bank balance snapshot for the authenticated relay key owner.
#[derive(Debug, Clone, Eq, PartialEq)]
pub struct GatewayTokenBankBalance {
    /// Available balance (stored amount string, platform minor-unit convention).
    pub available: String,
    /// Frozen (held) balance, same unit convention.
    pub frozen: String,
    /// Asset unit label (for the Token Bank wallet this is `TOKEN_BANK`).
    pub unit: String,
}

/// Port used by the balance endpoint to read the token bank balance of the
/// key owner. Implemented for the account-domain wallet store by the edge
/// runtime composition root.
#[async_trait::async_trait]
pub trait GatewayBalanceStore: Send + Sync {
    async fn retrieve_token_bank_balance(
        &self,
        tenant_id: i64,
        organization_id: i64,
        user_id: i64,
    ) -> Result<GatewayTokenBankBalance, String>;
}

/// Balance store for gateway surfaces that have no Token Bank ledger
/// (relay-only / client-local deployments).
///
/// The balance endpoint stays mounted on every surface that serves the
/// OpenAI-compatible API so CC Switch usage scripts never hit a 404; without
/// a ledger the honest answer is a zero balance in the standard shape.
pub struct ZeroGatewayBalanceStore;

#[async_trait::async_trait]
impl GatewayBalanceStore for ZeroGatewayBalanceStore {
    async fn retrieve_token_bank_balance(
        &self,
        _tenant_id: i64,
        _organization_id: i64,
        _user_id: i64,
    ) -> Result<GatewayTokenBankBalance, String> {
        Ok(GatewayTokenBankBalance {
            available: "0".to_owned(),
            frozen: "0".to_owned(),
            unit: "TOKEN_BANK".to_owned(),
        })
    }
}

struct GatewayBalanceState<C> {
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    store: Arc<dyn GatewayBalanceStore>,
}

impl<C> Clone for GatewayBalanceState<C> {
    fn clone(&self) -> Self {
        Self {
            catalog: Arc::clone(&self.catalog),
            api_key_hasher: Arc::clone(&self.api_key_hasher),
            store: Arc::clone(&self.store),
        }
    }
}

pub fn gateway_balance_router<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    store: Arc<dyn GatewayBalanceStore>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    Router::new()
        .route("/v1/user/balance", get(balance::<C>))
        .with_state(GatewayBalanceState {
            catalog,
            api_key_hasher,
            store,
        })
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GatewayBalanceResponse {
    object: String,
    balance: String,
    frozen: String,
    unit: String,
}

async fn balance<C>(
    State(state): State<GatewayBalanceState<C>>,
    headers: HeaderMap,
    uri: Uri,
) -> Response
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let identity = match ApiKeyIdentity::from_headers_and_uri(&headers, &uri) {
        Ok(identity) => identity,
        Err(error) => {
            tracing::warn!(
                path = %uri.path(),
                error = ?error,
                "gateway balance query rejected: missing or malformed api key identity"
            );
            return openai_error(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "invalid_request_error",
                error,
            );
        }
    };
    tracing::info!(
        path = %uri.path(),
        api_key_id = identity.api_key_id(),
        credential_source = ?identity.credential_source(),
        "gateway balance query: api key identity parsed"
    );
    let context = match authenticate(&state, &identity) {
        Ok(context) => context,
        Err(error) => {
            tracing::warn!(
                path = %uri.path(),
                api_key_id = identity.api_key_id(),
                "gateway balance query rejected: api key authentication failed"
            );
            return *error;
        }
    };
    tracing::info!(
        tenant_id = context.tenant_id,
        organization_id = context.organization_id,
        user_id = context.user_id,
        "gateway balance query authenticated"
    );
    match state
        .store
        .retrieve_token_bank_balance(context.tenant_id, context.organization_id, context.user_id)
        .await
    {
        Ok(balance) => {
            tracing::info!(
                tenant_id = context.tenant_id,
                organization_id = context.organization_id,
                user_id = context.user_id,
                unit = %balance.unit,
                available = %balance.available,
                frozen = %balance.frozen,
                "gateway balance query succeeded"
            );
            Json(GatewayBalanceResponse {
                object: "balance".to_owned(),
                balance: balance.available,
                frozen: balance.frozen,
                unit: balance.unit,
            })
            .into_response()
        }
        Err(message) => {
            tracing::warn!(
                tenant_id = context.tenant_id,
                organization_id = context.organization_id,
                user_id = context.user_id,
                error = %message,
                "gateway balance query failed: token bank wallet store error"
            );
            openai_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "balance_query_failed",
                "api_error",
                message,
            )
            .into_response()
        }
    }
}

fn authenticate<C>(
    state: &GatewayBalanceState<C>,
    identity: &ApiKeyIdentity,
) -> Result<AuthenticatedApiKeyContext, GatewayBalanceError>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let Some(credential_secret) = identity.credential_secret() else {
        return Err(Box::new(openai_error(
            StatusCode::UNAUTHORIZED,
            "invalid_api_key",
            "invalid_request_error",
            "missing api key credential",
        )));
    };
    let authenticator =
        ApiKeyAuthenticator::new(state.catalog.as_ref(), state.api_key_hasher.as_ref());
    authenticator
        .authenticate(AuthenticateApiKeyQuery { credential_secret })
        .map_err(|_| {
            Box::new(openai_error(
                StatusCode::UNAUTHORIZED,
                "invalid_api_key",
                "invalid_request_error",
                "invalid api key",
            ))
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{header::AUTHORIZATION, Request};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    use crate::domain::{
        AiModel, BillingMeter, GatewayAccessPolicy, GatewayApiKey, GatewayRiskRule,
        ModelMappingRule, ModelPrice, ModelUpstreamRoute, ModelVendorDefinition, PriceSide,
        PricingPlan, QuotaPolicy, ResolveModelMappingContext, RoutingPolicy, RoutingRule,
        UpstreamAccountGroup, UpstreamAccountGroupMetricSnapshot, UpstreamAccountRoute,
    };

    /// Minimal catalog: no keys, no models. Only `find_api_key_by_hash` is
    /// reached by the auth path in the tests.
    struct EmptyPricingCatalog;

    impl PricingCatalog for EmptyPricingCatalog {
        fn visit_models(
            &self,
            _vendor_code: Option<&str>,
            _visitor: &mut dyn FnMut(&AiModel) -> bool,
        ) {
        }
        fn list_model_upstream_routes(&self, _model: &str) -> Vec<ModelUpstreamRoute> {
            Vec::new()
        }
        fn list_upstream_account_routes(&self) -> Vec<UpstreamAccountRoute> {
            Vec::new()
        }
        fn list_routing_policies(&self) -> Vec<RoutingPolicy> {
            Vec::new()
        }
        fn list_routing_rules(&self, _profile_id: i64) -> Vec<RoutingRule> {
            Vec::new()
        }
        fn list_model_mappings(&self) -> Vec<ModelMappingRule> {
            Vec::new()
        }
        fn list_api_keys(&self) -> Vec<GatewayApiKey> {
            Vec::new()
        }
        fn list_upstream_account_groups(&self) -> Vec<UpstreamAccountGroup> {
            Vec::new()
        }
        fn list_model_prices(
            &self,
            _model: &str,
            _side: PriceSide,
            _meter: BillingMeter,
        ) -> Vec<ModelPrice> {
            Vec::new()
        }
        fn list_model_prices_for_side(&self, _model: &str, _side: PriceSide) -> Vec<ModelPrice> {
            Vec::new()
        }
        fn find_api_key(&self, _api_key_id: i64) -> Option<GatewayApiKey> {
            None
        }
        fn find_api_key_by_hash(&self, _key_hash: &str) -> Option<GatewayApiKey> {
            None
        }
        fn find_upstream_account_group(
            &self,
            _account_group_id: i64,
        ) -> Option<UpstreamAccountGroup> {
            None
        }
        fn find_access_policy(&self, _policy_id: i64) -> Option<GatewayAccessPolicy> {
            None
        }
        fn find_quota_policy(&self, _policy_id: i64) -> Option<QuotaPolicy> {
            None
        }
        fn list_gateway_risk_rules(&self) -> Vec<GatewayRiskRule> {
            Vec::new()
        }
        fn find_latest_upstream_account_group_metric_snapshot(
            &self,
            _account_group_id: i64,
        ) -> Option<UpstreamAccountGroupMetricSnapshot> {
            None
        }
        fn find_pricing_plan(&self, _plan_code: &str) -> Option<PricingPlan> {
            None
        }
        fn find_model(&self, _model: &str) -> Option<AiModel> {
            None
        }
        fn find_vendor(&self, _vendor_code: &str) -> Option<ModelVendorDefinition> {
            None
        }
        fn resolve_model_mapping(
            &self,
            _source_model: &str,
            _context: &ResolveModelMappingContext,
        ) -> Option<ModelMappingRule> {
            None
        }
        fn find_model_upstream_route(
            &self,
            _model: &str,
            _supplier_code: &str,
        ) -> Option<ModelUpstreamRoute> {
            None
        }
        fn find_model_price(
            &self,
            _model: &str,
            _side: PriceSide,
            _meter: BillingMeter,
            _supplier_code: Option<&str>,
            _pricing_plan_code: Option<&str>,
        ) -> Option<ModelPrice> {
            None
        }
    }

    /// Pass-through hasher so the auth path always yields a hash that is not
    /// present in the empty catalog.
    struct PassThroughApiKeySecretHasher;

    impl ApiKeySecretHasher for PassThroughApiKeySecretHasher {
        fn hash_secret(&self, secret: &str) -> Result<String, crate::domain::DomainError> {
            Ok(secret.to_owned())
        }
    }

    struct MockBalanceStore;

    #[async_trait::async_trait]
    impl GatewayBalanceStore for MockBalanceStore {
        async fn retrieve_token_bank_balance(
            &self,
            _tenant_id: i64,
            _organization_id: i64,
            _user_id: i64,
        ) -> Result<GatewayTokenBankBalance, String> {
            Ok(GatewayTokenBankBalance {
                available: "1234".to_owned(),
                frozen: "56".to_owned(),
                unit: "TOKEN_BANK".to_owned(),
            })
        }
    }

    fn test_router() -> Router {
        gateway_balance_router::<EmptyPricingCatalog>(
            Arc::new(EmptyPricingCatalog),
            Arc::new(PassThroughApiKeySecretHasher),
            Arc::new(MockBalanceStore),
        )
    }

    #[test]
    fn balance_response_shape_matches_cc_switch_usage_data() {
        // The deeplink usageScript extractor reads `response.balance` as
        // `remaining` and `response.unit` as `unit`; keep the JSON contract
        // stable.
        let json = serde_json::json!({
            "object": "balance",
            "balance": "1234",
            "frozen": "56",
            "unit": "TOKEN_BANK"
        });
        let parsed: GatewayBalanceResponse = serde_json::from_value(json).unwrap();
        assert_eq!(parsed.object, "balance");
        assert_eq!(parsed.balance, "1234");
        assert_eq!(parsed.frozen, "56");
        assert_eq!(parsed.unit, "TOKEN_BANK");
    }

    #[tokio::test]
    async fn balance_requires_valid_api_key() {
        // No credential → the handler must reject before touching the store.
        let response = test_router()
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/v1/user/balance")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["code"], "invalid_api_key");
    }

    #[tokio::test]
    async fn balance_rejects_unknown_key() {
        // A credential that does not match any catalog key → 401.
        let response = test_router()
            .oneshot(
                Request::builder()
                    .method("GET")
                    .uri("/v1/user/balance")
                    .header(AUTHORIZATION, "Bearer sk-not-in-catalog")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["code"], "invalid_api_key");
    }
}
