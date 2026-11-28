//! API-key relay recharge surface of the Cloud Router Open API.
//!
//! A Cloud Router deployment can act as a relay for another Cloud Router
//! deployment: an `sk-` API key authenticates `/v1/recharge/balance`,
//! `/v1/recharge/options`, and `/v1/recharge/orders`. The surface is
//! deliberately storage-agnostic — [`OpenRechargeStore`] owns catalog and order
//! persistence — while this module owns the wire contract, authentication, and
//! error mapping.
//!
//! Every response uses the standard `SdkWorkApiResponse` envelope and every
//! failure an `application/problem+json` body, because these operations are
//! SDKWork-owned business open-api operations, not vendor protocol mirrors.

use std::sync::Arc;

use axum::extract::rejection::JsonRejection;
use axum::extract::{Path, State};
use axum::http::{header, HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_cloudrouter_http::ApiKeyIdentity;
use sdkwork_utils_rust::{format_datetime, now, uuid, SdkWorkResultCode};
use serde::{Deserialize, Serialize};

use crate::api::GatewayBalanceStore;
use crate::application::{ApiKeyAuthenticator, ApiKeySecretHasher, AuthenticateApiKeyQuery};
use crate::ports::PricingCatalog;

pub use sdkwork_cloudrouter_upstream_recharge::{
    RechargeBalance, RechargeOption, RechargeOptions, RechargeOrder, RechargeOrderRequest,
};

/// Failure of one recharge store operation.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum OpenRechargeStoreError {
    /// The caller cannot see the requested order.
    #[error("{0}")]
    NotFound(String),
    /// The command is not acceptable for the relay catalog.
    #[error("{0}")]
    Validation(String),
    /// The command conflicts with an existing order.
    #[error("{0}")]
    Conflict(String),
    /// The relay's commerce store is unavailable.
    #[error("{0}")]
    Unavailable(String),
    /// The relay failed unexpectedly.
    #[error("{0}")]
    Internal(String),
}

impl OpenRechargeStoreError {
    /// Numeric platform code used on the problem response.
    fn result_code(&self) -> SdkWorkResultCode {
        match self {
            Self::NotFound(_) => SdkWorkResultCode::NotFound,
            Self::Validation(_) => SdkWorkResultCode::InvalidParameter,
            Self::Conflict(_) => SdkWorkResultCode::Conflict,
            Self::Unavailable(_) => SdkWorkResultCode::ServiceUnavailable,
            Self::Internal(_) => SdkWorkResultCode::InternalError,
        }
    }

    /// HTTP status paired with [`Self::result_code`].
    fn status(&self) -> StatusCode {
        match self {
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Validation(_) => StatusCode::UNPROCESSABLE_ENTITY,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::Unavailable(_) => StatusCode::SERVICE_UNAVAILABLE,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

/// Identity behind a relay recharge API key.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpenRechargeSubject {
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub user_id: String,
    pub api_key_id: Option<i64>,
}

/// Recharge catalog served to one API key owner.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpenRechargeCatalog {
    pub items: Vec<RechargeOption>,
    pub currency_code: String,
    pub points_unit: String,
    pub custom_amount_supported: bool,
    pub min_amount: Option<String>,
    pub max_amount: Option<String>,
    pub agreement: String,
}

/// Command that creates one recharge order for an API key owner.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpenRechargeOrderCommand {
    pub subject: OpenRechargeSubject,
    pub package_id: Option<String>,
    pub amount: Option<String>,
    pub payment_method: Option<String>,
    pub idempotency_key: Option<String>,
}

pub type OpenRechargeFuture<'a, T> = std::pin::Pin<
    Box<dyn std::future::Future<Output = Result<T, OpenRechargeStoreError>> + Send + 'a>,
>;

/// Persistence port of the relay recharge surface.
///
/// The router-service SQLx implementation wraps the commerce order store; tests
/// substitute an in-memory implementation so the HTTP contract stays testable
/// without a database.
pub trait OpenRechargeStore: Send + Sync {
    fn list_catalog<'a>(
        &'a self,
        subject: &'a OpenRechargeSubject,
    ) -> OpenRechargeFuture<'a, OpenRechargeCatalog>;

    fn create_order<'a>(
        &'a self,
        command: OpenRechargeOrderCommand,
    ) -> OpenRechargeFuture<'a, RechargeOrder>;

    fn retrieve_order<'a>(
        &'a self,
        subject: &'a OpenRechargeSubject,
        order_id: &'a str,
    ) -> OpenRechargeFuture<'a, Option<RechargeOrder>>;
}

