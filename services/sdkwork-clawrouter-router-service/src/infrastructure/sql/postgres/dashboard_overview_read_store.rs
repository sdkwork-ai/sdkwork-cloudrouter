use sqlx::{PgPool, Row};

use crate::domain::DomainError;
use crate::infrastructure::sql::dashboard_overview_metrics::derive_dashboard_summary_rates;
use crate::infrastructure::sql::model_modality;
use crate::ports::{
    DashboardAnnouncement, DashboardChartPoint, DashboardConfigurationDomain,
    DashboardOverviewQuery, DashboardOverviewReadFuture, DashboardOverviewReadStore,
    DashboardOverviewSnapshot, DashboardOverviewSubject, DashboardOverviewSummary,
    DashboardSparklinePoint, DashboardTopModel,
};

const LOAD_USAGE_SUMMARY: &str = r#"
SELECT
    CAST(COALESCE(SUM(COALESCE(request_count, 0)), 0) AS TEXT) AS request_count,
    CAST(COALESCE(SUM(COALESCE(total_tokens, 0)), 0) AS TEXT) AS total_tokens,
    CAST(COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS TEXT) AS used_credits,
    CAST(COALESCE(SUM(CASE WHEN modality = 2 THEN COALESCE(request_count, 0) ELSE 0 END), 0) AS TEXT) AS image_requests,
    CAST(COALESCE(SUM(CASE WHEN modality = 5 THEN COALESCE(request_count, 0) ELSE 0 END), 0) AS TEXT) AS video_requests,
    CAST(COALESCE(SUM(CASE WHEN modality = 3 THEN COALESCE(request_count, 0) ELSE 0 END), 0) AS TEXT) AS audio_requests,
    CAST(COALESCE(SUM(CASE WHEN modality = 4 THEN COALESCE(request_count, 0) ELSE 0 END), 0) AS TEXT) AS music_requests
FROM ai_usage_fact
WHERE status = 1
  AND tenant_id = $1
  AND organization_id = $2
  AND user_id = $3
  AND ($4::text IS NULL OR occurred_at >= ($4::timestamp AT TIME ZONE 'UTC'))
  AND ($5::text IS NULL OR occurred_at <= ($5::timestamp AT TIME ZONE 'UTC'))
"#;

const LOAD_ERROR_COUNT: &str = r#"
SELECT CAST(COUNT(DISTINCT COALESCE(NULLIF(request_id, ''), CAST(id AS TEXT))) AS TEXT) AS error_count
FROM ai_request_trace
WHERE status = 1
  AND tenant_id = $1
  AND organization_id = $2
  AND user_id = $3
  AND started_at IS NOT NULL
  AND ($4::text IS NULL OR started_at >= ($4::timestamp AT TIME ZONE 'UTC'))
  AND ($5::text IS NULL OR started_at <= ($5::timestamp AT TIME ZONE 'UTC'))
  AND (
    (http_status IS NOT NULL AND http_status >= 400)
    OR error_type IS NOT NULL
    OR NULLIF(provider_error_code, '') IS NOT NULL
  )
"#;

const LOAD_USAGE_TOTALS: &str = r#"
SELECT
    CAST(COALESCE(SUM(COALESCE(request_count, 0)), 0) AS TEXT) AS total_request_count,
    CAST(COALESCE(SUM(COALESCE(customer_charge_amount, 0)), 0) AS TEXT) AS total_used_credits
FROM ai_usage_fact
WHERE status = 1
  AND tenant_id = $1
  AND organization_id = $2
  AND user_id = $3
"#;

const LOAD_USAGE_CHART: &str = r#"
SELECT
    substr(CAST(occurred_at AS TEXT), 1, $6) AS period,
    CAST(COALESCE(SUM(CASE WHEN modality = 1 THEN COALESCE(request_count, 0) ELSE 0 END), 0) AS TEXT) AS text_requests,
    CAST(COALESCE(SUM(CASE WHEN modality = 2 THEN COALESCE(request_count, 0) ELSE 0 END), 0) AS TEXT) AS image_requests,
    CAST(COALESCE(SUM(CASE WHEN modality = 5 THEN COALESCE(request_count, 0) ELSE 0 END), 0) AS TEXT) AS video_requests,
    CAST(COALESCE(SUM(CASE WHEN modality = 3 THEN COALESCE(request_count, 0) ELSE 0 END), 0) AS TEXT) AS audio_requests,
    CAST(COALESCE(SUM(CASE WHEN modality = 4 THEN COALESCE(request_count, 0) ELSE 0 END), 0) AS TEXT) AS music_requests
