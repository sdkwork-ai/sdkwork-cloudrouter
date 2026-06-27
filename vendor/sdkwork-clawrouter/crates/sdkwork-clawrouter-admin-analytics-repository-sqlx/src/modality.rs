pub const MODALITY_TEXT: i64 = 1;
pub const MODALITY_IMAGE: i64 = 2;
pub const MODALITY_AUDIO: i64 = 3;
pub const MODALITY_MUSIC: i64 = 4;
pub const MODALITY_VIDEO: i64 = 5;
pub const MODALITY_EMBEDDING: i64 = 6;
pub const MODALITY_RERANK: i64 = 7;

pub fn label(value: Option<i64>) -> &'static str {
    match value {
        Some(MODALITY_IMAGE) => "image",
        Some(MODALITY_AUDIO) => "audio",
        Some(MODALITY_MUSIC) => "music",
        Some(MODALITY_VIDEO) => "video",
        Some(MODALITY_EMBEDDING) => "embedding",
        Some(MODALITY_RERANK) => "rerank",
        Some(MODALITY_TEXT) => "text",
        _ => "unknown",
    }
}
