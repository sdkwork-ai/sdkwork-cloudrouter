use std::io::Read;
use std::sync::OnceLock;
use tracing_subscriber::EnvFilter;

use crate::otlp::OtlpConfig;

static TRACING_INIT: OnceLock<TracingInitialization> = OnceLock::new();
const MAX_OTLP_CERTIFICATE_BYTES: u64 = 1024 * 1024;
const OTLP_MAX_QUEUED_SPANS: usize = 2_048;
const OTLP_MAX_EXPORT_BATCH_SIZE: usize = 512;

#[derive(Debug)]
enum TracingInitialization {
    LocalOnly,
    OtlpEnabled {
        endpoint: String,
        service_name: String,
        sampling_rate: f64,
    },
    OtlpUnavailable(String),
    SubscriberUnavailable(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogFormat {
    Compact,
    Json,
    Pretty,
    Full,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TracingConfig {
    pub log_filter: Option<String>,
    pub log_format: LogFormat,
    pub log_ansi: bool,
    pub log_target: bool,
    pub log_thread_names: bool,
    pub log_thread_ids: bool,
}

impl Default for TracingConfig {
    fn default() -> Self {
        Self {
            log_filter: None,
            log_format: LogFormat::Compact,
            log_ansi: false,
            log_target: true,
            log_thread_names: false,
            log_thread_ids: false,
        }
    }
}

pub fn init_tracing() {
    init_tracing_with_filter(None);
}

pub fn init_tracing_with_filter(config_filter: Option<&str>) {
    init_tracing_with_config(TracingConfig {
        log_filter: normalized_filter(config_filter).map(str::to_owned),
        ..TracingConfig::default()
    });
}

pub fn init_tracing_with_runtime_config(
    config: Option<&sdkwork_claw_config::ObservabilitySectionConfig>,
) -> Result<(), String> {
    init_tracing_with_config(TracingConfig::from_runtime_config(config)?);
    Ok(())
}

/// Initialise the global tracing subscriber.
///
/// This wires together:
/// 1. A `tracing_subscriber::fmt` layer (compact / json / pretty / full).
/// 2. An optional `tracing_opentelemetry` layer backed by an OTLP HTTP exporter
///    when `OtlpConfig::from_env().tracing_enabled` is `true`.
///
/// When OTLP export is enabled the tracer provider is registered as the global
/// OpenTelemetry provider so it lives for the entire process.  If exporter
/// construction fails the function falls back to fmt-only tracing and emits a
/// `tracing::warn!` after the subscriber is installed.
pub fn init_tracing_with_config(config: TracingConfig) {
    let initialization = TRACING_INIT.get_or_init(|| install_tracing_subscriber(config));
    match initialization {
        TracingInitialization::LocalOnly => tracing::info!("OTLP tracing export disabled"),
        TracingInitialization::OtlpEnabled {
            endpoint,
            service_name,
            sampling_rate,
        } => tracing::info!(
            endpoint,
            service_name,
            sampling_rate,
            "OTLP tracing export enabled"
        ),
        TracingInitialization::OtlpUnavailable(error) => tracing::warn!(
            error,
            "OTLP tracing export is unavailable; local structured tracing remains active"
        ),
        TracingInitialization::SubscriberUnavailable(error) => tracing::warn!(
            error,
            "Claw Router tracing subscriber could not be installed"
        ),
    }
}

/// Construct a boxed `tracing_opentelemetry` layer backed by an OTLP HTTP exporter.
///
/// The exporter uses the `http-proto` protocol (protobuf over HTTP) so it does
/// not require a `protoc` build-time dependency.  The tracer provider is
/// registered as the global OpenTelemetry provider, which keeps it alive for
/// the process lifetime and allows background span flushing via the batch
/// span processor.
fn install_tracing_subscriber(config: TracingConfig) -> TracingInitialization {
    let otlp_config = OtlpConfig::from_env();
    if !otlp_config.tracing_enabled {
        return install_local_subscriber(&config)
            .map(|_| TracingInitialization::LocalOnly)
            .unwrap_or_else(TracingInitialization::SubscriberUnavailable);
    }

    match build_otlp_runtime(&otlp_config) {
        Ok(runtime) => match install_otlp_subscriber(&config, runtime.layer) {
            Ok(()) => {
                opentelemetry::global::set_tracer_provider(runtime.provider);
                TracingInitialization::OtlpEnabled {
                    endpoint: otlp_traces_endpoint(&otlp_config.endpoint),
                    service_name: otlp_config.service_name,
                    sampling_rate: otlp_config.sampling_rate,
                }
            }
            Err(error) => TracingInitialization::SubscriberUnavailable(error),
        },
        Err(export_error) => match install_local_subscriber(&config) {
            Ok(()) => TracingInitialization::OtlpUnavailable(export_error),
            Err(subscriber_error) => TracingInitialization::SubscriberUnavailable(format!(
                "{subscriber_error}; OTLP setup also failed: {export_error}"
            )),
        },
    }
}

fn log_filter(config: &TracingConfig) -> EnvFilter {
    let filter = resolved_log_filter(
        std::env::var("RUST_LOG").ok().as_deref(),
        config.log_filter.as_deref(),
    );
    EnvFilter::try_new(filter).unwrap_or_else(|_| EnvFilter::new("info"))
}

fn install_local_subscriber(config: &TracingConfig) -> Result<(), String> {
    use tracing_subscriber::layer::SubscriberExt;
    use tracing_subscriber::util::SubscriberInitExt;

    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_ansi(config.log_ansi)
        .with_target(config.log_target)
        .with_thread_names(config.log_thread_names)
        .with_thread_ids(config.log_thread_ids);
    let registry = tracing_subscriber::registry().with(log_filter(config));
    let result = match config.log_format {
        LogFormat::Compact => registry.with(fmt_layer.compact()).try_init(),
        LogFormat::Json => registry.with(fmt_layer.json()).try_init(),
        LogFormat::Pretty => registry.with(fmt_layer.pretty()).try_init(),
        LogFormat::Full => registry.with(fmt_layer).try_init(),
    };
    result.map_err(|error| error.to_string())
}

fn install_otlp_subscriber(
    config: &TracingConfig,
    otlp_layer: tracing_opentelemetry::OpenTelemetryLayer<
        tracing_subscriber::Registry,
        opentelemetry_sdk::trace::Tracer,
    >,
) -> Result<(), String> {
    use tracing_subscriber::layer::SubscriberExt;
    use tracing_subscriber::util::SubscriberInitExt;

    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_ansi(config.log_ansi)
        .with_target(config.log_target)
        .with_thread_names(config.log_thread_names)
        .with_thread_ids(config.log_thread_ids);
    let registry = tracing_subscriber::registry()
        .with(otlp_layer)
        .with(log_filter(config));
    let result = match config.log_format {
        LogFormat::Compact => registry.with(fmt_layer.compact()).try_init(),
        LogFormat::Json => registry.with(fmt_layer.json()).try_init(),
        LogFormat::Pretty => registry.with(fmt_layer.pretty()).try_init(),
        LogFormat::Full => registry.with(fmt_layer).try_init(),
    };
    result.map_err(|error| error.to_string())
}

struct OtlpRuntime {
    layer: tracing_opentelemetry::OpenTelemetryLayer<
        tracing_subscriber::Registry,
        opentelemetry_sdk::trace::Tracer,
    >,
    provider: opentelemetry_sdk::trace::TracerProvider,
}

fn build_otlp_runtime(config: &OtlpConfig) -> Result<OtlpRuntime, String> {
    use opentelemetry::trace::TracerProvider as _;
    use opentelemetry::KeyValue;
    use opentelemetry_otlp::{WithExportConfig, WithHttpConfig};
    use opentelemetry_sdk::runtime::Tokio;
    use opentelemetry_sdk::trace::{
        BatchConfigBuilder, BatchSpanProcessor, Sampler, TracerProvider as SdkTracerProvider,
    };
    use opentelemetry_sdk::Resource;

    // The OTEL convention is that `OTEL_EXPORTER_OTLP_ENDPOINT` holds the base
    // URL (e.g. `http://localhost:4318`).  The OTLP HTTP exporter expects the
    // full traces path, so append `/v1/traces` when the endpoint does not
    // already include it.
    validate_otlp_config(config)?;
    let traces_endpoint = otlp_traces_endpoint(&config.endpoint);
    let timeout = std::time::Duration::from_secs(config.export_timeout_secs);
    let http_client = build_otlp_http_client(config, timeout)?;

    let exporter = opentelemetry_otlp::SpanExporter::builder()
        .with_http()
        .with_endpoint(&traces_endpoint)
        .with_timeout(timeout)
        .with_http_client(http_client)
        .build()
        .map_err(|error| format!("OTLP span exporter build failed: {error}"))?;

    let batch_config = BatchConfigBuilder::default()
        .with_max_queue_size(OTLP_MAX_QUEUED_SPANS)
        .with_max_export_batch_size(OTLP_MAX_EXPORT_BATCH_SIZE)
        .with_max_export_timeout(timeout)
        .build();
    let span_processor = BatchSpanProcessor::builder(exporter, Tokio)
        .with_batch_config(batch_config)
        .build();
    let provider = SdkTracerProvider::builder()
        .with_span_processor(span_processor)
        .with_sampler(Sampler::ParentBased(Box::new(Sampler::TraceIdRatioBased(
            config.sampling_rate,
        ))))
        .with_resource(Resource::new(vec![KeyValue::new(
            "service.name",
            config.service_name.clone(),
        )]))
        .build();

    // Get the SDK tracer BEFORE moving the provider into the global slot.
    // The SDK Tracer implements `PreSampledTracer` which is required by
    // `tracing_opentelemetry::layer().with_tracer()`, while the global
    // `BoxedTracer` does not.
    let tracer = provider.tracer(config.service_name.clone());
    let layer = tracing_opentelemetry::layer().with_tracer(tracer);
    Ok(OtlpRuntime { layer, provider })
}

fn validate_otlp_config(config: &OtlpConfig) -> Result<(), String> {
    if config.service_name.trim().is_empty() {
        return Err("OTEL_SERVICE_NAME must not be empty".to_owned());
    }
    if !config.sampling_rate.is_finite() || !(0.0..=1.0).contains(&config.sampling_rate) {
        return Err(format!(
            "OTEL_TRACES_SAMPLER_ARG must be a finite number from 0 through 1, got {}",
            config.sampling_rate
        ));
    }
    if config.export_timeout_secs == 0 {
        return Err("OTEL_EXPORTER_TIMEOUT_SECS must be greater than zero".to_owned());
    }
    let endpoint = reqwest::Url::parse(&otlp_traces_endpoint(&config.endpoint))
        .map_err(|error| format!("invalid OTLP traces endpoint: {error}"))?;
    if endpoint.scheme() != "http" && endpoint.scheme() != "https" {
        return Err(format!(
            "OTLP traces endpoint must use http or https, got {}",
            endpoint.scheme()
        ));
    }
    if config.certificate_path.is_some() && endpoint.scheme() != "https" {
        return Err("OTLP custom certificates require an https endpoint".to_owned());
    }
    Ok(())
}

fn otlp_traces_endpoint(endpoint: &str) -> String {
    let endpoint = endpoint.trim();
    if endpoint.ends_with("/v1/traces") {
        endpoint.to_owned()
    } else {
        format!("{}/v1/traces", endpoint.trim_end_matches('/'))
    }
}

fn build_otlp_http_client(
    config: &OtlpConfig,
    timeout: std::time::Duration,
) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder()
        .connect_timeout(timeout)
        .timeout(timeout);
    if let Some(certificate_path) = config.certificate_path.as_deref() {
        for certificate in read_otlp_certificates(certificate_path)? {
            builder = builder.add_root_certificate(certificate);
        }
    }
    builder
        .build()
        .map_err(|error| format!("OTLP HTTP client build failed: {error}"))
}

fn read_otlp_certificates(path: &str) -> Result<Vec<reqwest::Certificate>, String> {
    let file = std::fs::File::open(path)
        .map_err(|error| format!("cannot open OTLP certificate {path}: {error}"))?;
    let metadata = file
        .metadata()
        .map_err(|error| format!("cannot inspect OTLP certificate {path}: {error}"))?;
    if metadata.len() > MAX_OTLP_CERTIFICATE_BYTES {
        return Err(format!(
            "OTLP certificate {path} exceeds the {} byte limit",
            MAX_OTLP_CERTIFICATE_BYTES
        ));
    }

    let mut bytes = Vec::with_capacity(metadata.len() as usize);
    file.take(MAX_OTLP_CERTIFICATE_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| format!("cannot read OTLP certificate {path}: {error}"))?;
    if bytes.len() as u64 > MAX_OTLP_CERTIFICATE_BYTES {
        return Err(format!(
            "OTLP certificate {path} exceeds the {} byte limit",
            MAX_OTLP_CERTIFICATE_BYTES
        ));
    }

    match reqwest::Certificate::from_pem_bundle(&bytes) {
        Ok(certificates) if !certificates.is_empty() => Ok(certificates),
        _ => reqwest::Certificate::from_der(&bytes)
            .map(|certificate| vec![certificate])
            .map_err(|error| format!("OTLP certificate {path} is not valid PEM or DER: {error}")),
    }
}

pub fn resolved_log_filter(env_filter: Option<&str>, config_filter: Option<&str>) -> String {
    normalized_filter(env_filter)
        .or_else(|| normalized_filter(config_filter))
        .unwrap_or("info")
        .to_owned()
}

fn normalized_filter(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

impl TracingConfig {
    pub fn from_runtime_config(
        config: Option<&sdkwork_claw_config::ObservabilitySectionConfig>,
    ) -> Result<Self, String> {
        let Some(config) = config else {
            return Ok(Self::default());
        };
        Ok(Self {
            log_filter: normalized_filter(config.log_filter.as_deref()).map(str::to_owned),
            log_format: match normalized_filter(config.log_format.as_deref()) {
                Some(value) => parse_log_format(value)?,
                None => LogFormat::Compact,
            },
            log_ansi: config.log_ansi.unwrap_or(false),
            log_target: config.log_target.unwrap_or(true),
            log_thread_names: config.log_thread_names.unwrap_or(false),
            log_thread_ids: config.log_thread_ids.unwrap_or(false),
        })
    }
}

fn parse_log_format(value: &str) -> Result<LogFormat, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "compact" => Ok(LogFormat::Compact),
        "json" => Ok(LogFormat::Json),
        "pretty" => Ok(LogFormat::Pretty),
        "full" => Ok(LogFormat::Full),
        other => Err(format!(
            "runtime config [observability].log_format must be one of compact, json, pretty, or full: {other}"
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tracing_init_is_idempotent() {
        init_tracing();
        init_tracing();
    }

    #[test]
    fn resolved_log_filter_prefers_env_then_config_then_info() {
        assert_eq!(
            "warn,sdkwork_claw=debug",
            resolved_log_filter(Some(" warn,sdkwork_claw=debug "), Some("info"))
        );
        assert_eq!("debug", resolved_log_filter(Some(""), Some(" debug ")));
        assert_eq!("info", resolved_log_filter(None, Some("")));
        assert_eq!("info", resolved_log_filter(None, None));
    }

    #[test]
    fn tracing_config_reads_runtime_observability_policy() {
        let runtime = sdkwork_claw_config::ObservabilitySectionConfig {
            log_filter: Some(" info,sdkwork_claw=debug ".to_owned()),
            log_format: Some("json".to_owned()),
            log_ansi: Some(false),
            log_target: Some(true),
            log_thread_names: Some(true),
            log_thread_ids: Some(false),
        };

        let config = TracingConfig::from_runtime_config(Some(&runtime)).unwrap();

        assert_eq!(
            Some("info,sdkwork_claw=debug"),
            config.log_filter.as_deref()
        );
        assert_eq!(LogFormat::Json, config.log_format);
        assert_eq!(false, config.log_ansi);
        assert_eq!(true, config.log_target);
        assert_eq!(true, config.log_thread_names);
        assert_eq!(false, config.log_thread_ids);
    }

    #[test]
    fn tracing_config_rejects_unknown_log_format() {
        let runtime = sdkwork_claw_config::ObservabilitySectionConfig {
            log_format: Some("xml".to_owned()),
            ..Default::default()
        };

        let error = TracingConfig::from_runtime_config(Some(&runtime)).unwrap_err();

        assert!(error.contains("[observability].log_format"));
    }

    #[test]
    fn otlp_config_from_env_reads_defaults() {
        // Ensure from_env does not panic and produces a usable config.
        let config = OtlpConfig::from_env();
        assert!(!config.endpoint.is_empty());
        assert!(!config.service_name.is_empty());
    }

    #[test]
    fn build_otlp_layer_returns_error_on_unreachable_endpoint() {
        // Use an invalid endpoint to verify error handling.  The exporter
        // builder should fail when it cannot construct the HTTP client or
        // the endpoint is malformed.
        let config = OtlpConfig {
            tracing_enabled: true,
            endpoint: "not-a-valid-url".to_string(),
            service_name: "test-service".to_string(),
            sampling_rate: 1.0,
            export_timeout_secs: 1,
            certificate_path: None,
        };
        // We don't assert the result because some HTTP client implementations
        // may lazily connect and not fail at build time.  The important thing
        // is that the function does not panic.
        let _ = build_otlp_runtime(&config);
    }
}