type OpenRechargeStoreRef = Arc<dyn OpenRechargeStore>;
type OpenRechargeBalanceStore = Arc<dyn GatewayBalanceStore>;

struct OpenRechargeState<C> {
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    store: OpenRechargeStoreRef,
    balance_store: OpenRechargeBalanceStore,
}

impl<C> Clone for OpenRechargeState<C> {
    fn clone(&self) -> Self {
        Self {
            catalog: Arc::clone(&self.catalog),
            api_key_hasher: Arc::clone(&self.api_key_hasher),
            store: Arc::clone(&self.store),
            balance_store: Arc::clone(&self.balance_store),
        }
    }
}

/// Mounts the API-key relay recharge routes.
pub fn open_recharge_router<C>(
    catalog: Arc<C>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
    store: OpenRechargeStoreRef,
    balance_store: OpenRechargeBalanceStore,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    Router::new()
        .route("/v1/recharge/balance", get(retrieve_balance))
        .route("/v1/recharge/options", get(list_options))
        .route("/v1/recharge/orders", axum::routing::post(create_order))
        .route("/v1/recharge/orders/{order_id}", get(retrieve_order))
        .with_state(OpenRechargeState {
            catalog,
            api_key_hasher,
            store,
            balance_store,
        })
}

#[derive(Debug, Serialize)]
struct Envelope<T> {
    code: i32,
    data: T,
    #[serde(rename = "traceId")]
    trace_id: String,
}

fn success<T: Serialize>(status: StatusCode, data: T) -> Response {
    let trace_id = uuid();
    let mut response = (
        status,
        Json(Envelope {
            code: 0,
            data,
            trace_id: trace_id.clone(),
        }),
    )
        .into_response();
    attach_trace_id(&mut response, &trace_id);
    response
}

fn problem(status: StatusCode, code: SdkWorkResultCode, title: &str, detail: &str) -> Response {
    let trace_id = uuid();
    let body = serde_json::json!({
        "code": code.as_i32(),
        "status": status.as_u16(),
        "title": title,
        "detail": detail,
        "traceId": trace_id,
    });
    let mut response = (
        status,
        [(header::CONTENT_TYPE, "application/problem+json")],
        Json(body),
    )
        .into_response();
    attach_trace_id(&mut response, &trace_id);
    response
}

fn attach_trace_id(response: &mut Response, trace_id: &str) {
    if let Ok(value) = axum::http::HeaderValue::from_str(trace_id) {
        response.headers_mut().insert(
            axum::http::HeaderName::from_static("x-sdkwork-trace-id"),
            value,
        );
    }
}

fn authentication_error(status: StatusCode, detail: &str) -> Response {
    let code = if status == StatusCode::UNAUTHORIZED {
        SdkWorkResultCode::AuthenticationRequired
    } else {
        SdkWorkResultCode::PermissionRequired
    };
    problem(status, code, "Recharge authentication failed", detail)
}

fn authenticate<C>(
    state: &OpenRechargeState<C>,
    headers: &HeaderMap,
    uri: &Uri,
) -> Result<OpenRechargeSubject, Response>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let identity = ApiKeyIdentity::from_headers_and_uri(headers, uri).map_err(|error| {
        authentication_error(
            StatusCode::UNAUTHORIZED,
            &format!("missing or malformed api key: {error}"),
        )
    })?;
    let Some(credential_secret) = identity.credential_secret() else {
        return Err(authentication_error(
            StatusCode::UNAUTHORIZED,
            "missing api key credential",
        ));
    };
    let authenticator =
        ApiKeyAuthenticator::new(state.catalog.as_ref(), state.api_key_hasher.as_ref());
    let context = authenticator
        .authenticate(AuthenticateApiKeyQuery { credential_secret })
        .map_err(|_| authentication_error(StatusCode::UNAUTHORIZED, "invalid api key"))?;
    let organization_id =
        (context.organization_id > 0).then(|| context.organization_id.to_string());
    Ok(OpenRechargeSubject {
        tenant_id: context.tenant_id.to_string(),
        organization_id,
        user_id: context.user_id.to_string(),
        api_key_id: Some(context.api_key_id),
    })
}

