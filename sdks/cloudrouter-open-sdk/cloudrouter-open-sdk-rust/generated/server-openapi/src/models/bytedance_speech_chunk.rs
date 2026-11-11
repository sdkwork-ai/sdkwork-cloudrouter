use serde::{Deserialize, Serialize};

/// One streamed Seed TTS frame. The vendor answers NDJSON frames carrying base64 `data`; the final frame has `code` 20000000.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct BytedanceSpeechChunk {
    /// Frame status code; 20000000 marks the final frame.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub code: Option<i64>,

    /// Base64 audio payload of this frame.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<String>,

    /// Frame status message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,

    /// Frame sequence number.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sequence: Option<i64>,
}
