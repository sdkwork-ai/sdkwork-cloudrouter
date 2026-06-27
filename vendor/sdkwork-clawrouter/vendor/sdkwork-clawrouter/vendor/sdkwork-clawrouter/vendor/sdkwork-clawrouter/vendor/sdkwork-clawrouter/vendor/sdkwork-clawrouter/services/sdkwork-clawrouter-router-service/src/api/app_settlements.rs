use std::sync::Arc;

use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use crate::api::app_sql_subject::{map_optional_app_sql_subject, ResolvedAppSqlScopedSubject};
use crate::api::response::PlusApiResult;
use serde::Deserialize;
use crate::ports::{
    SettlementsDashboardQuery, SettlementsDashboardReadFuture, SettlementsDashboardReadStore,
    SettlementsDashboardSnapshot, SettlementsDashboardSubject,
};

const MIN_SETTLEMENTS_YEAR: i64 = 2000;
const MAX_SETTLEMENTS_YEAR: i64 = 2100;

#[derive(Clone)]
struct AppSettlementsDashboardState {
    read_store: Arc<dyn SettlementsDashboardReadStore + Send + Sync>,
    require_subject: bool,
}

#[derive(Debug, Deserialize)]
struct AppSettlementsDashboardQuery {
    year: Option<i64>,
}

struct ValidatedSettlementsDashboardQuery {
    query: SettlementsDashboardQuery,
}

struct SettlementsDashboardQueryValidationError {
    message: String,
}

impl SettlementsDashboardQueryValidationError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

struct EmptySettlementsDashboardReadStore;

impl SettlementsDashboardReadStore for EmptySettlementsDashboardReadStore {
    fn load_settlements_dashboard<'a>(
        &'a self,
        _query: SettlementsDashboardQuery,
        _subject: Option<SettlementsDashboardSubject>,
    ) -> SettlementsDashboardReadFuture<'a> {
        Box::pin(async { Ok(SettlementsDashboardSnapshot::default()) })
    }
}

pub fn app_settlements_dashboard_router() -> Router {
    app_settlements_dashboard_router_with_state(Arc::new(EmptySettlementsDashboardReadStore), false)
}

pub fn app_settlements_dashboard_router_with_read_store(
    read_store: Arc<dyn SettlementsDashboardReadStore + Send + Sync>,
) -> Router {
    app_settlements_dashboard_router_with_state(read_store, true)
}

fn app_settlements_dashboard_router_with_state(
    read_store: Arc<dyn SettlementsDashboardReadStore + Send + Sync>,
    require_subject: bool,
) -> Router {
    Router::new()
        .route(
            "/app/v3/api/router/settlements/dashboard",
            get(fetch_settlements_dashboard),
        )
        .route(
            "/app/v3/api/billing/settlements/dashboard",
            get(fetch_settlements_dashboard),
        )
        .with_state(AppSettlementsDashboardState {
            read_store,
            require_subject,
        })
}

async fn fetch_settlements_dashboard(
    State(state): State<AppSettlementsDashboardState>,
    ResolvedAppSqlScopedSubject(subject): ResolvedAppSqlScopedSubject,
    Query(query): Query<AppSettlementsDashboardQuery>,
) -> Response {
    let subject = match map_optional_app_sql_subject(subject, state.require_subject, |scoped| {
        scoped.into()
    }) {
        Ok(subject) => subject,
        Err(response) => return response,
    };

    let validated_query = match validate_settlements_dashboard_query(query) {
        Ok(validated_query) => validated_query,
        Err(error) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(PlusApiResult::error("4001", error.message)),
            )
                .into_response();
        }
    };

    match state
        .read_store
        .load_settlements_dashboard(validated_query.query, subject)
        .await
    {
        Ok(snapshot) => Json(PlusApiResult::success(snapshot)).into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(PlusApiResult::error(
                "5000",
                format!("settlements dashboard read model is unavailable: {error}"),
            )),
        )
            .into_response(),
    }
}

fn validate_settlements_dashboard_query(
    query: AppSettlementsDashboardQuery,
) -> Result<ValidatedSettlementsDashboardQuery, SettlementsDashboardQueryValidationError> {
    if let Some(year) = query.year {
        if !(MIN_SETTLEMENTS_YEAR..=MAX_SETTLEMENTS_YEAR).contains(&year) {
            return Err(SettlementsDashboardQueryValidationError::new(format!(
                "settlements year must be between {MIN_SETTLEMENTS_YEAR} and {MAX_SETTLEMENTS_YEAR}"
            )));
        }
    }

    Ok(ValidatedSettlementsDashboardQuery {
        query: SettlementsDashboardQuery { year: query.year },
    })
}
