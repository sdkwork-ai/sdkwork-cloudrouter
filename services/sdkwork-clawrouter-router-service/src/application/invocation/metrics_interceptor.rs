use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Instant;

use prometheus::{HistogramVec, IntCounterVec, Opts};

use super::{
    Invocation, InvocationError, InvocationFuture, InvocationInterceptor, InvocationSurface,
};

/// Singleton Prometheus metrics shared across all pipeline instances.
struct MetricsState {
    invocation_total: IntCounterVec,
    invocation_duration_ms: HistogramVec,
    invocation_errors_total: IntCounterVec,
}

static METRICS_STATE: OnceLock<MetricsState> = OnceLock::new();

fn metrics_state() -> &'static MetricsState {
    METRICS_STATE.get_or_init(|| {
        let invocation_total = IntCounterVec::new(
            Opts::new(
                "clawrouter_invocation_total",
                "Total invocations processed by the gateway pipeline.",
            ),
            &["provider", "surface", "status_class"],
        )
        .expect("clawrouter_invocation_total metric construction must not fail");

        let invocation_duration_ms = HistogramVec::new(
            prometheus::HistogramOpts::new(
                "clawrouter_invocation_duration_ms",
                "End-to-end invocation latency in milliseconds.",
            )
            .buckets(vec![
                5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1_000.0, 2_500.0, 5_000.0, 10_000.0,
                30_000.0,
            ]),
            &["provider", "surface"],
        )
        .expect("clawrouter_invocation_duration_ms metric construction must not fail");

        let invocation_errors_total = IntCounterVec::new(
            Opts::new(
                "clawrouter_invocation_errors_total",
                "Total invocation errors by provider and error kind.",
            ),
            &["provider", "error_kind"],
        )
        .expect("clawrouter_invocation_errors_total metric construction must not fail");

        // Register with the default Prometheus registry.
        // Errors (already registered) are safe to ignore — the existing metric is reused.
        let _ = prometheus::register(Box::new(invocation_total.clone()));
        let _ = prometheus::register(Box::new(invocation_duration_ms.clone()));
        let _ = prometheus::register(Box::new(invocation_errors_total.clone()));

        MetricsState {
            invocation_total,
            invocation_duration_ms,
            invocation_errors_total,
        }
    })
}

/// Metrics interceptor — records Prometheus metrics for every invocation.
///
/// Placed at the very front of the pipeline so `before()` captures the true
/// request start time, and `after()` / `on_error()` capture the end-to-end
/// latency including all interceptor overhead.
#[derive(Clone)]
pub struct MetricsInterceptor {
    state: &'static MetricsState,
    start_times: Arc<Mutex<HashMap<String, Instant>>>,
}

impl MetricsInterceptor {
    pub fn new() -> Self {
        Self {
            state: metrics_state(),
            start_times: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn record_start(&self, request_id: &str) {
        let mut start_times = match self.start_times.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        start_times.insert(request_id.to_owned(), Instant::now());

        // Prevent unbounded growth: if the map exceeds 10k entries, drop the oldest 25%.
        if start_times.len() > 10_000 {
            let mut entries: Vec<(String, Instant)> =
                start_times.iter().map(|(k, v)| (k.clone(), *v)).collect();
            entries.sort_by_key(|(_, ts)| *ts);
            let drop_count = entries.len() / 4 + 1;
            for (key, _) in entries.into_iter().take(drop_count) {
                start_times.remove(&key);
            }
        }
    }

    fn take_start(&self, request_id: &str) -> Option<Instant> {
        let mut start_times = match self.start_times.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        start_times.remove(request_id)
    }

    fn provider_label(invocation: &Invocation) -> &str {
        invocation
            .routing
            .attempted_routes
            .last()
            .map(|attempt| attempt.supplier_code.as_str())
            .or_else(|| {
                invocation
                    .routing
                    .route_plan
                    .as_ref()
                    .and_then(|plan| plan.current_candidate())
                    .map(|candidate| candidate.supplier_code.as_str())
            })
            .unwrap_or("unknown")
    }

    fn surface_label(invocation: &Invocation) -> &'static str {
        match invocation.resource.surface {
            InvocationSurface::OpenAiCompatible => "openai_compatible",
            InvocationSurface::ProviderNative => "provider_native",
            InvocationSurface::CloudStorage => "cloud_storage",
            InvocationSurface::CloudIaas => "cloud_iaas",
            InvocationSurface::AppApi => "app_api",
            InvocationSurface::AdminApi => "admin_api",
            InvocationSurface::Internal => "internal",
        }
    }

    fn status_class_label(status_code: u16) -> &'static str {
        match status_code {
            200..300 => "2xx",
            300..400 => "3xx",
            400..500 => "4xx",
            500..600 => "5xx",
            _ => "unknown",
        }
    }

    fn effective_status_code(invocation: &Invocation) -> u16 {
        invocation
            .dispatch
            .response
            .as_ref()
            .map(|response| response.status_code)
            .unwrap_or(500)
    }

    fn record_completion(&self, invocation: &Invocation) {
        let provider = Self::provider_label(invocation);
        let surface = Self::surface_label(invocation);
        let status_code = Self::effective_status_code(invocation);
        let status_class = Self::status_class_label(status_code);

        self.state
            .invocation_total
            .with_label_values(&[provider, surface, status_class])
            .inc();

        if let Some(started) = self.take_start(&invocation.request.request_id) {
            let elapsed_ms = started.elapsed().as_millis() as f64;
            self.state
                .invocation_duration_ms
                .with_label_values(&[provider, surface])
                .observe(elapsed_ms);
        }
    }

    fn record_error(&self, invocation: &Invocation, error: &InvocationError) {
        let provider = Self::provider_label(invocation);
        self.state
            .invocation_errors_total
            .with_label_values(&[provider, error.kind.code()])
            .inc();
    }
}

impl Default for MetricsInterceptor {
    fn default() -> Self {
        Self::new()
    }
}

impl InvocationInterceptor for MetricsInterceptor {
    fn name(&self) -> &str {
        "metrics"
    }

    fn observe_pipeline_errors(&self) -> bool {
        true
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.record_start(&invocation.request.request_id);
            Ok(())
        })
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.record_completion(invocation);
            Ok(())
        })
    }

    fn on_error<'a>(
        &'a self,
        invocation: &'a mut Invocation,
        error: &'a InvocationError,
    ) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.record_completion(invocation);
            self.record_error(invocation, error);
            Ok(())
        })
    }
}
