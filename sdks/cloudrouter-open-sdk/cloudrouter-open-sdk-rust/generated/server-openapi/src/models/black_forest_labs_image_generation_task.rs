use serde::{Deserialize, Serialize};

/// Black Forest Labs asynchronous FLUX generation record.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BlackForestLabsImageGenerationTask {
    /// Provider diagnostics, including moderation reasons or error text.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub details: Option<std::collections::HashMap<String, String>>,

    /// Generation identifier used for polling.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Provider polling URL for the generation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub polling_url: Option<String>,

    /// Completion ratio between 0 and 1.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub progress: Option<f64>,

    /// Generation output envelope carrying the generated sample.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub result: Option<std::collections::HashMap<String, String>>,

    /// Task status, for example Pending, Ready, or Error.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