FROM ai_usage_fact
WHERE status = 1
  AND tenant_id = $1
  AND organization_id = $2
  AND user_id = $3
  AND occurred_at IS NOT NULL
  AND ($4::text IS NULL OR occurred_at >= ($4::timestamp AT TIME ZONE 'UTC'))
  AND ($5::text IS NULL OR occurred_at <= ($5::timestamp AT TIME ZONE 'UTC'))
GROUP BY period
ORDER BY period ASC
LIMIT 60
"#;

const LOAD_TOP_MODELS: &str = r#"
SELECT
    COALESCE(r.rank_no, 0) AS rank_no,
    COALESCE(r.previous_rank_no, 0) AS previous_rank_no,
    COALESCE(r.model, 'unknown') AS model,
    COALESCE(NULLIF(r.vendor_name_snapshot, ''), COALESCE(r.vendor_code, '-')) AS supplier,
    r.modality,
    CAST(COALESCE(r.request_count, 0) AS TEXT) AS request_count,
    CAST(COALESCE(r.cost_amount, 0) AS TEXT) AS cost_amount
FROM ai_model_rank_snapshot r
JOIN ai_model m
  ON m.catalog_key = r.catalog_key
 AND m.deleted_at IS NULL
 AND m.status = 1
 AND COALESCE(m.release_stage, 1) IN (1, 2)
 AND COALESCE(m.shelf_state, 1) = 1
 AND COALESCE(m.routing_state, 1) = 1
 AND (
     ($1 > 0 AND m.tenant_id = $1 AND m.organization_id = $2)
     OR ($1 > 0 AND $2 > 0 AND m.tenant_id = $1 AND m.organization_id = 0)
     OR (m.tenant_id = 0 AND m.organization_id = 0)
 )
WHERE r.status = 1
  AND (r.tenant_id = $1 OR r.tenant_id = 0 OR r.tenant_id IS NULL)
  AND (r.organization_id = $2 OR r.organization_id = 0 OR r.organization_id IS NULL)
  AND NULLIF(r.catalog_key, '') IS NOT NULL
ORDER BY
    CASE
        WHEN r.organization_id = $2 THEN 0
        WHEN r.tenant_id = $1 THEN 1
        ELSE 2
    END ASC,
    r.snapshot_date DESC NULLS LAST,
    r.snapshot_period DESC NULLS LAST,
    r.rank_no ASC NULLS LAST,
    r.id DESC
LIMIT 5
"#;

const LOAD_ANNOUNCEMENTS: &str = r#"
SELECT
    m.id,
    COALESCE(NULLIF(m.title, ''), NULLIF(m.summary, ''), NULLIF(m.content, ''), '') AS text,
    CAST(COALESCE(m.published_at, m.created_at) AS TEXT) AS published_at,
    m.severity
FROM ops_notification_message m
WHERE m.status = 1
  AND m.deleted_at IS NULL
  AND m.tenant_id = $1
  AND m.organization_id = $2
  AND m.scope_type = 2
  AND m.message_code = ('announcement:' || m.id::text)
  AND (m.published_at IS NULL OR m.published_at <= CURRENT_TIMESTAMP)
  AND (m.expire_at IS NULL OR m.expire_at > CURRENT_TIMESTAMP)
  AND EXISTS (
      SELECT 1
      FROM ops_notification_recipient r
      WHERE r.message_id = m.id
        AND r.tenant_id = m.tenant_id
        AND r.organization_id = m.organization_id
        AND r.status = 1
        AND r.deleted_at IS NULL
        AND r.recipient_type = 1
  )
ORDER BY COALESCE(m.priority, 0) DESC, m.published_at DESC NULLS LAST, m.id DESC
LIMIT 5
"#;

const LOAD_PERFORMANCE_SPARKLINE: &str = r#"
SELECT CAST(COALESCE(metric_value, 0) AS TEXT) AS metric_value
FROM ops_metric_snapshot
WHERE status = 1
  AND (tenant_id = $1 OR tenant_id = 0 OR tenant_id IS NULL)
  AND (organization_id = $2 OR organization_id = 0 OR organization_id IS NULL)
  AND lower(COALESCE(metric_name, '')) IN ('latency_p50_ms', 'latency_p95_ms', 'gateway_latency_ms')
