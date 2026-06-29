use std::sync::Arc;
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};

use crate::api::response::PlusApiResult;
use crate::ports::{AdminDashboardQuery, AdminDashboardReadStore};

#[derive(Clone)]
struct AdminDashboardState {
    read_store: Arc<dyn AdminDashboardReadStore + Send + Sync>,
}

pub fn admin_dashboard_router_with_read_store(
    read_store: Arc<dyn AdminDashboardReadStore + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/system/dashboard/admin/overview",
            get(fetch_admin_dashboard_overview),
        )
        .with_state(AdminDashboardState { read_store })
}

async fn fetch_admin_dashboard_overview(
    State(state): State<AdminDashboardState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
) -> Response {
    let query = AdminDashboardQuery {
        subject: scoped.into(),
    };

    match state.read_store.load_dashboard(query).await {
        Ok(snapshot) => Json(PlusApiResult::success(snapshot)).into_response(),
        Err(error) => PlusApiResult::error(
                "5000",
                format!("admin dashboard read model is unavailable: {error}"),
            )).into_response(),
    }
}
