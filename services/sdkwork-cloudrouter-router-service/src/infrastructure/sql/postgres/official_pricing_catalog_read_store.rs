use std::collections::HashMap;

use sqlx::{PgPool, Row};

use crate::domain::DomainError;
use crate::ports::{
    OfficialPricingCatalogQuery, OfficialPricingCatalogReadFuture, OfficialPricingCatalogReadStore,
    OfficialPricingCatalogSnapshot, OfficialPricingFormula, OfficialPricingFormulaTerm,
    OfficialPricingGroupFacet, OfficialPricingMeterFacet, OfficialPricingRate,
    OfficialPricingRateCondition, OfficialPricingRateTier, OfficialPricingValueFacet,
};

const CATEGORY_CODES_SQL: &str = r#"
ARRAY_REMOVE(ARRAY[
    'all',
    CASE
        WHEN lower(o.operation_kind) IN ('inference', 'chat', 'completion', 'responses')
          OR starts_with(lower(m.meter_code), 'llm_') THEN 'llm'
        WHEN lower(o.operation_kind) = 'image'
          OR starts_with(lower(m.meter_code), 'image_') THEN 'image'
        WHEN lower(o.operation_kind) = 'video'
          OR starts_with(lower(m.meter_code), 'video_') THEN 'video'
        WHEN lower(o.operation_kind) = 'audio'
          OR starts_with(lower(m.meter_code), 'audio_') THEN 'audio'
        WHEN lower(o.operation_kind) = 'music'
          OR starts_with(lower(m.meter_code), 'music_') THEN 'music'
        WHEN lower(o.operation_kind) = 'embedding'
          OR starts_with(lower(m.meter_code), 'embedding_') THEN 'embedding'
        WHEN lower(o.operation_kind) IN ('sound', 'sfx')
          OR starts_with(lower(m.meter_code), 'sfx_')
          OR starts_with(lower(m.meter_code), 'sound_') THEN 'sound'
        ELSE 'other'
    END,
    CASE
        WHEN lower(m.meter_code) IN ('api_request', 'api_result')
          OR lower(m.quantity_kind) IN ('api_request', 'api_result', 'per_request', 'per_result')
        THEN 'api'
        ELSE NULL
    END
], NULL)
"#;

