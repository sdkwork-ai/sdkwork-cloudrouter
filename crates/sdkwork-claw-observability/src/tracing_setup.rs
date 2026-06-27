use std::sync::Once;
use tracing_subscriber::EnvFilter;

static TRACING_INIT: Once = Once::new();

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

pub fn init_tracing_with_config(config: TracingConfig) {
    TRACING_INIT.call_once(|| {
        let filter = resolved_log_filter(
            std::env::var("RUST_LOG").ok().as_deref(),
            config.log_filter.as_deref(),
        );
        let filter = EnvFilter::try_new(filter).unwrap_or_else(|_| EnvFilter::new("info"));
        let subscriber = tracing_subscriber::fmt()
            .with_env_filter(filter)
            .with_ansi(config.log_ansi)
            .with_target(config.log_target)
            .with_thread_names(config.log_thread_names)
            .with_thread_ids(config.log_thread_ids);
        let result = match config.log_format {
            LogFormat::Compact => subscriber.compact().try_init(),
            LogFormat::Json => subscriber.json().try_init(),
            LogFormat::Pretty => subscriber.pretty().try_init(),
            LogFormat::Full => subscriber.try_init(),
        };
        let _ = result;
    });
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
}
