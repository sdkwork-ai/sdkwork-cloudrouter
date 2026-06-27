pub(crate) const MESSAGING_AUDIT_TARGET_PROVIDER_ACCOUNT: i32 = 1901;
pub(crate) const MESSAGING_AUDIT_TARGET_SENDER_IDENTITY: i32 = 1902;
pub(crate) const MESSAGING_AUDIT_TARGET_TEMPLATE: i32 = 1903;
pub(crate) const MESSAGING_AUDIT_TARGET_TEMPLATE_VERSION: i32 = 1904;
pub(crate) const MESSAGING_AUDIT_TARGET_ROUTE_RULE: i32 = 1905;
pub(crate) const MESSAGING_AUDIT_TARGET_SEND_REQUEST: i32 = 1906;
pub(crate) const MESSAGING_AUDIT_TARGET_VERIFICATION_POLICY: i32 = 1907;
pub(crate) const MESSAGING_AUDIT_TARGET_SUPPRESSION: i32 = 1908;

pub(crate) fn status_label_sql(column: &str) -> String {
    format!(
        "CASE {column} WHEN 1 THEN 'active' WHEN 0 THEN 'inactive' WHEN 2 THEN 'suspended' ELSE CAST({column} AS TEXT) END"
    )
}
