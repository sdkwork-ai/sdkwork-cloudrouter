use std::sync::atomic::{AtomicU64, Ordering};

use axum::http::{header, HeaderValue};
use axum::response::{IntoResponse, Response};

static HTTP_REQUESTS_TOTAL: AtomicU64 = AtomicU64::new(0);
static HTTP_REQUESTS_CLIENT_ERROR_TOTAL: AtomicU64 = AtomicU64::new(0);
static HTTP_REQUESTS_SERVER_ERROR_TOTAL: AtomicU64 = AtomicU64::new(0);
static HTTP_READINESS_CHECKS_TOTAL: AtomicU64 = AtomicU64::new(0);
static HTTP_READINESS_CHECKS_FAILED_TOTAL: AtomicU64 = AtomicU64::new(0);

pub fn record_http_request() {
    HTTP_REQUESTS_TOTAL.fetch_add(1, Ordering::Relaxed);
}

pub fn record_http_response_status(status: u16) {
    record_http_request();
    if (400..500).contains(&status) {
        HTTP_REQUESTS_CLIENT_ERROR_TOTAL.fetch_add(1, Ordering::Relaxed);
    } else if status >= 500 {
        HTTP_REQUESTS_SERVER_ERROR_TOTAL.fetch_add(1, Ordering::Relaxed);
    }
}

pub fn record_readiness_check(success: bool) {
    HTTP_READINESS_CHECKS_TOTAL.fetch_add(1, Ordering::Relaxed);
    if !success {
        HTTP_READINESS_CHECKS_FAILED_TOTAL.fetch_add(1, Ordering::Relaxed);
    }
}

pub async fn metrics() -> Response {
    let body = format!(
        "# HELP http_requests_total Total HTTP requests served by sdkwork-claw-http services.\n\
         # TYPE http_requests_total counter\n\
         http_requests_total {}\n\
         # HELP http_requests_client_error_total Total HTTP 4xx responses served by sdkwork-claw-http services.\n\
         # TYPE http_requests_client_error_total counter\n\
         http_requests_client_error_total {}\n\
         # HELP http_requests_server_error_total Total HTTP 5xx responses served by sdkwork-claw-http services.\n\
         # TYPE http_requests_server_error_total counter\n\
         http_requests_server_error_total {}\n\
         # HELP http_readiness_checks_total Total readiness probe evaluations.\n\
         # TYPE http_readiness_checks_total counter\n\
         http_readiness_checks_total {}\n\
         # HELP http_readiness_checks_failed_total Total failed readiness probe evaluations.\n\
         # TYPE http_readiness_checks_failed_total counter\n\
         http_readiness_checks_failed_total {}\n",
        HTTP_REQUESTS_TOTAL.load(Ordering::Relaxed),
        HTTP_REQUESTS_CLIENT_ERROR_TOTAL.load(Ordering::Relaxed),
        HTTP_REQUESTS_SERVER_ERROR_TOTAL.load(Ordering::Relaxed),
        HTTP_READINESS_CHECKS_TOTAL.load(Ordering::Relaxed),
        HTTP_READINESS_CHECKS_FAILED_TOTAL.load(Ordering::Relaxed),
    );
    (
        [(
            header::CONTENT_TYPE,
            HeaderValue::from_static("text/plain; version=0.0.4"),
        )],
        body,
    )
        .into_response()
}
