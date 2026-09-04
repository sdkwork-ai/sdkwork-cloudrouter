//! End-to-end Responses API (`POST /v1/responses`) resource-call routing tests
//! against the REAL dev PostgreSQL database (WSL) using the production SQL
//! schema, admin store, snapshot loader, secret-ref Responses relay, and real
//! local mock upstream providers.
//!
//! This covers the "responses" resource scheduling route that the
//! chat/completions chat test (`postgres_chat_completion_routing_e2e.rs`) does
//! NOT exercise: the Responses API uses `RoutingCapability::Chat` +
//! `openai.responses` api_code, a distinct relay (`ResponsesRelay`), and
//! distinct pricing meters, so a dedicated end-to-end chain is required.
//!
//! The chain under test (production wiring):
//!
//!   POST /v1/responses  (real Gateway API-key auth, NOT the auth-token path)
//!     → 真实鉴权 (ApiKeyAuthenticator hashes the bearer secret → find key)
//!     → 默认账号分组账号池 (account group pool via API-key group binding)
//!     → 路由策略/规则 (routing policy/profile/rule for openai.responses)
//!     → 路由账号选择 (account route with base_url + secret_ref)
//!     → secret 解析 (managed provider secrets from the snapshot)
//!     → 真实上游 HTTP 调用 (local mock provider as the routing target)
//!     → 响应回传 + usage 记录
//!
//! Test prerequisites (set before running):
//!   SDKWORK_DATABASE_URL=postgres://sdkwork_ai_dev:sdkworkdev123@localhost:5432/sdkwork_ai_dev

use std::num::NonZeroUsize;
use std::sync::Arc;

use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, Method, Request, StatusCode};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tower::ServiceExt;

use sdkwork_cloudrouter_router_service::api::{
    openai_responses_router_with_relay_usage_recorder_plugins_and_runtime_config,
    OpenAiRuntimeFailureStrategy, OpenAiRuntimeRouteConfig,
};
use sdkwork_cloudrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_cloudrouter_router_service::infrastructure::crypto::{
    HmacSha256ApiKeySecretHasher, RingAeadCredentialSecretCodec,
};
use sdkwork_cloudrouter_router_service::infrastructure::provider::{
    ProviderResponseMemoryBudget, RefreshableProviderSecretMapResolver,
    SecretRefOpenAiCompatibleResponsesRelay,
};
use sdkwork_cloudrouter_router_service::infrastructure::sql::catalog::RefreshableSqlPricingCatalog;
use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::{
    PostgresAdminUpstreamStore, PostgresPricingCatalogLoader,
};
use sdkwork_cloudrouter_router_service::ports::{
    AdminUpstreamAccountGroupMemberInput, AdminUpstreamListQuery, AdminUpstreamResourceInput,
    AdminUpstreamStore, AdminUpstreamSubject, AdminUpstreamSupplierAuthMethodInput,
    AdminUpstreamSupplierEndpointInput, GatewayUsageRecorder, LlmProtocolCode,
    SaveAdminUpstreamAccountCommand, SaveAdminUpstreamAccountGroupCommand,
    SaveAdminUpstreamSupplierCommand,
};
use sdkwork_cloudrouter_test_support::API_KEY_PEPPER;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const REQUESTED_AT: &str = "2026-07-28T12:00:00.000Z";

const TENANT_ID: i64 = 100_001;
const ORG_ID: i64 = 0;
const DEFAULT_GROUP_CODE: &str = "default-group";
const SUPPLIER_CODE: &str = "openrouter";
const MODEL: &str = "gpt-5.6-sol-responses-e2e";
const CATALOG_KEY: &str = "openai/gpt-5.6-sol-responses-e2e";
const RESOURCE_CODE: &str = "model:gpt-5.6-sol-responses-e2e";

const TEST_RESPONSE_MEMORY_BUDGET_BYTES: usize = 256 * 1024 * 1024;

