use serde::{Deserialize, Serialize};

/// One voice in a mixed-voice TTS request.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MinimaxTimbreWeight {
    /// Voice id.
    pub voice_id: String,

    /// Relative weight of this voice.
    pub weight: i64,
}
