use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde_json::json;
use sqlx::{PgPool, SqlitePool};

#[derive(Clone)]
enum CommerceHealthDb {
    Sqlite(SqlitePool),
    Postgres(PgPool),
}

impl CommerceHealthDb {
    async fn ping(&self) -> Result<(), String> {
        match self {
            Self::Sqlite(pool) => sqlx::query("SELECT 1")
                .execute(pool)
                .await
                .map(|_| ())
                .map_err(|error| error.to_string()),
            Self::Postgres(pool) => sqlx::query("SELECT 1")
                .execute(pool)
                .await
                .map(|_| ())
                .map_err(|error| error.to_string()),
        }
    }
}

#[derive(Clone)]
struct CommerceHealthState {
    db: CommerceHealthDb,
}

pub fn commerce_health_router() -> Router {
    Router::new()
        .route("/health", get(health_check))
        .route("/ready", get(ready_unconfigured))
}

pub fn commerce_health_router_with_sqlite_pool(pool: SqlitePool) -> Router {
    Router::new()
        .route("/health", get(health_check))
        .route("/ready", get(ready_with_db))
        .with_state(CommerceHealthState {
            db: CommerceHealthDb::Sqlite(pool),
        })
}

pub fn commerce_health_router_with_postgres_pool(pool: PgPool) -> Router {
    Router::new()
        .route("/health", get(health_check))
        .route("/ready", get(ready_with_db))
        .with_state(CommerceHealthState {
            db: CommerceHealthDb::Postgres(pool),
        })
}

async fn health_check() -> Response {
    (
        StatusCode::OK,
        Json(json!({
            "status": "ok",
            "service": "sdkwork-commerce"
        })),
    )
        .into_response()
}

async fn ready_unconfigured() -> Response {
    (
        StatusCode::SERVICE_UNAVAILABLE,
        Json(json!({
            "status": "not_ready",
            "service": "sdkwork-commerce",
            "detail": "database readiness probe is not configured"
        })),
    )
        .into_response()
}

async fn ready_with_db(State(state): State<CommerceHealthState>) -> Response {
    match state.db.ping().await {
        Ok(()) => (
            StatusCode::OK,
            Json(json!({
                "status": "ready",
                "service": "sdkwork-commerce"
            })),
        )
            .into_response(),
        Err(detail) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "status": "not_ready",
                "service": "sdkwork-commerce",
                "detail": detail
            })),
        )
            .into_response(),
    }
}

#[cfg(test)]
mod tests {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    use super::commerce_health_router;
    use crate::test_http::commerce_migrated_sqlite_pool;

    #[tokio::test]
    async fn health_router_exposes_liveness_and_readiness() {
        let router = commerce_health_router();

        let health_response = router
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(StatusCode::OK, health_response.status());

        let ready_response = router
            .oneshot(
                Request::builder()
                    .uri("/ready")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(StatusCode::SERVICE_UNAVAILABLE, ready_response.status());
    }

    #[tokio::test]
    async fn health_router_with_pool_reports_ready_when_database_is_reachable() {
        let pool = commerce_migrated_sqlite_pool().await;
        let router = super::commerce_health_router_with_sqlite_pool(pool);

        let ready_response = router
            .oneshot(
                Request::builder()
                    .uri("/ready")
                    .body(Body::empty())
                    .expect("request"),
            )
            .await
            .expect("response");
        assert_eq!(StatusCode::OK, ready_response.status());
    }
}
