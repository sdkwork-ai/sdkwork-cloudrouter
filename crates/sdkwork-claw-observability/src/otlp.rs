//! OpenTelemetry (OTLP) observability configuration for Claw Router.
//!
//! This module provides comprehensive observability support including:
//! - **Tracing**: Distributed tracing via OTLP exporter
//! - **Metrics**: Prometheus-compatible metrics with OTLP export
//! - **Logging**: Structured logging with trace context injection
//! - **Health Metrics**: SLO/SLI indicators for production monitoring
//!
//! # Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────────────┐
//! │                    Claw Router Application                       │
//! ├─────────────────────────────────────────────────────────────────┤
//! │  Tracing    │  Metrics   │  Logs       │  Health Checks         │
//! │  ────────   │  ───────   │  ─────      │  ──────────────        │
//! │  otlp       │  prom      │  structured │  /readyz               │
//! │  (spans)    │  (counters │  (JSON)     │  /healthz              │
//! │             │  gauges,   │             │                        │
//! │             │  histos)   │             │                        │
//! └─────────────┴───────────┴─────────────┴────────────────────────┘
//!         │              │              │              │
//!         ▼              ▼              ▼              ▼
//! ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
//! │  OTLP        │ │  Prometheus  │ │  Loki /      │ │  K8s         │
//! │  Collector   │ │  Scraper     │ │  ELK Stack   │ │  Liveness    │
//! └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
//!         │              │              │              │
//!         ▼              ▼              ▼              ▼
//! ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
//! │  Jaeger /    │ │  Grafana     │ │  Grafana     │ │  Alertmanager│
//! │  Tempo       │ │  (Metrics)   │ │  (Logs)      │ │  (Alerts)    │
//! └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
//! ```
//!
//! # SLO/SLI Definition
//!
//! | SLO Target | SLI Metric | Threshold | Measurement Window |
//! |------------|------------|-----------|-------------------|
//! | Availability | Request Success Rate | ≥ 99.9% | Rolling 30d |
//! | Latency | p95 Response Time | < 50ms | Rolling 1h |
//! | Latency | p99 Response Time | < 100ms | Rolling 1h |
//! | Throughput | Requests per Second | > 1000 RPS | Rolling 5m |
//!
//! # Environment Variables
//!
//! | Variable | Description | Default |
//! |----------|-------------|--------|
//! | `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | `http://localhost:4317` |
//! | `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | OTLP traces endpoint | `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces` |
//! | `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | OTLP metrics endpoint | `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics` |
//! | `OTEL_SERVICE_NAME` | Service name for tracing | `sdkwork-clawrouter` |
//! | `METRICS_PORT` | Prometheus metrics endpoint port | `9090` |

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

/// OTLP exporter configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OtlpConfig {
    /// Enable OTLP tracing export.
    pub tracing_enabled: bool,
    /// Enable OTLP metrics export.
    pub metrics_enabled: bool,
    /// OTLP collector endpoint (gRPC).
    pub endpoint: String,
    /// Service name for traces.
    pub service_name: String,
    /// Trace sampling rate (0.0 - 1.0).
    pub sampling_rate: f64,
    /// Export timeout in seconds.
    pub export_timeout_secs: u64,
    /// Certificate path for TLS (optional).
    pub certificate_path: Option<String>,
}

impl Default for OtlpConfig {
    fn default() -> Self {
        Self {
            tracing_enabled: false,
            metrics_enabled: true,
            endpoint: "http://localhost:4317".to_string(),
            service_name: "sdkwork-clawrouter".to_string(),
            sampling_rate: 1.0,
            export_timeout_secs: 30,
            certificate_path: None,
        }
    }
}

impl OtlpConfig {
    /// Load OTLP configuration from environment variables.
    pub fn from_env() -> Self {
        ObservabilityConfig::from_env().otlp
    }
}

