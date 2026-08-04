use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct PageInfo {
    #[serde(rename = "hasMore")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub has_more: Option<bool>,

    pub mode: String,

    #[serde(rename = "nextCursor")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub page: Option<i64>,

    #[serde(rename = "pageSize")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub page_size: Option<i64>,

    #[serde(rename = "totalItems")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_items: Option<String>,

    #[serde(rename = "totalPages")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub total_pages: Option<i64>,
}
