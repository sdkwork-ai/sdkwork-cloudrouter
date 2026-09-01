use sqlx::{PgPool, Row};

use crate::domain::DomainError;
use crate::ports::{
    OfficialPricingCatalogQuery, OfficialPricingCatalogReadFuture, OfficialPricingCatalogReadStore,
    OfficialPricingCatalogSnapshot, OfficialPricingFormula, OfficialPricingFormulaTerm,
    OfficialPricingGroupFacet, OfficialPricingMeterFacet, OfficialPricingProductCatalogQuery,
    OfficialPricingProductCatalogReadFuture, OfficialPricingProductCatalogSnapshot,
    OfficialPricingProductGroup, OfficialPricingRate, OfficialPricingRateCondition,
    OfficialPricingRateTier, OfficialPricingValueFacet,
};

const CATEGORY_CODES_SQL: &str = r#"
ARRAY_REMOVE(ARRAY[
    'all',
    CASE
        WHEN lower(r.operation_kind) IN ('inference', 'chat', 'completion', 'responses')
          OR starts_with(lower(r.meter_code), 'llm_') THEN 'llm'
        WHEN lower(r.operation_kind) = 'image' OR starts_with(lower(r.meter_code), 'image_') THEN 'image'
        WHEN lower(r.operation_kind) = 'video' OR starts_with(lower(r.meter_code), 'video_') THEN 'video'
        WHEN lower(r.operation_kind) = 'audio' OR starts_with(lower(r.meter_code), 'audio_') THEN 'audio'
        WHEN lower(r.operation_kind) = 'music' OR starts_with(lower(r.meter_code), 'music_') THEN 'music'
        WHEN lower(r.operation_kind) = 'embedding' OR starts_with(lower(r.meter_code), 'embedding_') THEN 'embedding'
        WHEN lower(r.operation_kind) IN ('sound', 'sfx')
          OR starts_with(lower(r.meter_code), 'sfx_') OR starts_with(lower(r.meter_code), 'sound_') THEN 'sound'
        ELSE 'other'
    END,
    CASE WHEN lower(r.meter_code) IN ('api_request', 'api_result')
              OR lower(r.quantity_kind) IN ('api_request', 'api_result', 'per_request', 'per_result')
         THEN 'api' ELSE NULL END
], NULL)
"#;

const LOAD_RATES_PREFIX: &str = r#"
WITH eligible AS (
    SELECT
        r.id, r.rate_code, r.rate_hash, __CATEGORY_CODES__ AS group_codes,
        pricing_resource_key(r.vendor_code, r.provider_code, COALESCE(r.catalog_key, ''),
            r.product_code, r.resource_code) AS product_group_key,
        r.product_code, r.product_kind, r.product_display_name,
        r.operation_code, r.operation_kind, r.operation_display_name,
        r.vendor_code, r.provider_code, r.region_code, r.resource_type,
        r.resource_code,
        COALESCE(NULLIF(model.display_name, ''), NULLIF(model.model, ''), r.resource_code) AS resource_display_name,
        r.catalog_key, r.api_format, r.endpoint_code,
        book.price_book_code, book.price_book_version, r.meter_code,
        r.meter_display_name, r.quantity_kind, r.unit_code, r.billability,
        r.charge_timing, r.calculation_mode, r.quantity_aggregation,
        r.unit_size::text AS unit_size, r.unit_price::text AS unit_price,
        r.minimum_quantity::text AS minimum_quantity, r.quantity_step::text AS quantity_step,
        r.currency_code, r.conditions::text AS conditions_json, r.tiers::text AS tiers_json,
        r.formula::text AS formula_json, r.effective_from::text AS effective_from,
        r.priority, r.rate_variant, r.schedule::text AS schedule_json,
        r.effective_to::text AS effective_to, r.source_url,
        r.source_observed_at::text AS source_observed_at,
        model.capabilities::text AS model_capabilities,
        model.input_modalities::text AS model_input_modalities,
        model.output_modalities::text AS model_output_modalities,
        model.usage_scopes::text AS model_usage_scopes,
        model.context_tokens AS model_context_tokens,
        model.max_input_tokens AS model_max_input_tokens,
        model.max_output_tokens AS model_max_output_tokens,
        model.supports_streaming AS model_supports_streaming,
        model.supports_tools AS model_supports_tools,
        model.supports_json_schema AS model_supports_json_schema,
        -- Configured default billing region for the resource (admin feature).
        -- Drives the region/currency shown at the group level of the admin
        -- product list; the runtime billing fallback reads the same table.
        default_region.default_region_code
    FROM pricing_rate r
    JOIN pricing_price_book book ON book.tenant_id = r.tenant_id
      AND book.organization_id = r.organization_id AND book.id = r.price_book_id
    LEFT JOIN ai_model model ON model.catalog_key = r.catalog_key
      AND model.status = 1 AND model.deleted_at IS NULL
    LEFT JOIN pricing_default_region default_region
      ON default_region.tenant_id = 0 AND default_region.organization_id = 0
     AND default_region.deleted_at IS NULL
     AND default_region.resource_key = pricing_resource_key(
         r.vendor_code, r.provider_code, COALESCE(r.catalog_key, ''), r.product_code, r.resource_code)
     AND BTRIM(default_region.default_region_code) NOT IN ('', 'global')
     AND default_region.effective_from <= CURRENT_TIMESTAMP
     AND (default_region.effective_to IS NULL OR default_region.effective_to > CURRENT_TIMESTAMP)
    WHERE r.tenant_id = 0 AND r.organization_id = 0 AND r.status = 1 AND r.deleted_at IS NULL
      AND book.status = 1 AND book.deleted_at IS NULL AND book.price_side = 'official_reference'
      AND book.lifecycle_state = 'active' AND book.effective_from <= CURRENT_TIMESTAMP
      AND (book.effective_to IS NULL OR book.effective_to > CURRENT_TIMESTAMP)
      AND r.effective_from <= CURRENT_TIMESTAMP
      AND (r.effective_to IS NULL OR r.effective_to > CURRENT_TIMESTAMP)
)
"#;