async fn retrieve_balance<C>(
    State(state): State<OpenRechargeState<C>>,
    headers: HeaderMap,
    uri: Uri,
) -> Response
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let subject = match authenticate(&state, &headers, &uri) {
        Ok(subject) => subject,
        Err(response) => return response,
    };
    match state
        .balance_store
        .retrieve_token_bank_balance(
            subject.tenant_id.parse().unwrap_or_default(),
            subject
                .organization_id
                .as_deref()
                .and_then(|value| value.parse().ok())
                .unwrap_or_default(),
            subject.user_id.parse().unwrap_or_default(),
        )
        .await
    {
        Ok(balance) => success(
            StatusCode::OK,
            RechargeBalance {
                amount: balance.available,
                frozen: balance.frozen,
                unit: balance.unit,
                currency_code: None,
                checked_at: format_datetime(now(), None),
            },
        ),
        Err(message) => problem(
            StatusCode::INTERNAL_SERVER_ERROR,
            SdkWorkResultCode::InternalError,
            "Balance query failed",
            &message,
        ),
    }
}

async fn list_options<C>(
    State(state): State<OpenRechargeState<C>>,
    headers: HeaderMap,
    uri: Uri,
) -> Response
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let subject = match authenticate(&state, &headers, &uri) {
        Ok(subject) => subject,
        Err(response) => return response,
    };
    match state.store.list_catalog(&subject).await {
        Ok(catalog) => success(
            StatusCode::OK,
            RechargeOptions {
                items: catalog.items,
                currency_code: catalog.currency_code,
                points_unit: catalog.points_unit,
                custom_amount_supported: catalog.custom_amount_supported,
                min_amount: catalog.min_amount,
                max_amount: catalog.max_amount,
                agreement: catalog.agreement,
            },
        ),
        Err(error) => recharge_store_error(error),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CreateOrderBody {
    package_id: Option<String>,
    amount: Option<String>,
    payment_method: Option<String>,
    idempotency_key: Option<String>,
}

async fn create_order<C>(
    State(state): State<OpenRechargeState<C>>,
    headers: HeaderMap,
    uri: Uri,
    payload: Result<Json<CreateOrderBody>, JsonRejection>,
) -> Response
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let subject = match authenticate(&state, &headers, &uri) {
        Ok(subject) => subject,
        Err(response) => return response,
    };
    let Json(body) = match payload {
        Ok(payload) => payload,
        Err(rejection) => {
            return problem(
                StatusCode::BAD_REQUEST,
                SdkWorkResultCode::MalformedRequest,
                "Malformed recharge order request",
                &rejection.body_text(),
            )
        }
    };
    let request = RechargeOrderRequest {
        package_id: body.package_id,
        amount: body.amount,
        payment_method: body.payment_method,
        idempotency_key: idempotency_header(&headers).or(body.idempotency_key),
    };
    let request = match request.normalized() {
        Ok(request) => request,
        Err(error) => {
            return problem(
                StatusCode::UNPROCESSABLE_ENTITY,
                SdkWorkResultCode::InvalidParameter,
                "Invalid recharge order request",
                &error.to_string(),
            )
        }
    };
    match state
        .store
        .create_order(OpenRechargeOrderCommand {
            subject,
            package_id: request.package_id,
            amount: request.amount,
            payment_method: request.payment_method,
            idempotency_key: request.idempotency_key,
        })
        .await
    {
        Ok(order) => success(StatusCode::CREATED, order),
        Err(error) => recharge_store_error(error),
    }
}

async fn retrieve_order<C>(
    State(state): State<OpenRechargeState<C>>,
    headers: HeaderMap,
    uri: Uri,
    Path(order_id): Path<String>,
) -> Response
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let subject = match authenticate(&state, &headers, &uri) {
        Ok(subject) => subject,
        Err(response) => return response,
    };
    let order_id = order_id.trim();
    if order_id.is_empty() || order_id.len() > 128 {
        return problem(
            StatusCode::BAD_REQUEST,
            SdkWorkResultCode::InvalidParameter,
            "Invalid recharge order id",
            "order_id must be a non-empty string of at most 128 characters",
        );
    }
    match state.store.retrieve_order(&subject, order_id).await {
        Ok(Some(order)) => success(StatusCode::OK, order),
        Ok(None) => problem(
            StatusCode::NOT_FOUND,
            SdkWorkResultCode::NotFound,
            "Recharge order not found",
            "no recharge order with that id belongs to this API key",
        ),
        Err(error) => recharge_store_error(error),
    }
}

fn idempotency_header(headers: &HeaderMap) -> Option<String> {
    headers
        .get("idempotency-key")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty() && value.len() <= 128)
        .map(str::to_owned)
}

fn recharge_store_error(error: OpenRechargeStoreError) -> Response {
    let status = error.status();
    problem(
        status,
        error.result_code(),
        "Recharge request failed",
        &error.to_string(),
    )
}
