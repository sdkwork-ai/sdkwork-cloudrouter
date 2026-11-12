//! Flexible bearer channel integration tests for the models endpoints.
//!
//! `GET /v1/models` accepts the same credential shapes as
//! `/v1/chat/completions`: `sk-`/`sp-` prefixed gateway API keys authenticate
//! against the API key store, and any other bearer value is resolved through
//! the injected [`OpenAiAuthTokenAuthenticator`] as an SDKWork IAM login auth
//! token. These tests mount the concrete router with a canned authenticator and
//! prove both channels plus the fail-closed cases.

use std::sync::Arc;

use async_trait::async_trait;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::response::IntoResponse;
use sdkwork_cloudrouter_router_service::api::{
    openai_models_router, openai_models_router_with_auth_extensions, OpenAiAuthTokenAuthenticator,
    OpenAiAuthTokenError,
};
use sdkwork_cloudrouter_router_service::application::{
    ApiKeySecretHasher, AuthenticatedApiKeyContext,
};
use sdkwork_cloudrouter_router_service::domain::{
    AiModel, DecimalValue, GatewayApiKey, ModelVendor, ModelVendorDefinition, UpstreamAccountGroup,
};
use sdkwork_cloudrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_web_core::default_open_api_bearer_classifier;
use tower::ServiceExt;

const API_KEY_SECRET: &str = "sk-live-secret";
const API_KEY_HASH_PEPPER: &str = "0123456789abcdef0123456789abcdef";
const LOGIN_AUTH_TOKEN: &str = "iam-login-auth-token";
const LONE_LOGIN_AUTH_TOKEN: &str = "iam-login-auth-token-lone";
const SESSION_ACCESS_TOKEN: &str = "dual-token-session-access";

fn catalog_with_hashed_api_key(key_hash: String) -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(AiModel::new(
        "gpt-4o-mini",
        "GPT-4o mini",
        "openai",
        vec!["chat", "tools"],
    ));
    catalog.add_upstream_account_group(UpstreamAccountGroup::new(
        10,
        "standard-group",
        "standard",
        DecimalValue::parse("1.000000").unwrap(),
        DecimalValue::parse("1.100000").unwrap(),
    ));
    catalog.add_api_key(GatewayApiKey::new(101, 10, "sk-live", &key_hash));
    catalog
}

fn api_key_hasher() -> Arc<HmacSha256ApiKeySecretHasher> {
    Arc::new(HmacSha256ApiKeySecretHasher::new(API_KEY_HASH_PEPPER).unwrap())
}

fn unauthorized(code: &str, message: &str) -> OpenAiAuthTokenError {
    let body = serde_json::json!({
        "error": {
            "message": message,
            "type": "invalid_request_error",
            "param": null,
            "code": code,
        }
    });
    Box::new((StatusCode::UNAUTHORIZED, axum::Json(body)).into_response())
}

/// Canned authenticator for the test fixture.
///
/// The pairing rule below (auth token + matching `Access-Token`) belongs to
/// this fixture, not to the endpoint: the real IAM channel accepts a lone
/// `Authorization: Bearer <authToken>` and only consults `Access-Token` when
/// the caller sends it. `LONE_LOGIN_AUTH_TOKEN` models that lone-bearer path,
/// and `LOGIN_AUTH_TOKEN` models an auth-token caller that does send the
/// paired dual-token session access token.
struct CannedAuthTokenAuthenticator;

#[async_trait]
impl OpenAiAuthTokenAuthenticator for CannedAuthTokenAuthenticator {
    async fn authenticate(
        &self,
        raw_bearer_token: &str,
        access_token: Option<&str>,
    ) -> Result<AuthenticatedApiKeyContext, OpenAiAuthTokenError> {
        match (raw_bearer_token, access_token) {
            (LOGIN_AUTH_TOKEN, Some(SESSION_ACCESS_TOKEN)) => {}
            (LONE_LOGIN_AUTH_TOKEN, None) => {}
            (LOGIN_AUTH_TOKEN, _) => {
                return Err(unauthorized(
                    "invalid_auth_token",
                    "missing or mismatched access token",
                ));
            }
            _ => return Err(unauthorized("invalid_auth_token", "unknown auth token")),
        }
        Ok(AuthenticatedApiKeyContext {
            api_key_id: 0,
            tenant_id: 100_001,
            organization_id: 0,
            user_id: 3001,
            api_key_name_snapshot: "auth-token-session".to_owned(),
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        })
    }
}

fn router_with_auth_token_channel() -> axum::Router {
    let hasher = api_key_hasher();
    let key_hash = hasher.hash_secret(API_KEY_SECRET).unwrap();
    openai_models_router_with_auth_extensions(
        Arc::new(catalog_with_hashed_api_key(key_hash)),
        hasher,
        Some(Arc::new(CannedAuthTokenAuthenticator)),
        default_open_api_bearer_classifier(),
    )
}

