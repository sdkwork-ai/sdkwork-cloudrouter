use serde::{Deserialize, Serialize};

/// Item module returned inside the listOrganizationGroups list response.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ListOrganizationGroupsItem {
    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Unix timestamp in seconds when the object was created.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,

    /// User or invite email address.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,

    /// Resource identifier returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// Developer-defined or provider-returned metadata.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub metadata: Option<std::collections::HashMap<String, String>>,

    /// Human-readable administrative resource name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    /// OpenAI-compatible object type.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub object: Option<String>,

    /// Project identifier associated with the resource.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,

    /// Role identifier or role name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,

    /// Current resource status when returned by the selected upstream.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
}
