use std::sync::{Arc, OnceLock};
use std::time::Instant;

use axum::extract::{MatchedPath, Request};
use axum::http::{header, HeaderValue, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use prometheus::{IntCounterVec, TextEncoder};
use sdkwork_claw_config::{DeploymentRuntime, RuntimeTomlConfig};
use sdkwork_web_core::{HttpMetricsDimensions, HttpMetricsRegistry, HttpRequestLabels};
use sha2::{Digest, Sha256};

struct HttpMetrics {
    readiness_checks_total: IntCounterVec,
}

static HTTP_METRICS: OnceLock<Option<HttpMetrics>> = OnceLock::new();
static SHARED_HTTP_METRICS: OnceLock<Arc<HttpMetricsRegistry>> = OnceLock::new();

fn http_metrics() -> Option<&'static HttpMetrics> {
    HTTP_METRICS
        .get_or_init(|| {
            let readiness_checks_total = IntCounterVec::new(
                prometheus::Opts::new(
                    "sdkwork_http_readiness_checks_total",
                    "Total HTTP readiness evaluations by normalized result.",
                ),
                &[
                    "service",
                    "environment",
                    "deployment_profile",
                    "runtime_target",
                    "runtime_profile",
                    "result",
                ],
            )
            .map_err(|e| tracing::error!(error = %e, "failed to construct sdkwork_http_readiness_checks_total"))
            .ok()?;

            let registry = prometheus::default_registry();
            let _ = registry.register(Box::new(readiness_checks_total.clone()));

            Some(HttpMetrics {
                readiness_checks_total,
            })
        })
        .as_ref()
}

pub fn shared_http_metrics_registry() -> Arc<HttpMetricsRegistry> {
    SHARED_HTTP_METRICS
        .get_or_init(HttpMetricsRegistry::new)
        .clone()
}

pub fn configure_http_metrics_for_runtime(
    service_name: &str,
    runtime_toml: Option<&RuntimeTomlConfig>,
    runtime_profile: Option<&str>,
) -> Result<Arc<HttpMetricsRegistry>, String> {
    let service_name = service_name.trim();
    if service_name.is_empty() {
        return Err("HTTP metrics service name must not be blank".to_owned());
    }
    let runtime = DeploymentRuntime::resolve(runtime_toml)?;
    let dimensions = HttpMetricsDimensions {
        service: service_name.to_owned(),
        environment: metrics_environment(runtime_toml)?,
        deployment_profile: runtime.profile.as_str().to_owned(),
        runtime_target: runtime.target.as_str().to_owned(),
        runtime_profile: runtime_profile
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or_default()
            .to_owned(),
    };
    let metrics = shared_http_metrics_registry();
    metrics.set_dimensions(dimensions);
    Ok(metrics)
}

fn metrics_environment(runtime_toml: Option<&RuntimeTomlConfig>) -> Result<String, String> {
    let value = std::env::var("SDKWORK_CLAW_ROUTER_ENVIRONMENT")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| runtime_toml.and_then(|config| config.install.environment.clone()));
    match value
        .as_deref()
        .unwrap_or("production")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "dev" | "development" => Ok("development".to_owned()),
        "test" | "testing" => Ok("test".to_owned()),
        "staging" => Ok("staging".to_owned()),
        "prod" | "production" => Ok("production".to_owned()),
        other => Err(format!(
            "HTTP metrics environment must be development, test, staging, or production, got `{other}`"
        )),
    }
}

pub async fn metrics_middleware(request: Request, next: Next) -> Response {
    let path = request.uri().path().to_owned();
    let should_record = HttpMetricsRegistry::should_record_path(&path);
    let framework_records_request = request
        .extensions()
        .get::<sdkwork_web_core::WebRequestContext>()
        .is_some();
    let labels = (should_record && !framework_records_request).then(|| HttpRequestLabels {
        dimensions: shared_http_metrics_registry().dimensions(),
        api_surface: api_surface_for_path(&path).to_owned(),
        route: request
            .extensions()
            .get::<MatchedPath>()
            .map(|matched| matched.as_str().to_owned())
            .unwrap_or_else(|| "unmatched".to_owned()),
        method: request.method().as_str().to_owned(),
        status: 0,
        operation_id: None,
        backend_layer: "router".to_owned(),
    });
    let start = Instant::now();
    let response = next.run(request).await;
    if let Some(mut labels) = labels {
        labels.status = response.status().as_u16();
        shared_http_metrics_registry().record_request_with_duration(&labels, start.elapsed());
    }
    response
}

