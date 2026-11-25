//! Postgres read model for the billing decision diagnostics.

use crate::domain::DomainError;
use chrono::{DateTime, Utc};
use sqlx::{PgPool, Row};

use crate::ports::{
    AdminBillingDecision, AdminBillingDecisionFuture, AdminBillingDecisionStore,
    AdminBillingDecisionSubject, AdminBillingDecisionVerdict,
};

/// One query, three sources: the account hold, the charge lines and the measured
/// usage. The hold row is looked up by its request-scoped business number, which
/// is the only stable link between the account ledger and a routing invocation.
///
/// `invocation_id` is cast to text so the statement works whether the column is
/// uuid or text, and every source is tenant-filtered: a request id from another
/// tenant must read as missing, never as another tenant's data.
const READ_BILLING_DECISION: &str = r#"
WITH hold AS (
    SELECT CAST(h.amount AS TEXT) AS amount,
           CAST(h.settled_amount AS TEXT) AS settled_amount,
           h.status,
           CAST(h.expires_at AS TEXT) AS expires_at
      FROM acct_hold h
     WHERE h.tenant_id = $2
       AND h.business_no = 'cloudrouter:' || $1 || ':precharge'
     ORDER BY h.id DESC
     LIMIT 1
),
charges AS (
    SELECT COUNT(*) AS charge_rows,
           CAST(COALESCE(SUM(c.amount), 0) AS TEXT) AS charge_amount,
           CAST(COALESCE(SUM(c.debit_points), 0) AS BIGINT) AS debit_points
      FROM cloudrouter_charge_line c
     WHERE c.tenant_id = $2
       AND c.invocation_id::text = $1
),
usage AS (
    SELECT CAST(COALESCE(SUM(m.quantity), 0) AS TEXT) AS measured_quantity
      FROM cloudrouter_usage_measurement m
     WHERE m.tenant_id = $2
       AND m.invocation_id::text = $1
)
SELECT hold.amount, hold.settled_amount, hold.status, hold.expires_at,
       charges.charge_rows, charges.charge_amount, charges.debit_points,
       usage.measured_quantity
  FROM charges, usage
  LEFT JOIN hold ON TRUE
"#;

#[derive(Debug, Clone)]
pub struct PostgresAdminBillingDecisionStore {
    pool: PgPool,
}

impl PostgresAdminBillingDecisionStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl AdminBillingDecisionStore for PostgresAdminBillingDecisionStore {
    fn read_billing_decision<'a>(
        &'a self,
        subject: AdminBillingDecisionSubject,
        invocation_id: String,
    ) -> AdminBillingDecisionFuture<'a, Option<AdminBillingDecision>> {
        Box::pin(async move {
            let invocation_id = invocation_id.trim().to_owned();
            if invocation_id.is_empty() {
                return Err(DomainError::new("request id must not be empty"));
            }
            let row = sqlx::query(READ_BILLING_DECISION)
                .bind(&invocation_id)
                .bind(subject.tenant_id)
                .fetch_one(&self.pool)
                .await
                .map_err(|error| {
                    DomainError::new(format!("failed to read the billing decision: {error}"))
                })?;

            let hold_amount: Option<String> = row.try_get("amount").ok().flatten();
            let hold_settled_amount: Option<String> = row.try_get("settled_amount").ok().flatten();
            let hold_status: Option<i16> = row.try_get("status").ok().flatten();
            let hold_expires_at: Option<String> = row.try_get("expires_at").ok().flatten();
            let charge_line_count: i64 = row.try_get("charge_rows").unwrap_or(0);
            let charge_amount: String = row.try_get("charge_amount").unwrap_or_else(|_| "0".into());
            let debit_points: i64 = row.try_get("debit_points").unwrap_or(0);
            let measured_quantity: String = row
                .try_get("measured_quantity")
                .unwrap_or_else(|_| "0".into());

            // An unknown request carries neither a hold nor a charge line, which is
            // indistinguishable from a request rejected before dispatch — and that
            // is the honest answer, so it is reported as such rather than as a 404.
            if hold_amount.is_none() && charge_line_count == 0 && measured_quantity == "0" {
                return Ok(Some(AdminBillingDecision {
                    invocation_id,
                    hold_amount: None,
                    hold_settled_amount: None,
                    hold_status: None,
                    hold_expires_at: None,
                    charge_line_count: 0,
                    charge_amount,
                    debit_points: 0,
                    measured_quantity,
                    verdict: AdminBillingDecisionVerdict::NotBilled,
                }));
            }

            let verdict =
                decide_verdict(hold_status, hold_expires_at.as_deref(), charge_line_count);
            Ok(Some(AdminBillingDecision {
                invocation_id,
                hold_amount,
                hold_settled_amount,
                hold_status,
                hold_expires_at,
                charge_line_count,
                charge_amount,
                debit_points,
                measured_quantity,
                verdict,
            }))
        })
    }
}

fn decide_verdict(
    hold_status: Option<i16>,
    hold_expires_at: Option<&str>,
    charge_line_count: i64,
) -> AdminBillingDecisionVerdict {
    match hold_status {
        None => AdminBillingDecisionVerdict::NotBilled,
        // 1 held, 2 settled, 3 released, 4 expired (account hold status codes).
        Some(1) => {
            if hold_is_overdue(hold_expires_at) {
                AdminBillingDecisionVerdict::Overdue
            } else {
                AdminBillingDecisionVerdict::Held
            }
        }
        Some(2) => AdminBillingDecisionVerdict::Settled,
        Some(3) => AdminBillingDecisionVerdict::Released,
        Some(4) => {
            if charge_line_count > 0 {
                // Charged after the reservation was released: the overage path
                // captured the usage, so the request is settled even though the
                // hold itself expired.
                AdminBillingDecisionVerdict::Settled
            } else {
                AdminBillingDecisionVerdict::Expired
            }
        }
        Some(_) => AdminBillingDecisionVerdict::NotBilled,
    }
}

fn hold_is_overdue(expires_at: Option<&str>) -> bool {
    let Some(value) = expires_at else {
        return false;
    };
    match DateTime::parse_from_rfc3339(value) {
        Ok(deadline) => deadline.with_timezone(&Utc) <= Utc::now(),
        // An unparsable deadline must not claim the hold is healthy.
        Err(_) => true,
    }
}