/// Prometheus metrics configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsConfig {
    /// Enable Prometheus metrics endpoint.
    pub enabled: bool,
    /// Port for metrics endpoint.
    pub port: u16,
    /// Path for metrics endpoint.
    pub path: String,
    /// Include default runtime metrics.
    pub include_runtime_metrics: bool,
    /// Histogram buckets for latency (in seconds).
    pub latency_buckets: Vec<f64>,
    /// Histogram buckets for request size (in bytes).
    pub request_size_buckets: Vec<f64>,
    /// Histogram buckets for response size (in bytes).
    pub response_size_buckets: Vec<f64>,
}

impl Default for MetricsConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            port: 9090,
            path: "/metrics".to_string(),
            include_runtime_metrics: true,
            latency_buckets: vec![
                0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
            ],
            request_size_buckets: vec![
                100.0, 500.0, 1000.0, 5000.0, 10000.0, 50000.0, 100000.0, 500000.0, 1000000.0,
            ],
            response_size_buckets: vec![
                100.0, 500.0, 1000.0, 5000.0, 10000.0, 50000.0, 100000.0, 500000.0, 1000000.0,
            ],
        }
    }
}

/// SLO/SLI configuration for alerting.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SloConfig {
    /// Availability SLO target (e.g., 99.9 for 99.9%).
    pub availability_target: f64,
    /// Latency SLO target for p95 (in milliseconds).
    pub latency_p95_target_ms: u64,
    /// Latency SLO target for p99 (in milliseconds).
    pub latency_p99_target_ms: u64,
    /// Throughput SLO target (requests per second).
    pub throughput_target: u64,
    /// Error budget policy (burn rate alerting).
    pub error_budget_burn_rate: ErrorBudgetBurnRate,
}

impl Default for SloConfig {
    fn default() -> Self {
        Self {
            availability_target: 99.9,
            latency_p95_target_ms: 50,
            latency_p99_target_ms: 100,
            throughput_target: 1000,
            error_budget_burn_rate: ErrorBudgetBurnRate::default(),
        }
    }
}

/// Error budget burn rate configuration for multi-window alerting.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorBudgetBurnRate {
    /// Fast burn rate (1h window) - triggers quickly.
    pub fast: BurnRateThreshold,
    /// Medium burn rate (6h window).
    pub medium: BurnRateThreshold,
    /// Slow burn rate (3d window) - catches sustained issues.
    pub slow: BurnRateThreshold,
}

impl Default for ErrorBudgetBurnRate {
    fn default() -> Self {
        Self {
            fast: BurnRateThreshold {
                multiplier: 14.4, // Burns 1% in 1 hour
                window_hours: 1,
                severity: "critical".to_string(),
            },
            medium: BurnRateThreshold {
                multiplier: 6.0, // Burns 1% in 6 hours
                window_hours: 6,
                severity: "warning".to_string(),
            },
            slow: BurnRateThreshold {
                multiplier: 1.0, // Burns 1% in 3 days
                window_hours: 72,
                severity: "warning".to_string(),
            },
        }
    }
}

/// Single burn rate threshold for alerting.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BurnRateThreshold {
    /// Burn rate multiplier.
    pub multiplier: f64,
    /// Time window in hours.
    pub window_hours: u32,
    /// Alert severity.
    pub severity: String,
}

/// Complete observability configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObservabilityConfig {
    /// OTLP tracing and metrics export.
    pub otlp: OtlpConfig,
    /// Prometheus metrics endpoint.
    pub metrics: MetricsConfig,
    /// SLO/SLI definitions for alerting.
    pub slo: SloConfig,
}

impl Default for ObservabilityConfig {
    fn default() -> Self {
        Self {
            otlp: OtlpConfig::default(),
            metrics: MetricsConfig::default(),
            slo: SloConfig::default(),
        }
    }
}

