use serde::{Deserialize, Serialize};

/// MiniMax TTS voice effects.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MinimaxVoiceModify {
    /// Stronger/softer adjustment.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub intensity: Option<i64>,

    /// Deepen/brighten adjustment.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pitch: Option<i64>,

    /// One optional sound effect.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sound_effects: Option<String>,

    /// Nasal/crisp adjustment.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timbre: Option<i64>,
}
