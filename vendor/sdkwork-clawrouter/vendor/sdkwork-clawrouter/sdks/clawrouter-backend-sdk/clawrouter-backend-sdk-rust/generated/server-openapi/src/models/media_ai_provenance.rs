use serde::{Deserialize, Serialize};

/// Media ai provenance schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MediaAiProvenance {
    /// Generation task id field on media ai provenance.
    #[serde(rename = "generationTaskId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub generation_task_id: Option<String>,

    /// Model field on media ai provenance.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Moderation status field on media ai provenance.
    #[serde(rename = "moderationStatus")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub moderation_status: Option<String>,

    /// Prompt id field on media ai provenance.
    #[serde(rename = "promptId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prompt_id: Option<String>,

    /// Provenance field on media ai provenance.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provenance: Option<String>,

    /// Provider field on media ai provenance.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub provider: Option<String>,

    /// Safety labels field on media ai provenance.
    #[serde(rename = "safetyLabels")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_labels: Option<Vec<String>>,

    /// Seed field on media ai provenance.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<String>,

    /// Source media ids field on media ai provenance.
    #[serde(rename = "sourceMediaIds")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source_media_ids: Option<Vec<String>>,
}
