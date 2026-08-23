//! End-to-end chat completion routing tests against the REAL dev PostgreSQL
//! database (WSL) using the production SQL schema, admin store, snapshot
//! loader, secret-ref relay, and real local mock upstream providers.
//!
//! The chain under test (production wiring):
//!
//!   POST /v1/chat/completions  (real dual-token app-session login)
//!     → 真实鉴权 (verify_app_session_token)
//!     → 默认账号分组账号池 (account group pool)
//!     → 路由策略/规则 (routing policy/profile/rule)
//!     → 路由账号选择 (account route with base_url + secret_ref)
//!     → secret 解析 (managed provider secrets from the snapshot)
//!     → 真实上游 HTTP 调用 (local mock provider as the routing target)
//!     → 响应回传
//!
//! Test prerequisites (set before running):
//!   SDKWORK_DATABASE_URL=postgres://sdkwork_ai_dev:sdkworkdev123@localhost:5432/sdkwork_ai_dev
//!   SDKWORK_MODELS_CATALOG_ROOT=e:/sdkwork-space/sdkwork-models   (optional, for bundled catalog)

use std::num::NonZeroUsize;
use std::sync::Arc;

use async_trait::async_trait;
use axum::body::Body;
use axum::extract::State;
use axum::http::{HeaderMap, Method, Request, StatusCode};
use axum::response::IntoResponse;
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};
use tower::ServiceExt;

use sdkwork_cloudrouter_config::AppSessionConfig;
use sdkwork_cloudrouter_http::verify_app_session_token;
use sdkwork_cloudrouter_router_service::api::{
    openai_chat_completions_router_with_auth_extensions, OpenAiAuthTokenAuthenticator,
    OpenAiRuntimeFailureStrategy, OpenAiRuntimeRouteConfig,
};
use sdkwork_cloudrouter_router_service::application::AuthenticatedApiKeyContext;
use sdkwork_cloudrouter_router_service::infrastructure::crypto::RingAeadCredentialSecretCodec;
use sdkwork_cloudrouter_router_service::infrastructure::provider::{
    ProviderResponseMemoryBudget, RefreshableProviderSecretMapResolver,
    SecretRefOpenAiCompatibleChatCompletionRelay, SecretRefOpenAiCompatibleChatCompletionStreamRelay,
};
use sdkwork_cloudrouter_router_service::infrastructure::sql::catalog::RefreshableSqlPricingCatalog;
use sdkwork_cloudrouter_router_service::infrastructure::sql::postgres::{
    PostgresAdminUpstreamStore, PostgresPricingCatalogLoader,
};
use sdkwork_cloudrouter_router_service::ports::{
    AdminUpstreamAccountGroupMemberInput, AdminUpstreamResourceInput, AdminUpstreamStore,
    AdminUpstreamSubject, AdminUpstreamSupplierAuthMethodInput, AdminUpstreamSupplierEndpointInput,
    LlmProtocolCode, SaveAdminUpstreamAccountCommand, SaveAdminUpstreamAccountGroupCommand,
    SaveAdminUpstreamSupplierCommand,
};
use sdkwork_cloudrouter_test_support::{
    app_session_config, app_session_dual_token_headers, default_trusted_request_subject,
    API_KEY_PEPPER,
};
use sdkwork_cloudrouter_router_service::infrastructure::crypto::HmacSha256ApiKeySecretHasher;
use sdkwork_web_core::default_open_api_bearer_classifier;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_DATABASE_URL";
const REQUESTED_AT: &str = "2026-07-28T12:00:00.000Z";

const TENANT_ID: i64 = 100_001;
const ORG_ID: i64 = 0;
const DEFAULT_GROUP_CODE: &str = "default-group";
const SUPPLIER_CODE: &str = "openrouter";
const MODEL: &str = "gpt-5.6-sol";
const CATALOG_KEY: &str = "openai/gpt-5.6-sol";

const TEST_NOW_UNIX_SECONDS: i64 = 1_800_000_001;

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
                    "skipping Postgres chat completion routing e2e test; set {POSTGRES_TEST_DATABASE_URL} to run it"
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

        // Load the full runtime schema: CloudRouter routing tables,
        // Gateway IAM tables, and the sdkwork-models catalog tables that the
        // snapshot loader reads (ai_model_vendor, ai_model, ai_model_capability,
        // ai_billing_meter, ai_resource, ...).
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
// Real login authenticator (real token verification)
// ---------------------------------------------------------------------------