const LOAD_RATES_PREFIX: &str = r#"
WITH eligible AS (
    SELECT
        r.id,
        r.rate_code,
        r.rate_hash,
        __CATEGORY_CODES__ AS group_codes,
        p.product_code,
        p.product_kind,
        p.display_name AS product_display_name,
        o.operation_code,
        o.operation_kind,
        o.display_name AS operation_display_name,
        binding.vendor_code,
        binding.provider_code,
        binding.region_code,
        binding.resource_type,
        binding.resource_code,
        binding.catalog_key,
        binding.api_format,
        binding.endpoint_code,
        book.price_book_code,
        book.price_book_version,
        m.meter_code,
        m.display_name AS meter_display_name,
        m.quantity_kind,
        m.unit_code,
        r.billability,
        r.charge_timing,
        r.calculation_mode,
        r.quantity_aggregation,
        CAST(r.unit_size AS TEXT) AS unit_size,
        CAST(r.unit_price AS TEXT) AS unit_price,
        CAST(r.minimum_quantity AS TEXT) AS minimum_quantity,
        CAST(r.quantity_step AS TEXT) AS quantity_step,
        r.currency_code,
        CAST(r.effective_from AS TEXT) AS effective_from,
        CAST(r.effective_to AS TEXT) AS effective_to,
        r.source_url,
        CAST(r.source_observed_at AS TEXT) AS source_observed_at,
        model_cap.capabilities::text AS model_capabilities,
        model_cap.input_modalities::text AS model_input_modalities,
        model_cap.output_modalities::text AS model_output_modalities,
        model_cap.usage_scopes::text AS model_usage_scopes,
        model_cap.context_tokens AS model_context_tokens,
        model_cap.max_input_tokens AS model_max_input_tokens,
        model_cap.max_output_tokens AS model_max_output_tokens,
        model_cap.supports_streaming AS model_supports_streaming,
        model_cap.supports_tools AS model_supports_tools,
        model_cap.supports_json_schema AS model_supports_json_schema
    FROM pricing_rate r
    JOIN pricing_price_book book
      ON book.tenant_id = r.tenant_id
     AND book.organization_id = r.organization_id
     AND book.id = r.price_book_id
    JOIN pricing_product p
      ON p.tenant_id = r.tenant_id
     AND p.organization_id = r.organization_id
     AND p.id = r.product_id
    JOIN pricing_operation o
      ON o.tenant_id = r.tenant_id
     AND o.organization_id = r.organization_id
     AND o.id = r.operation_id
    JOIN pricing_meter m
      ON m.tenant_id = r.tenant_id
     AND m.organization_id = r.organization_id
     AND m.id = r.meter_id
    JOIN LATERAL (
        SELECT pb.*
        FROM pricing_rate_binding rb
        JOIN pricing_product_binding pb
          ON pb.tenant_id = rb.tenant_id
         AND pb.organization_id = rb.organization_id
         AND pb.id = rb.product_binding_id
        WHERE rb.tenant_id = r.tenant_id
          AND rb.organization_id = r.organization_id
          AND rb.rate_id = r.id
          AND rb.status = 1
          AND rb.deleted_at IS NULL
          AND pb.status = 1
          AND pb.deleted_at IS NULL
        ORDER BY pb.account_id NULLS FIRST, pb.id
        LIMIT 1
    ) binding ON TRUE
    LEFT JOIN ai_model model_cap
      ON model_cap.tenant_id = r.tenant_id
     AND model_cap.organization_id = r.organization_id
     AND model_cap.status = 1
     AND model_cap.deleted_at IS NULL
     AND model_cap.catalog_key = binding.catalog_key
    WHERE r.tenant_id = 0
      AND r.organization_id = 0
      AND r.status = 1
      AND r.deleted_at IS NULL
      AND book.status = 1
      AND book.deleted_at IS NULL
      AND book.price_side = 'official_reference'
      AND book.lifecycle_state = 'active'
      AND book.effective_from <= CURRENT_TIMESTAMP
      AND (book.effective_to IS NULL OR book.effective_to > CURRENT_TIMESTAMP)
      AND p.status = 1
      AND p.deleted_at IS NULL
      AND o.status = 1
      AND o.deleted_at IS NULL
      AND m.status = 1
      AND m.deleted_at IS NULL
      AND r.effective_from <= CURRENT_TIMESTAMP
      AND (r.effective_to IS NULL OR r.effective_to > CURRENT_TIMESTAMP)
)
"#;

const FILTERED_RATES_CTE_SUFFIX: &str = r#"
, filtered AS (
SELECT *
FROM eligible
WHERE ($1 = 'all' OR $1 = ANY(group_codes))
  AND (
      $2::text IS NULL
      OR lower(product_code) LIKE $2
      OR lower(product_display_name) LIKE $2
      OR lower(operation_code) LIKE $2
      OR lower(vendor_code) LIKE $2
      OR lower(provider_code) LIKE $2
      OR lower(resource_code) LIKE $2
      OR lower(COALESCE(catalog_key, '')) LIKE $2
      OR lower(meter_code) LIKE $2
      OR lower(meter_display_name) LIKE $2
  )
  AND ($3::text IS NULL OR vendor_code = $3)
  AND ($4::text IS NULL OR region_code = $4)
  AND ($5::text IS NULL OR meter_code = $5)
)
"#;

const COUNT_RATES_SUFFIX: &str = r#"
SELECT COUNT(*) AS total
FROM filtered
"#;

const LOAD_RATES_SUFFIX: &str = r#"
SELECT *
FROM filtered
ORDER BY product_display_name, resource_code, operation_code, meter_code, rate_code
LIMIT $6 OFFSET $7
"#;

const LOAD_FACETS_SUFFIX: &str = r#"
, searched AS (
    SELECT *
    FROM eligible
    WHERE (
        $1::text IS NULL
        OR lower(product_code) LIKE $1
        OR lower(product_display_name) LIKE $1
        OR lower(operation_code) LIKE $1
        OR lower(vendor_code) LIKE $1
        OR lower(provider_code) LIKE $1
        OR lower(resource_code) LIKE $1
        OR lower(COALESCE(catalog_key, '')) LIKE $1
        OR lower(meter_code) LIKE $1
        OR lower(meter_display_name) LIKE $1
    )
      AND ($2::text IS NULL OR vendor_code = $2)
      AND ($3::text IS NULL OR region_code = $3)
      AND ($4::text IS NULL OR meter_code = $4)
), category_filtered AS (
    SELECT * FROM searched WHERE ($5 = 'all' OR $5 = ANY(group_codes))
)
SELECT 'group' AS facet_kind, group_code AS code, '' AS display_name, '' AS unit_code,
       CAST(COUNT(*) AS TEXT) AS facet_count
