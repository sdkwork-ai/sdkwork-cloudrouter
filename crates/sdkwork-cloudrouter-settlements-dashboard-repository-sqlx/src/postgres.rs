use std::collections::HashMap;

use sdkwork_cloudrouter_router_service::domain::DomainError;
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

/// Monthly settlement bills aggregated from the metering facts
/// (`ai_metering_usage`). The legacy statement tables
/// (`commerce_usage_statement`/`commerce_usage_settlement`/`commerce_billing_export`)
/// have no writers since the settlement bridge was retired, so the dashboard
/// derives bills from the same facts the settlement worker settles.
const LOAD_SETTLEMENT_BILLS: &str = r#"
SELECT
    CAST(to_char(occurred_at, 'YYYYMM') AS BIGINT) AS statement_id,
    to_char(occurred_at, 'YYYY-MM') AS statement_no,
    to_char(occurred_at, 'YYYY-MM') AS period,
    CAST(date_trunc('month', occurred_at) AS TEXT) AS period_start,
    CAST((date_trunc('month', occurred_at) + interval '1 month' - interval '1 day') AS TEXT) AS period_end,
    CAST(COALESCE(SUM(total_tokens), 0) AS TEXT) AS total_tokens,
    CAST(COALESCE(SUM(customer_charge_amount), 0) AS TEXT) AS total_cost,
    CASE
        WHEN bool_and(settlement_status = 2) THEN 2
        WHEN bool_or(settlement_status IN (3, 4)) THEN 3
        ELSE 0
    END AS payment_status,
    2 AS statement_status
FROM ai_metering_usage
WHERE status = 1
  AND tenant_id = $1
  AND organization_id = $2
  AND user_id = $3
  AND occurred_at IS NOT NULL
  AND ($4::text IS NULL OR substr(CAST(occurred_at AS TEXT), 1, 4) = $4)
GROUP BY to_char(occurred_at, 'YYYYMM'), date_trunc('month', occurred_at)
ORDER BY period_end DESC
LIMIT 24
"#;

const LOAD_SETTLEMENT_ITEMS: &str = r#"
SELECT
    CAST(to_char(occurred_at, 'YYYYMM') AS BIGINT) AS statement_id,
    modality,
    COALESCE(NULLIF(requested_model, ''), '-') AS model,
    '[]' AS model_list,
    '' AS usage_text,
    CAST(COALESCE(SUM(request_count), 0) AS TEXT) AS request_count,
    CAST(COALESCE(SUM(total_tokens), 0) AS TEXT) AS token_count,
    '0' AS asset_count,
    '0' AS duration_seconds,
    CAST(COALESCE(SUM(customer_charge_amount), 0) AS TEXT) AS cost_amount
FROM ai_metering_usage
WHERE status = 1
  AND tenant_id = $1
  AND organization_id = $2
  AND user_id = $3
  AND occurred_at IS NOT NULL
  AND ($4::text IS NULL OR substr(CAST(occurred_at AS TEXT), 1, 4) = $4)
GROUP BY to_char(occurred_at, 'YYYYMM'), modality, requested_model
ORDER BY to_char(occurred_at, 'YYYYMM') DESC, modality ASC, model ASC
"#;

const LOAD_SETTLEMENT_CHART: &str = r#"
SELECT
    substr(CAST(occurred_at AS TEXT), 1, 10) AS day,
    CAST(COALESCE(SUM(CASE WHEN modality = 1 THEN COALESCE(customer_charge_amount, 0) ELSE 0 END), 0) AS TEXT) AS text_cost,
    CAST(COALESCE(SUM(CASE WHEN modality = 2 THEN COALESCE(customer_charge_amount, 0) ELSE 0 END), 0) AS TEXT) AS image_cost,
    CAST(COALESCE(SUM(CASE WHEN modality = 5 THEN COALESCE(customer_charge_amount, 0) ELSE 0 END), 0) AS TEXT) AS video_cost,
    CAST(COALESCE(SUM(CASE WHEN modality = 3 THEN COALESCE(customer_charge_amount, 0) ELSE 0 END), 0) AS TEXT) AS audio_cost,
    CAST(COALESCE(SUM(CASE WHEN modality = 4 THEN COALESCE(customer_charge_amount, 0) ELSE 0 END), 0) AS TEXT) AS music_cost
FROM ai_metering_usage
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
            let result: RepositoryResult<_> = async {
                let subject = require_subject(subject)?;
                let bills = load_settlement_bills(&self.pool, &query, subject).await?;
                let chart_data = load_settlement_chart(&self.pool, &query, subject).await?;

                Ok(SettlementsDashboardSnapshot { chart_data, bills })
            }
            .await;
            result.map_err(|error| DomainError::new(error.to_string()))
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