ORDER BY period_start DESC NULLS LAST, id DESC
LIMIT 10
"#;

const LOAD_CONFIGURATION_NODES: &str = r#"
SELECT
    COALESCE(NULLIF(i.instance_code, ''), i.id::text, i.uuid) AS id,
    COALESCE(NULLIF(i.node_name, ''), NULLIF(i.host_name, ''), NULLIF(i.instance_code, ''), i.uuid) AS name,
    COALESCE(NULLIF(i.host_name, ''), NULLIF(i.instance_code, ''), i.uuid) AS host_name,
    COALESCE(i.ip_address_masked, '') AS ip,
    COALESCE(i.region, '') AS region,
    COALESCE(i.cell, '') AS cell,
    COALESCE(i.metadata::text, '') AS metadata,
    i.health_status AS health_status
FROM ops_gateway_instance i
WHERE (i.tenant_id = $1 OR i.tenant_id = 0 OR i.tenant_id IS NULL)
  AND (i.organization_id = $2 OR i.organization_id = 0 OR i.organization_id IS NULL)
  AND i.status = 1
  AND i.deleted_at IS NULL
ORDER BY i.last_heartbeat_at DESC NULLS LAST, i.updated_at DESC NULLS LAST, i.id DESC
LIMIT 20
"#;

pub struct PostgresDashboardOverviewReadStore {
    pool: PgPool,
}

impl PostgresDashboardOverviewReadStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl DashboardOverviewReadStore for PostgresDashboardOverviewReadStore {
    fn load_dashboard_overview<'a>(
        &'a self,
        query: DashboardOverviewQuery,
        subject: Option<DashboardOverviewSubject>,
    ) -> DashboardOverviewReadFuture<'a> {
        Box::pin(async move {
            let subject = subject.ok_or_else(|| {
                DomainError::new("trusted request subject is required for dashboard overview")
            })?;
            let mut summary = load_summary(&self.pool, &query, subject).await?;
            let chart_data = load_chart_data(&self.pool, &query, subject).await?;
            let top_models = load_top_models(&self.pool, subject).await?;
            let announcements = load_announcements(&self.pool, subject).await?;
            let performance_sparkline = load_performance_sparkline(&self.pool, subject).await?;
            let configuration_domains = load_configuration_nodes(&self.pool, subject).await?;

            if summary.request_count == 0 {
                summary.request_count = chart_data
                    .iter()
                    .map(|item| item.total_requests() as i64)
                    .sum();
            }

            Ok(DashboardOverviewSnapshot {
                summary,
                request_sparkline: build_sparkline(
                    &chart_data,
                    DashboardChartPoint::total_requests,
                ),
                multimodal_sparkline: build_sparkline(
                    &chart_data,
                    DashboardChartPoint::multimodal_requests,
                ),
                performance_sparkline,
                chart_data,
                top_models,
                announcements,
                configuration_domains,
                warnings: Vec::new(),
            })
        })
    }
}

async fn load_summary(
    pool: &PgPool,
    query: &DashboardOverviewQuery,
    subject: DashboardOverviewSubject,
) -> Result<DashboardOverviewSummary, DomainError> {
    let row = sqlx::query(LOAD_USAGE_SUMMARY)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .bind(query.start_time.as_deref())
        .bind(query.end_time.as_deref())
        .fetch_one(pool)
        .await
        .map_err(sql_error)?;

    let request_count = integer_cell(&row, "request_count");
    let total_tokens = decimal_cell(&row, "total_tokens");
    let (rpm, tpm) = derive_dashboard_summary_rates(query, request_count, total_tokens);
    let error_count = load_error_count(pool, query, subject).await?;
    let (total_request_count, total_used_credits) = load_usage_totals(pool, subject).await?;

    Ok(DashboardOverviewSummary {
        available_credits: 0.0,
        used_credits: decimal_cell(&row, "used_credits"),
        request_count,
        total_used_credits,
        total_request_count,
        error_count,
        image_requests: integer_cell(&row, "image_requests"),
        video_requests: integer_cell(&row, "video_requests"),
        audio_requests: integer_cell(&row, "audio_requests"),
        music_requests: integer_cell(&row, "music_requests"),
        rpm,
        tpm,
    })
}

