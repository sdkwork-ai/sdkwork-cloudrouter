use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const PRICING_BASELINE: &str = include_str!(
    "../../../database/modules/pricing/ddl/baseline/postgres/0001_pricing_baseline.sql"
);
const PRICING_DIMENSION_COLUMNS_MIGRATION: &str = include_str!(
    "../../../database/modules/pricing/migrations/postgres/0001_pricing_rate_book_dimension_columns.up.sql"
);
const PRICING_INTEGRITY_MIGRATION: &str = include_str!(
    "../../../database/modules/pricing/migrations/postgres/0002_pricing_integrity_guards.up.sql"
);
const BILLING_BASELINE: &str = include_str!(
    "../../../database/modules/cloudrouter-billing/ddl/baseline/postgres/0001_cloudrouter_billing_baseline.sql"
);
const BILLING_INTEGRITY_MIGRATION: &str = include_str!(
    "../../../database/modules/cloudrouter-billing/migrations/postgres/0002_pricing_rule_integrity_guards.up.sql"
);

#[tokio::test]
async fn pricing_integrity_migration_enforces_payloads_dimensions_and_immutability() {
    let Some(context) = PostgresPricingTestContext::new().await else {
        return;
    };

    sqlx::raw_sql(PRICING_BASELINE)
        .execute(&context.pool)
        .await
        .unwrap();
    sqlx::raw_sql(PRICING_DIMENSION_COLUMNS_MIGRATION)
        .execute(&context.pool)
        .await
        .unwrap();
    sqlx::raw_sql(PRICING_INTEGRITY_MIGRATION)
        .execute(&context.pool)
        .await
        .unwrap();
    sqlx::raw_sql(BILLING_BASELINE)
        .execute(&context.pool)
        .await
        .unwrap();
    sqlx::raw_sql(BILLING_INTEGRITY_MIGRATION)
        .execute(&context.pool)
        .await
        .unwrap();

    sqlx::query(
        r#"
        INSERT INTO cloudrouter_pricing_plan (
            id, uuid, tenant_id, organization_id, plan_code, plan_name,
            base_price_side, currency_code, fallback_policy, rounding_mode,
            minimum_charge_amount, effective_from
        ) VALUES (
            10, 'cloudrouter-plan-10', 0, 0, 'standard', 'Standard',
            'official_reference', 'USD', 'fail_closed', 'half_up',
            0, '2026-08-17T00:00:00Z'
        )
        "#,
    )
    .execute(&context.pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_pricing_rule (
            id, uuid, tenant_id, organization_id, pricing_plan_id,
            rule_code, formula_mode, multiplier, markup_amount, conditions,
            priority, effective_from
        ) VALUES (
            10, 'cloudrouter-rule-10', 0, 0, 10,
            'standard-rule', 'multiplier_markup', 1, 0, '[]'::jsonb,
            100, '2026-08-17T00:00:00Z'
        )
        "#,
    )
    .execute(&context.pool)
    .await
    .unwrap();
    assert_rejected(
        &context.pool,
        "UPDATE cloudrouter_pricing_rule SET conditions = '[{\"dimensionCode\":\"region\",\"operatorCode\":\"contains\",\"value\":\"cn\"}]'::jsonb WHERE id = 10",
        "unsupported operator",
    )
    .await;
    assert_rejected(
        &context.pool,
        "UPDATE cloudrouter_pricing_rule SET conditions = '[{\"dimensionCode\":\"region\",\"operatorCode\":\"eq\",\"value\":\"cn\",\"unexpected\":true}]'::jsonb WHERE id = 10",
        "invalid condition object",
    )
    .await;
    assert_rejected(
        &context.pool,
        "UPDATE cloudrouter_pricing_rule SET schedule = '{\"timeZone\":\"Mars/Olympus\",\"weeklyWindows\":[{\"windowCode\":\"invalid\",\"daysOfWeek\":[1],\"startTime\":\"09:00:00\",\"endTime\":\"12:00:00\",\"endDayOffset\":0}],\"includeDates\":[],\"excludeDates\":[]}'::jsonb WHERE id = 10",
        "unknown IANA timezone",
    )
    .await;
    sqlx::query(
        r#"
        UPDATE cloudrouter_pricing_rule
        SET schedule = '{
            "timeZone":"Asia/Shanghai",
            "weeklyWindows":[{
                "windowCode":"overnight",
                "daysOfWeek":[1,2,3,4,5],
                "startTime":"21:00:00",
                "endTime":"02:00:00",
                "endDayOffset":1
            }],
            "includeDates":[],
            "excludeDates":[]
        }'::jsonb
        WHERE id = 10
        "#,
    )
    .execute(&context.pool)
    .await
    .unwrap();
    assert_rejected(
        &context.pool,
        "UPDATE cloudrouter_pricing_rule SET schedule = schedule || '{\"unexpected\":true}'::jsonb WHERE id = 10",
        "invalid timezone or array shape",
    )
    .await;

    sqlx::query(
        r#"
        INSERT INTO pricing_price_book (
            id, uuid, tenant_id, organization_id, namespace_code,
            price_book_code, price_book_version, price_side, source_system,
            vendor_code, region_code, source_catalog_version, source_hash,
            lifecycle_state, currency_code, effective_from
        ) VALUES (
            1, 'pricing-book-1', 0, 0, 'models',
            'openai-global', '2026-08-17', 'official_reference', 'sdkwork-models',
            'openai', 'global', '2026-08-17', 'book-hash-1',
            'staged', 'USD', '2026-08-17T00:00:00Z'
        )
        "#,
    )
    .execute(&context.pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO pricing_rate (
            id, uuid, tenant_id, organization_id, price_book_id,
            rate_code, rate_hash, product_code, product_kind, product_display_name,
            operation_code, operation_kind, operation_display_name,
            meter_code, meter_display_name, quantity_kind, unit_code,
            vendor_code, provider_code, region_code, resource_type, resource_code,
            billability, charge_timing, calculation_mode, quantity_aggregation,
            unit_size, unit_price, minimum_quantity, currency_code,
            conditions, tiers, formula, priority, rate_variant, schedule,
            effective_from, source_url, source_observed_at
        ) VALUES (
            1, 'pricing-rate-1', 0, 0, 1,
            'input-token.standard', 'rate-hash-1', 'gpt-5', 'model', 'GPT-5',
            'chat.completions.input', 'inference', 'Chat input',
            'input_token', 'Input token', 'token', 'token',
            'openai', 'openai', 'global', 'model', 'gpt-5',
            'chargeable', 'successful_result', 'per_unit', 'sum',
            1000000, 1.25, 0, 'USD',
            '[]'::jsonb, '[]'::jsonb, NULL, 100, 'standard', NULL,
            '2026-08-17T00:00:00Z', 'https://example.invalid/pricing',
            '2026-08-17T00:00:00Z'
        )
        "#,
    )
    .execute(&context.pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        UPDATE pricing_rate
        SET rate_variant = 'time_window',
            schedule = '{
                "timeZone":"Asia/Shanghai",
                "weeklyWindows":[{
                    "windowCode":"weekday-morning",
                    "daysOfWeek":[1,2,3,4,5],
                    "startTime":"09:00:00",
                    "endTime":"12:00:00",
                    "endDayOffset":0
                }],
                "includeDates":[],
                "excludeDates":[]
            }'::jsonb
        WHERE id = 1
        "#,
    )
    .execute(&context.pool)
    .await
    .unwrap();

    assert_rejected(
        &context.pool,
        "UPDATE pricing_rate SET conditions = '[{\"dimensionCode\":\"batch\",\"operatorCode\":\"contains\",\"value\":true}]'::jsonb WHERE id = 1",
        "unsupported operator",
    )
    .await;
    assert_rejected(
        &context.pool,
        "UPDATE pricing_rate SET conditions = '[{\"dimensionCode\":\"batch\",\"operatorCode\":\"eq\",\"value\":true,\"unexpected\":true}]'::jsonb WHERE id = 1",
        "invalid condition object",
    )
    .await;
    assert_rejected(
        &context.pool,
        "UPDATE pricing_rate SET calculation_mode = 'graduated', tiers = '[{\"tierCode\":\"tier-1\",\"lowerBound\":\"0\",\"upperBound\":\"10\",\"unitSize\":\"1\",\"unitPrice\":\"1\",\"flatAmount\":\"0\"},{\"tierCode\":\"tier-2\",\"lowerBound\":\"11\",\"unitSize\":\"1\",\"unitPrice\":\"0.8\",\"flatAmount\":\"0\"}]'::jsonb WHERE id = 1",
        "must be contiguous",
    )
    .await;
    assert_rejected(
        &context.pool,
        "UPDATE pricing_rate SET calculation_mode = 'formula', formula = '{\"formulaCode\":\"weighted\",\"formulaVersion\":\"1\",\"constantUnits\":\"0\",\"quantityCoefficient\":\"1\",\"minimumUnits\":\"10\",\"maximumUnits\":\"5\",\"terms\":[]}'::jsonb WHERE id = 1",
        "invalid minimum/maximum units",
    )
    .await;
    assert_rejected(
        &context.pool,
        "UPDATE pricing_rate SET schedule = '{\"timeZone\":\"Mars/Olympus\",\"weeklyWindows\":[{\"windowCode\":\"invalid\",\"daysOfWeek\":[1],\"startTime\":\"09:00:00\",\"endTime\":\"12:00:00\",\"endDayOffset\":0}],\"includeDates\":[],\"excludeDates\":[]}'::jsonb WHERE id = 1",
        "unknown IANA timezone",
    )
    .await;
    assert_rejected(
        &context.pool,
        "UPDATE pricing_rate SET schedule = schedule || '{\"unexpected\":true}'::jsonb WHERE id = 1",
        "invalid timezone or array shape",
    )
    .await;
    assert_rejected(
        &context.pool,
        "UPDATE pricing_rate SET vendor_code = 'anthropic' WHERE id = 1",
        "fk_pricing_rate_book_dimensions",
    )
    .await;

    sqlx::query(
        r#"
        UPDATE pricing_price_book
        SET lifecycle_state = 'active',
            activated_at = '2026-08-17T00:01:00Z'
        WHERE id = 1
        "#,
    )
    .execute(&context.pool)
    .await
    .unwrap();

    assert_rejected(
        &context.pool,
        "UPDATE pricing_rate SET priority = 99 WHERE id = 1",
        "rows in an active price book are immutable",
    )
    .await;
    assert_rejected(
        &context.pool,
        "DELETE FROM pricing_rate WHERE id = 1",
        "rows in an active price book are immutable",
    )
    .await;
    assert_rejected(
        &context.pool,
        "INSERT INTO pricing_rate SELECT 2, 'pricing-rate-2', tenant_id, organization_id, data_scope, status, created_at, updated_at, version, deleted_at, deleted_by, metadata, price_book_id, 'input-token.late', 'rate-hash-2', product_code, product_kind, product_display_name, operation_code, operation_kind, operation_display_name, meter_code, meter_display_name, quantity_kind, unit_code, vendor_code, provider_code, account_id, region_code, resource_type, resource_code, catalog_key, api_format, endpoint_code, billability, charge_timing, calculation_mode, quantity_aggregation, unit_size, unit_price, minimum_quantity, quantity_step, currency_code, conditions, tiers, formula, priority, rate_variant, schedule, effective_from, effective_to, source_url, source_observed_at FROM pricing_rate WHERE id = 1",
        "rows in an active price book are immutable",
    )
    .await;
    assert_rejected(
        &context.pool,
        "UPDATE pricing_price_book SET metadata = '{\"mutated\":true}'::jsonb WHERE id = 1",
        "business fields are immutable",
    )
    .await;

    sqlx::query("UPDATE pricing_price_book SET lifecycle_state = 'retired' WHERE id = 1")
        .execute(&context.pool)
        .await
        .unwrap();
    sqlx::query("UPDATE pricing_rate SET priority = 99 WHERE id = 1")
        .execute(&context.pool)
        .await
        .unwrap();

    context.cleanup().await;
}

