use std::env;
use std::sync::Arc;

use sdkwork_clawrouter_router_service::application::ApiKeySecretCodec;
use sdkwork_clawrouter_router_service::infrastructure::crypto::{
    HmacSha256ApiKeySecretHasher, RingAeadApiKeySecretCodec,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::postgres::PostgresAdminUpstreamStore;
use sdkwork_clawrouter_router_service::infrastructure::sql::PricingCatalogSql;
use sdkwork_clawrouter_router_service::ports::{
    AdminUpstreamAccountGroupMemberInput, AdminUpstreamListQuery, AdminUpstreamResourceInput,
    AdminUpstreamStore, AdminUpstreamSubject, AdminUpstreamSupplierAuthMethodInput,
    AdminUpstreamSupplierEndpointInput, CreateAdminUpstreamAccountCredentialCommand,
    SaveAdminUpstreamAccountCommand, SaveAdminUpstreamAccountGroupCommand,
    SaveAdminUpstreamSupplierCommand,
};
use sqlx::postgres::PgPoolOptions;
use sqlx::{PgPool, Row};

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL";
const REQUESTED_AT: &str = "2026-07-28T12:00:00.000Z";

#[tokio::test]
async fn postgres_upstream_store_enforces_scope_concurrency_and_secret_safety() {
    let Some(context) = PostgresTestContext::new("admin_upstream").await else {
        return;
    };
    let codec = Arc::new(
        RingAeadApiKeySecretCodec::new("0123456789abcdef0123456789abcdef")
            .expect("credential codec"),
    );
    let hasher = Arc::new(
        HmacSha256ApiKeySecretHasher::new("abcdef0123456789abcdef0123456789")
            .expect("credential hasher"),
    );
    let store = PostgresAdminUpstreamStore::new(context.pool.clone(), codec.clone(), hasher);
    let subject = upstream_subject(100001, 200001);

    let supplier = store
        .save_supplier(SaveAdminUpstreamSupplierCommand {
            subject: subject.clone(),
            supplier_id: None,
            expected_version: None,
            uuid: "test-upstream-supplier-openai".to_owned(),
            supplier_code: "openai".to_owned(),
            supplier_name: "OpenAI".to_owned(),
            display_name: "OpenAI Official".to_owned(),
            description: Some("Official upstream".to_owned()),
            supplier_type: "official".to_owned(),
            adapter_code: "openai".to_owned(),
            protocol_code: "openai".to_owned(),
            website_url: Some("https://openai.com".to_owned()),
            docs_url: Some("https://platform.openai.com/docs".to_owned()),
            region_code: Some("global".to_owned()),
            environment: 1,
            sort_order: 10,
            status: 1,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create supplier");
    assert_eq!(0, supplier.version);

    let auth_methods = store
        .replace_supplier_auth_methods(
            subject.clone(),
            supplier.id,
            supplier.version,
            vec![AdminUpstreamSupplierAuthMethodInput {
                auth_method_code: "api-key".to_owned(),
                auth_method_name: "API key".to_owned(),
                auth_type: "api_key".to_owned(),
                config_schema: serde_json::json!({"type": "string"}),
                authorization_url: None,
                token_url: None,
                scopes: None,
                priority: 10,
                status: 1,
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace auth methods");
    assert_eq!(1, auth_methods.len());

    let endpoints = store
        .replace_supplier_endpoints(
            subject.clone(),
            supplier.id,
            1,
            vec![AdminUpstreamSupplierEndpointInput {
                endpoint_code: "global".to_owned(),
                endpoint_name: "Global API".to_owned(),
                base_url: "https://api.openai.com/v1".to_owned(),
                protocol_code: Some("openai".to_owned()),
                region_code: Some("global".to_owned()),
                environment: 1,
                priority: 10,
                routing_weight: 100,
                timeout_ms: Some(30_000),
                status: 1,
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace endpoints");
    assert_eq!(1, endpoints.len());

    store
        .replace_supplier_resources(
            subject.clone(),
            supplier.id,
            2,
            vec![resource("model:gpt-4.1")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace supplier resources");

    let account = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: None,
            expected_version: None,
            uuid: "test-upstream-account-openai-main".to_owned(),
            supplier_id: supplier.id,
            preferred_endpoint_id: Some(endpoints[0].id),
            account_code: "openai-main".to_owned(),
            account_name: "OpenAI main account".to_owned(),
            account_type: "standard".to_owned(),
            auth_method_code: "api-key".to_owned(),
            external_account_id: Some("org-commercial".to_owned()),
            environment: Some(1),
            region_code: Some("global".to_owned()),
            quota_limit: Some("100000.000000000000".to_owned()),
            upstream_balance_currency: Some("USD".to_owned()),
            contract_cost_multiplier: "0.850000000000".to_owned(),
            rpm_limit: Some(10_000),
            timeout_ms: Some(30_000),
            status: 1,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create upstream account");

    let long_secret = format!("sk-test-{}", "x".repeat(1024));
    let credential_command = CreateAdminUpstreamAccountCredentialCommand {
        subject: subject.clone(),
        account_id: account.id,
        uuid: "credential-idempotency-0001".to_owned(),
        credential_name: "Primary production key".to_owned(),
        secret: long_secret.clone(),
        priority: 10,
        expires_at: Some("2027-07-28T12:00:00.000Z".to_owned()),
        requested_at: REQUESTED_AT.to_owned(),
    };
    let credential = store
        .create_account_credential(credential_command.clone())
        .await
        .expect("create credential");
    let replay = store
        .create_account_credential(credential_command)
        .await
        .expect("idempotent credential replay");
    assert_eq!(credential.id, replay.id);
    assert_eq!(Some("sk-t****xxxx".to_owned()), credential.masked_label);

    let stored = sqlx::query(
        "SELECT credential_ref, credential_hash FROM ai_upstream_account_credential WHERE id = $1",
    )
    .bind(credential.id)
    .fetch_one(&context.pool)
    .await
    .expect("read encrypted credential evidence");
    let credential_ref: String = stored.try_get("credential_ref").expect("credential_ref");
    let credential_hash: String = stored.try_get("credential_hash").expect("credential_hash");
    assert!(credential_ref.len() > 256);
    assert_ne!(long_secret, credential_ref);
    assert_ne!(long_secret, credential_hash);
    assert_eq!(
        long_secret,
        codec
            .decode_secret(&credential_ref)
            .expect("decrypt stored credential")
    );

    let credential_page = store
        .list_account_credentials(list_query(subject.clone()), account.id)
        .await
        .expect("list credentials");
    assert_eq!(1, credential_page.items.len());
    assert_eq!(1, credential_page.total);

    let group = store
        .save_account_group(SaveAdminUpstreamAccountGroupCommand {
            subject: subject.clone(),
            account_group_id: None,
            expected_version: None,
            uuid: "test-upstream-account-group-default".to_owned(),
            group_code: "default".to_owned(),
            group_name: "Default routing group".to_owned(),
            description: Some("Commercial default group".to_owned()),
            group_type: "shared".to_owned(),
            routing_strategy: "weighted".to_owned(),
            fallback_mode: "cross_supplier".to_owned(),
            priority: 10,
            cost_multiplier: "1.100000000000".to_owned(),
            sale_multiplier: "1.250000000000".to_owned(),
            environment: Some(1),
            status: 1,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create account group");
    store
        .replace_account_group_members(
            subject.clone(),
            group.id,
            group.version,
            vec![AdminUpstreamAccountGroupMemberInput {
                account_id: account.id,
                priority: 10,
                routing_weight: 100,
                cost_multiplier_override: Some("0.950000000000".to_owned()),
                enabled: true,
                status: 1,
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account group members");
    store
        .replace_account_group_resources(
            subject.clone(),
            group.id,
            1,
            vec![resource("model:gpt-4.1")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account group resources");

    let runtime_rows = sqlx::query(PricingCatalogSql::load_upstream_account_routes())
        .bind(30_i64)
        .fetch_all(&context.pool)
        .await
        .expect("load runtime upstream account routes");
    assert_eq!(1, runtime_rows.len());
    let runtime_row = &runtime_rows[0];
    assert_eq!(
        format!("managed://upstream-account-credential/{}", credential.id),
        runtime_row
            .try_get::<String, _>("secret_ref")
            .expect("managed secret ref")
    );
    assert_eq!(
        credential_ref,
        runtime_row
            .try_get::<String, _>("secret_ciphertext")
            .expect("encrypted secret material")
    );
    assert_eq!(
        10,
        runtime_row.try_get::<i32, _>("endpoint_priority").unwrap()
    );
    assert_eq!(
        100,
        runtime_row.try_get::<i32, _>("endpoint_weight").unwrap()
    );
    let bindings: serde_json::Value = serde_json::from_str(
        &runtime_row
            .try_get::<String, _>("account_group_bindings_json")
            .expect("account group bindings"),
    )
    .expect("parse account group bindings");
    assert_eq!(
        Some("model:gpt-4.1"),
        bindings[0]["resourceEntitlements"][0]["resourceCode"].as_str()
    );
    assert_eq!(
        Some("openai/gpt-4.1"),
        bindings[0]["resourceEntitlements"][0]["catalogKey"].as_str()
    );

    sqlx::query(
        "UPDATE ai_upstream_account_group_resource SET grant_type = 'deny' WHERE account_group_id = $1",
    )
    .bind(group.id)
    .execute(&context.pool)
    .await
    .expect("deny group resource");
    let denied_rows = sqlx::query(PricingCatalogSql::load_upstream_account_routes())
        .bind(30_i64)
        .fetch_all(&context.pool)
        .await
        .expect("load denied runtime upstream account routes");
    let denied_bindings: serde_json::Value = serde_json::from_str(
        &denied_rows[0]
            .try_get::<String, _>("account_group_bindings_json")
            .expect("denied account group bindings"),
    )
    .expect("parse denied account group bindings");
    assert_eq!(
        serde_json::json!(["__deny__"]),
        denied_bindings[0]["apiScope"]
    );
    assert_eq!(
        serde_json::json!([]),
        denied_bindings[0]["resourceEntitlements"]
    );

    let isolated = store
        .list_accounts(list_query(upstream_subject(999999, 0)))
        .await
        .expect("tenant-isolated account list");
    assert_eq!(0, isolated.total);
    assert!(isolated.items.is_empty());

    let stale = store
        .replace_supplier_resources(
            subject.clone(),
            supplier.id,
            2,
            vec![resource("model:gpt-4.1-mini")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect_err("stale supplier version must fail");
    assert!(stale.is_conflict());

    let blocked = store
        .delete_account(
            subject.clone(),
            account.id,
            account.version,
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect_err("group member dependency must block account deletion");
    assert!(blocked.is_conflict());

    context.cleanup().await;
}

fn upstream_subject(tenant_id: i64, organization_id: i64) -> AdminUpstreamSubject {
    AdminUpstreamSubject {
        tenant_id,
        organization_id,
        operator_id: 300001,
        operator_type: 1,
    }
}

fn list_query(subject: AdminUpstreamSubject) -> AdminUpstreamListQuery {
    AdminUpstreamListQuery {
        subject,
        q: None,
        page: 1,
        page_size: 20,
        offset: 0,
    }
}

fn resource(resource_code: &str) -> AdminUpstreamResourceInput {
    AdminUpstreamResourceInput {
        resource_code: resource_code.to_owned(),
        resource_group_code: String::new(),
        grant_type: "allow".to_owned(),
        priority: 10,
        status: 1,
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
                    "skipping Postgres upstream store test; set {POSTGRES_TEST_DATABASE_URL} to run it"
                );
                return None;
            }
        };
        let schema = format!(
            "test_{}_{}_{}",
            label,
            std::process::id(),
            sdkwork_utils_rust::now().timestamp_millis().unsigned_abs()
        );
        let quoted_schema = quote_identifier(&schema);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&database_url)
            .await
            .expect("connect PostgreSQL admin pool");
        sqlx::query(&format!("CREATE SCHEMA {quoted_schema}"))
            .execute(&admin_pool)
            .await
            .expect("create test schema");
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
            .expect("connect PostgreSQL test pool");
        sqlx::raw_sql(include_str!(
            "../../../database/ddl/baseline/postgres/0001_clawrouter_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create ClawRouter schema");
        sqlx::raw_sql(include_str!(
            "../../../database/modules/gateway-iam/ddl/baseline/postgres/0001_gateway_iam_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create Gateway IAM schema");
        create_resource_catalog(&pool).await;
        Some(Self {
            pool,
            database_url,
            schema,
        })
    }

    async fn cleanup(self) {
        self.pool.close().await;
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect(&self.database_url)
            .await
            .expect("reconnect PostgreSQL admin pool");
        sqlx::query(&format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&self.schema)
        ))
        .execute(&admin_pool)
        .await
        .expect("drop test schema");
        admin_pool.close().await;
    }
}

async fn create_resource_catalog(pool: &PgPool) {
    sqlx::raw_sql(
        r#"
        CREATE TABLE ai_resource (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            resource_code VARCHAR(128) NOT NULL,
            resource_type VARCHAR(64) NOT NULL,
            vendor_code VARCHAR(64),
            modality_code VARCHAR(64),
            api_code VARCHAR(128),
            catalog_key VARCHAR(256),
            model VARCHAR(256),
            provider_native_model VARCHAR(256),
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TIMESTAMPTZ
        );
        CREATE TABLE ai_resource_group (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            group_code VARCHAR(128) NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TIMESTAMPTZ
        );
        CREATE TABLE ai_resource_group_item (
            id BIGINT PRIMARY KEY,
            tenant_id BIGINT NOT NULL,
            organization_id BIGINT NOT NULL,
            resource_group_id BIGINT NOT NULL,
            resource_group_code VARCHAR(128) NOT NULL,
            resource_id BIGINT,
            resource_code VARCHAR(128),
            child_resource_group_id BIGINT,
            child_resource_group_code VARCHAR(128),
            status INTEGER NOT NULL DEFAULT 1,
            deleted_at TIMESTAMPTZ
        );
        INSERT INTO ai_resource (
            id, tenant_id, organization_id, resource_code, resource_type,
            vendor_code, modality_code, api_code, catalog_key, model,
            provider_native_model, status
        ) VALUES (
            9101, 100001, 200001, 'model:gpt-4.1', 'model_api',
            'openai', 'chat', 'openai.chat_completions', 'openai/gpt-4.1', 'gpt-4.1',
            'gpt-4.1', 1
        );
        "#,
    )
    .execute(pool)
    .await
    .expect("create resource catalog fixture");
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