async fn load_error_count(
    pool: &PgPool,
    query: &DashboardOverviewQuery,
    subject: DashboardOverviewSubject,
) -> Result<i64, DomainError> {
    let row = sqlx::query(LOAD_ERROR_COUNT)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .bind(query.start_time.as_deref())
        .bind(query.end_time.as_deref())
        .fetch_one(pool)
        .await
        .map_err(sql_error)?;

    Ok(integer_cell(&row, "error_count"))
}

async fn load_usage_totals(
    pool: &PgPool,
    subject: DashboardOverviewSubject,
) -> Result<(i64, f64), DomainError> {
    let row = sqlx::query(LOAD_USAGE_TOTALS)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .fetch_one(pool)
        .await
        .map_err(sql_error)?;

    Ok((
        integer_cell(&row, "total_request_count"),
        decimal_cell(&row, "total_used_credits"),
    ))
}

async fn load_chart_data(
    pool: &PgPool,
    query: &DashboardOverviewQuery,
    subject: DashboardOverviewSubject,
) -> Result<Vec<DashboardChartPoint>, DomainError> {
    let period_length = chart_period_length(query.keyword.as_deref());
    let rows = sqlx::query(LOAD_USAGE_CHART)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .bind(subject.user_id)
        .bind(query.start_time.as_deref())
        .bind(query.end_time.as_deref())
        .bind(period_length)
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;

    Ok(rows
        .into_iter()
        .map(|row| DashboardChartPoint {
            time: string_cell(&row, "period"),
            text_requests: decimal_cell(&row, "text_requests"),
            image_requests: decimal_cell(&row, "image_requests"),
            video_requests: decimal_cell(&row, "video_requests"),
            audio_requests: decimal_cell(&row, "audio_requests"),
            music_requests: decimal_cell(&row, "music_requests"),
        })
        .collect())
}

async fn load_top_models(
    pool: &PgPool,
    subject: DashboardOverviewSubject,
) -> Result<Vec<DashboardTopModel>, DomainError> {
    let rows = sqlx::query(LOAD_TOP_MODELS)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;

    Ok(rows
        .into_iter()
        .enumerate()
        .map(|(index, row)| {
            let rank = integer_cell(&row, "rank_no").max(1);
            let previous_rank = integer_cell(&row, "previous_rank_no");
            let (trend, is_up) = rank_trend(rank, previous_rank);
            DashboardTopModel {
                rank: if rank > 0 { rank } else { index as i64 + 1 },
                name: string_cell(&row, "model"),
                supplier: string_cell(&row, "supplier"),
                modality: modality_label(optional_integer_cell(&row, "modality")),
                requests: integer_cell(&row, "request_count"),
                cost: decimal_cell(&row, "cost_amount"),
                trend,
                is_up,
            }
        })
        .collect())
}

async fn load_announcements(
    pool: &PgPool,
    subject: DashboardOverviewSubject,
) -> Result<Vec<DashboardAnnouncement>, DomainError> {
    let rows = sqlx::query(LOAD_ANNOUNCEMENTS)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;

    Ok(rows
        .into_iter()
        .map(|row| DashboardAnnouncement {
            id: integer_cell(&row, "id"),
            text: string_cell(&row, "text"),
            time: string_cell(&row, "published_at"),
            announcement_type: announcement_type_label(optional_integer_cell(&row, "severity")),
        })
        .collect())
}

async fn load_performance_sparkline(
    pool: &PgPool,
    subject: DashboardOverviewSubject,
) -> Result<Vec<DashboardSparklinePoint>, DomainError> {
    let rows = sqlx::query(LOAD_PERFORMANCE_SPARKLINE)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;

    let mut points: Vec<DashboardSparklinePoint> = rows
        .into_iter()
        .map(|row| DashboardSparklinePoint {
            value: decimal_cell(&row, "metric_value"),
        })
        .collect();
    points.reverse();
    Ok(points)
}

async fn load_configuration_nodes(
    pool: &PgPool,
    subject: DashboardOverviewSubject,
) -> Result<Vec<DashboardConfigurationDomain>, DomainError> {
    let rows = sqlx::query(LOAD_CONFIGURATION_NODES)
        .bind(subject.tenant_id)
        .bind(subject.organization_id)
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;

    Ok(rows.into_iter().map(configuration_node_from_row).collect())
}

