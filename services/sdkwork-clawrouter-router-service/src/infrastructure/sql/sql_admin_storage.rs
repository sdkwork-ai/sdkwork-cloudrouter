pub(crate) fn resource_status_label_sql(column: &'static str) -> String {
    format!(
        "CASE LOWER(CAST({column} AS TEXT)) \
         WHEN '1' THEN 'active' \
         WHEN '0' THEN 'disabled' \
         WHEN '2' THEN 'archived' \
         ELSE LOWER(CAST({column} AS TEXT)) END"
    )
}

pub(crate) fn job_status_label_sql(column: &'static str) -> String {
    format!(
        "CASE LOWER(CAST({column} AS TEXT)) \
         WHEN '1' THEN 'created' \
         WHEN '2' THEN 'running' \
         WHEN '3' THEN 'completed' \
         WHEN '4' THEN 'failed' \
         WHEN '5' THEN 'canceled' \
         ELSE LOWER(CAST({column} AS TEXT)) END"
    )
}

pub(crate) const STORAGE_AUDIT_TARGET_PROVIDER: i32 = 2101;
pub(crate) const STORAGE_AUDIT_TARGET_BUCKET: i32 = 2102;
pub(crate) const STORAGE_AUDIT_TARGET_DEFAULT_BUCKET: i32 = 2103;
pub(crate) const STORAGE_AUDIT_TARGET_QUOTA_POLICY: i32 = 2104;
pub(crate) const STORAGE_AUDIT_TARGET_RECONCILIATION_RUN: i32 = 2105;
pub(crate) const STORAGE_AUDIT_TARGET_GC_JOB: i32 = 2106;
