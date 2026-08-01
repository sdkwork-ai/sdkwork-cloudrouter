use std::sync::OnceLock;
use std::time::Instant;

use prometheus::{HistogramVec, IntCounterVec, Opts};

use super::{
    Invocation, InvocationError, InvocationFuture, InvocationInterceptor, InvocationSurface,
};

/// Singleton Prometheus metrics shared across all pipeline instances.
struct MetricsState {
    invocation_total: IntCounterVec,
    invocation_duration_seconds: HistogramVec,
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

        let invocation_duration_seconds = HistogramVec::new(
            prometheus::HistogramOpts::new(
                "clawrouter_invocation_duration_seconds",
                "End-to-end invocation latency in seconds.",
            )
            .buckets(vec![
                0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0,
            ]),
            &["provider", "surface"],
        )
        .expect("clawrouter_invocation_duration_seconds metric construction must not fail");

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
        let _ = prometheus::register(Box::new(invocation_duration_seconds.clone()));
        let _ = prometheus::register(Box::new(invocation_errors_total.clone()));

        MetricsState {
            invocation_total,
            invocation_duration_seconds,
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
}

impl MetricsInterceptor {
    pub fn new() -> Self {
        Self {
            state: metrics_state(),
        }
    }

    fn provider_label(invocation: &Invocation) -> &'static str {
        let supplier_code = invocation
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
            .unwrap_or("unknown");
        normalized_provider_metric_label(supplier_code)
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

    fn record_completion(&self, invocation: &mut Invocation) {
        let started = invocation.telemetry.pipeline_started_at.take();
        let provider = Self::provider_label(invocation);
        let surface = Self::surface_label(invocation);
        let status_code = Self::effective_status_code(invocation);
        let status_class = Self::status_class_label(status_code);

        self.state
            .invocation_total
            .with_label_values(&[provider, surface, status_class])
            .inc();

        if let Some(started) = started {
            self.state
                .invocation_duration_seconds
                .with_label_values(&[provider, surface])
                .observe(started.elapsed().as_secs_f64());
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

fn normalized_provider_metric_label(value: &str) -> &'static str {
    let normalized = value.trim().to_ascii_lowercase().replace(['_', '.'], "-");
    let provider = normalized.as_str();
    if provider.is_empty() || provider == "unknown" {
        "unknown"
    } else if provider.contains("openrouter") {
        "openrouter"
    } else if provider.contains("azure") && provider.contains("openai") {
        "azure_openai"
    } else if provider.contains("openai") {
        "openai"
    } else if provider.contains("anthropic") || provider.contains("claude") {
        "anthropic"
    } else if provider.contains("google")
        || provider.contains("gemini")
        || provider.contains("vertex")
    {
        "google"
    } else if provider.contains("bedrock") || provider.starts_with("aws") {
        "aws"
    } else if provider.contains("alibaba")
        || provider.contains("alicloud")
        || provider.contains("dashscope")
        || provider.contains("qwen")
    {
        "alibaba"
    } else if provider.contains("tencent") || provider.contains("hunyuan") {
        "tencent"
    } else if provider.contains("baidu") || provider.contains("ernie") {
        "baidu"
    } else if provider.contains("deepseek") {
        "deepseek"
    } else if provider.contains("mistral") {
        "mistral"
    } else if provider.contains("cohere") {
        "cohere"
    } else if provider == "xai" || provider.starts_with("xai-") {
        "xai"
    } else if provider.contains("ollama") || provider.contains("local") {
        "local"
    } else {
        "other"
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
            invocation.telemetry.pipeline_started_at = Some(Instant::now());
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

#[cfg(test)]
mod tests {
    use super::normalized_provider_metric_label;

    #[test]
    fn provider_metric_labels_use_a_fixed_family_dictionary() {
        assert_eq!("openai", normalized_provider_metric_label("openai-primary"));
        assert_eq!(
            "azure_openai",
            normalized_provider_metric_label("azure.openai/eastus")
        );
        assert_eq!("google", normalized_provider_metric_label("vertex-gemini"));
        assert_eq!("alibaba", normalized_provider_metric_label("dashscope-cn"));
        assert_eq!(
            "other",
            normalized_provider_metric_label("tenant-reseller-42")
        );
        assert_eq!("unknown", normalized_provider_metric_label(""));
    }
}
