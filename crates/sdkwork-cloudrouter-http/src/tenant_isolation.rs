use std::sync::OnceLock;

use prometheus::IntCounterVec;
use tracing::error;

struct TenantIsolationMetrics {
    violations_total: IntCounterVec,
}

static TENANT_ISOLATION_METRICS: OnceLock<Option<TenantIsolationMetrics>> = OnceLock::new();

fn tenant_isolation_metrics() -> Option<&'static TenantIsolationMetrics> {
    TENANT_ISOLATION_METRICS
        .get_or_init(|| {
            let violations_total = IntCounterVec::new(
                prometheus::Opts::new(
                    "tenant_isolation_violation_total",
                    "Cross-tenant data boundary violations detected at SQL scope.",
                ),
                &["table", "surface"],
            )
            .map_err(|error| {
                tracing::error!(
                    error = %error,
                    "failed to construct tenant_isolation_violation_total"
                )
            })
            .ok()?;

            let registry = prometheus::default_registry();
            let _ = registry.register(Box::new(violations_total.clone()));

            Some(TenantIsolationMetrics { violations_total })
        })
        .as_ref()
}

/// Records a tenant isolation violation and emits a structured error log for SOC2 runbooks.
pub fn record_tenant_isolation_violation(
    table: &str,
    surface: &str,
    principal_tenant_id: i64,
    row_tenant_id: i64,
) {
    if let Some(metrics) = tenant_isolation_metrics() {
        metrics
            .violations_total
            .with_label_values(&[table, surface])
            .inc();
    }

    error!(
        target: "tenant_isolation_violation",
        table = table,
        surface = surface,
        principal_tenant = principal_tenant_id,
        row_tenant = row_tenant_id,
        "tenant isolation boundary violation"
    );
}

/// Ensures a loaded row belongs to the authenticated SQL scope tenant.
pub fn ensure_row_tenant_matches(
    table: &str,
    surface: &str,
    principal_tenant_id: i64,
    row_tenant_id: i64,
) -> Result<(), TenantIsolationViolation> {
    if principal_tenant_id <= 0 {
        return Ok(());
    }
    if row_tenant_id == principal_tenant_id {
        return Ok(());
    }

    record_tenant_isolation_violation(table, surface, principal_tenant_id, row_tenant_id);
    Err(TenantIsolationViolation {
        table: table.to_owned(),
        surface: surface.to_owned(),
        principal_tenant_id,
        row_tenant_id,
    })
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TenantIsolationViolation {
    pub table: String,
    pub surface: String,
    pub principal_tenant_id: i64,
    pub row_tenant_id: i64,
}

impl std::fmt::Display for TenantIsolationViolation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "tenant isolation violation on {} (principal_tenant={} row_tenant={})",
            self.table, self.principal_tenant_id, self.row_tenant_id
        )
    }
}

impl std::error::Error for TenantIsolationViolation {}
