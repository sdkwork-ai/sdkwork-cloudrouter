use std::collections::HashMap;

use sqlx::PgPool;

use crate::error::{store_error, RepositoryResult};
use crate::mapping::{
    chart_point_from_row, merge_item_into_breakdown, require_subject, row_to_bill, year_filter,
    RowMapping,
};
use crate::types::{
    SettlementBill, SettlementChartPoint, SettlementsDashboardQuery,
    SettlementsDashboardReadFuture, SettlementsDashboardReadStore, SettlementsDashboardSnapshot,
    SettlementsDashboardSubject,
};

const LOAD_SETTLEMENT_BILLS: &str = r#"
SELECT
    s.id AS statement_id,
    COALESCE(NULLIF(s.statement_no, ''), CAST(s.id AS TEXT)) AS statement_no,
    COALESCE(NULLIF(s.period, ''), substr(CAST(s.period_start AS TEXT), 1, 7), '-') AS period,
    CAST(COALESCE(s.period_start, s.created_at) AS TEXT) AS period_start,
    CAST(COALESCE(s.period_end, s.updated_at, s.created_at) AS TEXT) AS period_end,
    CAST(COALESCE(s.total_tokens, 0) AS TEXT) AS total_tokens,
    CAST(COALESCE(s.total_cost, 0) AS TEXT) AS total_cost,
    s.statement_status AS statement_status,
    s.payment_status AS payment_status,
    CAST(s.due_at AS TEXT) AS due_at,
    COUNT(DISTINCT us.id) AS settlement_count,
    COUNT(DISTINCT be.id) AS export_count,
    COUNT(DISTINCT pi.id) AS invoice_count
FROM commerce_usage_statement s
LEFT JOIN commerce_usage_settlement us
  ON us.status = 1
 AND us.tenant_id = s.tenant_id
 AND us.organization_id = s.organization_id
 AND us.created_at >= s.period_start
 AND us.created_at <= s.period_end
LEFT JOIN commerce_billing_export be
  ON be.status = 1
 AND be.tenant_id = s.tenant_id
 AND be.organization_id = s.organization_id
 AND be.id = s.export_id
LEFT JOIN commerce_invoice pi
  ON pi.id = CAST(s.invoice_id AS TEXT)
 AND pi.tenant_id = CAST(s.tenant_id AS TEXT)
 AND pi.organization_id = CAST(s.organization_id AS TEXT)
WHERE s.status = 1
  AND s.tenant_id = $1
  AND s.organization_id = $2
  AND s.owner_id = $3
  AND ($4::text IS NULL OR substr(CAST(s.period_start AS TEXT), 1, 4) = $4 OR s.period LIKE ($4 || '%'))
GROUP BY
    s.id,
    s.statement_no,
    s.period,
    s.period_start,
    s.period_end,
    s.created_at,
    s.updated_at,
    s.total_tokens,
    s.total_cost,
    s.statement_status,
    s.payment_status,
    s.due_at
ORDER BY s.period_end DESC NULLS LAST, s.id DESC
LIMIT 24
"#;

const LOAD_SETTLEMENT_ITEMS: &str = r#"
SELECT
    i.statement_id,
    i.modality,
    COALESCE(NULLIF(i.model, ''), '-') AS model,
    CAST(i.model_list AS TEXT) AS model_list,
    COALESCE(NULLIF(i.usage_text, ''), '') AS usage_text,
    CAST(COALESCE(i.request_count, 0) AS TEXT) AS request_count,
    CAST(COALESCE(i.token_count, 0) AS TEXT) AS token_count,
    CAST(COALESCE(i.asset_count, 0) AS TEXT) AS asset_count,
    CAST(COALESCE(i.duration_seconds, 0) AS TEXT) AS duration_seconds,
    CAST(COALESCE(i.cost_amount, 0) AS TEXT) AS cost_amount
FROM commerce_usage_statement_item i
JOIN commerce_usage_statement s
  ON s.id = i.statement_id
WHERE i.status = 1
  AND s.status = 1
  AND s.tenant_id = $1
  AND s.organization_id = $2
  AND s.owner_id = $3
  AND ($4::text IS NULL OR substr(CAST(s.period_start AS TEXT), 1, 4) = $4 OR s.period LIKE ($4 || '%'))