FROM searched CROSS JOIN LATERAL unnest(group_codes) AS group_code
GROUP BY group_code
UNION ALL
SELECT 'vendor', vendor_code, '', '', CAST(COUNT(*) AS TEXT)
FROM category_filtered GROUP BY vendor_code
UNION ALL
SELECT 'region', region_code, '', '', CAST(COUNT(*) AS TEXT)
FROM category_filtered GROUP BY region_code
UNION ALL
SELECT 'meter', meter_code, MAX(meter_display_name), MAX(unit_code), CAST(COUNT(*) AS TEXT)
FROM category_filtered GROUP BY meter_code
ORDER BY facet_kind, code
"#;

const LOAD_CONDITIONS: &str = r#"
SELECT rate_id, dimension_code, operator_code,
       CASE value_type
           WHEN 'string' THEN value_string
           WHEN 'decimal' THEN CAST(value_decimal AS TEXT)
           WHEN 'boolean' THEN CAST(value_boolean AS TEXT)
           WHEN 'json' THEN CAST(value_json AS TEXT)
           ELSE ''
       END AS condition_value
FROM pricing_rate_condition
WHERE tenant_id = 0 AND organization_id = 0
  AND rate_id = ANY($1) AND status = 1 AND deleted_at IS NULL
ORDER BY rate_id, sort_order, id
"#;

const LOAD_TIERS: &str = r#"
SELECT rate_id, tier_code, CAST(lower_bound AS TEXT) AS lower_bound,
       CAST(upper_bound AS TEXT) AS upper_bound, CAST(unit_size AS TEXT) AS unit_size,
       CAST(unit_price AS TEXT) AS unit_price, CAST(flat_amount AS TEXT) AS flat_amount,
       currency_code
FROM pricing_rate_tier
WHERE tenant_id = 0 AND organization_id = 0
  AND rate_id = ANY($1) AND status = 1 AND deleted_at IS NULL
ORDER BY rate_id, tier_index, id
"#;

const LOAD_FORMULAS: &str = r#"
SELECT f.id AS formula_id, f.rate_id, f.formula_code, f.formula_version,
       CAST(f.constant_units AS TEXT) AS constant_units,
       CAST(f.quantity_coefficient AS TEXT) AS quantity_coefficient,
       CAST(f.minimum_units AS TEXT) AS minimum_units,
       CAST(f.maximum_units AS TEXT) AS maximum_units
FROM pricing_rate_formula f
WHERE f.tenant_id = 0 AND f.organization_id = 0
  AND f.rate_id = ANY($1) AND f.status = 1 AND f.deleted_at IS NULL
ORDER BY f.rate_id, f.id
"#;

const LOAD_FORMULA_TERMS: &str = r#"
SELECT formula_id, term_code, dimension_code, CAST(coefficient AS TEXT) AS coefficient
FROM pricing_rate_formula_term
WHERE tenant_id = 0 AND organization_id = 0
  AND formula_id = ANY($1) AND status = 1 AND deleted_at IS NULL
ORDER BY formula_id, term_index, id
"#;

pub struct PostgresOfficialPricingCatalogReadStore {
    pool: PgPool,
}

impl PostgresOfficialPricingCatalogReadStore {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

impl OfficialPricingCatalogReadStore for PostgresOfficialPricingCatalogReadStore {
    fn load_official_pricing_catalog<'a>(
        &'a self,
        query: OfficialPricingCatalogQuery,
    ) -> OfficialPricingCatalogReadFuture<'a> {
        Box::pin(async move { load_catalog(&self.pool, query).await })
    }
}

