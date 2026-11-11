use serde::{Deserialize, Serialize};

/// Ark draft video task reference used to promote a preview video into a final video.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ArkDraftTask {
    /// Draft video task id returned by an earlier create call with `draft: true`.
    pub id: String,
}
