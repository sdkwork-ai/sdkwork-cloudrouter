use serde::{Deserialize, Serialize};

/// ElevenLabs pronunciation dictionary version locator.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ElevenLabsPronunciationDictionaryLocator {
    /// Pronunciation dictionary id.
    pub pronunciation_dictionary_id: String,

    /// Dictionary version id; omit to use the latest version.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version_id: Option<String>,
}