fn test_response_memory_budget() -> ProviderResponseMemoryBudget {
    ProviderResponseMemoryBudget::new(
        NonZeroUsize::new(TEST_RESPONSE_MEMORY_BUDGET_BYTES)
            .expect("test response memory budget must be nonzero"),
    )
    .expect("test response memory budget must be valid")
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn upstream_subject(tenant_id: i64, organization_id: i64) -> AdminUpstreamSubject {
    AdminUpstreamSubject {
        tenant_id,
        organization_id,
        operator_id: 300_001,
        operator_type: 1,
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

// ---------------------------------------------------------------------------
// Postgres test context (isolated schema per test)
// ---------------------------------------------------------------------------

struct PostgresTestContext {
    pool: PgPool,
    database_url: String,
    schema: String,
}

impl PostgresTestContext {
    async fn new(label: &str) -> Option<Self> {
        let database_url = match std::env::var(POSTGRES_TEST_DATABASE_URL) {
            Ok(value) if !value.trim().is_empty() => value,
            _ => {
                eprintln!(
                    "skipping Postgres responses routing e2e test; set {POSTGRES_TEST_DATABASE_URL} to run it"
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
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "CREATE SCHEMA {quoted_schema}"
        )))
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
            .expect("connect PostgreSQL test pool");

        sqlx::raw_sql(include_str!(
            "../../../database/ddl/baseline/postgres/0001_cloudrouter_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create CloudRouter schema");
        sqlx::raw_sql(include_str!(
            "../../../database/modules/gateway-iam/ddl/baseline/postgres/0001_gateway_iam_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create Gateway IAM schema");
        sqlx::raw_sql(include_str!(
            "../../../../sdkwork-models/database/ddl/baseline/postgres/0001_sdkwork-models_baseline.sql"
        ))
        .execute(&pool)
        .await
        .expect("create sdkwork-models catalog schema");
        for migration_sql in [
            include_str!("../../../database/migrations/postgres/0020_upstream_account_group_default_flag.up.sql"),
            include_str!("../../../database/migrations/postgres/0025_upstream_account_group_model_lists.up.sql"),
            include_str!("../../../database/migrations/postgres/0026_add_upstream_supplier_model_lists.up.sql"),
            include_str!("../../../database/migrations/postgres/0027_add_upstream_supplier_endpoint_vendors.up.sql"),
            include_str!("../../../database/migrations/postgres/0028_add_upstream_supplier_default_base_url.up.sql"),
            include_str!("../../../database/migrations/postgres/0030_add_upstream_account_base_urls.up.sql"),
        ] {
            sqlx::raw_sql(migration_sql)
                .execute(&pool)
                .await
                .expect("apply routing migration");
        }

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
        sqlx::query(sqlx::AssertSqlSafe(format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&self.schema)
        )))
        .execute(&admin_pool)
        .await
        .expect("drop test schema");
        admin_pool.close().await;
    }
}

// ---------------------------------------------------------------------------
// Mock upstream provider (Responses API shape)
// ---------------------------------------------------------------------------

#[derive(Debug, Default, Clone)]
struct MockProvider {
    captured: Arc<std::sync::Mutex<Vec<CapturedUpstreamRequest>>>,
    marker: &'static str,
}

#[derive(Debug, Clone)]
struct CapturedUpstreamRequest {
    authorization: Option<String>,
    body: Value,
}

async fn start_mock_provider(marker: &'static str) -> (MockProvider, String) {
    let provider = MockProvider {
        captured: Arc::new(std::sync::Mutex::new(Vec::new())),
        marker,
    };
    let state = Arc::new(provider.clone());
    let app = Router::new()
        .route("/v1/responses", post(mock_responses_handler))
        .with_state(state);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    let base_url = format!("http://{addr}");
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    for _ in 0..100 {
        if tokio::net::TcpStream::connect(addr).await.is_ok() {
            return (provider, base_url);
        }
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    }
    panic!("mock provider failed to start accepting connections");
}

async fn mock_responses_handler(
    State(provider): State<Arc<MockProvider>>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> (StatusCode, Json<Value>) {
    provider
        .captured
        .lock()
        .unwrap()
        .push(CapturedUpstreamRequest {
            authorization: headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            body,
        });
    (
        StatusCode::OK,
        Json(json!({
            "id": format!("resp-e2e-{}", provider.marker),
            "object": "response",
            "created_at": 1_800_000_001,
            "status": "completed",
            "model": MODEL,
            "output": [{
                "type": "message",
                "role": "assistant",
                "content": [{"type": "output_text", "text": "pong"}]
            }],
            "usage": {
                "input_tokens": 3,
                "output_tokens": 5,
                "total_tokens": 8,
                "input_tokens_details": {"cached_tokens": 0},
                "output_tokens_details": {"reasoning_tokens": 0}
            }
        })),
    )
}

// ---------------------------------------------------------------------------
// Routing topology seed (admin store) — responses resource
// ---------------------------------------------------------------------------

struct SeededTopology {
    group_id: i64,
}

async fn seed_routing_topology(
    pool: &PgPool,
    codec: Arc<RingAeadCredentialSecretCodec>,
    provider_a_base_url: &str,
    provider_b_base_url: &str,
) -> SeededTopology {
    // The model's api_code must be `openai.responses` so that the Responses
    // API resource (`responses` capability) maps onto it.
    // A DB-owned model with the `responses` capability. The Responses route
    // resolver requires `ensure_model_capability(model, ["response","responses"])`.
    // The bundled `gpt-5.6-sol` only advertises `["chat"]` (the shared catalog
    // intentionally tags chat models with `chat` capability), so a dedicated
    // tenant-owned model with `api_format='openai_responses'` + `capability=1`
    // is inserted, which the snapshot derives the `responses` capability from.
    sqlx::query(
        r#"
        INSERT INTO ai_model (
            id, uuid, tenant_id, organization_id, data_scope, status, metadata,
            catalog_key, model, display_name, vendor_code, vendor_name_snapshot,
            family_code, capability, capabilities, modalities, input_modalities,
            output_modalities, api_format, context_tokens, max_output_tokens,
            supports_streaming, supports_tools, supports_json_schema,
            usage_scopes, coding_visible, rank_score, release_stage, shelf_state,
            routing_state, description
        ) VALUES (
            97_002, 'e2e-model-gpt-5.6-sol-responses', 0, 0, 1, 1, '{}'::jsonb,
            'openai/gpt-5.6-sol-responses-e2e', 'gpt-5.6-sol-responses-e2e',
            'GPT-5.6 Sol Responses E2E', 'openai', 'OpenAI',
            'gpt-5.6', 1, '["chat"]'::jsonb, '["text"]'::jsonb, '["text"]'::jsonb,
            '["text"]'::jsonb,             'openai_responses', 120000, 32768,
            true, true, true, '[]'::jsonb, true, 1220, 1, 1,
            1, 'E2E responses model'
        )
        "#,
    )
    .execute(pool)
    .await
    .expect("insert ai_model row for responses model");

    sqlx::query(
        r#"
        INSERT INTO ai_resource (
            id, uuid, tenant_id, organization_id, data_scope, status, metadata,
            resource_code, resource_type, display_name, vendor_code, modality_code,
            api_code, model_code, catalog_key, model, provider_native_model, sort_order
        ) VALUES (
            98_002, 'e2e-resource-gpt-5.6-sol-responses', 0, 0, 1, 1, '{}'::jsonb,
            'model:gpt-5.6-sol-responses-e2e', 'model_api', 'GPT-5.6 Sol Responses', 'openai', 'chat',
            'openai.responses', 'gpt-5.6-sol-responses-e2e',
            'openai/gpt-5.6-sol-responses-e2e', 'gpt-5.6-sol-responses-e2e',
            'gpt-5.6-sol-responses-e2e', 10
        )
        "#,
    )
    .execute(pool)
    .await
    .expect("insert ai_resource catalog row for responses model");

    let store = PostgresAdminUpstreamStore::new(pool.clone(), codec);
    let subject = upstream_subject(TENANT_ID, ORG_ID);

    let supplier = store
        .save_supplier(SaveAdminUpstreamSupplierCommand {
            subject: subject.clone(),
            supplier_id: None,
            expected_version: None,
            uuid: "e2e-supplier-openrouter-responses".to_owned(),
            supplier_code: SUPPLIER_CODE.to_owned(),
            default_vendor_code: Some("openai".to_owned()),
            default_base_url: Some(provider_a_base_url.to_owned()),
            supplier_name: "OpenRouter E2E Responses".to_owned(),
            display_name: "OpenRouter E2E Responses".to_owned(),
            description: Some("E2E upstream".to_owned()),
            supplier_type: "official".to_owned(),
            adapter_code: "openai".to_owned(),
            protocol_code: "openai".to_owned(),
            protocols: vec![
                sdkwork_cloudrouter_router_service::ports::AdminLlmProtocolConfig {
                    protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                    base_url: provider_a_base_url.to_owned(),
                },
            ],
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            website_url: None,
            docs_url: None,
            region_code: Some("global".to_owned()),
            environment: 0,
            sort_order: 10,
            status: 1,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create supplier");

    store
        .replace_supplier_auth_methods(
            subject.clone(),
            supplier.id,
            supplier.version,
            vec![AdminUpstreamSupplierAuthMethodInput {
                auth_method_code: "api-key".to_owned(),
                auth_method_name: "API key".to_owned(),
                auth_type: "api_key".to_owned(),
                config_schema: serde_json::json!({"type": "string"}),
                runtime_auth_config: serde_json::json!({
                    "credentialTransport": "bearer",
                    "defaultHeaders": {}
                }),
                priority: 10,
                status: 1,
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace auth methods");

    store
        .replace_supplier_endpoints(
            subject.clone(),
            supplier.id,
            supplier.version + 1,
            vec![AdminUpstreamSupplierEndpointInput {
                endpoint_code: "global".to_owned(),
                endpoint_name: "Global API".to_owned(),
                base_url: provider_a_base_url.to_owned(),
                protocol_code: Some("openai".to_owned()),
                region_code: Some("global".to_owned()),
                environment: 0,
                priority: 10,
                routing_weight: 100,
                timeout_ms: Some(30_000),
                status: 1,
                vendor_codes: vec!["openai".to_owned()],
            }],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace endpoints");

    store
        .replace_supplier_resources(
            subject.clone(),
            supplier.id,
            supplier.version + 2,
            vec![resource(RESOURCE_CODE)],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace supplier resources");

    let account_a = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: None,
            expected_version: None,
            uuid: "e2e-responses-account-a".to_owned(),
            supplier_id: supplier.id,
            preferred_endpoint_id: None,
            default_base_url: Some(provider_a_base_url.to_owned()),
            protocols: vec![
                sdkwork_cloudrouter_router_service::ports::AdminLlmProtocolConfig {
                    protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                    base_url: provider_a_base_url.to_owned(),
                },
            ],
            account_code: "e2e-responses-account-a".to_owned(),
            account_name: "E2E Responses Account A".to_owned(),
            account_type: "standard".to_owned(),
            auth_method_code: "api-key".to_owned(),
            external_account_id: None,
            environment: Some(0),
            region_code: Some("global".to_owned()),
            quota_limit: None,
            upstream_balance_currency: None,
            contract_cost_multiplier: "1.000000000000".to_owned(),
            rpm_limit: None,
            timeout_ms: Some(30_000),
            status: 1,
            billing_mode: "prepay".to_owned(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            api_key: Some("sk-e2e-responses-account-a-secret".to_owned()),
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create responses account A");

    let account_b = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: None,
            expected_version: None,
            uuid: "e2e-responses-account-b".to_owned(),
            supplier_id: supplier.id,
            preferred_endpoint_id: None,
            default_base_url: Some(provider_b_base_url.to_owned()),
            protocols: vec![
                sdkwork_cloudrouter_router_service::ports::AdminLlmProtocolConfig {
                    protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                    base_url: provider_b_base_url.to_owned(),
                },
            ],
            account_code: "e2e-responses-account-b".to_owned(),
            account_name: "E2E Responses Account B".to_owned(),
            account_type: "standard".to_owned(),
            auth_method_code: "api-key".to_owned(),
            external_account_id: None,
            environment: Some(0),
            region_code: Some("global".to_owned()),
            quota_limit: None,
            upstream_balance_currency: None,
            contract_cost_multiplier: "1.000000000000".to_owned(),
            rpm_limit: None,
            timeout_ms: Some(30_000),
            status: 1,
            billing_mode: "prepay".to_owned(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            api_key: Some("sk-e2e-responses-account-b-secret".to_owned()),
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create responses account B");

    // Pricing plan + default multiplier rule.
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_pricing_plan (
            id, uuid, tenant_id, organization_id, data_scope, status, metadata,
            plan_code, plan_name, base_price_side, currency_code, fallback_policy,
            rounding_mode, minimum_charge_amount, effective_from
        ) VALUES (
            99_042, 'e2e-responses-standard-plan', 0, 0, 0, 1, '{}'::jsonb,
            'standard', 'Standard plan', 'official_reference', 'USD', 'fail_closed',
            'half_up', 0, $1
        )
        "#,
    )
    .bind(
        chrono::DateTime::parse_from_rfc3339("2026-01-01T00:00:00Z")
            .expect("parse plan effective from")
            .with_timezone(&chrono::Utc),
    )
    .execute(pool)
    .await
    .expect("insert standard pricing plan");

    sqlx::query(
        r#"
        INSERT INTO cloudrouter_pricing_rule (
            id, uuid, tenant_id, organization_id, data_scope, status, pricing_plan_id,
            rule_code, product_code, operation_code, meter_code, provider_code, region_code,
            catalog_key, formula_mode, multiplier, markup_amount, unit_price_override,
            conditions, schedule, priority, effective_from
        ) VALUES (
            99_052, 'e2e-responses-standard-rule', 0, 0, 0, 1, 99_042,
            'default', NULL, NULL, NULL, NULL, NULL,
            NULL, 'multiplier_markup', 1.000000000000, 0, NULL,
            '[]'::jsonb, NULL, 10, $1
        )
        "#,
    )
    .bind(
        chrono::DateTime::parse_from_rfc3339("2026-01-01T00:00:00Z")
            .expect("parse rule effective from")
            .with_timezone(&chrono::Utc),
    )
    .execute(pool)
    .await
    .expect("insert standard pricing rule");

    // Default account group with both accounts in the pool.
    let group = store
        .save_account_group(SaveAdminUpstreamAccountGroupCommand {
            subject: subject.clone(),
            account_group_id: None,
            expected_version: None,
            uuid: "e2e-responses-default-group".to_owned(),
            group_code: DEFAULT_GROUP_CODE.to_owned(),
            group_name: "E2E Responses default group".to_owned(),
            description: None,
            group_type: "mixed".to_owned(),
            routing_strategy: "failover".to_owned(),
            fallback_mode: "cross_supplier".to_owned(),
            priority: 10,
            cost_multiplier: "1.000000000000".to_owned(),
            sale_multiplier: "1.000000000000".to_owned(),
            environment: Some(1),
            vendor_code: None,
            modalities: Vec::new(),
            tags: Vec::new(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            is_default: true,
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
            vec![
                AdminUpstreamAccountGroupMemberInput {
                    account_id: account_a.id,
                    priority: 10,
                    routing_weight: 100,
                    cost_multiplier_override: None,
                    enabled: true,
                    status: 1,
                },
                AdminUpstreamAccountGroupMemberInput {
                    account_id: account_b.id,
                    priority: 20,
                    routing_weight: 50,
                    cost_multiplier_override: None,
                    enabled: true,
                    status: 1,
                },
            ],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account group members");

    store
        .replace_account_group_resources(
            subject.clone(),
            group.id,
            group.version + 1,
            vec![resource(RESOURCE_CODE)],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account group resources");

    store
        .replace_account_resources(
            subject.clone(),
            account_a.id,
            account_a.version,
            vec![resource(RESOURCE_CODE)],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account A resources");

    store
        .replace_account_resources(
            subject.clone(),
            account_b.id,
            account_b.version,
            vec![resource(RESOURCE_CODE)],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account B resources");

    // Routing behavior is driven by the account group itself (routing_strategy
    // set at group creation) plus the group-member pool and resource
    // entitlements above. The retired ai_routing_policy/profile/rule tables are
    // no longer part of the schema (V2 design P6) and must not be seeded here.

    seed_pricing(pool, account_a.id, account_b.id).await;

    SeededTopology { group_id: group.id }
}

async fn seed_pricing(pool: &PgPool, account_a_id: i64, account_b_id: i64) {
    let now = sqlx::query_scalar::<_, chrono::DateTime<chrono::Utc>>("SELECT CURRENT_TIMESTAMP")
        .fetch_one(pool)
        .await
        .expect("read current timestamp");
    sqlx::query(
        r#"
        INSERT INTO pricing_import_run (
            id, uuid, tenant_id, organization_id, user_id, request_id, trace_id, payload_hash,
            status, source_system, source_catalog_version, source_hash, import_state,
            row_count, accepted_count, rejected_count, staged_at
        ) VALUES (
            99_002, 'e2e-responses-import-run', $1, $2, 0, 'e2e', 'e2e', 'e2e', 1,
            'e2e', 'e2e', 'e2e', 'activated', 3, 3, 0, $3
        )
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORG_ID)
    .bind(now)
    .execute(pool)
    .await
    .expect("insert pricing import run");

    sqlx::query(
        r#"
        INSERT INTO pricing_price_book (
            id, uuid, tenant_id, organization_id, data_scope, status, import_run_id,
            namespace_code, price_book_code, price_book_version, price_side, source_system,
            vendor_code, region_code, source_catalog_version, source_hash, lifecycle_state,
            currency_code, effective_from
        ) VALUES (
            99_013, 'e2e-responses-official-book', $1, $2, 1, 1, 99_002,
            'e2e', 'official', '1', 'official_reference', 'e2e',
            'openai', 'global', 'e2e', 'e2e', 'active', 'USD', $3
        )
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORG_ID)
    .bind(now)
    .execute(pool)
    .await
    .expect("insert official price book");

    sqlx::query(
        r#"
        INSERT INTO pricing_price_book (
            id, uuid, tenant_id, organization_id, data_scope, status, import_run_id,
            namespace_code, price_book_code, price_book_version, price_side, source_system,
            vendor_code, region_code, source_catalog_version, source_hash, lifecycle_state,
            currency_code, effective_from
        ) VALUES (
            99_014, 'e2e-responses-upstream-book', $1, $2, 1, 1, 99_002,
            'e2e', 'upstream', '1', 'upstream_cost', 'e2e',
            'openai', 'global', 'e2e', 'e2e', 'active', 'USD', $3
        )
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORG_ID)
    .bind(now)
    .execute(pool)
    .await
    .expect("insert upstream price book");

    for (meter, official, upstream) in [
        ("llm_input_token", "0.150000", "0.110000"),
        ("llm_output_token", "0.600000", "0.440000"),
        ("llm_cache_read_token", "0.075000", "0.055000"),
    ] {
        sqlx::query(
            r#"
            INSERT INTO pricing_rate (
                id, uuid, tenant_id, organization_id, data_scope, status, price_book_id,
                rate_code, rate_hash, product_code, product_kind, product_display_name,
                operation_code, operation_kind, operation_display_name,
                meter_code, meter_display_name, quantity_kind, unit_code,
                vendor_code, provider_code, region_code, resource_type, resource_code,
                catalog_key, api_format, billability, charge_timing, calculation_mode,
                quantity_aggregation, unit_size, unit_price, minimum_quantity, currency_code,
                priority, effective_from, source_url, source_observed_at
            ) VALUES (
                $1, $2, $3, $4, 1, 1, 99_013,
                $5, $5, 'gpt-5.6-sol-responses-e2e', 'model', 'GPT-5.6 Sol',
                $6, 'meter', $7,
                $6, $7, 'token', 'token',
                'openai', '', 'global', 'model', 'model:gpt-5.6-sol-responses-e2e',
                $8, 'openai_responses', 'chargeable', 'usage_reported', 'per_unit',
                'sum', 1, $9::numeric, 0, 'USD',
                1, $10, 'e2e', $10
            )
            "#,
        )
        .bind(99_022_i64 + rate_id_offset(meter))
        .bind(format!("e2e-responses-official-{meter}"))
        .bind(TENANT_ID)
        .bind(ORG_ID)
        .bind(format!("responses-official-{meter}"))
        .bind(meter)
        .bind(meter.to_owned())
        .bind(CATALOG_KEY)
        .bind(official)
        .bind(now)
        .execute(pool)
        .await
        .expect("insert official pricing rate");

        sqlx::query(
            r#"
            INSERT INTO pricing_rate (
                id, uuid, tenant_id, organization_id, data_scope, status, price_book_id,
                rate_code, rate_hash, product_code, product_kind, product_display_name,
                operation_code, operation_kind, operation_display_name,
                meter_code, meter_display_name, quantity_kind, unit_code,
                vendor_code, provider_code, account_id, region_code, resource_type, resource_code,
                catalog_key, api_format, billability, charge_timing, calculation_mode,
                quantity_aggregation, unit_size, unit_price, minimum_quantity, currency_code,
                priority, effective_from, source_url, source_observed_at
            ) VALUES (
                $1, $2, $3, $4, 1, 1, 99_014,
                $5, $5, 'gpt-5.6-sol-responses-e2e', 'model', 'GPT-5.6 Sol',
                $6, 'meter', $7,
                $6, $7, 'token', 'token',
                'openai', $11, $12, 'global', 'model', 'model:gpt-5.6-sol-responses-e2e',
                $8, 'openai_responses', 'chargeable', 'usage_reported', 'per_unit',
                'sum', 1, $9::numeric, 0, 'USD',
                1, $10, 'e2e', $10
            )
            "#,
        )
        .bind(99_032_i64 + rate_id_offset(meter))
        .bind(format!("e2e-responses-upstream-{meter}"))
        .bind(TENANT_ID)
        .bind(ORG_ID)
        .bind(format!("responses-upstream-{meter}"))
        .bind(meter)
        .bind(meter.to_owned())
        .bind(CATALOG_KEY)
        .bind(upstream)
        .bind(now)
        .bind(SUPPLIER_CODE)
        .bind(account_a_id)
        .execute(pool)
        .await
        .expect("insert upstream pricing rate for account A");

        sqlx::query(
            r#"
            INSERT INTO pricing_rate (
                id, uuid, tenant_id, organization_id, data_scope, status, price_book_id,
                rate_code, rate_hash, product_code, product_kind, product_display_name,
                operation_code, operation_kind, operation_display_name,
                meter_code, meter_display_name, quantity_kind, unit_code,
                vendor_code, provider_code, account_id, region_code, resource_type, resource_code,
                catalog_key, api_format, billability, charge_timing, calculation_mode,
                quantity_aggregation, unit_size, unit_price, minimum_quantity, currency_code,
                priority, effective_from, source_url, source_observed_at
            ) VALUES (
                $1, $2, $3, $4, 1, 1, 99_014,
                $5, $5, 'gpt-5.6-sol-responses-e2e', 'model', 'GPT-5.6 Sol',
                $6, 'meter', $7,
                $6, $7, 'token', 'token',
                'openai', $11, $12, 'global', 'model', 'model:gpt-5.6-sol-responses-e2e',
                $8, 'openai_responses', 'chargeable', 'usage_reported', 'per_unit',
                'sum', 1, $9::numeric, 0, 'USD',
                1, $10, 'e2e', $10
            )
            "#,
        )
        .bind(99_042_i64 + rate_id_offset(meter))
        .bind(format!("e2e-responses-upstream-b-{meter}"))
        .bind(TENANT_ID)
        .bind(ORG_ID)
        .bind(format!("responses-upstream-b-{meter}"))
        .bind(meter)
        .bind(meter.to_owned())
        .bind(CATALOG_KEY)
        .bind(upstream)
        .bind(now)
        .bind(SUPPLIER_CODE)
        .bind(account_b_id)
        .execute(pool)
        .await
        .expect("insert upstream pricing rate for account B");
    }
}

fn rate_id_offset(meter: &str) -> i64 {
    match meter {
        "llm_input_token" => 0,
        "llm_output_token" => 1,
        _ => 2,
    }
}

// ---------------------------------------------------------------------------
// Gateway API-key seeding (real API-key auth path)
// ---------------------------------------------------------------------------

/// Inserts an active `iam_gateway_api_key` bound to the default account group,
/// hashed with the production HMAC-SHA256 hasher so `ApiKeyAuthenticator`
/// (used by the Responses router) resolves the bearer secret to this key.
async fn seed_gateway_api_key(pool: &PgPool, group_id: i64) -> String {
    let hasher = Arc::new(
        HmacSha256ApiKeySecretHasher::new(API_KEY_PEPPER).expect("hasher must initialize"),
    );
    let raw_key = "sk-e2e-responses-gateway-secret";
    let key_hash = hasher
        .hash_secret(raw_key)
        .expect("hash gateway key secret");

    sqlx::query(
        r#"
        INSERT INTO iam_gateway_api_key (
            id, uuid, tenant_id, organization_id, data_scope, status,
            created_at, updated_at, version, metadata,
            user_id, owner_type, owner_id, account_group_id,
            name, key_prefix, key_display_masked, key_hash, hash_alg, secret_version,
            key_secret_mode, key_secret_plaintext, key_secret_ciphertext, key_secret_key_id,
            idempotency_key, environment, expire_at, revoked_at
        ) VALUES (
            70_001, 'e2e-responses-gateway-key', $1, $2, 0, 1,
            $3::timestamptz, $3::timestamptz, 0, '{}'::jsonb,
            30, 1, 30, $4,
            'E2E Responses Gateway Key', 'sk-e2e-', 'sk-e2e-************', $5, 'hmac-sha256', 1,
            'plaintext', $6, NULL, NULL,
            'e2e-responses-gateway-key', 1, NULL, NULL
        )
        "#,
    )
    .bind(TENANT_ID)
    .bind(ORG_ID)
    .bind(
        chrono::DateTime::parse_from_rfc3339("2026-07-28T00:00:00Z")
            .expect("parse api key created at")
            .with_timezone(&chrono::Utc),
    )
    .bind(group_id)
    .bind(&key_hash)
    .bind(raw_key)
    .execute(pool)
    .await
    .expect("insert gateway API key");

    raw_key.to_owned()
}

// ---------------------------------------------------------------------------
// Router + snapshot assembly (Responses router)
// ---------------------------------------------------------------------------

struct RecordingUsageRecorder {
    records: Arc<
        std::sync::Mutex<Vec<sdkwork_cloudrouter_router_service::ports::GatewayUsageRecordCommand>>,
    >,
}

impl RecordingUsageRecorder {
    fn new() -> Self {
        Self {
            records: Arc::new(std::sync::Mutex::new(Vec::new())),
        }
    }

    fn records(&self) -> Vec<sdkwork_cloudrouter_router_service::ports::GatewayUsageRecordCommand> {
        self.records.lock().unwrap().clone()
    }
}

impl GatewayUsageRecorder for RecordingUsageRecorder {
    fn record_gateway_usage<'a>(
        &'a self,
        command: sdkwork_cloudrouter_router_service::ports::GatewayUsageRecordCommand,
    ) -> sdkwork_cloudrouter_router_service::ports::GatewayUsageRecordFuture<'a> {
        self.records.lock().unwrap().push(command);
        Box::pin(async { Ok(()) })
    }
}

async fn build_router(
    context: &PostgresTestContext,
    codec: Arc<RingAeadCredentialSecretCodec>,
) -> (axum::Router, Arc<RecordingUsageRecorder>) {
    let loader =
        PostgresPricingCatalogLoader::with_credential_secret_codec(context.pool.clone(), codec);
    let snapshot = loader
        .load_snapshot()
        .await
        .expect("load real snapshot from dev database");
    let managed_secrets = snapshot.managed_provider_secrets();
    let catalog = Arc::new(RefreshableSqlPricingCatalog::new(snapshot));

    let secret_resolver = Arc::new(RefreshableProviderSecretMapResolver::from_maps(
        std::collections::BTreeMap::new(),
        managed_secrets,
    ));
    let budget = test_response_memory_budget();
    let relay = Arc::new(
        SecretRefOpenAiCompatibleResponsesRelay::for_local_development(secret_resolver)
            .with_shared_response_memory_budget(budget),
    );
    let hasher = Arc::new(
        HmacSha256ApiKeySecretHasher::new(API_KEY_PEPPER).expect("hasher must initialize"),
    );
    let usage_recorder = Arc::new(RecordingUsageRecorder::new());
    let runtime_config = OpenAiRuntimeRouteConfig::new(
        sdkwork_cloudrouter_router_service::domain::ProviderRetryPolicy::default(),
        OpenAiRuntimeFailureStrategy::FailClosed,
    );

    let router = openai_responses_router_with_relay_usage_recorder_plugins_and_runtime_config(
        catalog,
        hasher,
        relay,
        None,
        usage_recorder.clone(),
        Vec::new(),
        runtime_config,
    );

    (router, usage_recorder)
}

async fn send_responses_request(
    router: axum::Router,
    bearer: &str,
    stream: bool,
) -> (StatusCode, String) {
    let builder = Request::builder()
        .method(Method::POST)
        .uri("/v1/responses")
        .header("content-type", "application/json")
        .header("authorization", format!("Bearer {bearer}"));
    let body = json!({
        "model": MODEL,
        "input": [{"role": "user", "content": "ping"}],
        "stream": stream,
    });
    let response = router
        .oneshot(builder.body(Body::from(body.to_string())).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    (status, String::from_utf8(bytes.to_vec()).unwrap())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// Complete chain: real API-key auth → default group pool → real routing →
/// real secret resolution → real HTTP call to the Responses routing target.
#[tokio::test]
async fn real_gateway_key_routes_responses_through_default_group_pool_to_routing_target() {
    let Some(context) = PostgresTestContext::new("responses_e2e_full").await else {
        return;
    };
    let codec = Arc::new(
        RingAeadCredentialSecretCodec::new("0123456789abcdef0123456789abcdef")
            .expect("credential codec"),
    );

    let (provider_a, base_a) = start_mock_provider("responses-account-a").await;
    let (provider_b, base_b) = start_mock_provider("responses-account-b").await;
    let topology = seed_routing_topology(&context.pool, codec.clone(), &base_a, &base_b).await;
    let raw_key = seed_gateway_api_key(&context.pool, topology.group_id).await;

    let (router, usage_recorder) = build_router(&context, codec).await;
    let (status, body) = send_responses_request(router, &raw_key, false).await;

    assert_eq!(StatusCode::OK, status, "unexpected response body: {body}");
    let payload: Value = serde_json::from_str(&body).unwrap();
    assert_eq!("resp-e2e-responses-account-a", payload["id"]);

    let captured_a = provider_a.captured.lock().unwrap();
    let captured_b = provider_b.captured.lock().unwrap();
    assert_eq!(
        1,
        captured_a.len(),
        "primary responses account A must be called exactly once"
    );
    assert_eq!(
        0,
        captured_b.len(),
        "failover responses account B must NOT be called"
    );
    assert_eq!(
        Some(format!("Bearer {}", "sk-e2e-responses-account-a-secret")),
        captured_a[0].authorization,
        "routing target must receive the resolved account credential"
    );
    assert_eq!(MODEL, captured_a[0].body["model"]);
    drop(captured_a);
    drop(captured_b);

    // Usage must have been recorded for the Responses billing meters, routed
    // through the account-group pool to the resolved upstream account.
    let records = usage_recorder.records();
    assert!(
        records.iter().any(|record| {
            record.billing_meter_code == "llm_input_token"
                && record.request_path == "/v1/responses"
                && record.account_id > 0
                && !record.upstream_account_group_snapshot.is_empty()
        }),
        "responses input-token usage must be recorded with routed account: {:?}",
        records
    );
    assert!(
        records.iter().any(|record| {
            record.billing_meter_code == "llm_output_token"
                && record.request_path == "/v1/responses"
        }),
        "responses output-token usage must be recorded"
    );

    context.cleanup().await;
}

/// Real-time Responses routing reacts to account enable/disable: disabling the
/// primary account removes it from the pool (failover to the backup), and
/// re-enabling it restores primary routing — all through the real DB snapshot.
#[tokio::test]
async fn disabling_responses_primary_account_fails_over_and_re_enable_restores_routing() {
    let Some(context) = PostgresTestContext::new("responses_e2e_failover").await else {
        return;
    };
    let codec = Arc::new(
        RingAeadCredentialSecretCodec::new("0123456789abcdef0123456789abcdef")
            .expect("credential codec"),
    );

    let (provider_a, base_a) = start_mock_provider("responses-failover-account-a").await;
    let (provider_b, base_b) = start_mock_provider("responses-failover-account-b").await;
    let topology = seed_routing_topology(&context.pool, codec.clone(), &base_a, &base_b).await;
    let raw_key = seed_gateway_api_key(&context.pool, topology.group_id).await;

    // 1) Baseline: primary account A is called.
    let (router, _) = build_router(&context, codec.clone()).await;
    let (status, body) = send_responses_request(router, &raw_key, false).await;
    assert_eq!(StatusCode::OK, status, "unexpected response body: {body}");
    assert!(
        body.contains("resp-e2e-responses-failover-account-a"),
        "{body}"
    );
    assert_eq!(1, provider_a.captured.lock().unwrap().len());
    assert_eq!(0, provider_b.captured.lock().unwrap().len());

    // 2) Disable account A via the admin store (status=0) → next request fails
    //    over to account B.
    let store = PostgresAdminUpstreamStore::new(context.pool.clone(), codec.clone());
    let subject = upstream_subject(TENANT_ID, ORG_ID);
    let accounts = store
        .list_accounts(AdminUpstreamListQuery {
            subject: subject.clone(),
            q: None,
            page: 1,
            page_size: 100,
            offset: 0,
        })
        .await
        .expect("list accounts");
    let account_a = accounts
        .items
        .iter()
        .find(|account| account.account_code == "e2e-responses-account-a")
        .expect("find responses account A")
        .clone();
    let version_a = account_a.version;
    let disabled = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: Some(account_a.id),
            expected_version: Some(version_a),
            uuid: "e2e-responses-account-a".to_owned(),
            supplier_id: account_a.supplier_id,
            preferred_endpoint_id: None,
            default_base_url: Some(base_a.clone()),
            protocols: vec![
                sdkwork_cloudrouter_router_service::ports::AdminLlmProtocolConfig {
                    protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                    base_url: base_a.clone(),
                },
            ],
            account_code: "e2e-responses-account-a".to_owned(),
            account_name: "E2E Responses Account A".to_owned(),
            account_type: "standard".to_owned(),
            auth_method_code: "api-key".to_owned(),
            external_account_id: None,
            environment: Some(0),
            region_code: Some("global".to_owned()),
            quota_limit: None,
            upstream_balance_currency: None,
            contract_cost_multiplier: "1.000000000000".to_owned(),
            rpm_limit: None,
            timeout_ms: Some(30_000),
            status: 0,
            billing_mode: "prepay".to_owned(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            api_key: None,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("disable responses account A");
    assert_eq!(0, disabled.status);

    let (router, _) = build_router(&context, codec.clone()).await;
    let (status, body) = send_responses_request(router, &raw_key, false).await;
    assert_eq!(StatusCode::OK, status, "unexpected response body: {body}");
    assert!(
        body.contains("resp-e2e-responses-failover-account-b"),
        "disabled primary must fail over to account B: {body}"
    );
    assert_eq!(1, provider_b.captured.lock().unwrap().len());

    // 3) Re-enable account A (status=1) → routing returns to A.
    let version_a = disabled.version;
    let enabled = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: Some(account_a.id),
            expected_version: Some(version_a),
            uuid: "e2e-responses-account-a".to_owned(),
            supplier_id: account_a.supplier_id,
            preferred_endpoint_id: None,
            default_base_url: Some(base_a.clone()),
            protocols: vec![
                sdkwork_cloudrouter_router_service::ports::AdminLlmProtocolConfig {
                    protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                    base_url: base_a.clone(),
                },
            ],
            account_code: "e2e-responses-account-a".to_owned(),
            account_name: "E2E Responses Account A".to_owned(),
            account_type: "standard".to_owned(),
            auth_method_code: "api-key".to_owned(),
            external_account_id: None,
            environment: Some(0),
            region_code: Some("global".to_owned()),
            quota_limit: None,
            upstream_balance_currency: None,
            contract_cost_multiplier: "1.000000000000".to_owned(),
            rpm_limit: None,
            timeout_ms: Some(30_000),
            status: 1,
            billing_mode: "prepay".to_owned(),
            model_blacklist: Vec::new(),
            model_whitelist: Vec::new(),
            api_key: None,
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("re-enable responses account A");
    assert_eq!(1, enabled.status);

    let (router, _) = build_router(&context, codec.clone()).await;
    let (status, body) = send_responses_request(router, &raw_key, false).await;
    assert_eq!(StatusCode::OK, status, "unexpected response body: {body}");
    assert!(
        body.contains("resp-e2e-responses-failover-account-a"),
        "re-enabled primary must route back to account A: {body}"
    );
    assert_eq!(2, provider_a.captured.lock().unwrap().len());

    context.cleanup().await;
}
