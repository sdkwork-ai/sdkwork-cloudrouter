use std::sync::OnceLock;
use std::time::Instant;

use axum::extract::Request;
use axum::http::{header, HeaderValue};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use prometheus::{HistogramVec, IntCounter, IntCounterVec, TextEncoder};

/// Singleton HTTP metrics registered with the default Prometheus registry.
///
/// Uses labelled counter/histogram vectors for cardinality-rich observability:
/// - `http_requests_total{method,status}` — request count by HTTP method + status code
/// - `http_request_duration_seconds{method}` — latency histogram with standard
///   Prometheus buckets (5ms → 10s) for p50/p95/p99 computation
/// - `http_readiness_checks_total` / `http_readiness_checks_failed_total` —
///   unlabelled counters (readiness probe is a single endpoint)
struct HttpMetrics {
    requests_total: IntCounterVec,
    request_duration_seconds: HistogramVec,
    readiness_checks_total: IntCounter,
    readiness_checks_failed_total: IntCounter,
}

static HTTP_METRICS: OnceLock<Option<HttpMetrics>> = OnceLock::new();

fn http_metrics() -> Option<&'static HttpMetrics> {
    HTTP_METRICS
        .get_or_init(|| {
            let requests_total = IntCounterVec::new(
                prometheus::Opts::new(
                    "http_requests_total",
                    "Total HTTP requests served by sdkwork-claw-http services.",
                ),
                &["method", "status"],
            )
            .map_err(|e| tracing::error!(error = %e, "failed to construct http_requests_total"))
            .ok()?;

            let request_duration_seconds = HistogramVec::new(
                prometheus::HistogramOpts::new(
                    "http_request_duration_seconds",
                    "HTTP request latency in seconds.",
                )
                .buckets(vec![
                    0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
                ]),
                &["method"],
            )
            .map_err(|e| tracing::error!(error = %e, "failed to construct http_request_duration_seconds"))
            .ok()?;

            let readiness_checks_total = IntCounter::new(
                "http_readiness_checks_total",
                "Total readiness probe evaluations.",
            )
            .map_err(|e| tracing::error!(error = %e, "failed to construct http_readiness_checks_total"))
            .ok()?;

            let readiness_checks_failed_total = IntCounter::new(
                "http_readiness_checks_failed_total",
                "Total failed readiness probe evaluations.",
            )
            .map_err(|e| tracing::error!(error = %e, "failed to construct http_readiness_checks_failed_total"))
            .ok()?;

            let registry = prometheus::default_registry();
            let _ = registry.register(Box::new(requests_total.clone()));
            let _ = registry.register(Box::new(request_duration_seconds.clone()));
            let _ = registry.register(Box::new(readiness_checks_total.clone()));
            let _ = registry.register(Box::new(readiness_checks_failed_total.clone()));

            Some(HttpMetrics {
                requests_total,
                request_duration_seconds,
                readiness_checks_total,
                readiness_checks_failed_total,
            })
        })
        .as_ref()
}

/// Axum middleware that records per-request metrics with method + status labels.
///
/// Replaces the previous `TraceLayer::on_response` callback approach which only
/// had access to the response (no method). This middleware captures the method
/// from the request and the latency from a high-resolution timer, providing
/// proper p50/p95/p99 observability via histogram buckets.
pub async fn metrics_middleware(request: Request, next: Next) -> Response {
    let method = request.method().clone();
    let start = Instant::now();
    let response = next.run(request).await;
    let elapsed = start.elapsed().as_secs_f64();
    let status = response.status().as_u16().to_string();

    if let Some(metrics) = http_metrics() {
        metrics
            .requests_total
            .with_label_values(&[method.as_str(), &status])
            .inc();
        metrics
            .request_duration_seconds
            .with_label_values(&[method.as_str()])
            .observe(elapsed);
    }

    response
}

pub fn record_readiness_check(success: bool) {
    if let Some(metrics) = http_metrics() {
        metrics.readiness_checks_total.inc();
        if !success {
            metrics.readiness_checks_failed_total.inc();
        }
    }
}

pub async fn metrics() -> Response {
    let encoder = TextEncoder::new();
    let metric_families = prometheus::default_registry().gather();
    let body = encoder
        .encode_to_string(&metric_families)
        .unwrap_or_default();
    (
        [(
            header::CONTENT_TYPE,
            HeaderValue::from_static("text/plain; version=0.0.4; charset=utf-8"),
        )],
        body,
    )
        .into_response()
}
