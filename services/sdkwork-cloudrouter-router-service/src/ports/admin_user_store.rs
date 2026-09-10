#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminUserSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminUserApiKeyItem {
    pub id: i64,
    pub user_id: i64,
    pub name: String,
    pub key: String,
    pub used: String,
    pub status: String,
}
