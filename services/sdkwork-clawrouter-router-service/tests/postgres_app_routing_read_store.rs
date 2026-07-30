use std::env;
use std::time::{SystemTime, UNIX_EPOCH};

use sdkwork_clawrouter_router_service::infrastructure::sql::postgres::PostgresAppRoutingReadStore;
use sdkwork_clawrouter_router_service::ports::{
    AppRoutingListQuery, AppRoutingReadStore, AppRoutingSubject,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";

#[tokio::test]
async fn postgres_app_routing_projects_authorized_account_groups_api_keys_and_traces() {
    let Some(context) = PostgresTestContext::new("app_routing_read").await else {
        return;
    };
    seed_routing_projection(&context.pool).await;

    let store = PostgresAppRoutingReadStore::new(context.pool.clone());
    let subject = Some(AppRoutingSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
    });

    let groups = store
        .load_routing_account_groups(subject, list_query())
        .await
        .expect("load routing account groups from PostgreSQL");
    assert_eq!(3, groups.total);
    assert_eq!(3, groups.items.len());

    let standard = groups
        .items
        .iter()
        .find(|item| item.group_code == "standard")
        .expect("standard account group");
    assert!(standard.authorized);
    assert_eq!(2, standard.member_account_count);
    assert_eq!(1, standard.available_account_count);
    assert_eq!(vec!["model.openai.gpt-4.1"], standard.resource_codes);
    assert!(standard.resource_group_codes.is_empty());

    let fallback = groups
        .items
        .iter()
        .find(|item| item.group_code == "fallback")
        .expect("fallback account group");
    assert!(fallback.authorized);
    assert_eq!(1, fallback.member_account_count);
    assert_eq!(0, fallback.available_account_count);
    assert!(fallback.resource_codes.is_empty());
    assert_eq!(vec!["bundle.deepseek.chat"], fallback.resource_group_codes);

    let private = groups
        .items
        .iter()
        .find(|item| item.group_code == "private")
        .expect("private account group");
    assert!(
        !private.authorized,
        "expired bindings must not authorize a group"
    );

    let api_keys = store
        .load_routing_api_keys(subject, list_query())
        .await
        .expect("load routing API keys from PostgreSQL");
    assert_eq!(1, api_keys.total);
    assert_eq!(1, api_keys.items.len());
    let api_key = &api_keys.items[0];
    assert_eq!("Production gateway key", api_key.name);
    assert_eq!("sk-live-****-0001", api_key.display_key);
    assert_eq!("3", api_key.total_usage);
    assert_eq!(2, api_key.account_groups.len());
    assert_eq!("standard", api_key.account_groups[0].code);
    assert_eq!("fallback", api_key.account_groups[1].code);

    let traces = store
        .load_routing_request_traces(subject, list_query())
        .await
        .expect("load routing request traces from PostgreSQL");
    assert_eq!(1, traces.total);
    assert_eq!(1, traces.items.len());
    let trace = &traces.items[0];
    assert_eq!("101", trace.upstream_account_id);
    assert_eq!("openai-primary", trace.upstream_account_code);
    assert_eq!("OpenAI primary snapshot", trace.upstream_account_name);
    assert_eq!("10", trace.upstream_account_group_id);
    assert_eq!("standard", trace.upstream_account_group_code);
    assert_eq!(
        "Standard routing snapshot",
        trace.upstream_account_group_name
    );
    assert_eq!("openai/gpt-4.1", trace.model);
    assert_eq!(24, trace.tokens);
    assert_eq!(200, trace.status);

    let public_projection = serde_json::to_string(&serde_json::json!({
        "accountGroups": groups.items,
        "apiKeys": api_keys.items,
        "requestTraces": traces.items,
    }))
    .expect("serialize App routing projection")
    .to_ascii_lowercase();
    for forbidden in [
        "baseurl",
        "credential_ref",
        "credentialhash",
        "credentialciphertext",
        "secretciphertext",
        "upstreamapikey",
    ] {
        assert!(
            !public_projection.contains(forbidden),
            "App routing response leaked forbidden field {forbidden}"
        );
    }

    context.cleanup().await;
}

