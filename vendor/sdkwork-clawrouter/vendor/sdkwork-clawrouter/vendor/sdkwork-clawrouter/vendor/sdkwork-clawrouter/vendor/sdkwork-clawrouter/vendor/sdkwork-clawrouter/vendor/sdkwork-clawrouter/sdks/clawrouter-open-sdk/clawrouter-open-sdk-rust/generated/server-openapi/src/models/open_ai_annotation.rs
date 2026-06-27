use serde::{Deserialize, Serialize};

/// OpenAI-compatible open ai annotation schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiAnnotation {
    /// End character index for the annotation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub end_index: Option<i64>,

    /// Referenced file identifier when applicable.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file_id: Option<String>,

    /// Referenced filename when applicable.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,

    /// Annotation index when returned by the upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub index: Option<i64>,

    /// Start character index for the annotation.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub start_index: Option<i64>,

    /// Referenced URL title when applicable.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,

    /// Annotation type.
    pub r#type: String,

    /// Referenced URL when applicable.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}