fn openai_auth_error(
    status: StatusCode,
    code: &str,
    message: &str,
) -> Box<axum::response::Response> {
    let body = serde_json::json!({
        "error": {
            "message": message,
            "type": "invalid_request_error",
            "param": null,
            "code": code,
        }
    });
    Box::new((status, axum::Json(body)).into_response())
}

struct RealTestAuthTokenAuthenticator {
    config: AppSessionConfig,
    now_unix_seconds: i64,
    group_id: i64,
    group_code: String,
}

#[async_trait]
impl OpenAiAuthTokenAuthenticator for RealTestAuthTokenAuthenticator {
    async fn authenticate(
        &self,
        raw_bearer_token: &str,
        access_token: Option<&str>,
    ) -> Result<
        AuthenticatedApiKeyContext,
        sdkwork_cloudrouter_router_service::api::OpenAiAuthTokenError,
    > {
        let bearer_subject = match verify_app_session_token(
            &self.config,
            raw_bearer_token,
            self.now_unix_seconds,
        ) {
            Ok(subject) => subject,
            Err(error) => {
                return Err(openai_auth_error(
                    StatusCode::UNAUTHORIZED,
                    "invalid_auth_token",
                    &format!("bearer token verification failed: {error}"),
                ));
            }
        };
        if let Some(access) = access_token
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            match verify_app_session_token(&self.config, access, self.now_unix_seconds) {
                Ok(access_subject) => {
                    if bearer_subject.tenant_id != access_subject.tenant_id
                        || bearer_subject.organization_id != access_subject.organization_id
                        || bearer_subject.user_id != access_subject.user_id
                    {
                        return Err(openai_auth_error(
                            StatusCode::UNAUTHORIZED,
                            "subject_mismatch",
                            "bearer and access token subjects do not match",
                        ));
                    }
                }
                Err(error) => {
                    return Err(openai_auth_error(
                        StatusCode::UNAUTHORIZED,
                        "invalid_auth_token",
                        &format!("access token verification failed: {error}"),
                    ));
                }
            }
        }
        Ok(AuthenticatedApiKeyContext {
            api_key_id: 0,
            tenant_id: bearer_subject.tenant_id,
            organization_id: bearer_subject.organization_id,
            user_id: bearer_subject.user_id,
            api_key_name_snapshot: "auth-token-session".to_owned(),
            group_id: self.group_id,
            group_code: self.group_code.clone(),
            pricing_plan_code: "standard".to_owned(),
        })
    }
}

// ---------------------------------------------------------------------------
// Mock upstream provider (one per account) capturing every request
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
        .route("/v1/chat/completions", post(mock_chat_handler))
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

async fn mock_chat_handler(
    State(provider): State<Arc<MockProvider>>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> (StatusCode, Json<Value>) {
    provider.captured.lock().unwrap().push(CapturedUpstreamRequest {
        authorization: headers
            .get("authorization")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned),
        body,
    });
    (
        StatusCode::OK,
        Json(json!({
            "id": format!("chatcmpl-e2e-{}", provider.marker),
            "object": "chat.completion",
            "model": MODEL,
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": "pong"},
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 3, "completion_tokens": 5, "total_tokens": 8}
        })),
    )
}

