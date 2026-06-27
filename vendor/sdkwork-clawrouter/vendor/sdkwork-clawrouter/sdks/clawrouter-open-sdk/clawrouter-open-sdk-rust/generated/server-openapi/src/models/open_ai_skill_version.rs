use serde::{Deserialize, Serialize};

/// OpenAI-compatible skill version object exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct OpenAiSkillVersion {
    /// Unix timestamp in seconds when the version was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// Skill version identifier.
    pub id: String,

    /// Developer-defined skill version metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Object type, normally skill.version.
    pub object: String,

    /// SHA-256 digest of the uploaded skill package.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub package_sha256: Option<String>,

    /// Skill identifier that owns this version.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub skill_id: Option<String>,

    /// Skill version lifecycle status.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    /// Version label.
    pub version: String,
}