const FILTERED_RATES_CTE_SUFFIX: &str = r#"
, filtered AS (
    SELECT * FROM eligible
    WHERE ($1 = 'all' OR $1 = ANY(group_codes))
      AND ($2::text IS NULL OR lower(product_code) LIKE $2 OR lower(product_display_name) LIKE $2
        OR lower(operation_code) LIKE $2 OR lower(vendor_code) LIKE $2 OR lower(provider_code) LIKE $2
        OR lower(resource_code) LIKE $2 OR lower(COALESCE(catalog_key, '')) LIKE $2
        OR lower(meter_code) LIKE $2 OR lower(meter_display_name) LIKE $2)
      AND ($3::text IS NULL OR vendor_code = ANY(string_to_array($3, ',')))
      AND ($4::text IS NULL OR region_code = $4)
      AND ($5::text IS NULL OR meter_code = $5)
      AND ($6::text IS NULL OR currency_code = $6)
)
"#;

const COUNT_RATES_SUFFIX: &str = "\nSELECT COUNT(*) AS total FROM filtered\n";
const LOAD_RATES_SUFFIX: &str = r#"
SELECT * FROM filtered
ORDER BY product_display_name, resource_code, operation_code, meter_code, rate_code
LIMIT $7 OFFSET $8
"#;

const COUNT_PRODUCT_GROUPS_SUFFIX: &str =
    "\nSELECT COUNT(DISTINCT product_group_key) AS total FROM filtered\n";
const LOAD_PRODUCT_GROUP_RATES_SUFFIX: &str = r#"
, product_groups AS (
    SELECT product_group_key, MIN(product_display_name) AS product_display_name,
        MIN(resource_code) AS resource_code, MIN(rate_code) AS first_rate_code
    FROM filtered GROUP BY product_group_key
), paged_products AS (
    SELECT product_group_key FROM product_groups
    ORDER BY product_display_name, resource_code, first_rate_code, product_group_key
    LIMIT $7 OFFSET $8
)
SELECT filtered.* FROM filtered
JOIN paged_products USING (product_group_key)
ORDER BY product_display_name, resource_code, product_group_key,
    operation_code, meter_code, rate_code
"#;

const LOAD_PRODUCT_GROUP_FACETS_SUFFIX: &str = r#"
, searched AS (
    SELECT * FROM eligible
    WHERE ($1::text IS NULL OR lower(product_code) LIKE $1 OR lower(product_display_name) LIKE $1
      OR lower(operation_code) LIKE $1 OR lower(vendor_code) LIKE $1 OR lower(provider_code) LIKE $1
      OR lower(resource_code) LIKE $1 OR lower(COALESCE(catalog_key, '')) LIKE $1
      OR lower(meter_code) LIKE $1 OR lower(meter_display_name) LIKE $1)
)
SELECT group_code AS code, COUNT(DISTINCT product_group_key)::text AS facet_count
FROM searched CROSS JOIN LATERAL unnest(group_codes) AS group_code
GROUP BY group_code ORDER BY group_code
"#;

