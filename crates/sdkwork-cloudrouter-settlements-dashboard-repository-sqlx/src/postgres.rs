use std::collections::HashMap;

use sdkwork_cloudrouter_router_service::domain::DomainError;
use sqlx::{AssertSqlSafe, PgPool};

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

const BILLABLE_USAGE_SELECT: &str = r#"
SELECT
    c.invocation_id,
    c.tenant_id,
    c.organization_id,
    c.user_id,
    c.amount AS customer_charge_amount,
    c.cost_amount AS upstream_cost_amount,
    COALESCE((m.dimensions_json ->> 'totalTokens')::bigint, 0) AS total_tokens,
    COALESCE((m.dimensions_json ->> 'requestCount')::bigint, 0) AS request_count,
    COALESCE((m.dimensions_json ->> 'modality')::integer, 0) AS modality,
    GREATEST(
        COALESCE((m.dimensions_json ->> 'resultCount')::bigint, 0),
        COALESCE((m.dimensions_json ->> 'imageCount')::bigint, 0)
    ) AS asset_count,
    COALESCE((m.dimensions_json ->> 'audioSeconds')::numeric, 0)
        + COALESCE((m.dimensions_json ->> 'videoSeconds')::numeric, 0) AS duration_seconds,
    COALESCE(
        NULLIF(d.pricing_snapshot #>> '{resource,requestedModel}', ''),
        NULLIF(d.pricing_snapshot #>> '{model,model}', ''),
        NULLIF(m.catalog_key, ''),
        '-'
    ) AS model,
    CASE
        WHEN c.charge_status = 'settled' OR c.settled_at IS NOT NULL THEN 2
        WHEN c.charge_status IN ('failed', 'rejected') THEN 3
        ELSE 0
    END AS settlement_status,
    c.charged_at AS occurred_at
FROM cloudrouter_charge_line c
JOIN cloudrouter_rating_decision d
  ON d.tenant_id = c.tenant_id
 AND d.organization_id = c.organization_id
 AND d.id = c.rating_decision_id
JOIN cloudrouter_usage_measurement m
  ON m.tenant_id = d.tenant_id
 AND m.organization_id = d.organization_id
 AND m.id = d.measurement_id
WHERE c.status = 1
  AND c.charge_status IN ('rated', 'settled')
  AND c.amount > 0
  AND d.status = 1
  AND d.decision_status = 'rated'
  AND d.billability = 'chargeable'
UNION ALL
SELECT
    COALESCE(NULLIF(legacy.request_id, ''), CAST(legacy.id AS TEXT)),
    legacy.tenant_id,
    legacy.organization_id,
    legacy.user_id,
    legacy.customer_charge_amount,
    COALESCE(legacy.upstream_cost_amount, 0),
    COALESCE(legacy.total_tokens, 0),
    COALESCE(legacy.request_count, 0),
    COALESCE(legacy.modality, 0),
    GREATEST(COALESCE(legacy.result_count, 0), COALESCE(legacy.image_count, 0)),
    COALESCE(legacy.audio_seconds, 0) + COALESCE(legacy.video_seconds, 0),
    COALESCE(NULLIF(legacy.requested_model, ''), NULLIF(legacy.catalog_key, ''), '-'),
    COALESCE(legacy.settlement_status, 0),
    legacy.occurred_at
FROM ai_metering_usage legacy
WHERE legacy.status = 1
  AND COALESCE(legacy.customer_charge_amount, 0) > 0
  AND NOT EXISTS (
      SELECT 1
      FROM cloudrouter_rating_decision current_decision
      WHERE current_decision.tenant_id = legacy.tenant_id
        AND current_decision.organization_id = legacy.organization_id
        AND current_decision.invocation_id = legacy.request_id
        AND current_decision.status = 1
  )
"#;

fn billable_usage_query(body: &str) -> AssertSqlSafe<String> {
    AssertSqlSafe(format!(
        "WITH billable_usage AS ({BILLABLE_USAGE_SELECT})\n{body}"
    ))
}

/// Monthly settlement bills aggregated from the immutable charge ledger.
/// Legacy metering facts remain a history-only fallback for invocations that
/// have no rating decision in the current billing system.
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
FROM billable_usage
WHERE tenant_id = $1
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
    model,
    '[]' AS model_list,
    '' AS usage_text,
    CAST(COALESCE(SUM(request_count), 0) AS TEXT) AS request_count,
    CAST(COALESCE(SUM(total_tokens), 0) AS TEXT) AS token_count,
    CAST(COALESCE(SUM(asset_count), 0) AS TEXT) AS asset_count,
    CAST(COALESCE(SUM(duration_seconds), 0) AS TEXT) AS duration_seconds,
    CAST(COALESCE(SUM(customer_charge_amount), 0) AS TEXT) AS cost_amount
FROM billable_usage
WHERE tenant_id = $1
  AND organization_id = $2
  AND user_id = $3
  AND occurred_at IS NOT NULL
  AND ($4::text IS NULL OR substr(CAST(occurred_at AS TEXT), 1, 4) = $4)
GROUP BY to_char(occurred_at, 'YYYYMM'), modality, model
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
FROM billable_usage
WHERE tenant_id = $1
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
    let bill_rows = sqlx::query(billable_usage_query(LOAD_SETTLEMENT_BILLS))
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

    let item_rows = sqlx::query(billable_usage_query(LOAD_SETTLEMENT_ITEMS))
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
    let rows = sqlx::query(billable_usage_query(LOAD_SETTLEMENT_CHART))
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
