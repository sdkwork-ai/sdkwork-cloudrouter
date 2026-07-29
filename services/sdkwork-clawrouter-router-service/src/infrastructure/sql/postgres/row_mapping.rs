use sqlx::postgres::PgRow;
use sqlx::{Executor, Row};

pub(crate) fn postgres_row_i64(row: &PgRow, column: &str) -> Result<i64, sqlx::Error> {
    row.try_get::<i64, _>(column)
        .or_else(|_| row.try_get::<i32, _>(column).map(i64::from))
}

use crate::infrastructure::sql::rows::{
    AiModelRow, GatewayAccessPolicyRow, GatewayApiKeyRow, GatewayRiskRuleRow, ModelMappingRuleRow,
    ModelPriceRow, ModelVendorRow, PricingPlanRow, QuotaPolicyRow, RoutingPolicyRow,
    RoutingRuleRow, UpstreamAccountGroupMetricSnapshotRow, UpstreamAccountGroupRow,
    UpstreamAccountRouteRow,
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
            supplier_code: row.try_get("supplier_code")?,
            account_id: row.try_get("account_id")?,
            credential_id: row.try_get("credential_id")?,
            credential_rotation: row.try_get("credential_rotation")?,
            credential_priority: row.try_get("credential_priority")?,
            credential_weight: row.try_get("credential_weight")?,
            contract_cost_multiplier: row.try_get("contract_cost_multiplier")?,
            last_latency_ms: row.try_get("last_latency_ms")?,
            account_code: row.try_get("account_code")?,
            region_code: row.try_get("region_code")?,
            supplier_id: row.try_get("supplier_id")?,
            endpoint_id: row.try_get("endpoint_id")?,
            endpoint_code: row.try_get("endpoint_code")?,
            endpoint_priority: row.try_get("endpoint_priority")?,
            endpoint_weight: row.try_get("endpoint_weight")?,
            endpoint_health_status: row.try_get("endpoint_health_status")?,
            base_url: row.try_get("base_url")?,
            secret_ref: row.try_get("secret_ref")?,
            secret_ciphertext: row.try_get("secret_ciphertext")?,
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

pub async fn load_routing_policies(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<RoutingPolicyRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(RoutingPolicyRow {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            policy_code: row.try_get("policy_code")?,
            policy_scope: row.try_get("policy_scope")?,
            subject_id: row.try_get("subject_id")?,
            capability: row.try_get("capability")?,
            default_profile_id: row.try_get("default_profile_id")?,
            fallback_mode: row.try_get("fallback_mode")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_routing_rules(
    executor: impl sqlx::Executor<'_, Database = sqlx::Postgres>,
    sql: &'static str,
) -> Result<Vec<RoutingRuleRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(RoutingRuleRow {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            profile_id: row.try_get("profile_id")?,
            rule_code: row.try_get("rule_code")?,
            priority: row.try_get("priority")?,
            match_expression_json: row.try_get("match_expression_json")?,
            target_model: row.try_get("target_model")?,
            candidate_account_groups_json: row.try_get("candidate_account_groups_json")?,
            fallback_chain_json: row.try_get("fallback_chain_json")?,
            constraints_json: row.try_get("constraints_json")?,
        })
    })
    .fetch(executor)
    .await
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
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            plan_code: row.try_get("plan_code")?,
            base_price_side_code: row.try_get("base_price_side_code")?,
            default_multiplier: row.try_get("default_multiplier")?,
            default_markup_amount: row.try_get("default_markup_amount")?,
            currency: row.try_get("currency")?,
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
            pricing_plan_code: row.try_get("pricing_plan_code")?,
            routing_strategy: row.try_get("routing_strategy")?,
            fallback_mode: row.try_get("fallback_mode")?,
            priority: row.try_get("priority")?,
            cost_multiplier: row.try_get("cost_multiplier")?,
            sale_multiplier: row.try_get("sale_multiplier")?,
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
        Ok(ModelPriceRow {
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            catalog_key: row.try_get("catalog_key")?,
            model: row.try_get("model")?,
            region_code: row.try_get("region_code")?,
            price_side_code: row.try_get("price_side_code")?,
            billing_meter_code: row.try_get("billing_meter_code")?,
            unit_price: row.try_get("unit_price")?,
            currency: row.try_get("currency")?,
            supplier_code: row.try_get("supplier_code")?,
            account_id: row.try_get("account_id")?,
            pricing_plan_code: row.try_get("pricing_plan_code")?,
        })
    })
    .fetch(executor)
    .await
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
        policy_id: row.try_get("policy_id")?,
        quota_policy_id: row.try_get("quota_policy_id")?,
        created_at: row.try_get("created_at")?,
        expire_at: row.try_get("expire_at")?,
        status_code: row.try_get("status_code")?,
        default_for_runtime: row.try_get("default_for_runtime")?,
    })
}

pub async fn load_api_keys_paginated(
    pool: &sqlx::PgPool,
    base_sql: &str,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    search: Option<&str>,
    page_size: i64,
    offset: i64,
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
    let rows = sqlx::query(&sql)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(user_id)
        .bind(search)
        .bind(page_size)
        .bind(offset)
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
    sqlx::query_scalar(&sql)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(user_id)
        .bind(search)
        .fetch_one(pool)
        .await
}
