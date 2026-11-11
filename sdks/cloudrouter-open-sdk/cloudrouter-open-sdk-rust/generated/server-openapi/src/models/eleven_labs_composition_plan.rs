use serde::{Deserialize, Serialize};

/// Composition plan for the music_v2 and music_v2_5 models.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ElevenLabsCompositionPlan {
    /// Chunks that make up the generation.
    pub chunks: Vec<std::collections::HashMap<String, String>>,
}
