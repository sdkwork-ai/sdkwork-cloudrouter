pub(crate) fn status_label_sql(column: &str) -> String {
    format!(
        "CASE {column} WHEN 1 THEN 'active' WHEN 0 THEN 'inactive' ELSE CAST({column} AS TEXT) END"
    )
}

pub(crate) fn risk_label_sql(column: &str) -> String {
    format!(
        "CASE {column} WHEN 1 THEN 'low' WHEN 2 THEN 'medium' WHEN 3 THEN 'high' WHEN 4 THEN 'critical' ELSE 'unknown' END"
    )
}

pub(crate) const SERVICE_PROVIDER_AUDIT_TARGET_PROVIDER: i32 = 1801;
pub(crate) const SERVICE_PROVIDER_AUDIT_TARGET_EDGE: i32 = 1802;
pub(crate) const SERVICE_PROVIDER_AUDIT_TARGET_CONTRACT: i32 = 1803;
pub(crate) const SERVICE_PROVIDER_AUDIT_TARGET_PRICE_RULE: i32 = 1804;
pub(crate) const SERVICE_PROVIDER_AUDIT_TARGET_STATEMENT: i32 = 1805;
pub(crate) const SERVICE_PROVIDER_AUDIT_TARGET_ADJUSTMENT: i32 = 1806;
pub(crate) const SERVICE_PROVIDER_AUDIT_TARGET_RECONCILIATION_RUN: i32 = 1807;
