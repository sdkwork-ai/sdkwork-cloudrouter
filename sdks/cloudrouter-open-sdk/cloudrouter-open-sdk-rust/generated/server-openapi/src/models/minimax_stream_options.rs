use serde::{Deserialize, Serialize};

/// MiniMax TTS streaming options.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MinimaxStreamOptions {
    /// Omit the aggregated audio from the final chunk.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub exclude_aggregated_audio: Option<bool>,
}