const LOAD_PRODUCT_VALUE_FACETS_SUFFIX: &str = r#"
, searched AS (
    SELECT * FROM eligible
    WHERE ($1::text IS NULL OR lower(product_code) LIKE $1 OR lower(product_display_name) LIKE $1
      OR lower(operation_code) LIKE $1 OR lower(vendor_code) LIKE $1 OR lower(provider_code) LIKE $1
      OR lower(resource_code) LIKE $1 OR lower(COALESCE(catalog_key, '')) LIKE $1
      OR lower(meter_code) LIKE $1 OR lower(meter_display_name) LIKE $1)
      AND ($2 = 'all' OR $2 = ANY(group_codes))
)
SELECT 'vendor' AS facet_kind, vendor_code AS code, COUNT(DISTINCT product_group_key)::text AS facet_count
FROM searched WHERE vendor_code <> '' GROUP BY vendor_code
UNION ALL
SELECT 'region' AS facet_kind, region_code AS code, COUNT(DISTINCT product_group_key)::text AS facet_count
FROM searched WHERE region_code <> '' GROUP BY region_code
ORDER BY facet_kind, code
"#;

const LOAD_FACETS_SUFFIX: &str = r#"
, searched AS (
    SELECT * FROM eligible
    WHERE ($1::text IS NULL OR lower(product_code) LIKE $1 OR lower(product_display_name) LIKE $1
      OR lower(operation_code) LIKE $1 OR lower(vendor_code) LIKE $1 OR lower(provider_code) LIKE $1
      OR lower(resource_code) LIKE $1 OR lower(COALESCE(catalog_key, '')) LIKE $1
      OR lower(meter_code) LIKE $1 OR lower(meter_display_name) LIKE $1)
      AND ($2::text IS NULL OR vendor_code = $2) AND ($3::text IS NULL OR region_code = $3)
      AND ($4::text IS NULL OR meter_code = $4)
), category_filtered AS (
    SELECT * FROM searched WHERE ($5 = 'all' OR $5 = ANY(group_codes))
      AND ($6::text IS NULL OR currency_code = $6)
)
SELECT 'group' AS facet_kind, group_code AS code, '' AS display_name, '' AS unit_code, COUNT(*)::text AS facet_count
FROM searched CROSS JOIN LATERAL unnest(group_codes) AS group_code GROUP BY group_code
UNION ALL SELECT 'vendor', vendor_code, '', '', COUNT(*)::text FROM category_filtered GROUP BY vendor_code
UNION ALL SELECT 'region', region_code, '', '', COUNT(*)::text FROM category_filtered GROUP BY region_code
UNION ALL SELECT 'currency', currency_code, '', '', COUNT(*)::text FROM category_filtered GROUP BY currency_code
UNION ALL SELECT 'meter', meter_code, MAX(meter_display_name), MAX(unit_code), COUNT(*)::text
FROM category_filtered GROUP BY meter_code ORDER BY facet_kind, code
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

    fn load_official_pricing_product_catalog<'a>(
        &'a self,
        query: OfficialPricingProductCatalogQuery,
    ) -> OfficialPricingProductCatalogReadFuture<'a> {
        Box::pin(async move { load_product_catalog(&self.pool, query).await })
    }
}