async fn load_catalog(
    pool: &PgPool,
    query: OfficialPricingCatalogQuery,
) -> Result<OfficialPricingCatalogSnapshot, DomainError> {
    let base_sql = LOAD_RATES_PREFIX.replace("__CATEGORY_CODES__", CATEGORY_CODES_SQL);
    let filtered_rates_sql = format!("{base_sql}{FILTERED_RATES_CTE_SUFFIX}");
    let search = keyword_like(query.search_query.as_deref());
    let count_sql = format!("{filtered_rates_sql}{COUNT_RATES_SUFFIX}");
    let total_row = sqlx::query(sqlx::AssertSqlSafe(count_sql))
        .bind(&query.category)
        .bind(search.as_deref())
        .bind(query.vendor_code.as_deref())
        .bind(query.region_code.as_deref())
        .bind(query.meter_code.as_deref())
        .fetch_one(pool)
        .await
        .map_err(sql_error)?;
    let total_items = integer_cell(&total_row, "total");

    let rates_sql = format!("{filtered_rates_sql}{LOAD_RATES_SUFFIX}");
    let rows = sqlx::query(sqlx::AssertSqlSafe(rates_sql))
        .bind(&query.category)
        .bind(search.as_deref())
        .bind(query.vendor_code.as_deref())
        .bind(query.region_code.as_deref())
        .bind(query.meter_code.as_deref())
        .bind(query.page_size)
        .bind(query.offset)
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;
    let rate_ids = rows
        .iter()
        .map(|row| integer_cell(row, "id"))
        .collect::<Vec<_>>();
    let mut conditions = load_conditions(pool, &rate_ids).await?;
    let mut tiers = load_tiers(pool, &rate_ids).await?;
    let mut formulas = load_formulas(pool, &rate_ids).await?;
    let items = rows
        .into_iter()
        .map(|row| {
            let rate_id = integer_cell(&row, "id");
            OfficialPricingRate {
                rate_code: string_cell(&row, "rate_code"),
                rate_hash: string_cell(&row, "rate_hash"),
                group_codes: row.try_get("group_codes").unwrap_or_default(),
                product_code: string_cell(&row, "product_code"),
                product_kind: string_cell(&row, "product_kind"),
                product_display_name: string_cell(&row, "product_display_name"),
                operation_code: string_cell(&row, "operation_code"),
                operation_kind: string_cell(&row, "operation_kind"),
                operation_display_name: string_cell(&row, "operation_display_name"),
                vendor_code: string_cell(&row, "vendor_code"),
                provider_code: string_cell(&row, "provider_code"),
                region_code: string_cell(&row, "region_code"),
                resource_type: string_cell(&row, "resource_type"),
                resource_code: string_cell(&row, "resource_code"),
                catalog_key: optional_string_cell(&row, "catalog_key"),
                api_format: optional_string_cell(&row, "api_format"),
                endpoint_code: optional_string_cell(&row, "endpoint_code"),
                price_book_code: string_cell(&row, "price_book_code"),
                price_book_version: string_cell(&row, "price_book_version"),
                meter_code: string_cell(&row, "meter_code"),
                meter_display_name: string_cell(&row, "meter_display_name"),
                quantity_kind: string_cell(&row, "quantity_kind"),
                unit_code: string_cell(&row, "unit_code"),
                billability: string_cell(&row, "billability"),
                charge_timing: string_cell(&row, "charge_timing"),
                calculation_mode: string_cell(&row, "calculation_mode"),
                quantity_aggregation: string_cell(&row, "quantity_aggregation"),
                unit_size: string_cell(&row, "unit_size"),
                unit_price: string_cell(&row, "unit_price"),
                minimum_quantity: string_cell(&row, "minimum_quantity"),
                quantity_step: optional_string_cell(&row, "quantity_step"),
                currency_code: string_cell(&row, "currency_code"),
                conditions: conditions.remove(&rate_id).unwrap_or_default(),
                tiers: tiers.remove(&rate_id).unwrap_or_default(),
                formula: formulas.remove(&rate_id),
                effective_from: string_cell(&row, "effective_from"),
                effective_to: optional_string_cell(&row, "effective_to"),
                source_url: string_cell(&row, "source_url"),
                source_observed_at: string_cell(&row, "source_observed_at"),
                capabilities: json_array_cell(&row, "model_capabilities"),
                input_modalities: json_array_cell(&row, "model_input_modalities"),
                output_modalities: json_array_cell(&row, "model_output_modalities"),
                usage_scopes: json_array_cell(&row, "model_usage_scopes"),
                context_tokens: optional_integer_cell(&row, "model_context_tokens"),
                max_input_tokens: optional_integer_cell(&row, "model_max_input_tokens"),
                max_output_tokens: optional_integer_cell(&row, "model_max_output_tokens"),
                supports_streaming: optional_bool_cell(&row, "model_supports_streaming"),
                supports_tools: optional_bool_cell(&row, "model_supports_tools"),
                supports_json_schema: optional_bool_cell(&row, "model_supports_json_schema"),
            }
        })
        .collect();

    let facets_sql = format!("{base_sql}{LOAD_FACETS_SUFFIX}");
    let facet_rows = sqlx::query(sqlx::AssertSqlSafe(facets_sql))
        .bind(search.as_deref())
        .bind(query.vendor_code.as_deref())
        .bind(query.region_code.as_deref())
        .bind(query.meter_code.as_deref())
        .bind(&query.category)
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;
    let mut snapshot = OfficialPricingCatalogSnapshot {
        items,
        total_items,
        ..OfficialPricingCatalogSnapshot::default()
    };
    for row in facet_rows {
        let code = string_cell(&row, "code");
        let count = string_cell(&row, "facet_count");
        match string_cell(&row, "facet_kind").as_str() {
            "group" => snapshot.groups.push(OfficialPricingGroupFacet {
                id: code.clone(),
                code,
                count,
            }),
            "vendor" => snapshot.vendors.push(OfficialPricingValueFacet {
                id: code.clone(),
                code,
                count,
            }),
            "region" => snapshot.regions.push(OfficialPricingValueFacet {
                id: code.clone(),
                code,
                count,
            }),
            "meter" => snapshot.meters.push(OfficialPricingMeterFacet {
                id: code.clone(),
                code,
                display_name: string_cell(&row, "display_name"),
                unit_code: string_cell(&row, "unit_code"),
                count,
            }),
            _ => {}
        }
    }
    Ok(snapshot)
}