async fn assert_rejected(pool: &PgPool, statement: &str, expected: &str) {
    let error = sqlx::query(sqlx::AssertSqlSafe(statement.to_owned()))
        .execute(pool)
        .await
        .expect_err("statement must be rejected by the pricing integrity contract");
    assert!(
        error.to_string().contains(expected),
        "expected error containing {expected:?}, got {error}"
    );
}

struct PostgresPricingTestContext {
    pool: PgPool,
    database_url: String,
    schema: String,
}

impl PostgresPricingTestContext {
    async fn new() -> Option<Self> {
        let database_url = match env::var(POSTGRES_TEST_DATABASE_URL) {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                eprintln!(
                    "skipping Postgres pricing integrity migration test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = unique_schema_name();
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE SCHEMA {}",
            quote_identifier(&schema)
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        admin_pool.close().await;

        let schema_for_connections = schema.clone();
        let pool = PgPoolOptions::new()
            .max_connections(2)
            .after_connect(move |connection, _metadata| {
                let schema = schema_for_connections.clone();
                Box::pin(async move {
                    sqlx::query(sqlx::AssertSqlSafe(format!(
                        "SET search_path TO {}",
                        quote_identifier(&schema)
                    )))
                    .execute(&mut *connection)
                    .await?;
                    Ok(())
                })
            })
            .connect(&database_url)
            .await
            .unwrap();

        Some(Self {
            pool,
            database_url,
            schema,
        })
    }

    async fn cleanup(self) {
        let Self {
            pool,
            database_url,
            schema,
        } = self;
        pool.close().await;
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .unwrap();
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&schema)
        )))
        .execute(&admin_pool)
        .await
        .unwrap();
        admin_pool.close().await;
    }
}

fn unique_schema_name() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    format!(
        "sdkwork_cloudrouter_pricing_integrity_{}_{}",
        std::process::id(),
        nanos
    )
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
