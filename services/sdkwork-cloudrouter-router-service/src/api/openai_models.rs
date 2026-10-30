use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_cloudrouter_http::ApiKeyIdentity;

use crate::api::openai_contract::{OpenAiModelListResponse, OpenAiModelResponse};
use crate::api::openai_error::openai_error;
use crate::application::{
    ApiKeyAuthenticator, ApiKeySecretHasher, AuthenticateApiKeyQuery, AuthenticatedApiKeyContext,
};
use crate::domain::AiModel;
use crate::ports::PricingCatalog;

type OpenAiResponseError = Box<Response>;

struct OpenAiModelsState<C> {
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
}

impl<C> Clone for OpenAiModelsState<C> {
    fn clone(&self) -> Self {
        Self {
            catalog: Arc::clone(&self.catalog),
            api_key_hasher: Arc::clone(&self.api_key_hasher),
        }
    }
}

pub fn openai_models_router<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    Router::new()
        .route("/v1/models", get(list_models::<C>))
        .route("/v1/models/{model}", get(retrieve_model::<C>))
        .with_state(OpenAiModelsState {
            catalog,
            api_key_hasher,
        })
}

async fn list_models<C>(
    State(state): State<OpenAiModelsState<C>>,
    headers: HeaderMap,
    uri: Uri,
) -> Response
where
    C: PricingCatalog + Send + Sync + 'static,
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
    if let Err(response) = authenticate(&state, &identity) {
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

async fn retrieve_model<C>(
    State(state): State<OpenAiModelsState<C>>,
    Path(model): Path<String>,
    headers: HeaderMap,
    uri: Uri,
) -> Response
where
    C: PricingCatalog + Send + Sync + 'static,
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
    if let Err(response) = authenticate(&state, &identity) {
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

fn find_model_for_openai_id<C>(catalog: &C, model: &str) -> Option<AiModel>
where
    C: PricingCatalog,
{
    if let Some(model) = catalog.find_model(model) {
        return Some(model);
    }
    let mut found = None;
    catalog.visit_models(None, &mut |candidate| {
        if candidate.model != model {
            return true;
        }
        found = Some(candidate.clone());
        false
    });
    if found.is_some() {
        return found;
    }
    // 精确未命中：接受 OpenRouter 风格 id（`anthropic/claude-opus-4.5` →
    // 目录键 `anthropic/claude-opus-4-5`），与路由期解析同一容错语义。
    let alias_keys = crate::ports::resolve_model_alias_catalog_keys(catalog, model);
    if let [catalog_key] = alias_keys.as_slice() {
        return catalog.find_model(catalog_key);
    }
    found
}

fn authenticate<C>(
    state: &OpenAiModelsState<C>,
    identity: &ApiKeyIdentity,
) -> Result<AuthenticatedApiKeyContext, OpenAiResponseError>
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
                "api key credential is invalid",
            ))
        })
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
    // `OpenAiModel` 契约的 `additionalProperties` 允许该扩展。
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