async fn load_conditions(
    pool: &PgPool,
    rate_ids: &[i64],
) -> Result<HashMap<i64, Vec<OfficialPricingRateCondition>>, DomainError> {
    if rate_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query(LOAD_CONDITIONS)
        .bind(rate_ids)
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;
    let mut values = HashMap::<i64, Vec<OfficialPricingRateCondition>>::new();
    for row in rows {
        values
            .entry(integer_cell(&row, "rate_id"))
            .or_default()
            .push(OfficialPricingRateCondition {
                dimension_code: string_cell(&row, "dimension_code"),
                operator: string_cell(&row, "operator_code"),
                value: string_cell(&row, "condition_value"),
            });
    }
    Ok(values)
}

async fn load_tiers(
    pool: &PgPool,
    rate_ids: &[i64],
) -> Result<HashMap<i64, Vec<OfficialPricingRateTier>>, DomainError> {
    if rate_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query(LOAD_TIERS)
        .bind(rate_ids)
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;
    let mut values = HashMap::<i64, Vec<OfficialPricingRateTier>>::new();
    for row in rows {
        values
            .entry(integer_cell(&row, "rate_id"))
            .or_default()
            .push(OfficialPricingRateTier {
                tier_code: string_cell(&row, "tier_code"),
                lower_bound: string_cell(&row, "lower_bound"),
                upper_bound: optional_string_cell(&row, "upper_bound"),
                unit_size: string_cell(&row, "unit_size"),
                unit_price: string_cell(&row, "unit_price"),
                flat_amount: string_cell(&row, "flat_amount"),
                currency_code: string_cell(&row, "currency_code"),
            });
    }
    Ok(values)
}