impl ObservabilityConfig {
    /// Load configuration from environment variables.
    pub fn from_env() -> Self {
        Self {
            otlp: OtlpConfig {
                tracing_enabled: std::env::var("OTEL_TRACING_ENABLED")
                    .map(|v| v == "true")
                    .unwrap_or(false),
                metrics_enabled: std::env::var("OTEL_METRICS_ENABLED")
                    .map(|v| v == "true")
                    .unwrap_or(true),
                endpoint: std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT")
                    .unwrap_or_else(|_| "http://localhost:4317".to_string()),
                service_name: std::env::var("OTEL_SERVICE_NAME")
                    .unwrap_or_else(|_| "sdkwork-clawrouter".to_string()),
                sampling_rate: std::env::var("OTEL_TRACES_SAMPLER_ARG")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(1.0),
                export_timeout_secs: std::env::var("OTEL_EXPORTER_TIMEOUT_SECS")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(30),
                certificate_path: std::env::var("OTEL_EXPORTER_OTLP_CERTIFICATE").ok(),
            },
            metrics: MetricsConfig {
                enabled: std::env::var("METRICS_ENABLED")
                    .map(|v| v == "true")
                    .unwrap_or(true),
                port: std::env::var("METRICS_PORT")
                    .ok()
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(9090),
                path: std::env::var("METRICS_PATH").unwrap_or_else(|_| "/metrics".to_string()),
                include_runtime_metrics: std::env::var("METRICS_INCLUDE_RUNTIME")
                    .map(|v| v == "true")
                    .unwrap_or(true),
                latency_buckets: vec![
                    0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
                ],
                request_size_buckets: vec![
                    100.0, 500.0, 1000.0, 5000.0, 10000.0, 50000.0, 100000.0, 500000.0, 1000000.0,
                ],
                response_size_buckets: vec![
                    100.0, 500.0, 1000.0, 5000.0, 10000.0, 50000.0, 100000.0, 500000.0, 1000000.0,
                ],
            },
            slo: SloConfig::default(),
        }
    }
}

/// SLO/SLI metrics for Claw Router.
#[derive(Debug, Clone)]
pub struct SloMetrics {
    /// Total requests counter.
    pub total_requests: u64,
    /// Successful requests counter.
    pub successful_requests: u64,
    /// Failed requests counter.
    pub failed_requests: u64,
    /// Request duration histogram (in microseconds).
    pub request_duration_us: Vec<f64>,
    /// p95 latency tracking.
    pub p95_latency_ms: f64,
    /// p99 latency tracking.
    pub p99_latency_ms: f64,
    /// Current RPS.
    pub current_rps: f64,
    /// Last update timestamp.
    pub last_updated: std::time::SystemTime,
}

impl Default for SloMetrics {
    fn default() -> Self {
        Self {
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            request_duration_us: Vec::new(),
            p95_latency_ms: 0.0,
            p99_latency_ms: 0.0,
            current_rps: 0.0,
            last_updated: std::time::SystemTime::now(),
        }
    }
}

/// SLO/SLI health indicator.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SloHealthStatus {
    /// All SLOs are healthy.
    Healthy,
    /// Some SLOs are at risk.
    AtRisk,
    /// Critical SLO breach.
    Critical,
    /// No data available.
    NoData,
}

impl SloMetrics {
    /// Calculate current availability percentage.
    pub fn availability(&self) -> f64 {
        let total = self.successful_requests + self.failed_requests;
        if total == 0 {
            return 100.0;
        }
        (self.successful_requests as f64 / total as f64) * 100.0
    }

    /// Check if availability SLO is met.
    pub fn is_availability_slo_met(&self, target: f64) -> bool {
        self.availability() >= target
    }

    /// Check if latency SLO is met.
    pub fn is_latency_slo_met(&self, p95_target_ms: u64, p99_target_ms: u64) -> bool {
        self.p95_latency_ms <= p95_target_ms as f64 && self.p99_latency_ms <= p99_target_ms as f64
    }