async fn load_catalog(
    pool: &PgPool,
    query: OfficialPricingCatalogQuery,
) -> Result<OfficialPricingCatalogSnapshot, DomainError> {
    let base_sql = LOAD_RATES_PREFIX.replace("__CATEGORY_CODES__", CATEGORY_CODES_SQL);
    let filtered = format!("{base_sql}{FILTERED_RATES_CTE_SUFFIX}");
    let search = keyword_like(query.search_query.as_deref());
    let total = sqlx::query(sqlx::AssertSqlSafe(format!(
        "{filtered}{COUNT_RATES_SUFFIX}"
    )))
    .bind(&query.category)
    .bind(search.as_deref())
    .bind(query.vendor_code.as_deref())
    .bind(query.region_code.as_deref())
    .bind(query.meter_code.as_deref())
    .bind(query.currency_code.as_deref())
    .fetch_one(pool)
    .await
    .map_err(sql_error)?;
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "{filtered}{LOAD_RATES_SUFFIX}"
    )))
    .bind(&query.category)
    .bind(search.as_deref())
    .bind(query.vendor_code.as_deref())
    .bind(query.region_code.as_deref())
    .bind(query.meter_code.as_deref())
    .bind(query.currency_code.as_deref())
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(sql_error)?;
    let items = rows
        .into_iter()
        .map(rate_from_row)
        .collect::<Result<Vec<_>, _>>()?;
    let facets = sqlx::query(sqlx::AssertSqlSafe(format!(
        "{base_sql}{LOAD_FACETS_SUFFIX}"
    )))
    .bind(search.as_deref())
    .bind(query.vendor_code.as_deref())
    .bind(query.region_code.as_deref())
    .bind(query.meter_code.as_deref())
    .bind(&query.category)
    .bind(query.currency_code.as_deref())
    .fetch_all(pool)
    .await
    .map_err(sql_error)?;
    let mut snapshot = OfficialPricingCatalogSnapshot {
        items,
        total_items: integer_cell(&total, "total"),
        ..Default::default()
    };
    for row in facets {
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
            "currency" => snapshot.currencies.push(OfficialPricingValueFacet {
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

async fn load_product_catalog(
    pool: &PgPool,
    query: OfficialPricingProductCatalogQuery,
) -> Result<OfficialPricingProductCatalogSnapshot, DomainError> {
    let base_sql = LOAD_RATES_PREFIX.replace("__CATEGORY_CODES__", CATEGORY_CODES_SQL);
    let filtered = format!("{base_sql}{FILTERED_RATES_CTE_SUFFIX}");
    let search = keyword_like(query.search_query.as_deref());
    let vendor_codes = (!query.vendor_codes.is_empty()).then(|| query.vendor_codes.join(","));
    let total = sqlx::query(sqlx::AssertSqlSafe(format!(
        "{filtered}{COUNT_PRODUCT_GROUPS_SUFFIX}"
    )))
    .bind(&query.category)
    .bind(search.as_deref())
    .bind(vendor_codes.as_deref())
    .bind(query.region_code.as_deref())
    .bind(Option::<&str>::None)
    .bind(Option::<&str>::None)
    .fetch_one(pool)
    .await
    .map_err(sql_error)?;
    let rows = sqlx::query(sqlx::AssertSqlSafe(format!(
        "{filtered}{LOAD_PRODUCT_GROUP_RATES_SUFFIX}"
    )))
    .bind(&query.category)
    .bind(search.as_deref())
    .bind(vendor_codes.as_deref())
    .bind(query.region_code.as_deref())
    .bind(Option::<&str>::None)
    .bind(Option::<&str>::None)
    .bind(query.page_size)
    .bind(query.offset)
    .fetch_all(pool)
    .await
    .map_err(sql_error)?;
    let facets = sqlx::query(sqlx::AssertSqlSafe(format!(
        "{base_sql}{LOAD_PRODUCT_GROUP_FACETS_SUFFIX}"
    )))
    .bind(search.as_deref())
    .fetch_all(pool)
    .await
    .map_err(sql_error)?;
    let value_facets = sqlx::query(sqlx::AssertSqlSafe(format!(
        "{base_sql}{LOAD_PRODUCT_VALUE_FACETS_SUFFIX}"
    )))
    .bind(search.as_deref())
    .bind(&query.category)
    .fetch_all(pool)
    .await
    .map_err(sql_error)?;

    let mut items: Vec<OfficialPricingProductGroup> = Vec::new();
    let mut default_regions: Vec<String> = Vec::new();
    for row in rows {
        let group_key = string_cell(&row, "product_group_key");
        let default_region = string_cell(&row, "default_region_code");
        let rate = rate_from_row(row)?;
        if let Some(group) = items
            .last_mut()
            .filter(|group| group.group_key == group_key)
        {
            merge_group_codes(&mut group.group_codes, &rate.group_codes);
            group.rates.push(rate);
            let index = items.len() - 1;
            if default_regions[index].is_empty() && !default_region.trim().is_empty() {
                default_regions[index] = default_region;
            }
        } else {
            items.push(product_group_from_rate(group_key, rate));
            default_regions.push(default_region);
        }
    }
    for (group, default_region) in items.iter_mut().zip(default_regions.iter()) {
        apply_group_region_identity(group, default_region);
    }
    let groups = facets
        .into_iter()
        .map(|row| {
            let code = string_cell(&row, "code");
            OfficialPricingGroupFacet {
                id: code.clone(),
                code,
                count: string_cell(&row, "facet_count"),
            }
        })
        .collect();
    let mut vendors = Vec::new();
    let mut regions = Vec::new();
    for row in value_facets {
        let code = string_cell(&row, "code");
        let facet = OfficialPricingValueFacet {
            id: code.clone(),
            code,
            count: string_cell(&row, "facet_count"),
        };
        if string_cell(&row, "facet_kind") == "vendor" {
            vendors.push(facet);
        } else {
            regions.push(facet);
        }
    }
    Ok(OfficialPricingProductCatalogSnapshot {
        items,
        groups,
        vendors,
        regions,
        total_items: integer_cell(&total, "total"),
    })
}

fn product_group_from_rate(
    group_key: String,
    rate: OfficialPricingRate,
) -> OfficialPricingProductGroup {
    OfficialPricingProductGroup {
        group_key,
        group_codes: rate.group_codes.clone(),
        product_code: rate.product_code.clone(),
        product_kind: rate.product_kind.clone(),
        product_display_name: rate.product_display_name.clone(),
        vendor_code: rate.vendor_code.clone(),
        provider_code: rate.provider_code.clone(),
        region_code: rate.region_code.clone(),
        resource_type: rate.resource_type.clone(),
        resource_code: rate.resource_code.clone(),
        resource_display_name: rate.resource_display_name.clone(),
        catalog_key: rate.catalog_key.clone(),
        currency_code: rate.currency_code.clone(),
        price_book_code: rate.price_book_code.clone(),
        price_book_version: rate.price_book_version.clone(),
        rates: vec![rate],
    }
}

/// A product group now aggregates one resource across every region it prices
/// (group_key is the resource identity, region-independent). The group-level
/// region/currency/price-book scalars must stay deterministic for the admin
/// list, so they are resolved from the configured default billing region when
/// present, falling back to `global`, then to the first region in lexical
/// order. All rates (every region) remain available in `group.rates` for the
/// per-row region tabs.
fn apply_group_region_identity(group: &mut OfficialPricingProductGroup, default_region_code: &str) {
    let default_region = default_region_code.trim();
    let identity = group
        .rates
        .iter()
        .find(|rate| {
            !default_region.is_empty()
                && rate.region_code.eq_ignore_ascii_case(default_region)
        })
        .or_else(|| {
            group
                .rates
                .iter()
                .find(|rate| rate.region_code.eq_ignore_ascii_case("global"))
        })
        .or_else(|| group.rates.iter().min_by_key(|rate| rate.region_code.as_str()));
    if let Some(rate) = identity {
        group.region_code = rate.region_code.clone();
        group.currency_code = rate.currency_code.clone();
        group.price_book_code = rate.price_book_code.clone();
        group.price_book_version = rate.price_book_version.clone();
    }
}

fn merge_group_codes(target: &mut Vec<String>, source: &[String]) {
    for code in source {
        if !target.contains(code) {
            target.push(code.clone());
        }
    }
}

fn rate_from_row(row: sqlx::postgres::PgRow) -> Result<OfficialPricingRate, DomainError> {
    let conditions =
        serde_json::from_str::<Vec<ConditionJson>>(&string_cell(&row, "conditions_json"))
            .map_err(|e| DomainError::new(e.to_string()))?
            .into_iter()
            .map(|v| OfficialPricingRateCondition {
                dimension_code: v.dimension_code,
                operator_code: v.operator_code,
                value: v.value,
            })
            .collect();
    let tiers = serde_json::from_str::<Vec<TierJson>>(&string_cell(&row, "tiers_json"))
        .map_err(|e| DomainError::new(e.to_string()))?
        .into_iter()
        .map(|v| OfficialPricingRateTier {
            tier_code: v.tier_code,
            lower_bound: v.lower_bound,
            upper_bound: v.upper_bound,
            unit_size: v.unit_size,
            unit_price: v.unit_price,
            flat_amount: v.flat_amount,
            currency_code: v.currency_code,
        })
        .collect();
    let formula = optional_string_cell(&row, "formula_json")
        .map(|raw| {
            serde_json::from_str::<FormulaJson>(&raw)
                .map(|v| OfficialPricingFormula {
                    formula_code: v.formula_code,
                    formula_version: v.formula_version,
                    constant_units: v.constant_units,
                    quantity_coefficient: v.quantity_coefficient,
                    minimum_units: v.minimum_units,
                    maximum_units: v.maximum_units,
                    terms: v
                        .terms
                        .into_iter()
                        .map(|t| OfficialPricingFormulaTerm {
                            term_code: t.term_code,
                            dimension_code: t.dimension_code,
                            coefficient: t.coefficient,
                        })
                        .collect(),
                })
                .map_err(|e| DomainError::new(e.to_string()))
        })
        .transpose()?;
    Ok(OfficialPricingRate {
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
        resource_display_name: string_cell(&row, "resource_display_name"),
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
        conditions,
        tiers,
        formula,
        priority: row.try_get("priority").unwrap_or_default(),
        rate_variant: string_cell(&row, "rate_variant"),
        schedule: optional_string_cell(&row, "schedule_json")
            .and_then(|raw| serde_json::from_str(&raw).ok()),
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
    })
}

#[derive(serde::Deserialize)]
struct ConditionJson {
    #[serde(rename = "dimensionCode")]
    dimension_code: String,
    #[serde(rename = "operatorCode")]
    operator_code: String,
    value: serde_json::Value,
}
#[derive(serde::Deserialize)]
struct TierJson {
    #[serde(rename = "tierCode")]
    tier_code: String,
    #[serde(rename = "lowerBound")]
    lower_bound: String,
    #[serde(rename = "upperBound")]
    upper_bound: Option<String>,
    #[serde(rename = "unitSize")]
    unit_size: String,
    #[serde(rename = "unitPrice")]
    unit_price: String,
    #[serde(rename = "flatAmount")]
    flat_amount: String,
    #[serde(rename = "currencyCode")]
    currency_code: String,
}
#[derive(serde::Deserialize)]
struct FormulaJson {
    #[serde(rename = "formulaCode")]
    formula_code: String,
    #[serde(rename = "formulaVersion")]
    formula_version: String,
    #[serde(rename = "constantUnits")]
    constant_units: String,
    #[serde(rename = "quantityCoefficient")]
    quantity_coefficient: String,
    #[serde(rename = "minimumUnits")]
    minimum_units: Option<String>,
    #[serde(rename = "maximumUnits")]
    maximum_units: Option<String>,
    terms: Vec<TermJson>,
}
#[derive(serde::Deserialize)]
struct TermJson {
    #[serde(rename = "termCode")]
    term_code: String,
    #[serde(rename = "dimensionCode")]
    dimension_code: String,
    coefficient: String,
}
fn keyword_like(value: Option<&str>) -> Option<String> {
    value.map(|v| format!("%{}%", v.to_ascii_lowercase()))
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
fn json_array_cell(row: &sqlx::postgres::PgRow, column: &str) -> Option<Vec<String>> {
    serde_json::from_str(&optional_string_cell(row, column)?).ok()
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
        assert!(!CATEGORY_CODES_SQL.contains("ESCAPE"));
    }
    #[test]
    fn official_catalog_total_is_independent_from_requested_page() {
        assert!(COUNT_RATES_SUFFIX.contains("COUNT(*) AS total"));
        assert!(!LOAD_RATES_SUFFIX.contains("COUNT(*) OVER()"));
    }
    #[test]
    fn official_product_catalog_pages_product_groups_before_loading_rates() {
        assert!(COUNT_PRODUCT_GROUPS_SUFFIX.contains("COUNT(DISTINCT product_group_key)"));
        assert!(LOAD_PRODUCT_GROUP_RATES_SUFFIX.contains("LIMIT $7 OFFSET $8"));
        assert!(LOAD_PRODUCT_GROUP_RATES_SUFFIX.contains("JOIN paged_products"));
    }
    #[test]
    fn official_product_group_key_is_resource_scoped_not_region_scoped() {
        // One row per resource: the group key must be derived from the
        // resource identity only (vendor/provider/catalog/product/resource),
        // never from region, currency, or price book, so multi-region
        // resources render as a single admin row with region tabs inside.
        assert!(LOAD_RATES_PREFIX.contains(
            "pricing_resource_key(r.vendor_code, r.provider_code, COALESCE(r.catalog_key, ''),"
        ));
        assert!(!LOAD_RATES_PREFIX.contains(
            "r.region_code, r.currency_code, book.price_book_code, book.price_book_version"
        ));
        assert!(!LOAD_RATES_PREFIX.contains("r.region_code,\n            r.currency_code, book"));
    }
    #[test]
    fn official_product_groups_carry_configured_default_region() {
        assert!(LOAD_RATES_PREFIX.contains("default_region.default_region_code"));
        assert!(LOAD_RATES_PREFIX.contains("default_region.resource_key = pricing_resource_key("));
    }
}
