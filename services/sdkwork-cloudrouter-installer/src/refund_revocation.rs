//! Archive applications whose paid template order was refunded or reversed.
//!
//! Dry-run by default: the command prints exactly which application rows would
//! be archived and never changes them until `--apply` is passed. Archiving
//! (not deleting) keeps the audit trail while the app-token lookup already
//! refuses a refunded order.

use sqlx::{PgPool, Row};

/// One application candidate for refund-driven archival.
#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundedApplication {
    pub tenant_id: String,
    pub app_uuid: String,
    pub name: String,
    pub order_id: String,
    pub payment_status: String,
}

/// Result of one audit/apply pass.
#[derive(Clone, Debug, Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundRevocationReport {
    pub applied: bool,
    pub candidates: Vec<RefundedApplication>,
}

/// Lists (and with `apply`, archives) apps whose recorded order is refunded.
pub async fn revoke_refunded_applications(
    pg: &PgPool,
    apply: bool,
) -> anyhow::Result<RefundRevocationReport> {
    let present: Option<String> = sqlx::query_scalar("SELECT to_regclass('commerce_order')::text")
        .fetch_one(pg)
        .await?;
    if present.is_none() {
        return Ok(RefundRevocationReport {
            applied: apply,
            candidates: Vec::new(),
        });
    }

    let rows = sqlx::query(
        "SELECT a.tenant_id::text AS tenant_id, a.uuid, a.name,
                o.id AS order_id, COALESCE(o.payment_status, '') AS payment_status
         FROM deploy_app a
         JOIN commerce_order o
           ON o.tenant_id = a.tenant_id::text
          AND o.id = a.metadata #>> '{template,orderId}'
         WHERE a.deleted_at IS NULL
           AND a.archived_at IS NULL
           AND LOWER(COALESCE(o.payment_status, '')) IN
               ('refunded', 'refund', 'chargeback', 'charged_back', 'reversed')
         ORDER BY a.tenant_id, a.id",
    )
    .fetch_all(pg)
    .await?;

    let candidates: Vec<RefundedApplication> = rows
        .into_iter()
        .map(|row| RefundedApplication {
            tenant_id: row.get("tenant_id"),
            app_uuid: row.get("uuid"),
            name: row.get("name"),
            order_id: row.get("order_id"),
            payment_status: row.get("payment_status"),
        })
        .collect();

    if apply {
        for candidate in &candidates {
            sqlx::query(
                "UPDATE deploy_app
                 SET app_status = 'ARCHIVED', archived_at = NOW(), updated_at = NOW(),
                     version = version + 1
                 WHERE tenant_id = CAST($1 AS BIGINT) AND uuid = $2
                   AND deleted_at IS NULL AND archived_at IS NULL",
            )
            .bind(&candidate.tenant_id)
            .bind(&candidate.app_uuid)
            .execute(pg)
            .await?;
        }
    }

    Ok(RefundRevocationReport {
        applied: apply,
        candidates,
    })
}
