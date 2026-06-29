use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};

use crate::api::app_sql_subject::{map_optional_app_sql_subject, ResolvedAppSqlScopedSubject};
use crate::api::response::PlusApiResult;
use crate::ports::{
    AppProviderItem, AppProvidersItems, AppProvidersReadFuture, AppProvidersReadStore,
    AppProvidersSubject,
};

#[derive(Clone)]
struct AppProvidersState {
    read_store: Arc<dyn AppProvidersReadStore + Send + Sync>,
    require_subject: bool,
}

struct EmptyAppProvidersReadStore;

impl AppProvidersReadStore for EmptyAppProvidersReadStore {
    fn load_providers<'a>(
        &'a self,
        _subject: Option<AppProvidersSubject>,
    ) -> AppProvidersReadFuture<'a, Vec<AppProviderItem>> {
        Box::pin(async { Ok(Vec::new()) })
    }
}

pub fn app_providers_router() -> Router {
    app_providers_router_with_state(Arc::new(EmptyAppProvidersReadStore), false)
}

pub fn app_providers_router_with_read_store(
    read_store: Arc<dyn AppProvidersReadStore + Send + Sync>,
) -> Router {
    app_providers_router_with_state(read_store, true)
}

fn app_providers_router_with_state(
    read_store: Arc<dyn AppProvidersReadStore + Send + Sync>,
    require_subject: bool,
) -> Router {
    Router::new()
        .route("/app/v3/api/ai/providers", get(fetch_providers))
        .with_state(AppProvidersState {
            read_store,
            require_subject,
        })
}

async fn fetch_providers(
    State(state): State<AppProvidersState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };

    match state.read_store.load_providers(subject).await {
        Ok(items) => Json(PlusApiResult::success(AppProvidersItems::new(items))).into_response(),
        Err(error) => app_providers_read_model_error(error),
    }
}

fn app_providers_read_model_error(error: impl std::fmt::Display) -> Response {
    PlusApiResult::error(
            "5000",
            format!("app providers read model is unavailable: {error}"),
        )).into_response()
}
