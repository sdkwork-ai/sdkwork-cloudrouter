use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use sqlx::postgres::PgRow;
use sqlx::{Executor, Row};

use crate::domain::{
    DecimalValue, Money, PricingFormula, PricingFormulaTerm, PricingRateCondition,
    PricingRateMetadata, PricingRateTier, PricingRateVariant, PricingRule, PricingSchedule,
    PricingWeeklyWindow,
};

use crate::infrastructure::sql::rows::{
    AccountRateCardRow, AiModelRow, GatewayAccessPolicyRow, GatewayApiKeyRow, GatewayRiskRuleRow,
    ModelMappingRuleRow, ModelPriceRow, ModelVendorRow, PricingDefaultRegionRow, PricingPlanRow,
    PricingRuleRow, QuotaPolicyRow, UpstreamAccountGroupMetricSnapshotRow, UpstreamAccountGroupRow,
    UpstreamAccountModelAccessRow, UpstreamAccountRouteRow, UpstreamSupplierModelAccessRow,
};

pub async fn load_vendors(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<ModelVendorRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(ModelVendorRow {
            vendor_code: row.try_get("vendor_code")?,
            display_name: row.try_get("display_name")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_models(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<AiModelRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(AiModelRow {
            catalog_key: row.try_get("catalog_key")?,
            model: row.try_get("model")?,
            display_name: row.try_get("display_name")?,
            vendor_code: row.try_get("vendor_code")?,
            capabilities_json: row.try_get("capabilities_json")?,
            description: row.try_get("description")?,
            modalities_json: row.try_get("modalities_json")?,
            input_modalities_json: row.try_get("input_modalities_json")?,
            output_modalities_json: row.try_get("output_modalities_json")?,
            api_format: row.try_get("api_format")?,
            capability_intro: row.try_get("capability_intro")?,
            limitations_json: row.try_get("limitations_json")?,
            supported_languages_json: row.try_get("supported_languages_json")?,
            use_cases_json: row.try_get("use_cases_json")?,
            training_data_cutoff: row.try_get("training_data_cutoff")?,
            context_tokens: row.try_get("context_tokens")?,
            max_output_tokens: row.try_get("max_output_tokens")?,
            supports_streaming: row.try_get("supports_streaming")?,
            supports_tools: row.try_get("supports_tools")?,
            supports_json_schema: row.try_get("supports_json_schema")?,
            usage_scopes_json: row.try_get("usage_scopes_json")?,
            coding_visible: row.try_get("coding_visible")?,
            release_stage: row.try_get("release_stage")?,
            shelf_state: row.try_get("shelf_state")?,
            routing_state: row.try_get("routing_state")?,
            replacement_model: row.try_get("replacement_model")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_upstream_account_routes(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
    circuit_breaker_recovery_window_seconds: i64,
) -> Result<Vec<UpstreamAccountRouteRow>, sqlx::Error> {
    let mapper = map_query(sql, |row| {
        Ok(UpstreamAccountRouteRow {
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            supplier_code: row.try_get("supplier_code")?,
            account_id: row.try_get("account_id")?,
            credential_id: row.try_get("credential_id")?,
            credential_rotation: row.try_get("credential_rotation")?,
            credential_priority: row.try_get("credential_priority")?,
            credential_weight: row.try_get("credential_weight")?,
            contract_cost_multiplier: row.try_get("contract_cost_multiplier")?,
            last_latency_ms: row.try_get("last_latency_ms")?,
            account_consecutive_error_count: row.try_get("account_consecutive_error_count")?,
            account_code: row.try_get("account_code")?,
            region_code: row.try_get("region_code")?,
            billing_mode: row
                .try_get::<Option<String>, _>("billing_mode")?
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "prepay".to_owned()),
            supplier_id: row.try_get("supplier_id")?,
            endpoint_id: row.try_get("endpoint_id")?,
            endpoint_code: row.try_get("endpoint_code")?,
            endpoint_priority: row.try_get("endpoint_priority")?,
            endpoint_weight: row.try_get("endpoint_weight")?,
            endpoint_health_status: row.try_get("endpoint_health_status")?,
            base_url: row.try_get("base_url")?,
            account_default_base_url: row.try_get("account_default_base_url")?,
            account_protocols_json: row.try_get("account_protocols_json")?,
            supplier_default_base_url: row.try_get("supplier_default_base_url")?,
            supplier_protocols_json: row.try_get("supplier_protocols_json")?,
            secret_ref: row.try_get("secret_ref")?,
            secret_ciphertext: row.try_get("secret_ciphertext")?,
            secret_key_id: row.try_get("secret_key_id")?,
            auth_type: row.try_get("auth_type")?,
            runtime_auth_config_json: row.try_get("runtime_auth_config_json")?,
            timeout_ms: row.try_get("timeout_ms")?,
            retry_policy_json: row.try_get("retry_policy_json")?,
            account_group_bindings_json: row.try_get("account_group_bindings_json")?,
            account_health_status: row.try_get("account_health_status")?,
            credential_health_status: row.try_get("credential_health_status")?,
        })
    });
    let rows = sqlx::query(mapper.sql)
        .bind(circuit_breaker_recovery_window_seconds)
        .fetch_all(executor)
        .await?
        .into_iter()
        .map(mapper.mapper)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows
        .into_iter()
        .filter(|row| {
            row.account_health_status == 1
                && row.credential_health_status == 1
                && row.endpoint_health_status == 1
        })
        .collect())
}

pub async fn load_model_mappings(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<ModelMappingRuleRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(ModelMappingRuleRow {
            id: row.try_get("id")?,
            binding_type: row.try_get("binding_type")?,
            binding_id: row.try_get("binding_id")?,
            binding_code: row.try_get("binding_code")?,
            source_model: row.try_get("source_model")?,
            source_catalog_key: row.try_get("source_catalog_key")?,
            target_model: row.try_get("target_model")?,
            target_catalog_key: row.try_get("target_catalog_key")?,
            target_vendor_code: row.try_get("target_vendor_code")?,
            target_provider_model: row.try_get("target_provider_model")?,
            target_provider_native_model: row.try_get("target_provider_native_model")?,
            binding_sort_order: row.try_get("binding_sort_order")?,
            item_sort_order: row.try_get("item_sort_order")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_pricing_plans(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<PricingPlanRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(PricingPlanRow {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            plan_code: row.try_get("plan_code")?,
            base_price_side_code: row.try_get("base_price_side_code")?,
            default_multiplier: row.try_get("default_multiplier")?,
            default_markup_amount: row.try_get("default_markup_amount")?,
            currency: row.try_get("currency")?,
            rounding_mode: row.try_get("rounding_mode")?,
            minimum_charge_amount: row.try_get("minimum_charge_amount")?,
            fallback_policy: row.try_get("fallback_policy")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_upstream_account_groups(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<UpstreamAccountGroupRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(UpstreamAccountGroupRow {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            name: row.try_get("name")?,
            code: row.try_get("code")?,
            is_default: row.try_get("is_default")?,
            pricing_plan_tenant_id: row.try_get("pricing_plan_tenant_id")?,
            pricing_plan_organization_id: row.try_get("pricing_plan_organization_id")?,
            pricing_plan_id: row.try_get("pricing_plan_id")?,
            pricing_plan_code: row.try_get("pricing_plan_code")?,
            routing_strategy: row.try_get("routing_strategy")?,
            fallback_mode: row.try_get("fallback_mode")?,
            priority: row.try_get("priority")?,
            cost_multiplier: row.try_get("cost_multiplier")?,
            sale_multiplier: row.try_get("sale_multiplier")?,
            model_blacklist_json: row.try_get("model_blacklist")?,
            model_whitelist_json: row.try_get("model_whitelist")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_pricing_rules(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<PricingRuleRow>, sqlx::Error> {
    map_query(sql, |row| {
        let currency: String = row.try_get("currency_code")?;
        let conditions = serde_json::from_str::<Vec<PricingConditionJson>>(
            &row.try_get::<String, _>("conditions_json")?,
        )
        .map_err(decode_error)?
        .into_iter()
        .map(|condition| PricingRateCondition {
            dimension_code: condition.dimension_code,
            operator_code: condition.operator_code,
            value: condition.value,
        })
        .collect();
        let schedule = row
            .try_get::<Option<String>, _>("schedule_json")?
            .map(|value| parse_pricing_schedule(&value))
            .transpose()?;
        let tenant_id = row.try_get("tenant_id")?;
        let organization_id = row.try_get("organization_id")?;
        let pricing_plan_id = row.try_get("pricing_plan_id")?;
        Ok(PricingRuleRow {
            tenant_id,
            organization_id,
            value: PricingRule {
                id: row.try_get("id")?,
                pricing_plan_id,
                tenant_id,
                organization_id,
                rule_code: row.try_get("rule_code")?,
                plan_code: row.try_get("plan_code")?,
                product_code: row.try_get("product_code")?,
                operation_code: row.try_get("operation_code")?,
                meter_code: row.try_get("meter_code")?,
                provider_code: row.try_get("provider_code")?,
                region_code: row.try_get("region_code")?,
                catalog_key: row.try_get("catalog_key")?,
                formula_mode: row.try_get("formula_mode")?,
                multiplier: DecimalValue::parse(&row.try_get::<String, _>("multiplier")?)
                    .map_err(decode_error)?,
                markup_amount: Money::new(&currency, &row.try_get::<String, _>("markup_amount")?)
                    .map_err(decode_error)?,
                unit_price_override: row
                    .try_get::<Option<String>, _>("unit_price_override")?
                    .as_deref()
                    .map(|value| Money::new(&currency, value))
                    .transpose()
                    .map_err(decode_error)?,
                priority: row.try_get("priority")?,
                effective_from: row.try_get("effective_from")?,
                effective_to: row.try_get("effective_to")?,
                conditions,
                schedule,
            },
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_account_rate_cards(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<AccountRateCardRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(AccountRateCardRow {
            value: crate::domain::AccountRateCard {
                id: row.try_get("id")?,
                rate_card_code: row.try_get("rate_card_code")?,
                tenant_id: row.try_get("tenant_id")?,
                organization_id: row.try_get("organization_id")?,
                subject_type: row.try_get("subject_type")?,
                subject_id: row.try_get("subject_id")?,
                subject_code: row.try_get("subject_code")?,
                pricing_plan_tenant_id: row.try_get("pricing_plan_tenant_id")?,
                pricing_plan_organization_id: row.try_get("pricing_plan_organization_id")?,
                pricing_plan_id: row.try_get("pricing_plan_id")?,
                pricing_plan_code: row.try_get("pricing_plan_code")?,
                priority: row.try_get("priority")?,
                effective_from: row.try_get("effective_from")?,
                effective_to: row.try_get("effective_to")?,
            },
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_upstream_supplier_model_access(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<UpstreamSupplierModelAccessRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(UpstreamSupplierModelAccessRow {
            supplier_id: row.try_get("supplier_id")?,
            supplier_code: row.try_get("supplier_code")?,
            model_blacklist_json: row.try_get("model_blacklist")?,
            model_whitelist_json: row.try_get("model_whitelist")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_upstream_account_model_access(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<UpstreamAccountModelAccessRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(UpstreamAccountModelAccessRow {
            account_id: row.try_get("account_id")?,
            account_code: row.try_get("account_code")?,
            model_blacklist_json: row.try_get("model_blacklist")?,
            model_whitelist_json: row.try_get("model_whitelist")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_api_keys(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<GatewayApiKeyRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(GatewayApiKeyRow {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            user_id: row.try_get("user_id")?,
            group_id: row.try_get("group_id")?,
            account_group_bindings_json: row.try_get("account_group_bindings_json")?,
            name: row.try_get("name")?,
            key_prefix: row.try_get("key_prefix")?,
            key_display_masked: row.try_get("key_display_masked")?,
            key_hash: row.try_get("key_hash")?,
            key_secret_mode: row.try_get("key_secret_mode")?,
            key_secret_plaintext: row.try_get("key_secret_plaintext")?,
            key_secret_ciphertext: row.try_get("key_secret_ciphertext")?,
            key_secret_key_id: row.try_get("key_secret_key_id")?,
            policy_id: row.try_get("policy_id")?,
            quota_policy_id: row.try_get("quota_policy_id")?,
            created_at: row.try_get("created_at")?,
            expire_at: row.try_get("expire_at")?,
            status_code: row.try_get("status_code")?,
            default_for_runtime: row.try_get("default_for_runtime")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_access_policies(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<GatewayAccessPolicyRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(GatewayAccessPolicyRow {
            id: row.try_get("id")?,
            allowed_capabilities_json: row.try_get("allowed_capabilities_json")?,
            ip_allowlist_json: row.try_get("ip_allowlist_json")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_quota_policies(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<QuotaPolicyRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(QuotaPolicyRow {
            id: row.try_get("id")?,
            quota_limit: row.try_get("quota_limit")?,
            requests_per_second: row.try_get("requests_per_second")?,
            requests_per_day: row.try_get("requests_per_day")?,
            burst_limit: row.try_get("burst_limit")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_gateway_risk_rules(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<GatewayRiskRuleRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(GatewayRiskRuleRow {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            rule_category: row.try_get("rule_category")?,
            rule_type: row.try_get("rule_type")?,
            scope_type: row.try_get("scope_type")?,
            scope_id: row.try_get("scope_id")?,
            target_type: row.try_get("target_type")?,
            target_value: row.try_get("target_value")?,
            match_mode: row.try_get("match_mode")?,
            action: row.try_get("action")?,
            priority: row.try_get("priority")?,
            requests_per_second: row.try_get("requests_per_second")?,
            requests_per_minute: row.try_get("requests_per_minute")?,
            requests_per_day: row.try_get("requests_per_day")?,
            burst_limit: row.try_get("burst_limit")?,
            block_duration_seconds: row.try_get("block_duration_seconds")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_upstream_account_group_metric_snapshots(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<UpstreamAccountGroupMetricSnapshotRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(UpstreamAccountGroupMetricSnapshotRow {
            group_id: row.try_get("group_id")?,
            capacity_used: row.try_get("capacity_used")?,
            capacity_limit: row.try_get("capacity_limit")?,
            usage_amount_total: row.try_get("usage_amount_total")?,
            snapshot_at: row.try_get("snapshot_at")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_prices(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<ModelPriceRow>, sqlx::Error> {
    map_query(sql, |row| {
        let billing_meter_code: String = row.try_get("billing_meter_code")?;
        let currency: String = row.try_get("currency")?;
        Ok(ModelPriceRow {
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            catalog_key: row.try_get("catalog_key")?,
            model: row.try_get("model")?,
            region_code: row.try_get("region_code")?,
            price_side_code: row.try_get("price_side_code")?,
            unit_size: row.try_get("unit_size")?,
            billing_meter_code,
            unit_price: row.try_get("unit_price")?,
            currency: currency.clone(),
            supplier_code: row.try_get("supplier_code")?,
            account_id: row.try_get("account_id")?,
            pricing_plan_code: row.try_get("pricing_plan_code")?,
            rate_metadata: Some(pricing_rate_metadata_from_row(&row, &currency)?),
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_pricing_default_regions(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<PricingDefaultRegionRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(PricingDefaultRegionRow {
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            catalog_key: row.try_get("catalog_key")?,
            default_region_code: row.try_get("default_region_code")?,
        })
    })
    .fetch(executor)
    .await
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct PricingConditionJson {
    dimension_code: String,
    operator_code: String,
    value: serde_json::Value,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct PricingTierJson {
    tier_code: String,
    lower_bound: String,
    upper_bound: Option<String>,
    unit_size: String,
    unit_price: String,
    flat_amount: String,
    currency_code: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct PricingFormulaJson {
    formula_code: String,
    formula_version: String,
    constant_units: String,
    quantity_coefficient: String,
    minimum_units: Option<String>,
    maximum_units: Option<String>,
    terms: Vec<PricingFormulaTermJson>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct PricingFormulaTermJson {
    term_code: String,
    dimension_code: String,
    coefficient: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct PricingScheduleJson {
    time_zone: String,
    weekly_windows: Vec<PricingWeeklyWindowJson>,
    #[serde(default)]
    include_dates: Vec<String>,
    #[serde(default)]
    exclude_dates: Vec<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct PricingWeeklyWindowJson {
    window_code: String,
    days_of_week: Vec<u8>,
    start_time: String,
    end_time: String,
    end_day_offset: u8,
}

fn pricing_rate_metadata_from_row(
    row: &PgRow,
    rate_currency: &str,
) -> Result<PricingRateMetadata, sqlx::Error> {
    let rate_variant_code = row.try_get::<String, _>("rate_variant")?;
    let rate_variant = PricingRateVariant::from_code(&rate_variant_code).ok_or_else(|| {
        decode_error(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            format!("invalid pricing rate variant {rate_variant_code}"),
        ))
    })?;
    let schedule = row
        .try_get::<Option<String>, _>("schedule_json")?
        .map(|value| parse_pricing_schedule(&value))
        .transpose()?;
    let conditions = serde_json::from_str::<Vec<PricingConditionJson>>(
        &row.try_get::<String, _>("conditions_json")?,
    )
    .map_err(decode_error)?
    .into_iter()
    .map(|condition| PricingRateCondition {
        dimension_code: condition.dimension_code,
        operator_code: condition.operator_code,
        value: condition.value,
    })
    .collect();
    let tiers =
        serde_json::from_str::<Vec<PricingTierJson>>(&row.try_get::<String, _>("tiers_json")?)
            .map_err(decode_error)?
            .into_iter()
            .map(|tier| {
                if !tier.currency_code.eq_ignore_ascii_case(rate_currency) {
                    return Err(sqlx::Error::Decode(
                        format!(
                            "pricing tier currency {} does not match rate currency {rate_currency}",
                            tier.currency_code
                        )
                        .into(),
                    ));
                }
                Ok(PricingRateTier {
                    tier_code: tier.tier_code,
                    lower_bound: DecimalValue::parse(&tier.lower_bound).map_err(decode_error)?,
                    upper_bound: tier
                        .upper_bound
                        .as_deref()
                        .map(DecimalValue::parse)
                        .transpose()
                        .map_err(decode_error)?,
                    unit_size: DecimalValue::parse(&tier.unit_size).map_err(decode_error)?,
                    unit_price: Money {
                        currency: rate_currency.to_owned(),
                        unit_price: DecimalValue::parse(&tier.unit_price).map_err(decode_error)?,
                    },
                    flat_amount: Money {
                        currency: rate_currency.to_owned(),
                        unit_price: DecimalValue::parse(&tier.flat_amount).map_err(decode_error)?,
                    },
                })
            })
            .collect::<Result<Vec<_>, sqlx::Error>>()?;
    let formula = row
        .try_get::<Option<String>, _>("formula_json")?
        .map(|value| serde_json::from_str::<PricingFormulaJson>(&value).map_err(decode_error))
        .transpose()?
        .map(|formula| -> Result<PricingFormula, sqlx::Error> {
            Ok(PricingFormula {
                formula_code: formula.formula_code,
                formula_version: formula.formula_version,
                constant_units: DecimalValue::parse(&formula.constant_units)
                    .map_err(decode_error)?,
                quantity_coefficient: DecimalValue::parse(&formula.quantity_coefficient)
                    .map_err(decode_error)?,
                minimum_units: formula
                    .minimum_units
                    .as_deref()
                    .map(DecimalValue::parse)
                    .transpose()
                    .map_err(decode_error)?,
                maximum_units: formula
                    .maximum_units
                    .as_deref()
                    .map(DecimalValue::parse)
                    .transpose()
                    .map_err(decode_error)?,
                terms: formula
                    .terms
                    .into_iter()
                    .map(|term| {
                        Ok(PricingFormulaTerm {
                            term_code: term.term_code,
                            dimension_code: term.dimension_code,
                            coefficient: DecimalValue::parse(&term.coefficient)
                                .map_err(decode_error)?,
                        })
                    })
                    .collect::<Result<Vec<_>, sqlx::Error>>()?,
            })
        })
        .transpose()?;

    Ok(PricingRateMetadata {
        record_identity: Some(crate::domain::PricingRateRecordIdentity {
            price_book_tenant_id: row.try_get("price_book_tenant_id")?,
            price_book_organization_id: row.try_get("price_book_organization_id")?,
            price_book_id: row.try_get("price_book_id")?,
            rate_id: row.try_get("rate_id")?,
        }),
        price_book_code: row.try_get("price_book_code")?,
        rate_hash: row.try_get("rate_hash")?,
        product_code: row.try_get("product_code")?,
        operation_code: row.try_get("operation_code")?,
        billability: row.try_get("billability")?,
        charge_timing: row.try_get("charge_timing")?,
        calculation_mode: row.try_get("calculation_mode")?,
        quantity_aggregation: row.try_get("quantity_aggregation")?,
        minimum_quantity: DecimalValue::parse(&row.try_get::<String, _>("minimum_quantity")?)
            .map_err(decode_error)?,
        quantity_step: row
            .try_get::<Option<String>, _>("quantity_step")?
            .as_deref()
            .map(DecimalValue::parse)
            .transpose()
            .map_err(decode_error)?,
        priority: row.try_get("priority")?,
        effective_from: row.try_get::<DateTime<Utc>, _>("effective_from")?,
        effective_to: row.try_get::<Option<DateTime<Utc>>, _>("effective_to")?,
        rate_variant,
        schedule,
        conditions,
        tiers,
        formula,
    })
}

fn parse_pricing_schedule(value: &str) -> Result<PricingSchedule, sqlx::Error> {
    let schedule = serde_json::from_str::<PricingScheduleJson>(value).map_err(decode_error)?;
    Ok(PricingSchedule {
        time_zone: schedule.time_zone.parse().map_err(decode_error)?,
        weekly_windows: schedule
            .weekly_windows
            .into_iter()
            .map(|window| {
                Ok(PricingWeeklyWindow {
                    window_code: window.window_code,
                    days_of_week: window.days_of_week,
                    start_time: NaiveTime::parse_from_str(&window.start_time, "%H:%M:%S")
                        .map_err(decode_error)?,
                    end_time: NaiveTime::parse_from_str(&window.end_time, "%H:%M:%S")
                        .map_err(decode_error)?,
                    end_day_offset: window.end_day_offset,
                })
            })
            .collect::<Result<Vec<_>, sqlx::Error>>()?,
        include_dates: schedule
            .include_dates
            .into_iter()
            .map(|value| NaiveDate::parse_from_str(&value, "%Y-%m-%d").map_err(decode_error))
            .collect::<Result<Vec<_>, sqlx::Error>>()?,
        exclude_dates: schedule
            .exclude_dates
            .into_iter()
            .map(|value| NaiveDate::parse_from_str(&value, "%Y-%m-%d").map_err(decode_error))
            .collect::<Result<Vec<_>, sqlx::Error>>()?,
    })
}

fn decode_error(error: impl std::error::Error + Send + Sync + 'static) -> sqlx::Error {
    sqlx::Error::Decode(Box::new(error))
}

struct QueryMapper<T, F>
where
    F: Fn(PgRow) -> Result<T, sqlx::Error>,
{
    sql: &'static str,
    mapper: F,
}

impl<T, F> QueryMapper<T, F>
where
    F: Fn(PgRow) -> Result<T, sqlx::Error>,
{
    /// Execute the mapped query against either a pool or a transaction.
    ///
    /// M-4: accepting any `Executor` lets `load_snapshot` wrap all catalog
    /// SELECTs in a single transaction so the pointer-swapped snapshot reflects
    /// one consistent database state instead of interleaved writes.
    async fn fetch<'e, E>(self, executor: E) -> Result<Vec<T>, sqlx::Error>
    where
        E: Executor<'e, Database = sqlx::Postgres>,
    {
        sqlx::query(self.sql)
            .fetch_all(executor)
            .await?
            .into_iter()
            .map(self.mapper)
            .collect()
    }
}

fn map_query<T, F>(sql: &'static str, mapper: F) -> QueryMapper<T, F>
where
    F: Fn(PgRow) -> Result<T, sqlx::Error>,
{
    QueryMapper { sql, mapper }
}

fn api_key_from_row(row: PgRow) -> Result<GatewayApiKeyRow, sqlx::Error> {
    Ok(GatewayApiKeyRow {
        id: row.try_get("id")?,
        tenant_id: row.try_get("tenant_id")?,
        organization_id: row.try_get("organization_id")?,
        user_id: row.try_get("user_id")?,
        group_id: row.try_get("group_id")?,
        account_group_bindings_json: row.try_get("account_group_bindings_json")?,
        name: row.try_get("name")?,
        key_prefix: row.try_get("key_prefix")?,
        key_display_masked: row.try_get("key_display_masked")?,
        key_hash: row.try_get("key_hash")?,
        key_secret_mode: row.try_get("key_secret_mode")?,
        key_secret_plaintext: row.try_get("key_secret_plaintext")?,
        key_secret_ciphertext: row.try_get("key_secret_ciphertext")?,
        key_secret_key_id: row.try_get("key_secret_key_id")?,
        policy_id: row.try_get("policy_id")?,
        quota_policy_id: row.try_get("quota_policy_id")?,
        created_at: row.try_get("created_at")?,
        expire_at: row.try_get("expire_at")?,
        status_code: row.try_get("status_code")?,
        default_for_runtime: row.try_get("default_for_runtime")?,
    })
}

pub(crate) struct ApiKeyPageQuery<'a> {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub search: Option<&'a str>,
    pub page_size: i64,
    pub offset: i64,
}

pub async fn load_api_keys_paginated(
    pool: &sqlx::PgPool,
    base_sql: &str,
    page: ApiKeyPageQuery<'_>,
) -> Result<Vec<GatewayApiKeyRow>, sqlx::Error> {
    let sql = format!(
        r#"
        SELECT page.*
        FROM ({base_sql}) page
        WHERE page.tenant_id = $1
          AND page.organization_id = $2
          AND page.user_id = $3
          AND (
              $4 IS NULL
              OR LOWER(page.name) LIKE $4
              OR LOWER(page.key_prefix) LIKE $4
              OR LOWER(page.key_display_masked) LIKE $4
          )
        ORDER BY page.created_at DESC, page.id DESC
        LIMIT $5 OFFSET $6
        "#
    );
    let rows = sqlx::query(sqlx::AssertSqlSafe(sql))
        .bind(page.tenant_id)
        .bind(page.organization_id)
        .bind(page.user_id)
        .bind(page.search)
        .bind(page.page_size)
        .bind(page.offset)
        .fetch_all(pool)
        .await?;
    rows.into_iter().map(api_key_from_row).collect()
}

pub async fn count_api_keys_paginated(
    pool: &sqlx::PgPool,
    base_sql: &str,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    search: Option<&str>,
) -> Result<i64, sqlx::Error> {
    let sql = format!(
        r#"
        SELECT COUNT(*)::bigint
        FROM ({base_sql}) page
        WHERE page.tenant_id = $1
          AND page.organization_id = $2
          AND page.user_id = $3
          AND (
              $4 IS NULL
              OR LOWER(page.name) LIKE $4
              OR LOWER(page.key_prefix) LIKE $4
              OR LOWER(page.key_display_masked) LIKE $4
          )
        "#
    );
    sqlx::query_scalar(sqlx::AssertSqlSafe(sql))
        .bind(tenant_id)
        .bind(organization_id)
        .bind(user_id)
        .bind(search)
        .fetch_one(pool)
        .await
}
