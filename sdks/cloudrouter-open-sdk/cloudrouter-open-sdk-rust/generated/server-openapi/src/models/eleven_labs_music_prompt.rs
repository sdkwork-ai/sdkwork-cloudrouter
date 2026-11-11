use serde::{Deserialize, Serialize};

/// Structured music prompt (deprecated in favor of `composition_plan`).
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ElevenLabsMusicPrompt {
    /// Styles that should not be present.
    pub negative_global_styles: Vec<String>,

    /// Styles that should be present across the whole song.
    pub positive_global_styles: Vec<String>,

    /// Song sections.
    pub sections: Vec<std::collections::HashMap<String, String>>,
}
