use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AdapterInvocationShape {
    #[default]
    SyncJson,
    AsyncTaskStart,
    AsyncTaskQuery,
    AsyncTaskCancel,
    SseStream,
    ByteStream,
    FileUpload,
    WebhookCallback,
    HealthProbe,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AdapterEndpointRuntimeState {
    #[default]
    RuntimeAvailable,
    DefinitionOnly,
    Planned,
    Deprecated,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AdapterStreamingMode {
    None,
    SsePassthrough,
    SseNormalized,
    ChunkedBinary,
}

/// Normalizes an adapter endpoint path to a canonical leading-slash form.
///
/// Adapter manifests, route matchers, and the HTTP handler all compare
/// standard paths for equality, so the same string must normalize identically
/// everywhere. Trims surrounding whitespace and prepends `/` when absent.
///
/// This is the single authority for adapter path normalization: the registry
/// matcher/snapshot and the HTTP handler delegate here rather than carrying
/// private copies.
pub fn normalize_adapter_path(value: &str) -> String {
    let value = value.trim();
    if value.starts_with('/') {
        value.to_owned()
    } else {
        format!("/{value}")
    }
}
