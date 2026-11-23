use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_cloudrouter_http::ApiKeyIdentity;

use crate::api::openai_auth_token::{
    apply_api_key_account_group_override,
    authenticated_context_from_auth_token_identity_with_routing, OpenAiAuthTokenAuthenticator,
};
use crate::api::openai_contract::{
    OpenAiModelGroupListResponse, OpenAiModelGroupResponse, OpenAiModelListResponse,
    OpenAiModelResponse,
};
use crate::api::openai_error::openai_error;
use crate::application::{
    ApiKeyAuthenticator, ApiKeySecretHasher, AuthenticateApiKeyQuery, AuthenticatedApiKeyContext,
};
use crate::domain::AiModel;
use crate::ports::{PricingCatalog, UpstreamAccountRouteCatalog};
use sdkwork_web_core::{
    default_open_api_bearer_classifier, DynOpenApiBearerCredentialClassifier, OpenApiCredentialKind,
};

type OpenAiResponseError = Box<Response>;

struct OpenAiModelsState<C> {
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    /// Resolves non-API-key bearer credentials (SDKWork IAM login auth tokens)
    /// into an authenticated context; `None` fails closed for that channel.
    auth_token_authenticator: Option<Arc<dyn OpenAiAuthTokenAuthenticator + Send + Sync>>,
    /// Classifies a single bearer credential into the API key or auth token
    /// channel (default: `sk-`/`sp-` prefixes).
    bearer_classifier: DynOpenApiBearerCredentialClassifier,
}

impl<C> Clone for OpenAiModelsState<C> {
    fn clone(&self) -> Self {
        Self {
            catalog: Arc::clone(&self.catalog),
            api_key_hasher: Arc::clone(&self.api_key_hasher),
            auth_token_authenticator: self.auth_token_authenticator.clone(),
            bearer_classifier: Arc::clone(&self.bearer_classifier),
        }
    }
}

pub fn openai_models_router<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    openai_models_router_with_auth_extensions(
        catalog,
        api_key_hasher,
        None,
        default_open_api_bearer_classifier(),
    )
}

/// Like [`openai_models_router`], plus the auth extensions for the flexible
/// bearer channel: an optional auth-token authenticator (non-`sk-`/`sp-`
/// credentials) and an overridable bearer classifier.
pub fn openai_models_router_with_auth_extensions<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    auth_token_authenticator: Option<Arc<dyn OpenAiAuthTokenAuthenticator + Send + Sync>>,
    bearer_classifier: DynOpenApiBearerCredentialClassifier,
) -> Router
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    Router::new()
        .route("/v1/models", get(list_models::<C>))
        // One catch-all segment: the model id may be a bare id (`gpt-4o`), a
        // vendor-qualified catalog key (`openai/gpt-4o`), or a percent-encoded
        // key (`openai%2Fgpt-4o`). The handler dispatches the `/groups`
        // suffix, so literal slashes inside a vendor-qualified id also work.
        .route("/v1/models/{*model}", get(model_path::<C>))
        .with_state(OpenAiModelsState {
            catalog,
            api_key_hasher,
            auth_token_authenticator,
            bearer_classifier,
        })
}

async fn model_path<C>(
    State(state): State<OpenAiModelsState<C>>,
    Path(model): Path<String>,
    headers: HeaderMap,
    uri: Uri,
) -> Response
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let model = model.trim_matches('/').trim().to_owned();
    if let Some(model) = model.strip_suffix("/groups") {
        return list_model_groups_inner(state, model.trim_matches('/').to_owned(), headers, uri)
            .await;
    }
    retrieve_model_inner(state, model, headers, uri).await
}

async fn list_models<C>(
    State(state): State<OpenAiModelsState<C>>,
    headers: HeaderMap,
    uri: Uri,
) -> Response
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let identity = match ApiKeyIdentity::from_headers_and_uri(&headers, &uri) {
        Ok(identity) => identity,
        Err(error) => {
            return openai_error(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "invalid_request_error",
                error,
            );
        }
    };
    if let Err(response) = authenticate(&state, &identity, &headers, None).await {
        return *response;
    }

    let mut data = Vec::new();
    state.catalog.visit_models(None, &mut |model| {
        data.push(to_model_response(state.catalog.as_ref(), model.clone()));
        true
    });
    Json(OpenAiModelListResponse {
        object: "list".to_owned(),
        data,
    })
    .into_response()
}

async fn retrieve_model_inner<C>(
    state: OpenAiModelsState<C>,
    model: String,
    headers: HeaderMap,
    uri: Uri,
) -> Response
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let identity = match ApiKeyIdentity::from_headers_and_uri(&headers, &uri) {
        Ok(identity) => identity,
        Err(error) => {
            return openai_error(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "invalid_request_error",
                error,
            );
        }
    };
    if let Err(response) = authenticate(&state, &identity, &headers, Some(&model)).await {
        return *response;
    }

    let Some(model) = find_model_for_openai_id(state.catalog.as_ref(), &model) else {
        return openai_error(
            StatusCode::NOT_FOUND,
            "model_not_found",
            "invalid_request_error",
            "model not found",
        );
    };

    Json(to_model_response(state.catalog.as_ref(), model)).into_response()
}