ORDER BY s.period_end DESC NULLS LAST, i.statement_id DESC, i.item_type ASC, i.model ASC
"#;

const LOAD_SETTLEMENT_CHART: &str = r#"
SELECT
    substr(CAST(occurred_at AS TEXT), 1, 10) AS day,
    CAST(COALESCE(SUM(CASE WHEN modality = 1 THEN COALESCE(customer_charge_amount, 0) ELSE 0 END), 0) AS TEXT) AS text_cost,
    CAST(COALESCE(SUM(CASE WHEN modality = 2 THEN COALESCE(customer_charge_amount, 0) ELSE 0 END), 0) AS TEXT) AS image_cost,
    CAST(COALESCE(SUM(CASE WHEN modality = 5 THEN COALESCE(customer_charge_amount, 0) ELSE 0 END), 0) AS TEXT) AS video_cost,
    CAST(COALESCE(SUM(CASE WHEN modality = 3 THEN COALESCE(customer_charge_amount, 0) ELSE 0 END), 0) AS TEXT) AS audio_cost,
    CAST(COALESCE(SUM(CASE WHEN modality = 4 THEN COALESCE(customer_charge_amount, 0) ELSE 0 END), 0) AS TEXT) AS music_cost
FROM ai_usage_fact
WHERE status = 1
  AND tenant_id = $1
  AND organization_id = $2
  AND user_id = $3
  AND occurred_at IS NOT NULL
  AND ($4::text IS NULL OR substr(CAST(occurred_at AS TEXT), 1, 4) = $4)
GROUP BY day
ORDER BY day ASC
LIMIT 366
"#;

#[derive(Debug, Clone)]
pub struct PostgresSettlementsDashboardReadStore {
    pool: PgPool,
}

impl PostgresSettlementsDashboardReadStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl SettlementsDashboardReadStore for PostgresSettlementsDashboardReadStore {
    fn load_settlements_dashboard<'a>(
        &'a self,
        query: SettlementsDashboardQuery,
        subject: Option<SettlementsDashboardSubject>,
    ) -> SettlementsDashboardReadFuture<'a> {
        Box::pin(async move {
            let subject = require_subject(subject)?;
            let bills = load_settlement_bills(&self.pool, &query, subject).await?;
            let chart_data = load_settlement_chart(&self.pool, &query, subject).await?;

            Ok(SettlementsDashboardSnapshot { chart_data, bills })
        })
    }
}

async fn load_settlement_bills(
    pool: &PgPool,
    query: &SettlementsDashboardQuery,
    subject: SettlementsDashboardSubject,
) -> RepositoryResult<Vec<SettlementBill>> {
    let year = year_filter(query);
    let bill_rows = sqlx::query(LOAD_SETTLEMENT_BILLS)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .bind(year.as_deref())
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("settlements dashboard query", error))?;

    let mut bill_indexes = HashMap::new();
    let mut bills = Vec::with_capacity(bill_rows.len());
    for row in bill_rows {
        let statement_id = row.integer_cell("statement_id");
        bill_indexes.insert(statement_id, bills.len());
        bills.push(row_to_bill(&row)?);
    }

    let item_rows = sqlx::query(LOAD_SETTLEMENT_ITEMS)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .bind(year.as_deref())
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("settlements dashboard query", error))?;

    for row in item_rows {
        let statement_id = row.integer_cell("statement_id");
        if let Some(index) = bill_indexes.get(&statement_id).copied() {
            merge_item_into_breakdown(&mut bills[index].breakdown, &row)?;
        }
    }

    Ok(bills)
}

async fn load_settlement_chart(
    pool: &PgPool,
    query: &SettlementsDashboardQuery,
    subject: SettlementsDashboardSubject,
) -> RepositoryResult<Vec<SettlementChartPoint>> {
    let year = year_filter(query);
    let rows = sqlx::query(LOAD_SETTLEMENT_CHART)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .bind(year.as_deref())
        .fetch_all(pool)
        .await
        .map_err(|error| store_error("settlements dashboard query", error))?;

    rows.into_iter()
        .map(|row| chart_point_from_row(&row))
        .collect()
}
