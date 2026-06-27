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