fn router_without_auth_token_channel() -> axum::Router {
    let hasher = api_key_hasher();
    let key_hash = hasher.hash_secret(API_KEY_SECRET).unwrap();
    openai_models_router(Arc::new(catalog_with_hashed_api_key(key_hash)), hasher)
}

async fn get_models(
    router: axum::Router,
    bearer: Option<&str>,
    access_token: Option<&str>,
) -> (StatusCode, serde_json::Value) {
    let mut builder = Request::builder().method("GET").uri("/v1/models");
    if let Some(bearer) = bearer {
        builder = builder.header("authorization", format!("Bearer {bearer}"));
    }
    if let Some(access_token) = access_token {
        builder = builder.header("Access-Token", access_token);
    }
    let response = router
        .oneshot(builder.body(Body::empty()).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload = serde_json::from_slice(&body).unwrap_or(serde_json::Value::Null);
    (status, payload)
}

#[tokio::test]
async fn sk_prefixed_bearer_still_authenticates_as_api_key() {
    let (status, payload) =
        get_models(router_with_auth_token_channel(), Some(API_KEY_SECRET), None).await;

    assert_eq!(StatusCode::OK, status);
    assert_eq!("list", payload["object"]);
    assert_eq!("gpt-4o-mini", payload["data"][0]["id"]);
    assert_eq!("GPT-4o mini", payload["data"][0]["displayName"]);
    assert_eq!("OpenAI", payload["data"][0]["vendorDisplayName"]);
}

#[tokio::test]
async fn login_auth_token_bearer_returns_catalog_list() {
    let (status, payload) = get_models(
        router_with_auth_token_channel(),
        Some(LOGIN_AUTH_TOKEN),
        Some(SESSION_ACCESS_TOKEN),
    )
    .await;

    assert_eq!(StatusCode::OK, status);
    let models = payload["data"]
        .as_array()
        .expect("model list must be an array");
    assert_eq!(1, models.len());
    assert_eq!("gpt-4o-mini", models[0]["id"]);
    assert_eq!("model", models[0]["object"]);
    assert_eq!("openai", models[0]["owned_by"]);
    assert_eq!("GPT-4o mini", models[0]["displayName"]);
    assert_eq!("OpenAI", models[0]["vendorDisplayName"]);
}

#[tokio::test]
async fn unknown_login_token_returns_invalid_auth_token() {
    let (status, payload) = get_models(
        router_with_auth_token_channel(),
        Some("unknown-login-token"),
        Some(SESSION_ACCESS_TOKEN),
    )
    .await;

    assert_eq!(StatusCode::UNAUTHORIZED, status);
    assert_eq!("invalid_request_error", payload["error"]["type"]);
    assert_eq!("invalid_auth_token", payload["error"]["code"]);
}

#[tokio::test]
async fn lone_authorization_bearer_reaches_the_authenticator() {
    // A signed-in product sends only `Authorization: Bearer <authToken>`; this
    // fixture's authenticator accepts that lone-bearer shape for this token.
    let (status, payload) = get_models(
        router_with_auth_token_channel(),
        Some(LONE_LOGIN_AUTH_TOKEN),
        None,
    )
    .await;

    assert_eq!(StatusCode::OK, status);
    assert_eq!("gpt-4o-mini", payload["data"][0]["id"]);
}

#[tokio::test]
async fn access_token_header_is_forwarded_to_the_authenticator() {
    // The endpoint forwards `Access-Token` when present and omits it otherwise.
    // This fixture requires the pairing for `LOGIN_AUTH_TOKEN`, so the 401 here
    // proves the absent header was observed by the authenticator; the pairing
    // requirement itself belongs to the fixture, not to the models endpoint.
    let (status, payload) = get_models(
        router_with_auth_token_channel(),
        Some(LOGIN_AUTH_TOKEN),
        None,
    )
    .await;

    assert_eq!(StatusCode::UNAUTHORIZED, status);
    assert_eq!("invalid_auth_token", payload["error"]["code"]);
}

#[tokio::test]
async fn non_api_key_bearer_is_rejected_without_authenticator() {
    let (status, payload) = get_models(
        router_without_auth_token_channel(),
        Some(LOGIN_AUTH_TOKEN),
        Some(SESSION_ACCESS_TOKEN),
    )
    .await;

    assert_eq!(StatusCode::UNAUTHORIZED, status);
    assert_eq!("invalid_auth_token", payload["error"]["code"]);
    assert_eq!(
        "auth token authentication is not configured",
        payload["error"]["message"]
    );
}
