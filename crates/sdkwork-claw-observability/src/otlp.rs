//! OpenTelemetry trace-export configuration for Claw Router.
//!
//! Prometheus metrics are recorded by `sdkwork-web-framework` and
//! `sdkwork-claw-http`, then exposed on the serving process' existing
//! `GET /metrics` route. This module deliberately does not maintain a second
//! request collector or a separate metrics listener.

use serde::{Deserialize, Serialize};

/// OTLP exporter configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OtlpConfig {
    /// Enable OTLP tracing export.
    pub tracing_enabled: bool,
    /// OTLP collector endpoint.
    pub endpoint: String,
    /// Stable service name attached to traces.
    pub service_name: String,
    /// Trace sampling rate in the inclusive range 0.0..=1.0.
    pub sampling_rate: f64,
    /// Export timeout in seconds.
    pub export_timeout_secs: u64,
    /// Optional collector CA certificate path.
    pub certificate_path: Option<String>,
}

impl Default for OtlpConfig {
    fn default() -> Self {
        Self {
            tracing_enabled: false,
            endpoint: "http://localhost:4318".to_owned(),
            service_name: "sdkwork-clawrouter".to_owned(),
            sampling_rate: 1.0,
            export_timeout_secs: 30,
            certificate_path: None,
        }
    }
}

impl OtlpConfig {
    /// Loads trace-export settings from the standard OTEL process variables.
    pub fn from_env() -> Self {
        Self {
            tracing_enabled: std::env::var("OTEL_TRACING_ENABLED")
                .is_ok_and(|value| value.eq_ignore_ascii_case("true")),
            endpoint: nonempty_env("OTEL_EXPORTER_OTLP_ENDPOINT")
                .unwrap_or_else(|| Self::default().endpoint),
            service_name: nonempty_env("OTEL_SERVICE_NAME")
                .unwrap_or_else(|| Self::default().service_name),
            sampling_rate: nonempty_env("OTEL_TRACES_SAMPLER_ARG")
                .and_then(|value| value.parse().ok())
                .unwrap_or(1.0),
            export_timeout_secs: nonempty_env("OTEL_EXPORTER_TIMEOUT_SECS")
                .and_then(|value| value.parse().ok())
                .unwrap_or(30),
            certificate_path: nonempty_env("OTEL_EXPORTER_OTLP_CERTIFICATE"),
        }
    }
}

fn nonempty_env(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}