fn api_surface_for_path(path: &str) -> &'static str {
    if path.starts_with("/app/") {
        "app-api"
    } else if path.starts_with("/backend/") {
        "backend-api"
    } else if path.starts_with("/v1/")
        || path.starts_with("/anthropic/")
        || path.starts_with("/google/")
    {
        "open-api"
    } else {
        "internal-api"
    }
}

pub fn record_readiness_check(success: bool) {
    if let Some(metrics) = http_metrics() {
        let dimensions = shared_http_metrics_registry().dimensions();
        let runtime_profile = if dimensions.runtime_profile.is_empty() {
            "-"
        } else {
            dimensions.runtime_profile.as_str()
        };
        metrics
            .readiness_checks_total
            .with_label_values(&[
                &dimensions.service,
                &dimensions.environment,
                &dimensions.deployment_profile,
                &dimensions.runtime_target,
                runtime_profile,
                if success { "ready" } else { "not_ready" },
            ])
            .inc();
    }
}

fn metrics_bearer_authorized(request: &Request) -> bool {
    let Some(expected) = std::env::var("SDKWORK_CLAW_METRICS_BEARER_TOKEN")
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
    else {
        return true;
    };

    let provided = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .and_then(|value| value.strip_prefix("Bearer "))
        .map(str::trim)
        .unwrap_or_default();

    bearer_token_matches(&expected, provided)
}

fn bearer_token_matches(expected: &str, provided: &str) -> bool {
    let expected_digest = Sha256::digest(expected.as_bytes());
    let provided_digest = Sha256::digest(provided.as_bytes());
    expected_digest
        .iter()
        .zip(provided_digest.iter())
        .fold(0_u8, |difference, (left, right)| {
            difference | (left ^ right)
        })
        == 0
}

pub async fn metrics(request: Request) -> Response {
    if !metrics_bearer_authorized(&request) {
        return StatusCode::UNAUTHORIZED.into_response();
    }

    let encoder = TextEncoder::new();
    let metric_families = prometheus::default_registry().gather();
    let mut body = encoder
        .encode_to_string(&metric_families)
        .unwrap_or_default();
    if !body.is_empty() && !body.ends_with('\n') {
        body.push('\n');
    }
    body.push_str(&shared_http_metrics_registry().render_prometheus());
    (
        [(
            header::CONTENT_TYPE,
            HeaderValue::from_static("text/plain; version=0.0.4; charset=utf-8"),
        )],
        body,
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::{api_surface_for_path, bearer_token_matches, metrics_environment};
    use sdkwork_claw_config::RuntimeTomlConfig;

    #[test]
    fn classifies_canonical_api_surfaces_without_dynamic_labels() {
        assert_eq!("app-api", api_surface_for_path("/app/v3/api/users"));
        assert_eq!("backend-api", api_surface_for_path("/backend/v3/api/users"));
        assert_eq!("open-api", api_surface_for_path("/v1/chat/completions"));
        assert_eq!("internal-api", api_surface_for_path("/readyz"));
    }

    #[test]
    fn runtime_toml_environment_is_normalized() {
        let mut config = RuntimeTomlConfig::default();
        config.install.environment = Some("staging".to_owned());
        if std::env::var("SDKWORK_CLAW_ROUTER_ENVIRONMENT").is_ok() {
            return;
        }
        assert_eq!("staging", metrics_environment(Some(&config)).unwrap());
    }

    #[test]
    fn metrics_bearer_comparison_rejects_near_matches() {
        assert!(bearer_token_matches("metrics-secret", "metrics-secret"));
        assert!(!bearer_token_matches("metrics-secret", "metrics-secreu"));
        assert!(!bearer_token_matches(
            "metrics-secret",
            "metrics-secret-extra"
        ));
    }
}