    /// Get overall SLO health status.
    pub fn health_status(&self, config: &SloConfig) -> SloHealthStatus {
        let availability_ok = self.is_availability_slo_met(config.availability_target);
        let latency_ok =
            self.is_latency_slo_met(config.latency_p95_target_ms, config.latency_p99_target_ms);

        let availability_critical_threshold = config.availability_target * 0.95;
        let latency_critical_p95 = config.latency_p95_target_ms as f64 * 1.5;
        let latency_critical_p99 = config.latency_p99_target_ms as f64 * 1.5;
        let latency_critical = self.p95_latency_ms > latency_critical_p95
            || self.p99_latency_ms > latency_critical_p99;

        if availability_ok && latency_ok {
            SloHealthStatus::Healthy
        } else if (!availability_ok && self.availability() < availability_critical_threshold)
            || latency_critical
        {
            SloHealthStatus::Critical
        } else {
            SloHealthStatus::AtRisk
        }
    }
}

/// Metrics collector for SLO tracking.
pub struct SloMetricsCollector {
    metrics: Arc<RwLock<SloMetrics>>,
    window_start: std::time::Instant,
}

impl SloMetricsCollector {
    /// Create a new metrics collector.
    pub fn new() -> Self {
        Self {
            metrics: Arc::new(RwLock::new(SloMetrics::default())),
            window_start: std::time::Instant::now(),
        }
    }

    /// Record a successful request.
    pub async fn record_success(&self, duration_us: u64) {
        let mut m = self.metrics.write().await;
        m.total_requests += 1;
        m.successful_requests += 1;
        m.request_duration_us.push(duration_us as f64);
        self.update_percentiles(&mut m);
        m.last_updated = std::time::SystemTime::now();
    }

    /// Record a failed request.
    pub async fn record_failure(&self, duration_us: u64) {
        let mut m = self.metrics.write().await;
        m.total_requests += 1;
        m.failed_requests += 1;
        m.request_duration_us.push(duration_us as f64);
        self.update_percentiles(&mut m);
        m.last_updated = std::time::SystemTime::now();
    }

    /// Update current RPS.
    pub async fn update_rps(&self, rps: f64) {
        let mut m = self.metrics.write().await;
        m.current_rps = rps;
    }

    /// Get current metrics snapshot.
    pub async fn get_metrics(&self) -> SloMetrics {
        self.metrics.read().await.clone()
    }

    /// Calculate percentiles from duration samples.
    fn update_percentiles(&self, metrics: &mut SloMetrics) {
        if metrics.request_duration_us.len() < 2 {
            return;
        }

        let mut sorted = metrics.request_duration_us.clone();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());

        let len = sorted.len();
        metrics.p95_latency_ms = sorted[(len as f64 * 0.95) as usize] / 1000.0;
        metrics.p99_latency_ms = sorted[(len as f64 * 0.99) as usize] / 1000.0;

        // Keep only last 10000 samples to prevent memory growth
        if metrics.request_duration_us.len() > 10000 {
            let drain_count = metrics.request_duration_us.len() - 10000;
            metrics.request_duration_us.drain(0..drain_count);
        }
    }
}

impl Default for SloMetricsCollector {
    fn default() -> Self {
        Self::new()
    }
}

use std::sync::OnceLock;
static SLO_COLLECTOR: OnceLock<SloMetricsCollector> = OnceLock::new();

/// Get the global SLO metrics collector singleton.
///
/// This provides a shared instance for recording and querying SLO metrics
/// across the entire application. The collector is created lazily on first access.
pub fn slo_metrics_collector() -> &'static SloMetricsCollector {
    SLO_COLLECTOR.get_or_init(|| SloMetricsCollector::new())
}