fn list_query() -> AppRoutingListQuery {
    AppRoutingListQuery {
        page_no: 1,
        page_size: 20,
        offset: 0,
        q: None,
    }
}

struct PostgresTestContext {
    pool: PgPool,
    database_url: String,
    schema: String,
}

impl PostgresTestContext {
    async fn new(label: &str) -> Option<Self> {
        let database_url = match env::var(POSTGRES_TEST_DATABASE_URL) {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                eprintln!(
                    "skipping Postgres App routing integration test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = unique_schema_name(label);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .expect("connect to PostgreSQL test database");
        sqlx::query(&format!("CREATE SCHEMA {}", quote_identifier(&schema)))
            .execute(&admin_pool)
            .await
            .expect("create isolated PostgreSQL test schema");
        admin_pool.close().await;

        let schema_for_connections = schema.clone();
        let pool = PgPoolOptions::new()
            .max_connections(4)
            .after_connect(move |connection, _metadata| {
                let schema = schema_for_connections.clone();
                Box::pin(async move {
                    sqlx::query(&format!("SET search_path TO {}", quote_identifier(&schema)))
                        .execute(&mut *connection)
                        .await?;
                    Ok(())
                })
            })
            .connect(&database_url)
            .await
            .expect("connect isolated PostgreSQL test pool");
        create_schema(&pool).await;

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
            .expect("reconnect for PostgreSQL test cleanup");
        sqlx::query(&format!(
            "DROP SCHEMA {} CASCADE",
            quote_identifier(&schema)
        ))
        .execute(&admin_pool)
        .await
        .expect("drop isolated PostgreSQL test schema");
        admin_pool.close().await;
    }
}

async fn create_schema(pool: &PgPool) {
    for statement in [
        r#"CREATE TABLE ai_upstream_supplier (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TABLE ai_upstream_account (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            supplier_id BIGINT NOT NULL,
            preferred_endpoint_id BIGINT,
            account_code VARCHAR(128) NOT NULL,
            account_name VARCHAR(256) NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TABLE ai_upstream_account_health_state (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            account_id BIGINT NOT NULL,
            health_status INTEGER NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )"#,
        r#"CREATE TABLE ai_upstream_supplier_endpoint (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            supplier_id BIGINT NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TABLE ai_upstream_supplier_endpoint_health_state (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            endpoint_id BIGINT NOT NULL,
            health_status INTEGER NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )"#,
        r#"CREATE TABLE ai_upstream_account_credential (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            account_id BIGINT NOT NULL,
            secret_ciphertext TEXT NOT NULL,
            secret_key_id VARCHAR(64) NOT NULL,
            secret_fingerprint VARCHAR(128) NOT NULL,
            status INTEGER NOT NULL,
            is_active BOOLEAN NOT NULL,
            expires_at TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TABLE ai_upstream_account_group (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            group_code VARCHAR(128) NOT NULL,
            group_name VARCHAR(256) NOT NULL,
            description TEXT,
            routing_strategy VARCHAR(64) NOT NULL,
            fallback_mode VARCHAR(64) NOT NULL,
            cost_multiplier NUMERIC(38, 12) NOT NULL,
            sale_multiplier NUMERIC(38, 12) NOT NULL,
            status INTEGER NOT NULL,
            priority INTEGER NOT NULL,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TABLE ai_upstream_account_group_member (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            account_group_id BIGINT NOT NULL,
            account_id BIGINT NOT NULL,
            status INTEGER NOT NULL,
            enabled BOOLEAN NOT NULL,
            effective_from TIMESTAMPTZ,
            effective_to TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TABLE ai_upstream_account_group_resource (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            account_group_id BIGINT NOT NULL,
            resource_code VARCHAR(256),
            resource_group_code VARCHAR(256),
            grant_type VARCHAR(32) NOT NULL,
            priority INTEGER NOT NULL,
            status INTEGER NOT NULL,
            effective_from TIMESTAMPTZ,
            effective_to TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TABLE iam_gateway_api_key (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            user_id BIGINT NOT NULL,
            account_group_id BIGINT,
            name VARCHAR(128),
            key_prefix VARCHAR(64),
            key_display_masked VARCHAR(128),
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            status INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TABLE iam_gateway_api_key_account_group (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            api_key_id BIGINT NOT NULL,
            account_group_id BIGINT NOT NULL,
            binding_role VARCHAR(32) NOT NULL,
            status INTEGER NOT NULL,
            effective_from TIMESTAMPTZ,
            effective_to TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ
        )"#,
        r#"CREATE TABLE ai_request_trace (
            id BIGINT PRIMARY KEY,
            request_id VARCHAR(128),
            trace_id VARCHAR(128),
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            user_id BIGINT NOT NULL,
            status INTEGER NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            ended_at TIMESTAMPTZ,
            account_group_id BIGINT,
            account_group_snapshot VARCHAR(256),
            account_id BIGINT,
            account_name_snapshot VARCHAR(256),
            requested_model VARCHAR(256),
            provider_model VARCHAR(256),
            request_path VARCHAR(512),
            http_method VARCHAR(16),
            http_status INTEGER,
            provider_error_code VARCHAR(128),
            error_type VARCHAR(128),
            error_message_masked VARCHAR(1024),
            request_payload_hash VARCHAR(128),
            response_payload_hash VARCHAR(128),
            request_bytes BIGINT,
            response_bytes BIGINT,
            streaming BOOLEAN,
            started_at TIMESTAMPTZ,
            latency_ms INTEGER,
            total_tokens BIGINT
        )"#,
        r#"CREATE TABLE ai_usage (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            user_id BIGINT NOT NULL,
            api_key_id BIGINT,
            request_id VARCHAR(128),
            catalog_key VARCHAR(256),
            total_tokens BIGINT,
            request_count BIGINT,
            status INTEGER NOT NULL
        )"#,
        r#"CREATE TABLE ai_routing_decision_log (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            request_id VARCHAR(128),
            resolved_model VARCHAR(256),
            selected_account_id BIGINT,
            status INTEGER NOT NULL
        )"#,
    ] {
        sqlx::query(statement)
            .execute(pool)
            .await
            .expect("create App routing PostgreSQL test table");
    }
}

async fn seed_routing_projection(pool: &PgPool) {
    for statement in [
        "INSERT INTO ai_upstream_supplier (id, tenant_id, organization_id, status) VALUES (1, 100001, 0, 1), (2, 100001, 0, 0)",
        "INSERT INTO ai_upstream_account (id, tenant_id, organization_id, supplier_id, preferred_endpoint_id, account_code, account_name, status) VALUES (101, 100001, 0, 1, 1001, 'openai-primary', 'OpenAI primary', 1), (102, 100001, 0, 1, 1001, 'openai-degraded', 'OpenAI degraded', 1), (103, 100001, 0, 2, 1002, 'deepseek-fallback', 'DeepSeek fallback', 1)",
        "INSERT INTO ai_upstream_account_health_state (id, tenant_id, organization_id, account_id, health_status) VALUES (101, 100001, 0, 101, 1), (102, 100001, 0, 102, 2), (103, 100001, 0, 103, 1)",
        "INSERT INTO ai_upstream_supplier_endpoint (id, tenant_id, organization_id, supplier_id, status) VALUES (1001, 100001, 0, 1, 1), (1002, 100001, 0, 2, 1)",
        "INSERT INTO ai_upstream_supplier_endpoint_health_state (id, tenant_id, organization_id, endpoint_id, health_status) VALUES (1001, 100001, 0, 1001, 1), (1002, 100001, 0, 1002, 1)",
        "INSERT INTO ai_upstream_account_credential (id, tenant_id, organization_id, account_id, secret_ciphertext, secret_key_id, secret_fingerprint, status, is_active, expires_at) VALUES (201, 100001, 0, 101, 'encrypted-primary-secret', 'test-active', 'fingerprint-primary', 1, true, CURRENT_TIMESTAMP + INTERVAL '1 day'), (202, 100001, 0, 102, 'encrypted-expired-secret', 'test-active', 'fingerprint-expired', 1, true, CURRENT_TIMESTAMP - INTERVAL '1 day'), (203, 100001, 0, 103, 'encrypted-fallback-secret', 'test-active', 'fingerprint-fallback', 1, true, CURRENT_TIMESTAMP + INTERVAL '1 day')",
        "INSERT INTO ai_upstream_account_group (id, tenant_id, organization_id, group_code, group_name, description, routing_strategy, fallback_mode, cost_multiplier, sale_multiplier, status, priority) VALUES (10, 100001, 0, 'standard', 'Standard routing', 'Primary commercial route', 'weighted', 'cross_supplier', 1.100000000000, 1.250000000000, 1, 10), (11, 100001, 0, 'fallback', 'Fallback routing', 'Fallback route', 'priority', 'reject', 1.200000000000, 1.300000000000, 1, 20), (12, 100001, 0, 'private', 'Private routing', 'Unauthorized route', 'priority', 'reject', 1.000000000000, 1.100000000000, 1, 30)",
        "INSERT INTO ai_upstream_account_group_member (id, tenant_id, organization_id, account_group_id, account_id, status, enabled) VALUES (301, 100001, 0, 10, 101, 1, true), (302, 100001, 0, 10, 102, 1, true), (303, 100001, 0, 11, 103, 1, true)",
        "INSERT INTO ai_upstream_account_group_resource (id, tenant_id, organization_id, account_group_id, resource_code, grant_type, priority, status) VALUES (401, 100001, 0, 10, 'model.openai.gpt-4.1', 'allow', 10, 1)",
        "INSERT INTO ai_upstream_account_group_resource (id, tenant_id, organization_id, account_group_id, resource_group_code, grant_type, priority, status) VALUES (402, 100001, 0, 11, 'bundle.deepseek.chat', 'allow', 10, 1)",
        "INSERT INTO iam_gateway_api_key (id, tenant_id, organization_id, user_id, account_group_id, name, key_prefix, key_display_masked, status, created_at, updated_at) VALUES (501, 100001, 0, 30, 10, 'Production gateway key', 'sk-live', 'sk-live-****-0001', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        "INSERT INTO iam_gateway_api_key_account_group (id, tenant_id, organization_id, api_key_id, account_group_id, binding_role, status, effective_to) VALUES (601, 100001, 0, 501, 11, 'route', 1, CURRENT_TIMESTAMP + INTERVAL '1 day'), (602, 100001, 0, 501, 12, 'route', 1, CURRENT_TIMESTAMP - INTERVAL '1 day')",
        "INSERT INTO ai_request_trace (id, request_id, trace_id, tenant_id, organization_id, user_id, status, created_at, ended_at, account_group_id, account_group_snapshot, account_id, account_name_snapshot, requested_model, provider_model, request_path, http_method, http_status, request_payload_hash, response_payload_hash, request_bytes, response_bytes, streaming, started_at, latency_ms, total_tokens) VALUES (701, 'request-701', 'trace-701', 100001, 0, 30, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 10, 'Standard routing snapshot', 101, 'OpenAI primary snapshot', 'gpt-4.1', 'gpt-4.1-2026-01-01', '/v1/responses', 'POST', 200, 'request-hash', 'response-hash', 1024, 2048, true, CURRENT_TIMESTAMP - INTERVAL '125 milliseconds', 125, 20)",
        "INSERT INTO ai_usage (id, tenant_id, organization_id, user_id, api_key_id, request_id, catalog_key, total_tokens, request_count, status) VALUES (801, 100001, 0, 30, 501, 'request-701', 'openai/gpt-4.1', 24, 3, 1)",
        "INSERT INTO ai_routing_decision_log (id, tenant_id, organization_id, request_id, resolved_model, selected_account_id, status) VALUES (901, 100001, 0, 'request-701', 'openai/gpt-4.1', 101, 1)",
    ] {
        sqlx::query(statement)
            .execute(pool)
            .await
            .expect("seed App routing PostgreSQL projection");
    }
}

fn unique_schema_name(label: &str) -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock after Unix epoch")
        .as_nanos();
    format!("clawrouter_{label}_{}_{}", std::process::id(), nanos)
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