async fn load_formulas(
    pool: &PgPool,
    rate_ids: &[i64],
) -> Result<HashMap<i64, OfficialPricingFormula>, DomainError> {
    if rate_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let rows = sqlx::query(LOAD_FORMULAS)
        .bind(rate_ids)
        .fetch_all(pool)
        .await
        .map_err(sql_error)?;
    let formula_ids = rows
        .iter()
        .map(|row| integer_cell(row, "formula_id"))
        .collect::<Vec<_>>();
    let term_rows = if formula_ids.is_empty() {
        Vec::new()
    } else {
        sqlx::query(LOAD_FORMULA_TERMS)
            .bind(&formula_ids)
            .fetch_all(pool)
            .await
            .map_err(sql_error)?
    };
    let mut terms = HashMap::<i64, Vec<OfficialPricingFormulaTerm>>::new();
    for row in term_rows {
        terms
            .entry(integer_cell(&row, "formula_id"))
            .or_default()
            .push(OfficialPricingFormulaTerm {
                term_code: string_cell(&row, "term_code"),
                dimension_code: string_cell(&row, "dimension_code"),
                coefficient: string_cell(&row, "coefficient"),
            });
    }
    let mut values = HashMap::new();
    for row in rows {
        let formula_id = integer_cell(&row, "formula_id");
        values.insert(
            integer_cell(&row, "rate_id"),
            OfficialPricingFormula {
                formula_code: string_cell(&row, "formula_code"),
                formula_version: string_cell(&row, "formula_version"),
                constant_units: string_cell(&row, "constant_units"),
                quantity_coefficient: string_cell(&row, "quantity_coefficient"),
                minimum_units: optional_string_cell(&row, "minimum_units"),
                maximum_units: optional_string_cell(&row, "maximum_units"),
                terms: terms.remove(&formula_id).unwrap_or_default(),
            },
        );
    }
    Ok(values)
}

fn keyword_like(value: Option<&str>) -> Option<String> {
    value.map(|value| format!("%{}%", value.to_ascii_lowercase()))
}

fn string_cell(row: &sqlx::postgres::PgRow, column: &str) -> String {
    optional_string_cell(row, column).unwrap_or_default()
}

fn optional_string_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<String> {
    row.try_get::<Option<String>, _>(column).ok().flatten()
}

fn integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> i64 {
    row.try_get::<i64, _>(column)
        .or_else(|_| {
            row.try_get::<Option<i64>, _>(column)
                .map(Option::unwrap_or_default)
        })
        .unwrap_or_default()
}

fn optional_integer_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<i64> {
    row.try_get::<Option<i64>, _>(column).ok().flatten()
}

fn optional_bool_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<bool> {
    row.try_get::<Option<bool>, _>(column).ok().flatten()
}

/// Parses a JSONB column cast to text (e.g. `input_modalities::text`) into an
/// optional string array. Returns `None` for NULL columns or malformed JSON.
fn json_array_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<Vec<String>> {
    let raw = optional_string_cell(row, column)?;
    serde_json::from_str::<Vec<String>>(&raw).ok()
}

fn sql_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn official_catalog_query_is_scoped_to_active_reference_prices() {
        assert!(LOAD_RATES_PREFIX.contains("book.price_side = 'official_reference'"));
        assert!(LOAD_RATES_PREFIX.contains("book.lifecycle_state = 'active'"));
        assert!(LOAD_RATES_PREFIX.contains("r.effective_from <= CURRENT_TIMESTAMP"));
    }

    #[test]
    fn category_projection_supports_domain_and_api_overlap() {
        assert!(CATEGORY_CODES_SQL.contains("THEN 'music'"));
        assert!(CATEGORY_CODES_SQL.contains("THEN 'api'"));
        assert!(CATEGORY_CODES_SQL.contains("THEN 'sound'"));
        assert!(CATEGORY_CODES_SQL.contains("starts_with(lower(m.meter_code), 'llm_')"));
        assert!(!CATEGORY_CODES_SQL.contains("ESCAPE"));
    }

    #[test]
    fn official_catalog_total_is_independent_from_requested_page() {
        assert!(COUNT_RATES_SUFFIX.contains("COUNT(*) AS total"));
        assert!(COUNT_RATES_SUFFIX.contains("FROM filtered"));
        assert!(!LOAD_RATES_SUFFIX.contains("COUNT(*) OVER()"));
    }

    #[test]
    fn official_catalog_merges_model_capabilities_from_ai_model() {
        assert!(LOAD_RATES_PREFIX.contains("LEFT JOIN ai_model model_cap"));
        assert!(LOAD_RATES_PREFIX.contains("model_cap.catalog_key = binding.catalog_key"));
        assert!(LOAD_RATES_PREFIX.contains("model_cap.input_modalities::text"));
        assert!(LOAD_RATES_PREFIX.contains("model_cap.context_tokens AS model_context_tokens"));
    }
}
