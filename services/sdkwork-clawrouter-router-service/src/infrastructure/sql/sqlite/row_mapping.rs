use sqlx::sqlite::SqliteRow;
use sqlx::{Executor, Row};

use crate::domain::{DomainError, DomainResult};
use crate::infrastructure::sql::rows::{
    AiModelRow, ChannelGroupMetricSnapshotRow, ChannelGroupRow, GatewayAccessPolicyRow,
    GatewayApiKeyRow, GatewayRiskRuleRow, ModelMappingRuleRow, ModelPriceRow,
    ModelProviderRouteRow, ModelVendorRow, PricingPlanRow, ProviderChannelRouteRow, QuotaPolicyRow,
    RoutingPolicyRow, RoutingRuleRow,
};

pub async fn load_vendors(
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
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
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
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

pub async fn load_provider_routes(
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
    sql: &'static str,
    circuit_breaker_recovery_window_seconds: i64,
) -> Result<Vec<ModelProviderRouteRow>, sqlx::Error> {
    let mapper = map_query(sql, |row| {
        Ok(ModelProviderRouteRow {
            catalog_key: row.try_get("catalog_key")?,
            model: row.try_get("model")?,
            api_code: row.try_get("api_code")?,
            region_code: row.try_get("region_code")?,
            provider_code: row.try_get("provider_code")?,
            channel_id: row.try_get("channel_id")?,
            credential_id: row.try_get("credential_id")?,
            credential_rotation: row.try_get("credential_rotation")?,
            credential_priority: row.try_get("credential_priority")?,
            credential_weight: row.try_get("credential_weight")?,
            provider_model: row.try_get("provider_model")?,
            base_url: row.try_get("base_url")?,
            secret_ref: row.try_get("secret_ref")?,
            auth_type: row.try_get("auth_type")?,
            auth_config_json: row.try_get("auth_config_json")?,
            timeout_ms: row.try_get("timeout_ms")?,
            retry_policy_json: row.try_get("retry_policy_json")?,
        })
    });
    sqlx::query(mapper.sql)
        .bind(circuit_breaker_recovery_window_seconds)
        .bind(circuit_breaker_recovery_window_seconds)
        .fetch_all(executor)
        .await?
        .into_iter()
        .map(mapper.mapper)
        .collect()
}

pub async fn load_provider_channel_routes(
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
    sql: &'static str,
    circuit_breaker_recovery_window_seconds: i64,
) -> Result<Vec<ProviderChannelRouteRow>, sqlx::Error> {
    let mapper = map_query(sql, |row| {
        Ok(ProviderChannelRouteRow {
            provider_code: row.try_get("provider_code")?,
            channel_id: row.try_get("channel_id")?,
            credential_id: row.try_get("credential_id")?,
            credential_rotation: row.try_get("credential_rotation")?,
            credential_priority: row.try_get("credential_priority")?,
            credential_weight: row.try_get("credential_weight")?,
            channel_code: row.try_get("channel_code")?,
            region_code: row.try_get("region_code")?,
            site_id: row.try_get("site_id")?,
            site_code: row.try_get("site_code")?,
            site_service_id: row.try_get("site_service_id")?,
            site_service_code: row.try_get("site_service_code")?,
            base_url: row.try_get("base_url")?,
            secret_ref: row.try_get("secret_ref")?,
            auth_type: row.try_get("auth_type")?,
            auth_config_json: row.try_get("auth_config_json")?,
            timeout_ms: row.try_get("timeout_ms")?,
            retry_policy_json: row.try_get("retry_policy_json")?,
            group_bindings_json: row.try_get("group_bindings_json")?,
            channel_health_status: row.try_get("channel_health_status")?,
            credential_health_status: row.try_get("credential_health_status")?,
        })
    });
    sqlx::query(mapper.sql)
        .bind(circuit_breaker_recovery_window_seconds)
        .bind(circuit_breaker_recovery_window_seconds)
        .fetch_all(executor)
        .await?
        .into_iter()
        .map(mapper.mapper)
        .collect()
}

pub async fn load_routing_policies(
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
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
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
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
            candidate_channels_json: row.try_get("candidate_channels_json")?,
            fallback_chain_json: row.try_get("fallback_chain_json")?,
            constraints_json: row.try_get("constraints_json")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_model_mappings(
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
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
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
    sql: &'static str,
) -> Result<Vec<PricingPlanRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(PricingPlanRow {
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

pub async fn load_channel_groups(
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
    sql: &'static str,
) -> Result<Vec<ChannelGroupRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(ChannelGroupRow {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            name: row.try_get("name")?,
            code: row.try_get("code")?,
            pricing_plan_code: row.try_get("pricing_plan_code")?,
            rate_multiplier: row.try_get("rate_multiplier")?,
            official_price_multiplier: row.try_get("official_price_multiplier")?,
        })
    })
    .fetch(executor)
    .await
}

pub async fn load_api_keys(
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
    sql: &'static str,
) -> Result<Vec<GatewayApiKeyRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(GatewayApiKeyRow {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            organization_id: row.try_get("organization_id")?,
            user_id: row.try_get("user_id")?,
            group_id: row.try_get("group_id")?,
            group_bindings_json: row.try_get("group_bindings_json")?,
            name: row.try_get("name")?,
            key_prefix: row.try_get("key_prefix")?,
            key_display_masked: row.try_get("key_display_masked")?,
            key_hash: row.try_get("key_hash")?,
            copyable_key: row.try_get("copyable_key")?,
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
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
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
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
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
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
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

pub async fn load_channel_group_metric_snapshots(
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
    sql: &'static str,
) -> Result<Vec<ChannelGroupMetricSnapshotRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(ChannelGroupMetricSnapshotRow {
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
    executor: impl sqlx::Executor<'_, Database = sqlx::Sqlite>,
    sql: &'static str,
) -> Result<Vec<ModelPriceRow>, sqlx::Error> {
    map_query(sql, |row| {
        Ok(ModelPriceRow {
            catalog_key: row.try_get("catalog_key")?,
            model: row.try_get("model")?,
            region_code: row.try_get("region_code")?,
            price_side_code: row.try_get("price_side_code")?,
            billing_meter_code: row.try_get("billing_meter_code")?,
            unit_price: row.try_get("unit_price")?,
            currency: row.try_get("currency")?,
            provider_code: row.try_get("provider_code")?,
            channel_id: row.try_get("channel_id")?,
            pricing_plan_code: row.try_get("pricing_plan_code")?,
        })
    })
    .fetch(executor)
    .await
}

struct QueryMapper<T, F>
where
    F: Fn(SqliteRow) -> Result<T, sqlx::Error>,
{
    sql: &'static str,
    mapper: F,
}

impl<T, F> QueryMapper<T, F>
where
    F: Fn(SqliteRow) -> Result<T, sqlx::Error>,
{
    /// Execute the mapped query against either a pool or a transaction.
    ///
    /// M-4: accepting any `Executor` lets `load_snapshot` wrap all catalog
    /// SELECTs in a single transaction so the pointer-swapped snapshot reflects
    /// one consistent database state instead of interleaved writes.
    async fn fetch<'e, E>(self, executor: E) -> Result<Vec<T>, sqlx::Error>
    where
        E: Executor<'e, Database = sqlx::Sqlite>,
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
    F: Fn(SqliteRow) -> Result<T, sqlx::Error>,
{
    QueryMapper { sql, mapper }
}

fn api_key_from_row(row: SqliteRow) -> Result<GatewayApiKeyRow, sqlx::Error> {
    Ok(GatewayApiKeyRow {
        id: row.try_get("id")?,
        tenant_id: row.try_get("tenant_id")?,
        organization_id: row.try_get("organization_id")?,
        user_id: row.try_get("user_id")?,
        group_id: row.try_get("group_id")?,
        group_bindings_json: row.try_get("group_bindings_json")?,
        name: row.try_get("name")?,
        key_prefix: row.try_get("key_prefix")?,
        key_display_masked: row.try_get("key_display_masked")?,
        key_hash: row.try_get("key_hash")?,
        copyable_key: row.try_get("copyable_key")?,
        policy_id: row.try_get("policy_id")?,
        quota_policy_id: row.try_get("quota_policy_id")?,
        created_at: row.try_get("created_at")?,
        expire_at: row.try_get("expire_at")?,
        status_code: row.try_get("status_code")?,
        default_for_runtime: row.try_get("default_for_runtime")?,
    })
}

pub async fn load_api_keys_paginated(
    pool: &sqlx::SqlitePool,
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
        WHERE page.tenant_id = ?
          AND page.organization_id = ?
          AND page.user_id = ?
          AND (
              ? IS NULL
              OR LOWER(page.name) LIKE ?
              OR LOWER(page.key_prefix) LIKE ?
              OR LOWER(page.key_display_masked) LIKE ?
          )
        ORDER BY page.created_at DESC, page.id DESC
        LIMIT ? OFFSET ?
        "#
    );
    let rows = sqlx::query(&sql)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(user_id)
        .bind(search)
        .bind(search)
        .bind(search)
        .bind(page_size)
        .bind(offset)
        .fetch_all(pool)
        .await?;
    rows.into_iter().map(api_key_from_row).collect()
}

pub async fn count_api_keys_paginated(
    pool: &sqlx::SqlitePool,
    base_sql: &str,
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
    search: Option<&str>,
) -> Result<i64, sqlx::Error> {
    let sql = format!(
        r#"
        SELECT COUNT(*)
        FROM ({base_sql}) page
        WHERE page.tenant_id = ?
          AND page.organization_id = ?
          AND page.user_id = ?
          AND (
              ? IS NULL
              OR LOWER(page.name) LIKE ?
              OR LOWER(page.key_prefix) LIKE ?
              OR LOWER(page.key_display_masked) LIKE ?
          )
        "#
    );
    sqlx::query_scalar(&sql)
        .bind(tenant_id)
        .bind(organization_id)
        .bind(user_id)
        .bind(search)
        .bind(search)
        .bind(search)
        .fetch_one(pool)
        .await
}

pub async fn load_paginated_channel_groups(
    pool: &sqlx::SqlitePool,
    tenant_id: i64,
    organization_id: i64,
    search: Option<&str>,
    page_size: i64,
    offset: i64,
) -> Result<Vec<SqliteRow>, sqlx::Error> {
    sqlx::query(
        r#"
        SELECT
            g.id,
            COALESCE(g.tenant_id, 0) AS tenant_id,
            COALESCE(g.organization_id, 0) AS organization_id,
            COALESCE(NULLIF(g.group_name, ''), g.group_code) AS name,
            g.group_code AS code,
            COALESCE(NULLIF(TRIM(g.pricing_plan_code), ''), 'standard') AS pricing_plan_code,
            CAST(g.rate_multiplier AS TEXT) AS rate_multiplier,
            CAST(g.official_price_multiplier AS TEXT) AS official_price_multiplier,
            COUNT(*) OVER() AS total
        FROM ai_channel_group g
        WHERE g.deleted_at IS NULL
          AND g.status = 1
          AND (g.tenant_id = ? OR g.tenant_id = 0)
          AND (g.organization_id = ? OR g.organization_id = 0)
          AND (
              ? IS NULL
              OR LOWER(COALESCE(g.group_name, g.group_code, '')) LIKE ?
              OR LOWER(COALESCE(g.group_code, '')) LIKE ?
          )
        ORDER BY g.updated_at DESC, g.id DESC
        LIMIT ? OFFSET ?
        "#,
    )
    .bind(tenant_id)
    .bind(organization_id)
    .bind(search)
    .bind(search)
    .bind(search)
    .bind(page_size)
    .bind(offset)
    .fetch_all(pool)
    .await
}

pub fn channel_group_from_row(row: &SqliteRow) -> DomainResult<crate::domain::ChannelGroup> {
    ChannelGroupRow {
        id: row.try_get("id").map_err(row_error)?,
        tenant_id: row.try_get("tenant_id").map_err(row_error)?,
        organization_id: row.try_get("organization_id").map_err(row_error)?,
        name: row.try_get("name").map_err(row_error)?,
        code: row.try_get("code").map_err(row_error)?,
        pricing_plan_code: row.try_get("pricing_plan_code").map_err(row_error)?,
        rate_multiplier: row.try_get("rate_multiplier").map_err(row_error)?,
        official_price_multiplier: row.try_get("official_price_multiplier").map_err(row_error)?,
    }
    .try_into_domain()
}

fn row_error(error: sqlx::Error) -> DomainError {
    DomainError::new(error.to_string())
}