/// Generate Prometheus exposition format for SLO metrics.
pub fn prometheus_exposition_format(metrics: &SloMetrics) -> String {
    let mut output = String::new();

    // SLO metrics
    output.push_str("# HELP clawrouter_slo_availability_current Current availability percentage\n");
    output.push_str("# TYPE clawrouter_slo_availability_current gauge\n");
    output.push_str(&format!(
        "clawrouter_slo_availability_current {:.6}\n",
        metrics.availability()
    ));

    output.push_str("# HELP clawrouter_slo_latency_p95_seconds p95 request latency\n");
    output.push_str("# TYPE clawrouter_slo_latency_p95_seconds gauge\n");
    output.push_str(&format!(
        "clawrouter_slo_latency_p95_seconds {:.6}\n",
        metrics.p95_latency_ms / 1000.0
    ));

    output.push_str("# HELP clawrouter_slo_latency_p99_seconds p99 request latency\n");
    output.push_str("# TYPE clawrouter_slo_latency_p99_seconds gauge\n");
    output.push_str(&format!(
        "clawrouter_slo_latency_p99_seconds {:.6}\n",
        metrics.p99_latency_ms / 1000.0
    ));

    output.push_str("# HELP clawrouter_slo_throughput_rps Current requests per second\n");
    output.push_str("# TYPE clawrouter_slo_throughput_rps gauge\n");
    output.push_str(&format!(
        "clawrouter_slo_throughput_rps {:.2}\n",
        metrics.current_rps
    ));

    output.push_str("# HELP clawrouter_requests_total Total number of requests\n");
    output.push_str("# TYPE clawrouter_requests_total counter\n");
    output.push_str(&format!(
        "clawrouter_requests_total{{status=\"success\"}} {}\n",
        metrics.successful_requests
    ));
    output.push_str(&format!(
        "clawrouter_requests_total{{status=\"failure\"}} {}\n",
        metrics.failed_requests
    ));

    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_slo_availability_calculation() {
        let collector = SloMetricsCollector::new();

        // Record 100 successful requests
        for _ in 0..100 {
            collector.record_success(5000).await;
        }

        let metrics = collector.get_metrics().await;
        assert!((metrics.availability() - 100.0).abs() < 0.001);
    }

    #[tokio::test]
    async fn test_slo_availability_with_failures() {
        let collector = SloMetricsCollector::new();

        // Record 90 successful, 10 failed
        for _ in 0..90 {
            collector.record_success(5000).await;
        }
        for _ in 0..10 {
            collector.record_failure(5000).await;
        }

        let metrics = collector.get_metrics().await;
        assert!((metrics.availability() - 90.0).abs() < 0.001);
    }

    #[tokio::test]
    async fn test_health_status_healthy() {
        let collector = SloMetricsCollector::new();

        for _ in 0..100 {
            collector.record_success(30000).await; // 30ms = well under 50ms target
        }

        let metrics = collector.get_metrics().await;
        let config = SloConfig::default();
        assert_eq!(metrics.health_status(&config), SloHealthStatus::Healthy);
    }

    #[tokio::test]
    async fn test_health_status_at_risk() {
        let collector = SloMetricsCollector::new();

        // Record 95 successful, 5 failed (95% availability, target is 99.9%)
        for _ in 0..95 {
            collector.record_success(30000).await;
        }
        for _ in 0..5 {
            collector.record_failure(30000).await;
        }

        let metrics = collector.get_metrics().await;
        let config = SloConfig::default();
        assert_eq!(metrics.health_status(&config), SloHealthStatus::AtRisk);
    }

    #[test]
    fn test_prometheus_exposition_format() {
        let mut metrics = SloMetrics::default();
        metrics.successful_requests = 100;
        metrics.failed_requests = 5;
        metrics.p95_latency_ms = 45.5;
        metrics.p99_latency_ms = 89.2;
        metrics.current_rps = 1250.5;

        let output = prometheus_exposition_format(&metrics);
        assert!(output.contains("clawrouter_slo_availability_current 95.238095"));
        assert!(output.contains("clawrouter_slo_latency_p95_seconds 0.045500"));
        assert!(output.contains("clawrouter_requests_total{status=\"success\"} 100"));
    }

    #[test]
    fn test_config_from_env() {
        std::env::set_var(
            "OTEL_EXPORTER_OTLP_ENDPOINT",
            "https://otel.example.com:4317",
        );
        std::env::set_var("METRICS_PORT", "9091");

        let config = ObservabilityConfig::from_env();
        assert_eq!(config.otlp.endpoint, "https://otel.example.com:4317");
        assert_eq!(config.metrics.port, 9091);
    }
}
