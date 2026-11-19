//! App-api surface that resolves a caller's effective generation asset delivery
//! policy from the storage center.
//!
//! The generation services call this once while creating a generation (the only
//! place a verified user context exists) and persist the resolved snapshot with
//! the generation. Background completion then applies the snapshot instead of
//! re-resolving with a deployment identity, which is why there is no internal
//! resolve surface: a deployment-level key cannot safely resolve another
//! tenant's policy.

use std::sync::Arc;

use axum::extract::rejection::QueryRejection;
use axum::extract::{Extension, Query, State};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use sdkwork_web_core::WebRequestContext;
use serde::Deserialize;

use crate::api::app_sql_subject::RequiredAppSqlScopedSubject;
use crate::api::command_error::system_error_response;
use crate::api::request_id::generate_server_request_id;
use crate::api::response::{json_success_response, validation_problem_for_context};
use crate::domain::DomainError;
use crate::ports::{AdminStorageStore, AdminStorageSubject, ResolveGenerationDeliveryQuery};

const MEDIA_KINDS: &[&str] = &["all", "audio", "image", "video"];
const MAX_TYPE_LEN: usize = 64;

type AppStorageDeliveryStore = Arc<dyn AdminStorageStore + Send + Sync>;

#[derive(Clone)]
struct AppStorageDeliveryState {
    store: Option<AppStorageDeliveryStore>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ResolveGenerationDeliveryRequest {
    media_kind: String,
    vendor_code: Option<String>,
}

pub fn app_storage_delivery_router() -> Router {
    app_storage_delivery_router_with_state(None)
}

pub fn app_storage_delivery_router_with_store(store: AppStorageDeliveryStore) -> Router {
    app_storage_delivery_router_with_state(Some(store))
}

fn app_storage_delivery_router_with_state(store: Option<AppStorageDeliveryStore>) -> Router {
    Router::new()
        .route(
            "/app/v3/api/storage/generation_delivery",
            get(resolve_generation_delivery),
        )
        .with_state(AppStorageDeliveryState { store })
}

async fn resolve_generation_delivery(
    State(state): State<AppStorageDeliveryState>,
    RequiredAppSqlScopedSubject(app_subject): RequiredAppSqlScopedSubject,
    request_context: Option<Extension<WebRequestContext>>,
    query: Result<Query<ResolveGenerationDeliveryRequest>, QueryRejection>,
) -> Response {
    let ctx = request_context.map(|context| context.0);
    let Query(query) = match query {
        Ok(query) => query,
        Err(_) => {
            return validation_problem_for_context(
                ctx.as_ref(),
                "mediaKind query parameter is invalid",
            )
            .into_response()
        }
    };
    let media_kind = query.media_kind.trim().to_ascii_lowercase();
    if media_kind.is_empty()
        || media_kind.len() > MAX_TYPE_LEN
        || !MEDIA_KINDS.contains(&media_kind.as_str())
    {
        return validation_problem_for_context(
            ctx.as_ref(),
            "mediaKind must be one of all, audio, image, video",
        )
        .into_response();
    }
    let vendor_code = query
        .vendor_code
        .map(|value| value.trim().to_ascii_lowercase())
        .filter(|value| !value.is_empty() && value.len() <= MAX_TYPE_LEN);
    let Some(store) = state.store.as_ref() else {
        return system_error_response(
            "storage delivery resolve is unavailable",
            DomainError::new("storage center database is not configured"),
        );
    };
    let request_id =
        generate_server_request_id().unwrap_or_else(|_| "storage-delivery-resolve".to_owned());
    match store
        .resolve_generation_delivery(ResolveGenerationDeliveryQuery {
            subject: AdminStorageSubject {
                tenant_id: app_subject.tenant_id,
                organization_id: app_subject.organization_id,
                operator_id: app_subject.user_id,
                operator_type: 1,
            },
            media_kind,
            user_id: Some(app_subject.user_id),
            vendor_code,
            request_id,
        })
        .await
    {
        Ok(record) => json_success_response(ctx.as_ref(), record),
        Err(error) => system_error_response("storage delivery resolve failed", error),
    }
}
