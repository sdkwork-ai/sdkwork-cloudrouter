use serde::{Deserialize, Serialize};

/// Admin prompt version item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminPromptVersionItem {
    /// Checksum hash field on admin prompt version item.
    #[serde(rename = "checksumHash")]
    pub checksum_hash: String,

    /// Content field on admin prompt version item.
    pub content: String,

    /// Created at field on admin prompt version item.
    #[serde(rename = "createdAt")]
    pub created_at: String,

    /// Created by field on admin prompt version item.
    #[serde(rename = "createdBy")]
    pub created_by: String,

    /// Examples json field on admin prompt version item.
    #[serde(rename = "examplesJson")]
    pub examples_json: Vec<std::collections::HashMap<String, String>>,

    /// Id field on admin prompt version item.
    pub id: String,

    /// Lifecycle status field on admin prompt version item.
    #[serde(rename = "lifecycleStatus")]
    pub lifecycle_status: String,

    /// Model constraints field on admin prompt version item.
    #[serde(rename = "modelConstraints")]
    pub model_constraints: std::collections::HashMap<String, String>,

    /// Organization id field on admin prompt version item.
    #[serde(rename = "organizationId")]
    pub organization_id: String,

    /// Output schema field on admin prompt version item.
    #[serde(rename = "outputSchema")]
    pub output_schema: std::collections::HashMap<String, String>,

    /// Prompt id field on admin prompt version item.
    #[serde(rename = "promptId")]
    pub prompt_id: String,

    /// Published at field on admin prompt version item.
    #[serde(rename = "publishedAt")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub published_at: Option<String>,

    /// Review comment field on admin prompt version item.
    #[serde(rename = "reviewComment")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub review_comment: Option<String>,

    /// Review status field on admin prompt version item.
    #[serde(rename = "reviewStatus")]
    pub review_status: String,

    /// Safety policy field on admin prompt version item.
    #[serde(rename = "safetyPolicy")]
    pub safety_policy: std::collections::HashMap<String, String>,

    /// Tenant id field on admin prompt version item.
    #[serde(rename = "tenantId")]
    pub tenant_id: String,

    /// Title field on admin prompt version item.
    pub title: String,

    /// Updated at field on admin prompt version item.
    #[serde(rename = "updatedAt")]
    pub updated_at: String,

    /// Uuid field on admin prompt version item.
    pub uuid: String,

    /// Variable schema field on admin prompt version item.
    #[serde(rename = "variableSchema")]
    pub variable_schema: std::collections::HashMap<String, String>,

    /// Version no field on admin prompt version item.
    #[serde(rename = "versionNo")]
    pub version_no: String,
}