async fn list_model_groups_inner<C>(
    state: OpenAiModelsState<C>,
    model: String,
    headers: HeaderMap,
    uri: Uri,
) -> Response
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let identity = match ApiKeyIdentity::from_headers_and_uri(&headers, &uri) {
        Ok(identity) => identity,
        Err(error) => {
            return openai_error(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "invalid_request_error",
                error,
            );
        }
    };
    // Listing the groups that serve a model must NOT require the caller's
    // current default group to serve that model: a user whose default pool
    // lacks the model is exactly who needs the alternatives. Resolve the
    // subject (tenant/organization, plus the optional group override) without
    // binding it to the requested model.
    let context = match authenticate(&state, &identity, &headers, None).await {
        Ok(context) => context,
        Err(response) => return *response,
    };
    let Some(found) = find_model_for_openai_id(state.catalog.as_ref(), &model) else {
        return openai_error(
            StatusCode::NOT_FOUND,
            "model_not_found",
            "invalid_request_error",
            "model not found",
        );
    };
    let (user_id, fallback_group_id) = if context.api_key_id == 0 {
        // Auth-token session: an explicit user rule is the default; with no
        // rule the helper falls back to the account-level default.
        (Some(context.user_id), None)
    } else {
        // API key: the key's bound default group is the fallback.
        (None, Some(context.group_id))
    };
    let data = crate::application::model_group_options_for_context(
        state.catalog.as_ref(),
        &found,
        context.tenant_id,
        context.organization_id,
        user_id,
        fallback_group_id,
    )
    .into_iter()
    .map(|group| OpenAiModelGroupResponse {
        id: group.group_id.to_string(),
        code: group.group_code,
        name: group.group_name,
        default_for_model: group.selected,
    })
    .collect();
    Json(OpenAiModelGroupListResponse {
        object: "list".to_owned(),
        data,
    })
    .into_response()
}

fn find_model_for_openai_id<C>(catalog: &C, model: &str) -> Option<AiModel>
where
    C: UpstreamAccountRouteCatalog + ?Sized,
{
    crate::application::resolve_catalog_model(catalog, model)
}

async fn authenticate<C>(
    state: &OpenAiModelsState<C>,
    identity: &ApiKeyIdentity,
    headers: &HeaderMap,
    requested_model: Option<&str>,
) -> Result<AuthenticatedApiKeyContext, OpenAiResponseError>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    let Some(credential_secret) = identity.credential_secret() else {
        return Err(Box::new(openai_error(
            StatusCode::UNAUTHORIZED,
            "invalid_api_key",
            "invalid_request_error",
            "missing api key credential",
        )));
    };
    let requested_group = headers
        .get(crate::domain::ACCOUNT_GROUP_ROUTING_HEADER)
        .and_then(|value| value.to_str().ok());
    // Flexible bearer channel, mirroring `/v1/chat/completions`: API-key
    // prefixed credentials (`sk-`/`sp-`) authenticate through the gateway API
    // key store; any other bearer value is an SDKWork IAM login auth token.
    match state.bearer_classifier.classify(credential_secret) {
        OpenApiCredentialKind::ApiKey => {
            let authenticator =
                ApiKeyAuthenticator::new(state.catalog.as_ref(), state.api_key_hasher.as_ref());
            authenticator
                .authenticate(AuthenticateApiKeyQuery { credential_secret })
                .map(|context| {
                    apply_api_key_account_group_override(
                        state.catalog.as_ref(),
                        context,
                        requested_group,
                    )
                })
                .map_err(|_| {
                    Box::new(openai_error(
                        StatusCode::UNAUTHORIZED,
                        "invalid_api_key",
                        "invalid_request_error",
                        "api key credential is invalid",
                    ))
                })
        }
        OpenApiCredentialKind::AuthToken => {
            let Some(authenticator) = state.auth_token_authenticator.as_deref() else {
                return Err(Box::new(openai_error(
                    StatusCode::UNAUTHORIZED,
                    "invalid_auth_token",
                    "invalid_request_error",
                    "auth token authentication is not configured",
                )));
            };
            let access_token = headers
                .get("Access-Token")
                .and_then(|value| value.to_str().ok())
                .map(str::trim)
                .filter(|value| !value.is_empty());
            let identity = authenticator
                .authenticate(credential_secret, access_token)
                .await?;
            // The model list has no inference modality: resolve the subject's
            // model rule or mixed/default group (same rule the balance query
            // uses).
            authenticated_context_from_auth_token_identity_with_routing(
                state.catalog.as_ref(),
                identity,
                None,
                requested_model,
                requested_group,
            )
        }
    }
}

fn to_model_response<C>(catalog: &C, model: AiModel) -> OpenAiModelResponse
where
    C: PricingCatalog,
{
    let vendor = catalog.find_vendor(&model.vendor_code);
    let owned_by = vendor
        .as_ref()
        .map(|vendor| vendor.vendor.code().to_owned())
        .unwrap_or_else(|| model.vendor_code.clone());
    // OpenAI Model 对象的扩展字段：目录声明的展示名与 vendor 展示名，供
    // 模型选择器等消费方（如 Birdcoder 导入）直接展示，无需再拼装。
    // `OpenAiModel` 契约把它们声明为可选属性，`additionalProperties` 仍允许
    // 其他厂商扩展字段。
    let mut extra = serde_json::Map::new();
    extra.insert(
        "displayName".to_owned(),
        serde_json::Value::String(model.display_name.clone()),
    );
    if let Some(vendor) = vendor {
        extra.insert(
            "vendorDisplayName".to_owned(),
            serde_json::Value::String(vendor.display_name.clone()),
        );
    }
    OpenAiModelResponse {
        id: model.model,
        object: "model".to_owned(),
        created: 0,
        owned_by,
        extra,
    }
}