fn configuration_node_from_row(row: sqlx::postgres::PgRow) -> DashboardConfigurationDomain {
    let metadata = parse_metadata(&string_cell(&row, "metadata"));
    let host_name = string_cell(&row, "host_name");
    let region = string_cell(&row, "region");
    let cell = string_cell(&row, "cell");
    DashboardConfigurationDomain {
        id: string_cell(&row, "id"),
        name: string_cell(&row, "name"),
        domain: metadata_text(
            &metadata,
            &[
                "domain",
                "baseUrl",
                "base_url",
                "endpoint",
                "publicUrl",
                "public_url",
                "origin",
            ],
        )
        .unwrap_or(host_name),
        ip: string_cell(&row, "ip"),
        status: configuration_node_status(optional_integer_cell(&row, "health_status")),
        remark: metadata_text(
            &metadata,
            &["remark", "remarks", "description", "note", "memo"],
        )
        .unwrap_or_else(|| configuration_node_remark(&region, &cell)),
    }
}

fn build_sparkline(
    chart_data: &[DashboardChartPoint],
    selector: fn(&DashboardChartPoint) -> f64,
) -> Vec<DashboardSparklinePoint> {
    let start = chart_data.len().saturating_sub(10);
    chart_data[start..]
        .iter()
        .map(|item| DashboardSparklinePoint {
            value: selector(item),
        })
        .filter(|item| item.value.is_finite())
        .collect()
}

fn chart_period_length(keyword: Option<&str>) -> i32 {
    match keyword.unwrap_or("").trim().to_ascii_lowercase().as_str() {
        "hourly" => 13,
        "monthly" => 7,
        "yearly" => 4,
        _ => 10,
    }
}

fn rank_trend(rank: i64, previous_rank: i64) -> (String, bool) {
    if previous_rank <= 0 || previous_rank == rank {
        return ("0".to_owned(), true);
    }
    if previous_rank > rank {
        (format!("+{}", previous_rank - rank), true)
    } else {
        (format!("-{}", rank - previous_rank), false)
    }
}

fn modality_label(value: Option<i64>) -> String {
    model_modality::label(value).to_owned()
}

fn announcement_type_label(value: Option<i64>) -> String {
    match value {
        Some(1) => "info",
        Some(2) => "success",
        Some(3) => "warning",
        Some(4) => "error",
        None => "unknown",
        Some(_) => "unknown",
    }
    .to_owned()
}

fn configuration_node_status(value: Option<i64>) -> String {
    match value {
        Some(1) => "online",
        Some(2) => "warning",
        Some(0) => "offline",
        _ => "unknown",
    }
    .to_owned()
}

fn configuration_node_remark(region: &str, cell: &str) -> String {
    match (region.trim(), cell.trim()) {
        ("", "") => String::new(),
        (region, "") => region.to_owned(),
        ("", cell) => cell.to_owned(),
        (region, cell) => format!("{region} / {cell}"),
    }
}

fn parse_metadata(value: &str) -> serde_json::Value {
    serde_json::from_str(value).unwrap_or(serde_json::Value::Null)
}

fn metadata_text(metadata: &serde_json::Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| {
        metadata
            .get(*key)
            .and_then(|value| value.as_str())
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
    })
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    row.try_get::<Option<String>, _>(column)
        .ok()
        .flatten()
        .unwrap_or_default()
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    optional_integer_cell(row, column).unwrap_or(0)
}

fn optional_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column)
        .ok()
        .flatten()
        .or_else(|| {
            string_cell(row, column)
                .parse::<f64>()
                .ok()
                .map(|value| value as i64)
        })
}

fn decimal_cell(row: &sqlx::postgres::PgRow, column: &str) -> f64 {
    string_cell(row, column).parse::<f64>().unwrap_or(0.0)
}

fn sql_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sql::model_modality::{MODALITY_IMAGE, MODALITY_TEXT};

    #[test]
    fn modality_label_reports_unknown_instead_of_defaulting_to_text() {
        assert_eq!("text", modality_label(Some(MODALITY_TEXT)));
        assert_eq!("image", modality_label(Some(MODALITY_IMAGE)));
        assert_eq!("unknown", modality_label(None));
        assert_eq!("unknown", modality_label(Some(99)));
    }

    #[test]
    fn announcement_type_label_reports_unknown_instead_of_defaulting_to_info() {
        assert_eq!("info", announcement_type_label(Some(1)));
        assert_eq!("success", announcement_type_label(Some(2)));
        assert_eq!("warning", announcement_type_label(Some(3)));
        assert_eq!("error", announcement_type_label(Some(4)));
        assert_eq!("unknown", announcement_type_label(None));
        assert_eq!("unknown", announcement_type_label(Some(99)));
    }
}