// ---------------------------------------------------------------------------
// Routing topology seed (admin store)
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
    // Model route derivation maps account/group/supplier resource entitlements
    // through the `ai_resource` catalog. Without a catalog row for
    // `model:gpt-5.6-sol`, no model route is derived for the group.
    sqlx::query(
        r#"
        INSERT INTO ai_resource (
            id, uuid, tenant_id, organization_id, data_scope, status, metadata,
            resource_code, resource_type, display_name, vendor_code, modality_code,
            api_code, model_code, catalog_key, model, provider_native_model, sort_order
        ) VALUES (
            98_001, 'e2e-resource-gpt-5.6-sol', 0, 0, 1, 1, '{}'::jsonb,
            'model:gpt-5.6-sol', 'model_api', 'GPT-5.6 Sol', 'openai', 'chat',
            'openai.chat_completions', 'gpt-5.6-sol', 'openai/gpt-5.6-sol', 'gpt-5.6-sol',
            'gpt-5.6-sol', 10
        )
        "#,
    )
    .execute(pool)
    .await
    .expect("insert ai_resource catalog row for gpt-5.6-sol");

    let store = PostgresAdminUpstreamStore::new(pool.clone(), codec);
    let subject = upstream_subject(TENANT_ID, ORG_ID);

    // Supplier with base_url → local mock provider A (used as supplier default).
    let supplier = store
        .save_supplier(SaveAdminUpstreamSupplierCommand {
            subject: subject.clone(),
            supplier_id: None,
            expected_version: None,
            uuid: "e2e-supplier-openrouter".to_owned(),
            supplier_code: SUPPLIER_CODE.to_owned(),
            default_vendor_code: Some("openai".to_owned()),
            default_base_url: Some(provider_a_base_url.to_owned()),
            supplier_name: "OpenRouter E2E".to_owned(),
            display_name: "OpenRouter E2E".to_owned(),
            description: Some("E2E upstream".to_owned()),
            supplier_type: "official".to_owned(),
            adapter_code: "openai".to_owned(),
            protocol_code: "openai".to_owned(),
            protocols: vec![sdkwork_cloudrouter_router_service::ports::AdminLlmProtocolConfig {
                protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                base_url: provider_a_base_url.to_owned(),
            }],
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
            vec![resource("model:gpt-5.6-sol")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace supplier resources");

    // Account A → local mock provider A.
    let account_a = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: None,
            expected_version: None,
            uuid: "e2e-account-a".to_owned(),
            supplier_id: supplier.id,
            preferred_endpoint_id: None,
            default_base_url: Some(provider_a_base_url.to_owned()),
            protocols: vec![sdkwork_cloudrouter_router_service::ports::AdminLlmProtocolConfig {
                protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                base_url: provider_a_base_url.to_owned(),
            }],
            account_code: "e2e-account-a".to_owned(),
            account_name: "E2E Account A".to_owned(),
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
            api_key: Some("sk-e2e-account-a-secret".to_owned()),
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create account A");

    // Account B → local mock provider B.
    let account_b = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: None,
            expected_version: None,
            uuid: "e2e-account-b".to_owned(),
            supplier_id: supplier.id,
            preferred_endpoint_id: None,
            default_base_url: Some(provider_b_base_url.to_owned()),
            protocols: vec![sdkwork_cloudrouter_router_service::ports::AdminLlmProtocolConfig {
                protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                base_url: provider_b_base_url.to_owned(),
            }],
            account_code: "e2e-account-b".to_owned(),
            account_name: "E2E Account B".to_owned(),
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
            api_key: Some("sk-e2e-account-b-secret".to_owned()),
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create account B");

    // Pricing plan must exist and be active before creating the group
    // (the admin store validates the group's `standard` plan and persists a
    // rate-card binding). `effective_from` must precede REQUESTED_AT because
    // the admin store validates with the requested_at timestamp.
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_pricing_plan (
            id, uuid, tenant_id, organization_id, data_scope, status, metadata,
            plan_code, plan_name, base_price_side, currency_code, fallback_policy,
            rounding_mode, minimum_charge_amount, effective_from
        ) VALUES (
            99_041, 'e2e-standard-plan', 0, 0, 0, 1, '{}'::jsonb,
            'standard', 'Standard plan', 'official_reference', 'USD', 'fail_closed',
            'half_up', 0, $1
        )
        "#,
    )
    .bind(chrono::DateTime::parse_from_rfc3339("2026-01-01T00:00:00Z")
        .expect("parse plan effective from")
        .with_timezone(&chrono::Utc))
    .execute(pool)
    .await
    .expect("insert standard pricing plan");

    // Default multiplier rule for the plan (the plan query joins a default
    // `multiplier_markup` rule).
    sqlx::query(
        r#"
        INSERT INTO cloudrouter_pricing_rule (
            id, uuid, tenant_id, organization_id, data_scope, status, pricing_plan_id,
            rule_code, product_code, operation_code, meter_code, provider_code, region_code,
            catalog_key, formula_mode, multiplier, markup_amount, unit_price_override,
            conditions, schedule, priority, effective_from
        ) VALUES (
            99_051, 'e2e-standard-rule', 0, 0, 0, 1, 99_041,
            'default', NULL, NULL, NULL, NULL, NULL,
            NULL, 'multiplier_markup', 1.000000000000, 0, NULL,
            '[]'::jsonb, NULL, 10, $1
        )
        "#,
    )
    .bind(chrono::DateTime::parse_from_rfc3339("2026-01-01T00:00:00Z")
        .expect("parse rule effective from")
        .with_timezone(&chrono::Utc))
    .execute(pool)
    .await
    .expect("insert standard pricing rule");

    // Default account group with both accounts in the pool.
    let group = store
        .save_account_group(SaveAdminUpstreamAccountGroupCommand {
            subject: subject.clone(),
            account_group_id: None,
            expected_version: None,
            uuid: "e2e-default-group".to_owned(),
            group_code: DEFAULT_GROUP_CODE.to_owned(),
            group_name: "E2E default group".to_owned(),
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
            vec![resource("model:gpt-5.6-sol")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account group resources");

    store
        .replace_account_resources(
            subject.clone(),
            account_a.id,
            account_a.version,
            vec![resource("model:gpt-5.6-sol")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account A resources");

    store
        .replace_account_resources(
            subject.clone(),
            account_b.id,
            account_b.version,
            vec![resource("model:gpt-5.6-sol")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account B resources");

    // Routing behavior is driven by the account group itself (routing_strategy =
    // "failover" set at group creation) plus the group-member pool and resource
    // entitlements above. The retired ai_routing_policy/profile/rule tables are
    // no longer part of the schema (V2 design P6) and must not be seeded here.

    // Pricing: official reference + upstream cost for the route so the
    // pricing preflight (`ensure_route_is_priced`) succeeds.
    seed_pricing(pool, account_a.id, account_b.id).await;

    SeededTopology {
        group_id: group.id,
    }
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
            99_001, 'e2e-import-run', $1, $2, 0, 'e2e', 'e2e', 'e2e', 1,
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

    // Official reference price book.
    sqlx::query(
        r#"
        INSERT INTO pricing_price_book (
            id, uuid, tenant_id, organization_id, data_scope, status, import_run_id,
            namespace_code, price_book_code, price_book_version, price_side, source_system,
            vendor_code, region_code, source_catalog_version, source_hash, lifecycle_state,
            currency_code, effective_from
        ) VALUES (
            99_011, 'e2e-official-book', $1, $2, 1, 1, 99_001,
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

    // Upstream cost price book.
    sqlx::query(
        r#"
        INSERT INTO pricing_price_book (
            id, uuid, tenant_id, organization_id, data_scope, status, import_run_id,
            namespace_code, price_book_code, price_book_version, price_side, source_system,
            vendor_code, region_code, source_catalog_version, source_hash, lifecycle_state,
            currency_code, effective_from
        ) VALUES (
            99_012, 'e2e-upstream-book', $1, $2, 1, 1, 99_001,
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
                $1, $2, $3, $4, 1, 1, 99_011,
                $5, $5, 'gpt-5.6-sol', 'model', 'GPT-5.6 Sol',
                $6, 'meter', $7,
                $6, $7, 'token', 'token',
                'openai', '', 'global', 'model', 'model:gpt-5.6-sol',
                $8, 'openai_responses', 'chargeable', 'usage_reported', 'per_unit',
                'sum', 1, $9::numeric, 0, 'USD',
                1, $10, 'e2e', $10
            )
            "#,
        )
        .bind(99_021_i64 + rate_id_offset(meter))
        .bind(format!("e2e-official-{meter}"))
        .bind(TENANT_ID)
        .bind(ORG_ID)
        .bind(format!("official-{meter}"))
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
                $1, $2, $3, $4, 1, 1, 99_012,
                $5, $5, 'gpt-5.6-sol', 'model', 'GPT-5.6 Sol',
                $6, 'meter', $7,
                $6, $7, 'token', 'token',
                'openai', $11, $12, 'global', 'model', 'model:gpt-5.6-sol',
                $8, 'openai_responses', 'chargeable', 'usage_reported', 'per_unit',
                'sum', 1, $9::numeric, 0, 'USD',
                1, $10, 'e2e', $10
            )
            "#,
        )
        .bind(99_031_i64 + rate_id_offset(meter))
        .bind(format!("e2e-upstream-{meter}"))
        .bind(TENANT_ID)
        .bind(ORG_ID)
        .bind(format!("upstream-{meter}"))
        .bind(meter)
        .bind(meter.to_owned())
        .bind(CATALOG_KEY)
        .bind(upstream)
        .bind(now)
        .bind(SUPPLIER_CODE)
        .bind(account_a_id)
        .execute(pool)
        .await
        .expect("insert upstream pricing rate");

        // Same upstream cost also for account B so both pool members are
        // priced (failover candidate).
        let upstream_b = sqlx::query(
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
                $1, $2, $3, $4, 1, 1, 99_012,
                $5, $5, 'gpt-5.6-sol', 'model', 'GPT-5.6 Sol',
                $6, 'meter', $7,
                $6, $7, 'token', 'token',
                'openai', $11, $12, 'global', 'model', 'model:gpt-5.6-sol',
                $8, 'openai_responses', 'chargeable', 'usage_reported', 'per_unit',
                'sum', 1, $9::numeric, 0, 'USD',
                1, $10, 'e2e', $10
            )
            "#,
        );
        let upstream_b = upstream_b
            .bind(99_041_i64 + rate_id_offset(meter))
            .bind(format!("e2e-upstream-b-{meter}"))
            .bind(TENANT_ID)
            .bind(ORG_ID)
            .bind(format!("upstream-b-{meter}"))
            .bind(meter)
            .bind(meter.to_owned())
            .bind(CATALOG_KEY)
            .bind(upstream)
            .bind(now)
            .bind(SUPPLIER_CODE)
            .bind(account_b_id);
        upstream_b
            .execute(pool)
            .await
            .expect("insert upstream pricing rate for account B");
    }
}

/// Seeds upstream-cost pricing for a single (newly added) account so that the
/// pricing preflight (`ensure_route_is_priced`) succeeds for it too.
async fn seed_pricing_for_account(pool: &PgPool, account_id: i64) {
    let now = sqlx::query_scalar::<_, chrono::DateTime<chrono::Utc>>("SELECT CURRENT_TIMESTAMP")
        .fetch_one(pool)
        .await
        .expect("read current timestamp");
    for (meter, upstream) in [
        ("llm_input_token", "0.110000"),
        ("llm_output_token", "0.440000"),
        ("llm_cache_read_token", "0.055000"),
    ] {
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
                $1, $2, $3, $4, 1, 1, 99_012,
                $5, $5, 'gpt-5.6-sol', 'model', 'GPT-5.6 Sol',
                $6, 'meter', $7,
                $6, $7, 'token', 'token',
                'openai', $11, $12, 'global', 'model', 'model:gpt-5.6-sol',
                $8, 'openai_responses', 'chargeable', 'usage_reported', 'per_unit',
                'sum', 1, $9::numeric, 0, 'USD',
                1, $10, 'e2e', $10
            )
            "#,
        )
        .bind(99_051_i64 + rate_id_offset(meter))
        .bind(format!("e2e-upstream-c-{meter}"))
        .bind(TENANT_ID)
        .bind(ORG_ID)
        .bind(format!("upstream-c-{meter}"))
        .bind(meter)
        .bind(meter.to_owned())
        .bind(CATALOG_KEY)
        .bind(upstream)
        .bind(now)
        .bind(SUPPLIER_CODE)
        .bind(account_id)
        .execute(pool)
        .await
        .expect("insert upstream pricing rate for account C");
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
// Router + snapshot assembly
// ---------------------------------------------------------------------------

async fn build_router(
    context: &PostgresTestContext,
    codec: Arc<RingAeadCredentialSecretCodec>,
    group_id: i64,
) -> axum::Router {
    let loader = PostgresPricingCatalogLoader::with_credential_secret_codec(
        context.pool.clone(),
        codec,
    );
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
        SecretRefOpenAiCompatibleChatCompletionRelay::for_local_development(
            secret_resolver.clone(),
        )
        .with_shared_response_memory_budget(budget.clone()),
    );
    let stream_relay = Arc::new(
        SecretRefOpenAiCompatibleChatCompletionStreamRelay::for_local_development(
            secret_resolver,
        )
        .with_shared_response_memory_budget(budget),
    );
    let hasher = Arc::new(
        HmacSha256ApiKeySecretHasher::new(API_KEY_PEPPER).expect("hasher must initialize"),
    );
    let authenticator: Arc<dyn OpenAiAuthTokenAuthenticator> = Arc::new(
        RealTestAuthTokenAuthenticator {
            config: app_session_config().expect("app session config must initialize"),
            now_unix_seconds: TEST_NOW_UNIX_SECONDS,
            group_id,
            group_code: DEFAULT_GROUP_CODE.to_owned(),
        },
    );
    let runtime_config = OpenAiRuntimeRouteConfig::new(
        sdkwork_cloudrouter_router_service::domain::ProviderRetryPolicy::default(),
        OpenAiRuntimeFailureStrategy::FailClosed,
    );

    openai_chat_completions_router_with_auth_extensions(
        catalog,
        hasher,
        Some(relay),
        Some(stream_relay),
        None,
        Vec::new(),
        runtime_config,
        Some(authenticator),
        default_open_api_bearer_classifier(),
    )
}

async fn send_chat_request(
    router: axum::Router,
    bearer: &str,
    access_token: &str,
    stream: bool,
) -> (StatusCode, String) {
    let builder = Request::builder()
        .method(Method::POST)
        .uri("/v1/chat/completions")
        .header("content-type", "application/json")
        .header("authorization", format!("Bearer {bearer}"))
        .header("Access-Token", access_token);
    let body = json!({
        "model": MODEL,
        "messages": [{"role": "user", "content": "ping"}],
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

fn sign_dual_token() -> (String, String) {
    let subject = default_trusted_request_subject();
    let issued_at = 1_800_000_000_i64;
    let expires_at = issued_at + 300;
    let (bearer, access) =
        app_session_dual_token_headers(subject, issued_at, expires_at).expect("sign tokens");
    (
        bearer.trim_start_matches("Bearer ").trim().to_owned(),
        access,
    )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/// Complete chain: real login → default group pool → real routing → real
/// secret resolution → real HTTP call to the routing target API (local mock).
#[tokio::test]
async fn real_login_routes_through_default_group_pool_to_routing_target() {
    let Some(context) = PostgresTestContext::new("chat_e2e_full").await else {
        return;
    };
    let codec = Arc::new(
        RingAeadCredentialSecretCodec::new("0123456789abcdef0123456789abcdef")
            .expect("credential codec"),
    );

    let (provider_a, base_a) = start_mock_provider("account-a").await;
    let (provider_b, base_b) = start_mock_provider("account-b").await;
    let topology = seed_routing_topology(&context.pool, codec.clone(), &base_a, &base_b).await;

    let router = build_router(&context, codec, topology.group_id).await;
    let (bearer, access) = sign_dual_token();
    let (status, body) = send_chat_request(router, &bearer, &access, false).await;

    assert_eq!(StatusCode::OK, status, "unexpected response body: {body}");
    let payload: Value = serde_json::from_str(&body).unwrap();
    assert_eq!("chatcmpl-e2e-account-a", payload["id"]);

    let captured_a = provider_a.captured.lock().unwrap();
    let captured_b = provider_b.captured.lock().unwrap();
    assert_eq!(1, captured_a.len(), "primary account A must be called exactly once");
    assert_eq!(0, captured_b.len(), "failover account B must NOT be called");
    assert_eq!(
        Some(format!("Bearer {}", "sk-e2e-account-a-secret")),
        captured_a[0].authorization,
        "routing target must receive the resolved account credential"
    );
    assert_eq!(MODEL, captured_a[0].body["model"]);
    assert_eq!(Some(false), captured_a[0].body["stream"].as_bool());

    context.cleanup().await;
}

/// Admin adds a NEW account to the default group → after reloading the real
/// snapshot, routing reaches the newly added account (admin group-account CRUD
/// regression).
#[tokio::test]
async fn admin_adds_account_to_group_then_routing_reaches_it() {
    let Some(context) = PostgresTestContext::new("chat_e2e_admin_add").await else {
        return;
    };
    let codec = Arc::new(
        RingAeadCredentialSecretCodec::new("0123456789abcdef0123456789abcdef")
            .expect("credential codec"),
    );

    let (_provider_a, base_a) = start_mock_provider("account-a").await;
    let (_provider_b, base_b) = start_mock_provider("account-b").await;
    let (provider_c, base_c) = start_mock_provider("account-c").await;
    let topology = seed_routing_topology(&context.pool, codec.clone(), &base_a, &base_b).await;

    // Baseline: routes to A (priority 10 primary).
    let router = build_router(&context, codec.clone(), topology.group_id).await;
    let (bearer, access) = sign_dual_token();
    let (status, body) = send_chat_request(router, &bearer, &access, false).await;
    assert_eq!(StatusCode::OK, status, "unexpected response body: {body}");
    assert!(body.contains("chatcmpl-e2e-account-a"));
    assert_eq!(0, provider_c.captured.lock().unwrap().len());

    // Admin creates account C → base_url → mock provider C, and adds it to the
    // default group as the new primary member (highest priority).
    let store = PostgresAdminUpstreamStore::new(context.pool.clone(), codec.clone());
    let subject = upstream_subject(TENANT_ID, ORG_ID);
    let account_c = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: None,
            expected_version: None,
            uuid: "e2e-account-c".to_owned(),
            supplier_id: {
                let supplier_id =
                    sqlx::query_scalar::<_, i64>("SELECT id FROM ai_upstream_supplier LIMIT 1")
                        .fetch_one(&context.pool)
                        .await
                        .expect("read supplier id");
                supplier_id
            },
            preferred_endpoint_id: None,
            default_base_url: Some(base_c.clone()),
            protocols: vec![sdkwork_cloudrouter_router_service::ports::AdminLlmProtocolConfig {
                protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                base_url: base_c.clone(),
            }],
            account_code: "e2e-account-c".to_owned(),
            account_name: "E2E Account C".to_owned(),
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
            api_key: Some("sk-e2e-account-c-secret".to_owned()),
            requested_at: REQUESTED_AT.to_owned(),
        })
        .await
        .expect("create account C");

    store
        .replace_account_resources(
            subject.clone(),
            account_c.id,
            account_c.version,
            vec![resource("model:gpt-5.6-sol")],
            REQUESTED_AT.to_owned(),
        )
        .await
        .expect("replace account C resources");

    // Replace group members: C (priority 1) becomes the new primary.
    let group_version =
        sqlx::query_scalar::<_, i64>("SELECT version FROM ai_upstream_account_group WHERE id = $1")
            .bind(topology.group_id)
            .fetch_one(&context.pool)
            .await
            .expect("read account group version");
    store
        .replace_account_group_members(
            subject.clone(),
            topology.group_id,
            group_version,
            vec![
                AdminUpstreamAccountGroupMemberInput {
                    account_id: account_c.id,
                    priority: 1,
                    routing_weight: 100,
                    cost_multiplier_override: None,
                    enabled: true,
                    status: 1,
                },
                AdminUpstreamAccountGroupMemberInput {
                    account_id: {
                        let id =
                            sqlx::query_scalar::<_, i64>(
                                "SELECT id FROM ai_upstream_account WHERE account_code = 'e2e-account-a'",
                            )
                            .fetch_one(&context.pool)
                            .await
                            .expect("read account A id");
                        id
                    },
                    priority: 10,
                    routing_weight: 100,
                    cost_multiplier_override: None,
                    enabled: true,
                    status: 1,
                },
                AdminUpstreamAccountGroupMemberInput {
                    account_id: {
                        let id =
                            sqlx::query_scalar::<_, i64>(
                                "SELECT id FROM ai_upstream_account WHERE account_code = 'e2e-account-b'",
                            )
                            .fetch_one(&context.pool)
                            .await
                            .expect("read account B id");
                        id
                    },
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
        .expect("replace account group members with account C");

    // Price account C upstream cost so the pricing preflight succeeds.
    seed_pricing_for_account(&context.pool, account_c.id).await;

    // Reload snapshot (cache invalidation + reload) → the next request must
    // reach the newly added account C.
    let router = build_router(&context, codec.clone(), topology.group_id).await;
    let (status, body) = send_chat_request(router, &bearer, &access, false).await;
    assert_eq!(StatusCode::OK, status, "unexpected response body: {body}");
    assert!(
        body.contains("chatcmpl-e2e-account-c"),
        "newly added account C must be routable after snapshot reload: {body}"
    );
    let captured_c = provider_c.captured.lock().unwrap();
    assert_eq!(1, captured_c.len(), "account C must be called exactly once");
    assert_eq!(
        Some(format!("Bearer {}", "sk-e2e-account-c-secret")),
        captured_c[0].authorization,
        "routing target must receive account C's resolved credential"
    );
    drop(captured_c);

    // --- 关闭账号 C（status=0）→ 立即从账号池剔除，路由故障转移到 A ---
    let account_c_version =
        sqlx::query_scalar::<_, i64>("SELECT version FROM ai_upstream_account WHERE id = $1")
            .bind(account_c.id)
            .fetch_one(&context.pool)
            .await
            .expect("read account C version");
    let disabled = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: Some(account_c.id),
            expected_version: Some(account_c_version),
            uuid: "e2e-account-c".to_owned(),
            supplier_id: account_c.supplier_id,
            preferred_endpoint_id: None,
            default_base_url: Some(base_c.clone()),
            protocols: vec![sdkwork_cloudrouter_router_service::ports::AdminLlmProtocolConfig {
                protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                base_url: base_c.clone(),
            }],
            account_code: "e2e-account-c".to_owned(),
            account_name: "E2E Account C".to_owned(),
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
        .expect("disable account C");
    assert_eq!(
        0, disabled.status,
        "admin save must persist the disabled account status"
    );

    // Reload snapshot → C is gone from the pool, routing fails over to A.
    let router = build_router(&context, codec.clone(), topology.group_id).await;
    let (status, body) = send_chat_request(router, &bearer, &access, false).await;
    assert_eq!(StatusCode::OK, status, "unexpected response body: {body}");
    assert!(
        body.contains("chatcmpl-e2e-account-a"),
        "disabled account C must be excluded and routing must fail over to A: {body}"
    );
    assert_eq!(
        1,
        provider_c.captured.lock().unwrap().len(),
        "disabled account C must NOT be called again"
    );

    // --- 重新开启账号 C（status=1）→ 立即恢复参与路由，回到 C ---
    let account_c_version =
        sqlx::query_scalar::<_, i64>("SELECT version FROM ai_upstream_account WHERE id = $1")
            .bind(account_c.id)
            .fetch_one(&context.pool)
            .await
            .expect("read account C version after disable");
    let enabled = store
        .save_account(SaveAdminUpstreamAccountCommand {
            subject: subject.clone(),
            account_id: Some(account_c.id),
            expected_version: Some(account_c_version),
            uuid: "e2e-account-c".to_owned(),
            supplier_id: account_c.supplier_id,
            preferred_endpoint_id: None,
            default_base_url: Some(base_c.clone()),
            protocols: vec![sdkwork_cloudrouter_router_service::ports::AdminLlmProtocolConfig {
                protocol_code: LlmProtocolCode::OpenaiChatCompletions,
                base_url: base_c.clone(),
            }],
            account_code: "e2e-account-c".to_owned(),
            account_name: "E2E Account C".to_owned(),
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
        .expect("re-enable account C");
    assert_eq!(
        1, enabled.status,
        "admin save must persist the re-enabled account status"
    );

    // Reload snapshot → C is back in the pool and routable again.
    let router = build_router(&context, codec.clone(), topology.group_id).await;
    let (status, body) = send_chat_request(router, &bearer, &access, false).await;
    assert_eq!(StatusCode::OK, status, "unexpected response body: {body}");
    assert!(
        body.contains("chatcmpl-e2e-account-c"),
        "re-enabled account C must rejoin the pool and be routable: {body}"
    );
    assert_eq!(
        2,
        provider_c.captured.lock().unwrap().len(),
        "re-enabled account C must be called again"
    );

    context.cleanup().await;
}
