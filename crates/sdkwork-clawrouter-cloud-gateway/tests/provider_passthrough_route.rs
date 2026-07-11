use axum::body::Body;
use axum::extract::State;
use axum::http::HeaderMap;
use axum::http::{Request, StatusCode};
use axum::routing::any;
use axum::Router;
use sdkwork_claw_config::{
    DeploymentMode, DeploymentProfile, DeploymentRuntime, ProviderAdapterConfig,
    ProviderRelayConfig, ProviderSecretMapConfig, RuntimeTarget, StartupInstallMode,
};
use sdkwork_claw_http::QueryStringApiKeyPolicy;
use sdkwork_claw_provider_adapter_contract::{
    AdapterInvocationRequest, AdapterInvocationResponse, AdapterInvocationShape, AdapterSecret,
    AdapterUsageLine,
};
use sdkwork_claw_test_support::{assert_server_generated_request_id, SeededSqliteCatalog};
use sdkwork_clawrouter_router_service::application::ApiKeySecretCodec;
use sdkwork_clawrouter_router_service::application::ApiKeySecretHasher;
use sdkwork_clawrouter_router_service::application::UsageSettlementWorkerConfig;
use sdkwork_clawrouter_router_service::infrastructure::crypto::{
    HmacSha256ApiKeySecretHasher, RingAeadApiKeySecretCodec,
};
use serde_json::json;
use sqlx::Row;
use std::collections::BTreeSet;
use std::sync::{Arc, Mutex};
use tokio::sync::OnceCell;
use tower::ServiceExt;

const PREMIUM_GROUP_API_KEY_SECRET: &str = "sk-premium-live-secret";
const STANDARD_GROUP_TEMPLATE_BASE_URL: &str =
    "http://provider-proxy.internal/openrouter-standard-template";
const PREMIUM_GROUP_TEMPLATE_BASE_URL: &str =
    "http://provider-proxy.internal/openrouter-premium-template";
const OPENROUTER_STANDARD_SECRET_REF: &str = "vault://providers/openrouter/channel/main";
const OPENROUTER_ACCOUNT_MAIN_SECRET_REF: &str = "vault://providers/openrouter/account/main";
const OPENROUTER_ACCOUNT_PREMIUM_SECRET_REF: &str = "vault://providers/openrouter/account/premium";
const OPENROUTER_STANDARD_RESOURCE_GROUP_ID: i64 = 5;
const OPENROUTER_STANDARD_RESOURCE_GROUP_CODE: &str = "bundle.openrouter.openai.standard";

struct ResourceSeed<'a> {
    id: i64,
    code: &'a str,
    resource_type: &'a str,
    display_name: &'a str,
    vendor_code: &'a str,
    modality_code: &'a str,
    api_code: &'a str,
    catalog_key: Option<&'a str>,
    model: Option<&'a str>,
    provider_native_model: Option<&'a str>,
    sort_order: i64,
}

static OPENAI_PASSTHROUGH_GROUP_ROUTE_TEMPLATE: OnceCell<SeededSqliteCatalog> =
    OnceCell::const_new();

fn openrouter_account_pool_secret_map() -> ProviderSecretMapConfig {
    ProviderSecretMapConfig::from_json(
        serde_json::json!({
            OPENROUTER_STANDARD_SECRET_REF: "sk-standard-upstream",
            OPENROUTER_ACCOUNT_MAIN_SECRET_REF: "sk-standard-upstream",
            OPENROUTER_ACCOUNT_PREMIUM_SECRET_REF: "sk-premium-upstream"
        })
        .to_string(),
    )
    .unwrap()
}

async fn set_channel_and_credential_base_url(
    pool: &sqlx::SqlitePool,
    channel_id: i64,
    base_url: &str,
) {
    sqlx::query("UPDATE ai_channel SET base_url = ? WHERE id = ?")
        .bind(base_url)
        .bind(channel_id)
        .execute(pool)
        .await
        .unwrap();
    sqlx::query("UPDATE ai_channel_credential SET base_url = ? WHERE channel_id = ?")
        .bind(base_url)
        .bind(channel_id)
        .execute(pool)
        .await
        .unwrap();
}

async fn set_channel_and_credential_secret(
    pool: &sqlx::SqlitePool,
    channel_id: i64,
    secret_ref: &str,
    auth_config: &str,
) {
    sqlx::query(
        r#"
        UPDATE ai_channel
        SET credential_ref = ?,
            auth_config = ?
        WHERE id = ?
        "#,
    )
    .bind(secret_ref)
    .bind(auth_config)
    .bind(channel_id)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_channel_credential
        SET credential_ref = ?,
            auth_config = ?
        WHERE channel_id = ?
        "#,
    )
    .bind(secret_ref)
    .bind(auth_config)
    .bind(channel_id)
    .execute(pool)
    .await
    .unwrap();
}

async fn insert_channel_credential(
    pool: &sqlx::SqlitePool,
    credential_id: i64,
    channel_id: i64,
    provider_code: &str,
    channel_code: &str,
    secret_ref: &str,
    base_url: &str,
    auth_config: &str,
) {
    sqlx::query(
        r#"
        INSERT INTO ai_channel_credential
            (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code,
             credential_name, auth_config, credential_ref, credential_hash, base_url,
             priority, weight, health_status, status)
        VALUES
            (?, ?, 100001, 0, ?, ?, ?, 'primary', ?, ?, ?, ?, 1, 100, 1, 1)
        "#,
    )
    .bind(credential_id)
    .bind(format!("channel-credential-{channel_code}"))
    .bind(channel_id)
    .bind(provider_code)
    .bind(channel_code)
    .bind(auth_config)
    .bind(secret_ref)
    .bind(format!("hash:{channel_code}"))
    .bind(base_url)
    .execute(pool)
    .await
    .unwrap();
}

async fn seeded_gateway_router_with_provider_configs(
    catalog: &SeededSqliteCatalog,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
) -> Result<Router, sdkwork_clawrouter_cloud_gateway::GatewayRouterError> {
    sdkwork_clawrouter_cloud_gateway::runtime::router_with_database_api_key_provider_configs_usage_settlement_worker_config_and_startup_install_mode(
        catalog.database_config().unwrap(),
        Some(catalog.api_key_security_config().unwrap()),
        provider_relay_config,
        provider_secret_map_config,
        UsageSettlementWorkerConfig::disabled(),
        StartupInstallMode::Skip,
    )
    .await
}

async fn seeded_gateway_router_with_provider_configs_and_query_string_api_key_policy(
    catalog: &SeededSqliteCatalog,
    provider_relay_config: Option<ProviderRelayConfig>,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
    query_string_api_key_policy: QueryStringApiKeyPolicy,
) -> Result<Router, sdkwork_clawrouter_cloud_gateway::GatewayRouterError> {
    sdkwork_clawrouter_cloud_gateway::runtime::router_with_database_api_key_provider_configs_usage_settlement_worker_config_startup_install_mode_and_query_string_api_key_policy(
        catalog.database_config().unwrap(),
        Some(catalog.api_key_security_config().unwrap()),
        provider_relay_config,
        provider_secret_map_config,
        UsageSettlementWorkerConfig::disabled(),
        StartupInstallMode::Skip,
        query_string_api_key_policy,
    )
    .await
}

fn standalone_desktop_query_string_api_key_policy() -> QueryStringApiKeyPolicy {
    QueryStringApiKeyPolicy::from_configured_runtime(Some(DeploymentRuntime {
        profile: DeploymentProfile::Standalone,
        target: RuntimeTarget::Desktop,
        mode: DeploymentMode::Desktop,
    }))
}

async fn seeded_gateway_router_with_provider_relay_config(
    catalog: &SeededSqliteCatalog,
    provider_relay_config: Option<ProviderRelayConfig>,
) -> Result<Router, sdkwork_clawrouter_cloud_gateway::GatewayRouterError> {
    seeded_gateway_router_with_provider_configs(catalog, provider_relay_config, None).await
}

async fn seeded_gateway_router_with_provider_adapter_config(
    catalog: &SeededSqliteCatalog,
    provider_secret_map_config: Option<ProviderSecretMapConfig>,
    provider_adapter_config: Option<ProviderAdapterConfig>,
) -> Result<Router, sdkwork_clawrouter_cloud_gateway::GatewayRouterError> {
    sdkwork_clawrouter_cloud_gateway::runtime::router_with_database_api_key_provider_configs_adapter_config_and_startup_install_mode(
        catalog.database_config().unwrap(),
        Some(catalog.api_key_security_config().unwrap()),
        None,
        provider_secret_map_config,
        provider_adapter_config,
        StartupInstallMode::Skip,
    )
    .await
}

#[test]
fn openai_compatible_passthrough_path_manifest_stays_complete() {
    let paths = sdkwork_clawrouter_cloud_gateway::openai_compatible_passthrough_paths();
    let method_paths = sdkwork_clawrouter_cloud_gateway::openai_method_passthrough_paths();

    assert!(
        paths.contains(&"/v1/conversations/{conversation_id}/items/{item_id}"),
        "OpenAI conversation item passthrough must stay declared"
    );
    assert!(
        method_paths.contains(&"/v1/models/{model}"),
        "OpenAI model deletion passthrough must stay declared for DELETE /v1/models/{{model}}"
    );
    assert!(
        paths.contains(&"/v1/responses/input_tokens"),
        "OpenAI response input token counting passthrough must stay declared"
    );
    assert!(
        paths.contains(&"/v1/realtime/calls/{call_id}/hangup"),
        "OpenAI realtime call control passthrough must stay declared"
    );
    assert!(
        paths.contains(&"/v1/realtime/calls"),
        "OpenAI realtime call creation passthrough must stay declared"
    );
    assert!(
        paths.contains(&"/v1/realtime/translations"),
        "OpenAI realtime translation session passthrough must stay declared"
    );
    assert!(
        paths.contains(&"/v1/fine_tuning/alpha/graders/validate"),
        "OpenAI fine-tuning grader validation passthrough must stay declared"
    );
    assert!(
        paths.contains(&"/v1/fine_tuning/checkpoints/{fine_tuned_model_checkpoint}/permissions"),
        "OpenAI fine-tuning checkpoint permissions passthrough must use the standard fine_tuned_model_checkpoint parameter"
    );
    assert!(
        !paths.contains(&"/v1/fine_tuning/checkpoints/{checkpoint_id}/permissions"),
        "OpenAI fine-tuning checkpoint permissions passthrough must not expose the nonstandard checkpoint_id parameter"
    );
    assert!(
        paths.contains(&"/v1/batches/{batch_id}/cancel"),
        "OpenAI batch cancellation passthrough must use the standard cancel subresource"
    );
    assert!(
        paths.contains(&"/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}/cancel"),
        "OpenAI vector store file batch cancellation passthrough must use the standard cancel subresource"
    );
    assert!(
        !paths.contains(&"/v1/uploads/{upload_id}"),
        "OpenAI upload passthrough must expose explicit parts, complete, and cancel subresources"
    );
    assert!(
        paths.contains(&"/v1/audio/voice_consents/{consent_id}"),
        "OpenAI voice consent passthrough must use the standard consent_id parameter"
    );
    assert!(
        paths.contains(&"/v1/skills/{skill_id}/versions/{version}/content"),
        "OpenAI skill version content passthrough must use the standard version parameter"
    );
    assert!(
        paths.contains(&"/v1/organization/costs"),
        "OpenAI organization costs passthrough must stay declared"
    );
    assert!(
        paths.contains(&"/v1/organization/projects/{project_id}/archive"),
        "OpenAI project archive passthrough must stay declared"
    );
    assert!(
        paths.contains(&"/v1/organization/admin_api_keys/{key_id}"),
        "OpenAI admin API key passthrough must stay declared"
    );
    assert!(
        paths.contains(&"/v1/organization/users/{user_id}/roles/{role_id}"),
        "OpenAI organization user role assignment passthrough must stay declared"
    );
    assert!(
        paths.contains(&"/v1/organization/groups/{group_id}/roles/{role_id}"),
        "OpenAI organization group role assignment passthrough must stay declared"
    );
    assert!(
        paths.contains(&"/v1/organization/projects/{project_id}/api_keys/{key_id}"),
        "OpenAI project API key passthrough must use the standard key_id parameter"
    );
    assert!(
        !paths.contains(&"/v1/organization/projects/{project_id}/api_keys/{api_key_id}"),
        "OpenAI project API key passthrough must not expose the nonstandard api_key_id parameter"
    );
    assert!(
        paths.contains(&"/v1/projects/{project_id}/users/{user_id}/roles/{role_id}"),
        "OpenAI project role assignment passthrough must stay declared"
    );
    assert!(
        paths.contains(&"/v1/containers/{container_id}/files/{file_id}/content"),
        "OpenAI container file content passthrough must stay declared"
    );
    assert!(
        paths.contains(&"/v1/realtime/transcription_sessions"),
        "OpenAI realtime transcription session passthrough must stay declared"
    );
}

#[test]
fn gateway_openapi_v1_paths_are_product_routes_or_openai_passthrough_routes() {
    let spec: serde_json::Value = serde_json::from_str(include_str!(
        "../../../apps/sdkwork-clawrouter-pc/public/openapi.json"
    ))
    .unwrap();
    let openapi_paths = spec["paths"]
        .as_object()
        .unwrap()
        .keys()
        .filter(|path| path.starts_with("/v1/"))
        .map(String::as_str)
        .collect::<BTreeSet<_>>();
    let passthrough_paths = sdkwork_clawrouter_cloud_gateway::openai_compatible_passthrough_paths()
        .iter()
        .chain(sdkwork_clawrouter_cloud_gateway::openai_method_passthrough_paths().iter())
        .chain(sdkwork_clawrouter_cloud_gateway::stored_chat_completion_passthrough_paths().iter())
        .copied()
        .collect::<BTreeSet<_>>();
    let product_paths = BTreeSet::from([
        "/v1/chat/completions",
        "/v1/embeddings",
        "/v1/models",
        "/v1/models/{model}",
        "/v1/responses",
    ]);

    let missing_runtime_paths = openapi_paths
        .difference(&passthrough_paths)
        .filter(|path| !product_paths.contains(*path))
        .copied()
        .collect::<Vec<_>>();
    assert!(
        missing_runtime_paths.is_empty(),
        "OpenAPI /v1 paths must be implemented directly or declared as OpenAI-compatible passthrough routes: {missing_runtime_paths:?}"
    );

    let stale_passthrough_paths = passthrough_paths
        .difference(&openapi_paths)
        .copied()
        .collect::<Vec<_>>();
    assert!(
        stale_passthrough_paths.is_empty(),
        "OpenAI-compatible passthrough routes must be documented in the gateway OpenAPI spec: {stale_passthrough_paths:?}"
    );
}

#[test]
fn gateway_openapi_vendor_paths_are_runtime_provider_routes_without_public_manifest() {
    let spec: serde_json::Value = serde_json::from_str(include_str!(
        "../../../apps/sdkwork-clawrouter-pc/public/openapi.json"
    ))
    .unwrap();
    assert!(
        spec.get("x-provider-passthrough").is_none(),
        "Public OpenAPI must not expose the internal provider route manifest"
    );
    let runtime_providers =
        sdkwork_clawrouter_cloud_gateway::provider_native_passthrough_providers()
            .iter()
            .copied()
            .collect::<BTreeSet<_>>();
    let public_vendor_providers = spec["paths"]
        .as_object()
        .unwrap()
        .keys()
        .filter(|path| !path.starts_with("/v1/"))
        .filter_map(|path| path.strip_prefix('/'))
        .filter_map(|path| path.split('/').next())
        .collect::<BTreeSet<_>>();

    assert!(
        public_vendor_providers.is_subset(&runtime_providers),
        "Public vendor OpenAPI paths must be covered by the runtime provider routes: {public_vendor_providers:?}"
    );
}

#[derive(Debug, Default)]
struct CapturedNativeProviderRequest {
    method: String,
    path_and_query: String,
    authorization: Option<String>,
    google_api_key: Option<String>,
    anthropic_api_key: Option<String>,
    anthropic_version: Option<String>,
    vidu_token: Option<String>,
    content_type: Option<String>,
    client_api_key: Option<String>,
    body: String,
}

#[derive(Debug, Clone)]
struct CapturedProviderNativeAdapterRequest {
    authorization: Option<String>,
    body: AdapterInvocationRequest,
}

#[tokio::test]
async fn gateway_mounts_provider_native_passthrough_boundaries_without_404() {
    let router = sdkwork_clawrouter_cloud_gateway::router();

    for (method, path, body) in [
        (
            "POST",
            "/provider/google/v1beta/models/gemini-2.5-flash:generateContent",
            r#"{"contents":[{"parts":[{"text":"hello"}]}]}"#,
        ),
        (
            "POST",
            "/provider/anthropic/v1/messages",
            r#"{"model":"claude-sonnet-4-5","max_tokens":128,"messages":[{"role":"user","content":"hello"}]}"#,
        ),
        (
            "POST",
            "/provider/suno/v1/music/generations",
            r#"{"prompt":"short piano theme"}"#,
        ),
        (
            "POST",
            "/provider/elevenlabs/v1/sound-generation",
            r#"{"text":"cinematic whoosh"}"#,
        ),
        (
            "POST",
            "/provider/midjourney/v1/images/generations",
            r#"{"prompt":"product render"}"#,
        ),
        (
            "POST",
            "/provider/kling/v1/videos/generations",
            r#"{"prompt":"cinematic camera move"}"#,
        ),
        (
            "POST",
            "/vidu/ent/v2/text2video",
            r#"{"model":"vidu2.0","prompt":"animated product reveal"}"#,
        ),
        (
            "POST",
            "/provider/volcengine/api/v3/contents/generations/tasks",
            r#"{"model":"doubao-seedance","content":[{"type":"text","text":"video"}]}"#,
        ),
    ] {
        let response = router
            .clone()
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(path)
                    .header("content-type", "application/json")
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(StatusCode::NOT_IMPLEMENTED, response.status(), "{path}");
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            "provider_passthrough_not_configured",
            payload["error"]["code"]
        );
        assert_eq!(path, payload["error"]["path"]);
    }
}

#[tokio::test]
async fn gateway_provider_native_passthrough_keeps_official_standard_provider_direct_when_only_non_standard_adapter_route_exists(
) {
    let direct_captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/vidu/ent/v2/start-end2video",
            any(capture_native_provider_request),
        )
        .route(
            "/vidu/ent/v2/text2video",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&direct_captured));
    let provider_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let provider_addr = provider_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(provider_listener, provider).await.unwrap();
    });

    let adapter_captured = Arc::new(Mutex::new(Vec::new()));
    let adapter = Router::new()
        .route(
            "/providers/tencent-cloud/vidu/ent/v2/start-end2video",
            any(capture_provider_native_adapter_request),
        )
        .with_state(Arc::clone(&adapter_captured));
    let adapter_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let adapter_addr = adapter_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(adapter_listener, adapter).await.unwrap();
    });

    let passthrough_config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "vidu": {{
                "baseUrl": "http://{provider_addr}/vidu",
                "auth": {{
                    "type": "header",
                    "name": "token",
                    "value": "sk-vidu-upstream"
                }}
            }}
        }}"#
    ))
    .unwrap();
    let adapter_config = ProviderAdapterConfig::from_json(
        format!(
            r#"{{
                "routes": [{{
                    "providerCode": "tencent-cloud",
                    "adapterKind": "internal_http",
                    "adapterBaseUrl": "http://{adapter_addr}",
                    "capability": "video_generation",
                    "endpointKey": "video.start_end2video",
                    "method": "POST",
                    "standardPathPattern": "/vidu/ent/v2/start-end2video",
                    "adapterPathTemplate": "/providers/{{provider_code}}{{standard_path}}",
                    "invocationShape": "async_task_start",
                    "status": "enabled",
                    "priority": 10
                }}]
            }}"#
        ),
        Some("adapter-token".to_owned()),
    )
    .unwrap();
    let router =
        sdkwork_clawrouter_cloud_gateway::router_with_provider_passthrough_and_adapter_config(
            passthrough_config,
            Some(adapter_config),
        );

    let official_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/vidu/ent/v2/start-end2video")
                .header("token", "client-token-should-not-pass")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"vidu2.0","prompt":"official direct route"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, official_response.status());
    assert!(
        adapter_captured.lock().unwrap().is_empty(),
        "official Vidu standard API must stay direct even when Tencent Cloud adapts the same standard path"
    );

    let direct_response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/vidu/ent/v2/text2video")
                .header("token", "client-token-should-not-pass")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"vidu2.0","prompt":"direct route"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, direct_response.status());
    assert_eq!(0, adapter_captured.lock().unwrap().len());
    let direct_calls = direct_captured.lock().unwrap();
    assert_eq!(2, direct_calls.len());
    assert_eq!("POST", direct_calls[0].method);
    assert_eq!(
        "/vidu/ent/v2/start-end2video",
        direct_calls[0].path_and_query
    );
    assert_eq!("POST", direct_calls[1].method);
    assert_eq!("/vidu/ent/v2/text2video", direct_calls[1].path_and_query);
    assert_eq!(
        Some("sk-vidu-upstream".to_owned()),
        direct_calls[0].vidu_token
    );
    assert_eq!(
        Some("sk-vidu-upstream".to_owned()),
        direct_calls[1].vidu_token
    );
    assert!(direct_calls[0].body.contains("official direct route"));
    assert!(direct_calls[1].body.contains("direct route"));
}

#[tokio::test]
async fn gateway_provider_native_passthrough_adapts_registered_non_standard_provider() {
    let direct_captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/vidu/ent/v2/start-end2video",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&direct_captured));
    let provider_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let provider_addr = provider_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(provider_listener, provider).await.unwrap();
    });

    let adapter_captured = Arc::new(Mutex::new(Vec::new()));
    let adapter = Router::new()
        .route(
            "/providers/tencent-cloud/vidu/ent/v2/start-end2video",
            any(capture_provider_native_adapter_request),
        )
        .with_state(Arc::clone(&adapter_captured));
    let adapter_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let adapter_addr = adapter_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(adapter_listener, adapter).await.unwrap();
    });

    let passthrough_config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "tencent-cloud": {{
                "baseUrl": "http://{provider_addr}/vidu",
                "auth": {{
                    "type": "bearer",
                    "value": "sk-tencent-cloud-upstream"
                }}
            }}
        }}"#
    ))
    .unwrap();
    let adapter_config = ProviderAdapterConfig::from_json(
        format!(
            r#"{{
                "routes": [{{
                    "providerCode": "tencent-cloud",
                    "adapterKind": "internal_http",
                    "adapterBaseUrl": "http://{adapter_addr}",
                    "capability": "video_generation",
                    "endpointKey": "video.start_end2video",
                    "method": "POST",
                    "standardPathPattern": "/vidu/ent/v2/start-end2video",
                    "adapterPathTemplate": "/providers/{{provider_code}}{{standard_path}}",
                    "invocationShape": "async_task_start",
                    "status": "enabled",
                    "priority": 10
                }}]
            }}"#
        ),
        Some("adapter-token".to_owned()),
    )
    .unwrap();
    let router =
        sdkwork_clawrouter_cloud_gateway::router_with_provider_passthrough_and_adapter_config(
            passthrough_config,
            Some(adapter_config),
        );

    let adapter_response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/tencent-cloud/vidu/ent/v2/start-end2video")
                .header("authorization", "Bearer client-token-should-not-pass")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"vidu2.0","prompt":"adapter route"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::ACCEPTED, adapter_response.status());
    assert!(
        direct_captured.lock().unwrap().is_empty(),
        "registered non-standard provider endpoint must call adapter instead of direct target"
    );
    let adapter_calls = adapter_captured.lock().unwrap();
    assert_eq!(1, adapter_calls.len());
    assert_eq!(
        Some("Bearer adapter-token".to_owned()),
        adapter_calls[0].authorization
    );
    assert_eq!(
        "video.start_end2video",
        adapter_calls[0].body.invocation.endpoint_key
    );
    assert_eq!(
        AdapterInvocationShape::AsyncTaskStart,
        adapter_calls[0].body.invocation.shape
    );
    assert_eq!(
        "/vidu/ent/v2/start-end2video",
        adapter_calls[0].body.invocation.standard_path
    );
    assert_eq!(
        "tencent-cloud",
        adapter_calls[0].body.provider.provider_code
    );
    assert_eq!(
        Some(format!("http://{provider_addr}/vidu")),
        adapter_calls[0].body.provider.base_url
    );
    assert_eq!(json!("adapter route"), adapter_calls[0].body.body["prompt"]);
    assert!(matches!(
        adapter_calls[0].body.secret,
        AdapterSecret::GatewayResolved(_)
    ));
}

#[tokio::test]
async fn gateway_database_provider_native_adapter_routes_after_channel_route_selection() {
    let direct_captured = Arc::new(Mutex::new(Vec::new()));
    let direct_provider = Router::new()
        .route(
            "/vidu/ent/v2/start-end2video",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&direct_captured));
    let direct_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let direct_addr = direct_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(direct_listener, direct_provider).await.unwrap();
    });

    let adapter_captured = Arc::new(Mutex::new(Vec::new()));
    let adapter = Router::new()
        .route(
            "/providers/tencent-cloud/vidu/ent/v2/start-end2video",
            any(capture_provider_native_adapter_request),
        )
        .with_state(Arc::clone(&adapter_captured));
    let adapter_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let adapter_addr = adapter_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(adapter_listener, adapter).await.unwrap();
    });

    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    seed_tencent_cloud_vidu_start_end2video_channel_route(
        &catalog,
        &format!("http://{direct_addr}/vidu"),
    )
    .await;
    let adapter_config = ProviderAdapterConfig::from_json(
        format!(
            r#"{{
                "routes": [
                    {{
                        "providerCode": "tencent-cloud",
                        "adapterKind": "internal_http",
                        "adapterBaseUrl": "http://{adapter_addr}",
                        "capability": "video_generation",
                        "endpointKey": "video.start_end2video",
                        "method": "POST",
                        "standardPathPattern": "/vidu/ent/v2/start-end2video",
                        "adapterPathTemplate": "/providers/{{provider_code}}{{standard_path}}",
                        "invocationShape": "async_task_start",
                        "status": "enabled",
                        "priority": 10
                    }}
                ]
            }}"#
        ),
        Some("adapter-token".to_owned()),
    )
    .unwrap();
    let router = seeded_gateway_router_with_provider_adapter_config(
        &catalog,
        Some(
            ProviderSecretMapConfig::from_json(
                r#"{"vault://providers/tencent-cloud/account/main":"sk-tencent-cloud-account"}"#,
            )
            .unwrap(),
        ),
        Some(adapter_config),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/vidu/ent/v2/start-end2video")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"vidu2.0","prompt":"db account adapter"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::ACCEPTED,
        response_status,
        "{}",
        String::from_utf8_lossy(&response_body)
    );
    assert!(
        direct_captured.lock().unwrap().is_empty(),
        "database-routed registered adapter endpoint must not call the direct provider target"
    );
    let adapter_calls = adapter_captured.lock().unwrap();
    assert_eq!(1, adapter_calls.len());
    assert_eq!(
        Some("Bearer adapter-token".to_owned()),
        adapter_calls[0].authorization
    );
    assert_eq!(
        "tencent-cloud",
        adapter_calls[0].body.provider.provider_code
    );
    assert_eq!(9301, adapter_calls[0].body.provider.channel_id);
    assert_eq!(
        Some(format!("http://{direct_addr}/vidu")),
        adapter_calls[0].body.provider.base_url
    );
    assert_eq!(
        "video.start_end2video",
        adapter_calls[0].body.invocation.endpoint_key
    );
    assert_eq!(
        AdapterInvocationShape::AsyncTaskStart,
        adapter_calls[0].body.invocation.shape
    );
    assert_eq!(
        json!("db account adapter"),
        adapter_calls[0].body.body["prompt"]
    );
    assert!(matches!(
        adapter_calls[0].body.secret,
        AdapterSecret::GatewayResolved(_)
    ));
}

#[tokio::test]
async fn gateway_database_provider_native_adapter_routes_by_standard_api_code_without_endpoint_key()
{
    let direct_captured = Arc::new(Mutex::new(Vec::new()));
    let direct_provider = Router::new()
        .route(
            "/v1/videos/text2video",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&direct_captured));
    let direct_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let direct_addr = direct_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(direct_listener, direct_provider).await.unwrap();
    });

    let adapter_captured = Arc::new(Mutex::new(Vec::new()));
    let adapter = Router::new()
        .route(
            "/providers/kling/v1/videos/text2video",
            any(capture_provider_native_adapter_request),
        )
        .with_state(Arc::clone(&adapter_captured));
    let adapter_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let adapter_addr = adapter_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(adapter_listener, adapter).await.unwrap();
    });

    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    seed_kling_text_to_video_channel_route(&catalog, &format!("http://{direct_addr}")).await;
    let adapter_config = ProviderAdapterConfig::from_json(
        format!(
            r#"{{
                "routes": [
                    {{
                        "providerCode": "kling",
                        "adapterKind": "internal_http",
                        "adapterBaseUrl": "http://{adapter_addr}",
                        "capability": "video_generation",
                        "method": "POST",
                        "standardPathPattern": "/kling/v1/videos/text2video",
                        "adapterPathTemplate": "/providers{{standard_path}}",
                        "invocationShape": "async_task_start",
                        "status": "enabled",
                        "priority": 10
                    }}
                ]
            }}"#
        ),
        Some("adapter-token".to_owned()),
    )
    .unwrap();
    let router = seeded_gateway_router_with_provider_adapter_config(
        &catalog,
        Some(
            ProviderSecretMapConfig::from_json(
                r#"{"vault://providers/kling/account/main":"sk-kling-account"}"#,
            )
            .unwrap(),
        ),
        Some(adapter_config),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/kling/v1/videos/text2video")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model_name":"kling-v2","prompt":"standard api code"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::ACCEPTED,
        response_status,
        "{}",
        String::from_utf8_lossy(&response_body)
    );
    assert!(
        direct_captured.lock().unwrap().is_empty(),
        "standardized provider-native adapter route must not call the direct provider target first"
    );
    let adapter_calls = adapter_captured.lock().unwrap();
    assert_eq!(1, adapter_calls.len());
    assert_eq!(
        "kling.text_to_video",
        adapter_calls[0].body.invocation.endpoint_key
    );
    assert_eq!(
        "/kling/v1/videos/text2video",
        adapter_calls[0].body.invocation.standard_path
    );
    assert_eq!("kling", adapter_calls[0].body.provider.provider_code);
    assert_eq!(9501, adapter_calls[0].body.provider.channel_id);
    assert_eq!(
        Some(format!("http://{direct_addr}")),
        adapter_calls[0].body.provider.base_url
    );
}

#[tokio::test]
async fn gateway_database_provider_native_adapter_records_standard_usage_lines() {
    let direct_captured = Arc::new(Mutex::new(Vec::new()));
    let direct_provider = Router::new()
        .route(
            "/vidu/ent/v2/start-end2video",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&direct_captured));
    let direct_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let direct_addr = direct_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(direct_listener, direct_provider).await.unwrap();
    });

    let adapter_captured = Arc::new(Mutex::new(Vec::new()));
    let adapter = Router::new()
        .route(
            "/providers/tencent-cloud/vidu/ent/v2/start-end2video",
            any(capture_provider_native_adapter_request_with_video_usage),
        )
        .with_state(Arc::clone(&adapter_captured));
    let adapter_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let adapter_addr = adapter_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(adapter_listener, adapter).await.unwrap();
    });

    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    seed_tencent_cloud_vidu_start_end2video_channel_route(
        &catalog,
        &format!("http://{direct_addr}/vidu"),
    )
    .await;
    seed_tencent_cloud_vidu_billing_catalog(&catalog).await;
    let adapter_config = ProviderAdapterConfig::from_json(
        format!(
            r#"{{
                "routes": [
                    {{
                        "providerCode": "tencent-cloud",
                        "adapterKind": "internal_http",
                        "adapterBaseUrl": "http://{adapter_addr}",
                        "capability": "video_generation",
                        "endpointKey": "video.start_end2video",
                        "method": "POST",
                        "standardPathPattern": "/vidu/ent/v2/start-end2video",
                        "adapterPathTemplate": "/providers/{{provider_code}}{{standard_path}}",
                        "invocationShape": "async_task_start",
                        "status": "enabled",
                        "priority": 10
                    }}
                ]
            }}"#
        ),
        Some("adapter-token".to_owned()),
    )
    .unwrap();
    let router = seeded_gateway_router_with_provider_adapter_config(
        &catalog,
        Some(
            ProviderSecretMapConfig::from_json(
                r#"{"vault://providers/tencent-cloud/account/main":"sk-tencent-cloud-account"}"#,
            )
            .unwrap(),
        ),
        Some(adapter_config),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/vidu/ent/v2/start-end2video")
                .header("authorization", catalog.gateway_authorization_header())
                .header("x-request-id", "req-provider-adapter-video-usage")
                .header("x-trace-id", "trace-provider-adapter-video-usage")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"vidu2.0","duration":8,"prompt":"bill adapter usage"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::ACCEPTED,
        response_status,
        "{}",
        String::from_utf8_lossy(&response_body)
    );
    assert!(
        direct_captured.lock().unwrap().is_empty(),
        "billable provider-native adapter route must not call the direct provider target"
    );
    let adapter_calls = adapter_captured.lock().unwrap().clone();
    assert_eq!(
        1,
        adapter_calls.len(),
        "billable provider-native route must invoke the configured adapter"
    );
    let adapter_request_id = adapter_calls[0]
        .body
        .invocation
        .request_id
        .as_deref()
        .expect("adapter invocation must carry the server request id");
    assert_server_generated_request_id(adapter_request_id, "req-provider-adapter-video-usage");
    assert_eq!(
        Some("trace-provider-adapter-video-usage".to_owned()),
        adapter_calls[0].body.invocation.trace_id
    );
    assert_eq!(
        "tencent-cloud",
        adapter_calls[0].body.provider.provider_code
    );
    assert_eq!(9301_i64, adapter_calls[0].body.provider.channel_id);

    let pool = catalog.open_pool().await.unwrap();
    let rows = sqlx::query(
        r#"
        SELECT request_id, trace_id, catalog_key, requested_model_catalog_key, model,
               provider_native_model, channel_id, modality, usage_type, billing_meter_code,
               billable_quantity, request_count, result_count,
               CASE WHEN video_seconds IS NULL THEN NULL ELSE printf('%.12f', video_seconds) END AS video_seconds,
               printf('%.12f', official_reference_amount) AS official_reference_amount,
               printf('%.12f', upstream_cost_amount) AS upstream_cost_amount,
               printf('%.12f', customer_charge_amount) AS customer_charge_amount,
               currency, pricing_plan_code, pricing_snapshot, settlement_status
        FROM ai_usage
        WHERE trace_id = 'trace-provider-adapter-video-usage'
        ORDER BY billing_meter_code ASC
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap();
    pool.close().await;

    assert_eq!(
        2,
        rows.len(),
        "adapter usageLines must become independent billable usage facts"
    );
    for row in &rows {
        assert_eq!(adapter_request_id, row.get::<String, _>("request_id"));
        assert_eq!(
            "trace-provider-adapter-video-usage",
            row.get::<String, _>("trace_id")
        );
    }
    assert_ne!(
        rows[0].get::<i64, _>("usage_type"),
        rows[1].get::<i64, _>("usage_type"),
        "different adapter usage lines for the same request must not overwrite each other"
    );

    let request_row = rows
        .iter()
        .find(|row| row.get::<String, _>("billing_meter_code") == "api_request")
        .expect("api_request usage line must be recorded");
    assert_eq!(
        "tencent-cloud/vidu2.0",
        request_row.get::<String, _>("catalog_key")
    );
    assert_eq!(
        "tencent-cloud/vidu2.0",
        request_row.get::<String, _>("requested_model_catalog_key")
    );
    assert_eq!("vidu2.0", request_row.get::<String, _>("model"));
    assert_eq!(
        "vidu2.0",
        request_row.get::<String, _>("provider_native_model")
    );
    assert_eq!(9301_i64, request_row.get::<i64, _>("channel_id"));
    assert_eq!(5_i64, request_row.get::<i64, _>("modality"));
    assert_eq!("1", request_row.get::<String, _>("billable_quantity"));
    assert_eq!(1_i64, request_row.get::<i64, _>("request_count"));
    assert_eq!(
        "0.020000000000",
        request_row.get::<String, _>("official_reference_amount")
    );
    assert_eq!(
        "0.010000000000",
        request_row.get::<String, _>("upstream_cost_amount")
    );
    assert_eq!(
        "0.026400000000",
        request_row.get::<String, _>("customer_charge_amount")
    );
    assert_eq!("USD", request_row.get::<String, _>("currency"));
    assert_eq!(
        "standard",
        request_row.get::<String, _>("pricing_plan_code")
    );
    assert_eq!(0_i64, request_row.get::<i64, _>("settlement_status"));

    let duration_row = rows
        .iter()
        .find(|row| row.get::<String, _>("billing_meter_code") == "video_output_second")
        .expect("video_output_second usage line must be recorded");
    assert_eq!(
        "8.000000000000",
        duration_row.get::<String, _>("billable_quantity")
    );
    assert_eq!(0_i64, duration_row.get::<i64, _>("request_count"));
    assert_eq!(0_i64, duration_row.get::<i64, _>("result_count"));
    assert_eq!(
        Some("8.000000000000".to_owned()),
        duration_row.get::<Option<String>, _>("video_seconds")
    );
    assert_eq!(
        "0.800000000000",
        duration_row.get::<String, _>("official_reference_amount")
    );
    assert_eq!(
        "0.480000000000",
        duration_row.get::<String, _>("upstream_cost_amount")
    );
    assert_eq!(
        "1.056000000000",
        duration_row.get::<String, _>("customer_charge_amount")
    );
    let pricing_snapshot: serde_json::Value =
        serde_json::from_str(&duration_row.get::<String, _>("pricing_snapshot")).unwrap();
    assert_eq!("video_output_second", pricing_snapshot["meter"]["code"]);
    assert_eq!(
        "tencent-cloud/vidu2.0",
        pricing_snapshot["model"]["catalogKey"]
    );
    assert_eq!(
        "tencent-cloud/vidu2.0",
        pricing_snapshot["model"]["requestedCatalogKey"]
    );
    assert_eq!("vidu2.0", pricing_snapshot["model"]["providerNativeModel"]);
}

#[tokio::test]
async fn gateway_database_provider_native_adapter_directs_when_selected_account_has_no_adapter_route(
) {
    let direct_captured = Arc::new(Mutex::new(Vec::new()));
    let direct_provider = Router::new()
        .route(
            "/vidu/ent/v2/start-end2video",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&direct_captured));
    let direct_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let direct_addr = direct_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(direct_listener, direct_provider).await.unwrap();
    });

    let adapter_captured = Arc::new(Mutex::new(Vec::new()));
    let adapter = Router::new()
        .route(
            "/providers/tencent-cloud/vidu/ent/v2/start-end2video",
            any(capture_provider_native_adapter_request),
        )
        .with_state(Arc::clone(&adapter_captured));
    let adapter_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let adapter_addr = adapter_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(adapter_listener, adapter).await.unwrap();
    });

    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    seed_vidu_start_end2video_channel_route(&catalog, &format!("http://{direct_addr}/vidu")).await;
    seed_vidu_official_billing_catalog(&catalog).await;
    let adapter_config = ProviderAdapterConfig::from_json(
        format!(
            r#"{{
                "routes": [{{
                    "providerCode": "tencent-cloud",
                    "adapterKind": "internal_http",
                    "adapterBaseUrl": "http://{adapter_addr}",
                    "capability": "video_generation",
                    "endpointKey": "video.start_end2video",
                    "method": "POST",
                    "standardPathPattern": "/vidu/ent/v2/start-end2video",
                    "adapterPathTemplate": "/providers/{{provider_code}}{{standard_path}}",
                    "invocationShape": "async_task_start",
                    "status": "enabled",
                    "priority": 1
                }}]
            }}"#
        ),
        Some("adapter-token".to_owned()),
    )
    .unwrap();
    let router = seeded_gateway_router_with_provider_adapter_config(
        &catalog,
        Some(
            ProviderSecretMapConfig::from_json(
                r#"{"vault://providers/vidu/account/main":"sk-vidu-account"}"#,
            )
            .unwrap(),
        ),
        Some(adapter_config),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/vidu/ent/v2/start-end2video")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"vidu2.0","prompt":"db account direct"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::CREATED,
        response_status,
        "{}",
        String::from_utf8_lossy(&response_body)
    );
    assert!(
        adapter_captured.lock().unwrap().is_empty(),
        "a metadata route for a non-standard provider must not adapt an official standard provider account"
    );
    let direct_calls = direct_captured.lock().unwrap();
    assert_eq!(1, direct_calls.len());
    assert_eq!("POST", direct_calls[0].method);
    assert_eq!(
        "/vidu/ent/v2/start-end2video",
        direct_calls[0].path_and_query
    );
    assert_eq!(
        Some("sk-vidu-account".to_owned()),
        direct_calls[0].vidu_token
    );
    assert!(direct_calls[0].body.contains("db account direct"));
}

#[tokio::test]
async fn gateway_forwards_configured_vendor_prefixed_vidu_passthrough_request() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/vidu/ent/v2/text2video",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "vidu": {{
                "baseUrl": "http://{addr}/vidu",
                "auth": {{
                    "type": "header",
                    "name": "token",
                    "value": "sk-vidu-upstream"
                }}
            }}
        }}"#
    ))
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::router_with_provider_passthrough_config(config);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/vidu/ent/v2/text2video")
                .header("token", "client-token-should-not-pass")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"vidu2.0","prompt":"provider route"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("POST", captured[0].method);
    assert_eq!("/vidu/ent/v2/text2video", captured[0].path_and_query);
    assert_eq!(None, captured[0].authorization);
    assert_eq!(Some("sk-vidu-upstream".to_owned()), captured[0].vidu_token);
    assert!(captured[0].body.contains("provider route"));
}

#[tokio::test]
async fn gateway_forwards_configured_provider_native_passthrough_request() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1beta/models/gemini-2.5-flash:generateContent",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let config = ProviderRelayConfig::from_parts("http://127.0.0.1:9", "sk-openai")
        .unwrap()
        .with_provider_passthrough("google", format!("http://{addr}"), "sk-google-upstream")
        .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::router_with_provider_passthrough_config(config);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/google/v1beta/models/gemini-2.5-flash:generateContent?alt=sse")
                .header("authorization", "Bearer sk-claw-router-client")
                .header("x-api-key", "sk-client-api-key")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"contents":[{"parts":[{"text":"hello"}]}]}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    assert_eq!(
        "provider-request-id",
        response.headers()["x-provider-request-id"]
    );
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("native-ok", payload["id"]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("POST", captured[0].method);
    assert_eq!(
        "/v1beta/models/gemini-2.5-flash:generateContent?alt=sse",
        captured[0].path_and_query
    );
    assert_eq!(
        Some("Bearer sk-google-upstream".to_owned()),
        captured[0].authorization
    );
    assert_eq!(
        Some("application/json".to_owned()),
        captured[0].content_type
    );
    assert_eq!(None, captured[0].client_api_key);
    assert!(captured[0].body.contains("hello"));
}

#[tokio::test]
async fn gateway_forwards_provider_native_passthrough_with_configured_header_auth() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1beta/models/gemini-2.5-flash:generateContent",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "google": {{
                "baseUrl": "http://{addr}",
                "auth": {{
                    "type": "header",
                    "name": "x-goog-api-key",
                    "value": "sk-google-upstream"
                }}
            }}
        }}"#
    ))
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::router_with_provider_passthrough_config(config);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/google/v1beta/models/gemini-2.5-flash:generateContent")
                .header("authorization", "Bearer sk-client")
                .header("x-goog-api-key", "sk-client-google")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"contents":[{"parts":[{"text":"hello"}]}]}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(None, captured[0].authorization);
    assert_eq!(
        Some("sk-google-upstream".to_owned()),
        captured[0].google_api_key
    );
}

#[tokio::test]
async fn gateway_forwards_anthropic_provider_native_passthrough_with_configured_header_auth() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/messages", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "anthropic": {{
                "baseUrl": "http://{addr}",
                "auth": {{
                    "type": "header",
                    "name": "x-api-key",
                    "value": "sk-anthropic-upstream"
                }}
            }}
        }}"#
    ))
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::router_with_provider_passthrough_config(config);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/anthropic/v1/messages")
                .header("authorization", "Bearer sk-client")
                .header("x-api-key", "sk-client-anthropic")
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"claude-sonnet-4-5","max_tokens":128,"messages":[{"role":"user","content":"hello"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(None, captured[0].authorization);
    assert_eq!(
        Some("sk-anthropic-upstream".to_owned()),
        captured[0].anthropic_api_key
    );
    assert_eq!(Some("2023-06-01".to_owned()), captured[0].anthropic_version);
}

#[tokio::test]
async fn gateway_applies_configured_provider_native_passthrough_default_headers() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/messages", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "anthropic": {{
                "baseUrl": "http://{addr}",
                "auth": {{
                    "type": "header",
                    "name": "x-api-key",
                    "value": "sk-anthropic-upstream"
                }},
                "defaultHeaders": {{
                    "anthropic-version": "2023-06-01"
                }}
            }}
        }}"#
    ))
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::router_with_provider_passthrough_config(config);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/anthropic/v1/messages")
                .header("authorization", "Bearer sk-client")
                .header("x-api-key", "sk-client-anthropic")
                .header("anthropic-version", "client-version-should-not-win")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"claude-sonnet-4-5","max_tokens":128,"messages":[{"role":"user","content":"hello"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("sk-anthropic-upstream".to_owned()),
        captured[0].anthropic_api_key
    );
    assert_eq!(Some("2023-06-01".to_owned()), captured[0].anthropic_version);
}

#[tokio::test]
async fn gateway_forwards_provider_native_passthrough_with_configured_query_auth() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1beta/models/gemini-2.5-flash:generateContent",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "google": {{
                "baseUrl": "http://{addr}",
                "auth": {{
                    "type": "query",
                    "name": "key",
                    "value": "sk-google-upstream"
                }}
            }}
        }}"#
    ))
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::router_with_provider_passthrough_config(config);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/google/v1beta/models/gemini-2.5-flash:generateContent?alt=sse")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"contents":[{"parts":[{"text":"hello"}]}]}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(
        "/v1beta/models/gemini-2.5-flash:generateContent?alt=sse&key=sk-google-upstream",
        captured[0].path_and_query
    );
    assert_eq!(None, captured[0].authorization);
}

#[tokio::test]
async fn gateway_percent_encodes_provider_native_passthrough_query_auth_name_and_value() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1beta/models/gemini-2.5-flash:generateContent",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "google": {{
                "baseUrl": "http://{addr}",
                "auth": {{
                    "type": "query",
                    "name": "api key",
                    "value": "sk-google+slash/value?tenant=acme&mode=test value"
                }}
            }}
        }}"#
    ))
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::router_with_provider_passthrough_config(config);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/google/v1beta/models/gemini-2.5-flash:generateContent?alt=sse")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"contents":[{"parts":[{"text":"hello"}]}]}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(
        "/v1beta/models/gemini-2.5-flash:generateContent?alt=sse&api%20key=sk-google%2Bslash%2Fvalue%3Ftenant%3Dacme%26mode%3Dtest%20value",
        captured[0].path_and_query
    );
    assert_eq!(None, captured[0].authorization);
}

#[tokio::test]
async fn gateway_forwards_provider_native_passthrough_without_openai_relay_target() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1beta/models/gemini-2.5-flash:generateContent",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "google": {{
                "baseUrl": "http://{addr}",
                "bearerToken": "sk-google-upstream"
            }}
        }}"#
    ))
    .unwrap();
    let router = sdkwork_clawrouter_cloud_gateway::router_with_provider_passthrough_config(config);

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/google/v1beta/models/gemini-2.5-flash:generateContent")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"contents":[{"parts":[{"text":"provider only"}]}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-google-upstream".to_owned()),
        captured[0].authorization
    );
    assert!(captured[0].body.contains("provider only"));
}

#[tokio::test]
async fn gateway_database_router_merges_configured_provider_native_passthrough() {
    let captured_account = Arc::new(Mutex::new(Vec::new()));
    let account_provider = Router::new()
        .route(
            "/v1beta/models/gemini-2.5-flash:generateContent",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_account));
    let account_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let account_addr = account_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(account_listener, account_provider)
            .await
            .unwrap();
    });

    let captured_static = Arc::new(Mutex::new(Vec::new()));
    let static_provider = Router::new()
        .route(
            "/v1beta/models/gemini-2.5-flash:generateContent",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_static));
    let static_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let static_addr = static_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(static_listener, static_provider).await.unwrap();
    });

    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    seed_gemini_generate_content_channel_route(&catalog, &format!("http://{account_addr}")).await;
    seed_gemini_generate_content_billing_catalog(&catalog).await;
    let config = ProviderRelayConfig::from_parts("http://127.0.0.1:9", "sk-openai")
        .unwrap()
        .with_provider_passthrough(
            "google",
            format!("http://{static_addr}"),
            "sk-static-google-upstream",
        )
        .unwrap();
    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        Some(config),
        Some(
            ProviderSecretMapConfig::from_json(
                r#"{"vault://providers/google/account/main":"sk-google-account"}"#,
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/google/v1beta/models/gemini-2.5-flash:generateContent")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .header("x-goog-api-key", "sk-client-should-not-pass")
                .body(Body::from(
                    r#"{"contents":[{"parts":[{"text":"merged account route"}]}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::CREATED,
        response_status,
        "{}",
        String::from_utf8_lossy(&response_body)
    );
    assert_eq!(
        0,
        captured_static.lock().unwrap().len(),
        "configured static provider passthrough must not bypass API-key group channel routing"
    );
    let account_calls = captured_account.lock().unwrap();
    assert_eq!(1, account_calls.len());
    assert_eq!(
        "/v1beta/models/gemini-2.5-flash:generateContent",
        account_calls[0].path_and_query
    );
    assert_eq!(None, account_calls[0].authorization);
    assert_eq!(
        Some("sk-google-account".to_owned()),
        account_calls[0].google_api_key
    );
    assert_eq!(None, account_calls[0].client_api_key);
    assert!(account_calls[0].body.contains("merged account route"));
}

#[tokio::test]
async fn gateway_database_legacy_builder_rejects_google_query_api_key_without_calling_upstream() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1beta/models/gemini-2.5-flash:generateContent",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });
    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    let config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "google": {{
                "baseUrl": "http://{addr}",
                "auth": {{
                    "type": "query",
                    "name": "key",
                    "value": "sk-google-upstream"
                }}
            }}
        }}"#
    ))
    .unwrap();
    let router = seeded_gateway_router_with_provider_relay_config(&catalog, Some(config))
        .await
        .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!(
                    "/provider/google/v1beta/models/gemini-2.5-flash:generateContent?alt=sse&key={}",
                    catalog.gateway_api_key()
                ))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"contents":[{"parts":[{"text":"hello"}]}]}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    assert_eq!(0, captured.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_standalone_desktop_google_query_api_key_is_consumed_before_provider_auth()
{
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1beta/models/gemini-2.5-flash:generateContent",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });
    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    let config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "google": {{
                "baseUrl": "http://{addr}",
                "auth": {{
                    "type": "query",
                    "name": "key",
                    "value": "sk-google-upstream"
                }}
            }}
        }}"#
    ))
    .unwrap();
    let router = seeded_gateway_router_with_provider_configs_and_query_string_api_key_policy(
        &catalog,
        Some(config),
        None,
        standalone_desktop_query_string_api_key_policy(),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!(
                    "/provider/google/v1beta/models/gemini-2.5-flash:generateContent?alt=sse&api_key=client-api-key&token=client-token&key={}",
                    catalog.gateway_api_key()
                ))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"contents":[{"parts":[{"text":"hello"}]}]}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        "/v1beta/models/gemini-2.5-flash:generateContent?alt=sse&key=sk-google-upstream",
        captured[0].path_and_query
    );
    assert_eq!(1, captured[0].path_and_query.matches("key=").count());
    assert!(!captured[0]
        .path_and_query
        .contains(catalog.gateway_api_key()));
    assert!(!captured[0].path_and_query.contains("client-api-key"));
    assert!(!captured[0].path_and_query.contains("client-token"));
}

#[tokio::test]
async fn gateway_database_router_rejects_provider_native_passthrough_without_api_key() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/messages", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });
    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    let config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "anthropic": {{
                "baseUrl": "http://{addr}",
                "bearerToken": "sk-anthropic-upstream"
            }}
        }}"#
    ))
    .unwrap();
    let router = seeded_gateway_router_with_provider_relay_config(&catalog, Some(config))
        .await
        .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/anthropic/v1/messages")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hello"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("invalid_api_key", payload["error"]["code"]);
    assert_eq!(0, captured.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_provider_native_passthrough_prefers_group_channel_route_when_static_target_exists(
) {
    let captured_account = Arc::new(Mutex::new(Vec::new()));
    let account_provider = Router::new()
        .route(
            "/v1beta/models/gemini-2.5-flash:generateContent",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_account));
    let account_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let account_addr = account_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(account_listener, account_provider)
            .await
            .unwrap();
    });

    let captured_static = Arc::new(Mutex::new(Vec::new()));
    let static_provider = Router::new()
        .route(
            "/v1beta/models/gemini-2.5-flash:generateContent",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_static));
    let static_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let static_addr = static_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(static_listener, static_provider).await.unwrap();
    });

    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    seed_gemini_generate_content_channel_route(&catalog, &format!("http://{account_addr}")).await;
    seed_gemini_generate_content_billing_catalog(&catalog).await;
    let config = ProviderRelayConfig::from_provider_passthrough_json(format!(
        r#"{{
            "google": {{
                "baseUrl": "http://{static_addr}",
                "auth": {{
                    "type": "header",
                    "name": "x-goog-api-key",
                    "value": "sk-static-google-upstream"
                }}
            }}
        }}"#
    ))
    .unwrap();
    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        Some(config),
        Some(
            ProviderSecretMapConfig::from_json(
                r#"{"vault://providers/google/account/main":"sk-google-account"}"#,
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/google/v1beta/models/gemini-2.5-flash:generateContent")
                .header("authorization", catalog.gateway_authorization_header())
                .header("x-goog-api-key", "sk-client-should-not-pass")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"contents":[{"parts":[{"text":"account route"}]}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::CREATED,
        response_status,
        "{}",
        String::from_utf8_lossy(&response_body)
    );
    assert_eq!(
        0,
        captured_static.lock().unwrap().len(),
        "static provider passthrough target must not bypass API-key group channel routing"
    );
    let account_calls = captured_account.lock().unwrap();
    assert_eq!(1, account_calls.len());
    assert_eq!(
        "/v1beta/models/gemini-2.5-flash:generateContent",
        account_calls[0].path_and_query
    );
    assert_eq!(None, account_calls[0].authorization);
    assert_eq!(
        Some("sk-google-account".to_owned()),
        account_calls[0].google_api_key
    );
    assert_eq!(None, account_calls[0].client_api_key);
    assert!(account_calls[0].body.contains("account route"));
}

#[tokio::test]
async fn gateway_database_provider_native_direct_passthrough_records_api_request_usage() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1beta/models/gemini-2.5-flash:generateContent",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    seed_gemini_generate_content_channel_route(&catalog, &format!("http://{addr}")).await;
    seed_gemini_generate_content_billing_catalog(&catalog).await;
    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                r#"{"vault://providers/google/account/main":"sk-google-account"}"#,
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/provider/google/v1beta/models/gemini-2.5-flash:generateContent")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .header("x-trace-id", "trace-provider-native-direct-api-request")
                .body(Body::from(
                    r#"{"contents":[{"parts":[{"text":"bill direct request"}]}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::CREATED,
        response_status,
        "{}",
        String::from_utf8_lossy(&response_body)
    );
    assert_eq!(1, captured.lock().unwrap().len());

    let read_pool = catalog.open_pool().await.unwrap();
    let usage = sqlx::query(
        r#"
        SELECT trace_id, tenant_id, organization_id, user_id, api_key_id,
               channel_group_snapshot, catalog_key, requested_model_catalog_key,
               model, channel_id, provider_native_model,
               modality, usage_type,
               billing_meter_code, billable_quantity, request_count,
               customer_charge_amount, currency, pricing_plan_code,
               settlement_status
        FROM ai_usage
        WHERE trace_id = ?
        "#,
    )
    .bind("trace-provider-native-direct-api-request")
    .fetch_optional(&read_pool)
    .await
    .unwrap();
    read_pool.close().await;

    assert!(
        usage.is_some(),
        "direct provider-native account-routed passthrough must write api_request usage"
    );
    let usage = usage.unwrap();
    assert_eq!(
        "trace-provider-native-direct-api-request",
        usage.get::<String, _>("trace_id")
    );
    assert_eq!(100001_i64, usage.get::<i64, _>("tenant_id"));
    assert_eq!(0_i64, usage.get::<i64, _>("organization_id"));
    assert_eq!(30_i64, usage.get::<i64, _>("user_id"));
    assert_eq!(100_i64, usage.get::<i64, _>("api_key_id"));
    assert_eq!(
        "standard-group",
        usage.get::<String, _>("channel_group_snapshot")
    );
    assert_eq!(
        "google/gemini-2.5-flash",
        usage.get::<String, _>("catalog_key")
    );
    assert_eq!(
        "google/gemini-2.5-flash",
        usage.get::<String, _>("requested_model_catalog_key")
    );
    assert_eq!("gemini-2.5-flash", usage.get::<String, _>("model"));
    assert_eq!(9601_i64, usage.get::<i64, _>("channel_id"));
    assert_eq!(
        "gemini-2.5-flash",
        usage.get::<String, _>("provider_native_model")
    );
    assert_eq!(1_i64, usage.get::<i64, _>("modality"));
    assert_eq!("api_request", usage.get::<String, _>("billing_meter_code"));
    assert_eq!("1", usage.get::<String, _>("billable_quantity"));
    assert_eq!(1_i64, usage.get::<i64, _>("request_count"));
    assert_eq!(
        "0.006600000000",
        usage.get::<String, _>("customer_charge_amount")
    );
    assert_eq!("USD", usage.get::<String, _>("currency"));
    assert_eq!("standard", usage.get::<String, _>("pricing_plan_code"));
    assert_eq!(0_i64, usage.get::<i64, _>("settlement_status"));
}

#[tokio::test]
async fn gateway_database_router_forwards_configured_openai_standard_passthrough() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });
    let global_captured = Arc::new(Mutex::new(Vec::new()));
    let global_provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&global_captured));
    let global_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let global_addr = global_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(global_listener, global_provider).await.unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{addr}"),
        "http://127.0.0.1:9",
    )
    .await;
    let config =
        ProviderRelayConfig::from_parts(format!("http://{global_addr}"), "sk-openai-upstream")
            .unwrap();
    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        Some(config),
        Some(openrouter_account_pool_secret_map()),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/images/generations")
                .header("authorization", catalog.gateway_authorization_header())
                .header("x-api-key", "sk-client-key")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-image-1","prompt":"logo"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("/v1/images/generations", captured[0].path_and_query);
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured[0].authorization
    );
    assert_eq!(None, captured[0].client_api_key);
    assert!(captured[0].body.contains("openrouter/gpt-image-1-standard"));
    assert_eq!(
        0,
        global_captured.lock().unwrap().len(),
        "DB OpenAI passthrough must route through the API-key group account pool, not the static relay"
    );
}

#[tokio::test]
async fn gateway_database_router_does_not_duplicate_openai_v1_prefix_for_configured_openai_passthrough(
) {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });
    let global_captured = Arc::new(Mutex::new(Vec::new()));
    let global_provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&global_captured));
    let global_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let global_addr = global_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(global_listener, global_provider).await.unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{addr}"),
        "http://127.0.0.1:9",
    )
    .await;
    let config =
        ProviderRelayConfig::from_parts(format!("http://{global_addr}/v1"), "sk-openai-upstream")
            .unwrap();
    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        Some(config),
        Some(openrouter_account_pool_secret_map()),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/images/generations")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-image-1","prompt":"logo"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!("/v1/images/generations", captured[0].path_and_query);
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured[0].authorization
    );
    assert_eq!(
        0,
        global_captured.lock().unwrap().len(),
        "static relay base URL must not be used in DB account-pool routing mode"
    );
}

#[tokio::test]
async fn gateway_database_openai_passthrough_routes_by_channel_group_channel_route() {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    for (authorization, prompt) in [
        (
            catalog.gateway_authorization_header(),
            "standard channel route",
        ),
        (
            "Bearer sk-premium-live-secret".to_owned(),
            "premium channel route",
        ),
    ] {
        let response = router
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/v1/images/generations")
                    .header("authorization", authorization)
                    .header("content-type", "application/json")
                    .body(Body::from(format!(
                        r#"{{"model":"gpt-image-1","prompt":"{prompt}"}}"#
                    )))
                    .unwrap(),
            )
            .await
            .unwrap();

        let status = response.status();
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        assert_eq!(
            StatusCode::CREATED,
            status,
            "{prompt}: {}",
            String::from_utf8_lossy(&body)
        );
    }

    let captured_standard = captured_standard.lock().unwrap();
    assert_eq!(1, captured_standard.len());
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured_standard[0].authorization
    );
    assert_eq!(
        "/v1/images/generations",
        captured_standard[0].path_and_query
    );
    assert!(captured_standard[0].body.contains("standard channel route"));

    let captured_premium = captured_premium.lock().unwrap();
    assert_eq!(1, captured_premium.len());
    assert_eq!(
        Some("Bearer sk-premium-upstream".to_owned()),
        captured_premium[0].authorization
    );
    assert_eq!("/v1/images/generations", captured_premium[0].path_and_query);
    assert!(captured_premium[0].body.contains("premium channel route"));
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_sticky_lookup_uses_created_object_channel() {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route("/v1/files", any(capture_native_provider_request))
        .route("/v1/files/{file_id}", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route("/v1/files", any(capture_native_provider_request))
        .route("/v1/files/{file_id}", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;
    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(openrouter_account_pool_secret_map()),
    )
    .await
    .unwrap();

    let create_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/files")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(r#"{"purpose":"assistants"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    let create_status = create_response.status();
    let create_body = axum::body::to_bytes(create_response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::CREATED,
        create_status,
        "{}",
        String::from_utf8_lossy(&create_body)
    );

    let lookup_response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/files/native-ok")
                .header("authorization", "Bearer sk-premium-live-secret")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let lookup_status = lookup_response.status();
    let lookup_body = axum::body::to_bytes(lookup_response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::CREATED,
        lookup_status,
        "{}",
        String::from_utf8_lossy(&lookup_body)
    );
    let captured_standard = captured_standard.lock().unwrap();
    assert_eq!(2, captured_standard.len());
    assert_eq!("/v1/files", captured_standard[0].path_and_query);
    assert_eq!("/v1/files/native-ok", captured_standard[1].path_and_query);
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured_standard[1].authorization
    );
    assert_eq!(
        0,
        captured_premium.lock().unwrap().len(),
        "lookup must follow the sticky object route instead of the caller API-key group route"
    );
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_rewrites_multipart_model() {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route("/v1/images/edits", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route("/v1/images/edits", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let boundary = "claw-router-test-boundary";
    let body = format!(
        "--{boundary}\r\n\
Content-Disposition: form-data; name=\"prompt\"\r\n\
\r\n\
edit the uploaded image\r\n\
--{boundary}\r\n\
Content-Disposition: form-data; name=\"model\"\r\n\
\r\n\
gpt-image-1\r\n\
--{boundary}\r\n\
Content-Disposition: form-data; name=\"image\"; filename=\"image.png\"\r\n\
Content-Type: image/png\r\n\
\r\n\
fake-png-bytes\r\n\
--{boundary}--\r\n"
    );

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/images/edits")
                .header("authorization", catalog.gateway_authorization_header())
                .header(
                    "content-type",
                    format!("multipart/form-data; boundary={boundary}"),
                )
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());

    let captured_standard = captured_standard.lock().unwrap();
    assert_eq!(1, captured_standard.len());
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured_standard[0].authorization
    );
    assert_eq!("/v1/images/edits", captured_standard[0].path_and_query);
    assert!(captured_standard[0]
        .content_type
        .as_deref()
        .unwrap()
        .starts_with("multipart/form-data"));
    assert!(captured_standard[0]
        .body
        .contains("name=\"model\"\r\n\r\nopenrouter/gpt-image-1-standard\r\n"));
    assert!(!captured_standard[0]
        .body
        .contains("name=\"model\"\r\n\r\ngpt-image-1\r\n"));
    assert!(captured_standard[0].body.contains("fake-png-bytes"));
    assert_eq!(0, captured_premium.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_openai_passthrough_prefers_group_channel_route_when_global_relay_exists()
{
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let captured_global = Arc::new(Mutex::new(Vec::new()));
    let global_provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_global));
    let global_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let global_addr = global_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(global_listener, global_provider).await.unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        Some(
            ProviderRelayConfig::from_parts(format!("http://{global_addr}"), "sk-global-upstream")
                .unwrap(),
        ),
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/images/generations")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-image-1","prompt":"standard channel route"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    assert_eq!(1, captured_standard.lock().unwrap().len());
    assert_eq!(0, captured_premium.lock().unwrap().len());
    assert_eq!(
        0,
        captured_global.lock().unwrap().len(),
        "global OpenAI relay must not bypass route-scoped group channel route routing"
    );
}

#[tokio::test]
async fn gateway_database_openai_passthrough_prefers_managed_group_channel_route_when_global_relay_exists(
) {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let captured_global = Arc::new(Mutex::new(Vec::new()));
    let global_provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_global));
    let global_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let global_addr = global_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(global_listener, global_provider).await.unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;
    set_channel_managed_provider_secret(
        &catalog,
        3001,
        "vault://providers/openrouter/account/main",
        "sk-managed-standard-upstream",
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        Some(
            ProviderRelayConfig::from_parts(format!("http://{global_addr}"), "sk-global-upstream")
                .unwrap(),
        ),
        None,
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/images/generations")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-image-1","prompt":"managed standard channel route"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured_standard = captured_standard.lock().unwrap();
    assert_eq!(1, captured_standard.len());
    assert_eq!(
        Some("Bearer sk-managed-standard-upstream".to_owned()),
        captured_standard[0].authorization
    );
    assert_eq!(
        "/v1/images/generations",
        captured_standard[0].path_and_query
    );
    assert_eq!(0, captured_premium.lock().unwrap().len());
    assert_eq!(
        0,
        captured_global.lock().unwrap().len(),
        "static OpenAI relay must not bypass managed account-pool route selection"
    );
}

#[tokio::test]
async fn gateway_database_openai_passthrough_uses_global_default_channel_route_when_group_pool_is_not_bound(
) {
    let captured_group = Arc::new(Mutex::new(Vec::new()));
    let group_provider = Router::new()
        .route("/v1/files", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_group));
    let group_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let group_addr = group_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(group_listener, group_provider).await.unwrap();
    });

    let captured_default = Arc::new(Mutex::new(Vec::new()));
    let default_provider = Router::new()
        .route("/v1/files", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_default));
    let default_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let default_addr = default_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(default_listener, default_provider)
            .await
            .unwrap();
    });

    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    seed_openai_passthrough_default_channel_route_fallback(
        &catalog,
        &format!("http://{group_addr}"),
        &format!("http://{default_addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/account/main": "sk-group-upstream",
                    "vault://providers/openrouter/account/default": "sk-default-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/files?purpose=assistants")
                .header("authorization", catalog.gateway_authorization_header())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::CREATED,
        response_status,
        "{}",
        String::from_utf8_lossy(&response_body)
    );
    assert_eq!(0, captured_group.lock().unwrap().len());
    let captured_default = captured_default.lock().unwrap();
    assert_eq!(1, captured_default.len());
    assert_eq!(
        Some("Bearer sk-default-upstream".to_owned()),
        captured_default[0].authorization
    );
    assert_eq!(
        "/v1/files?purpose=assistants",
        captured_default[0].path_and_query
    );
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_uses_channel_route_header_auth_profile() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/files", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    seed_openai_passthrough_header_auth_channel_route(&catalog, &format!("http://{addr}")).await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/google/account/main": "sk-google-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/files")
                .header("authorization", catalog.gateway_authorization_header())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(None, captured[0].authorization);
    assert_eq!(
        Some("sk-google-upstream".to_owned()),
        captured[0].google_api_key
    );
    assert_eq!("/v1/files", captured[0].path_and_query);
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_applies_channel_route_default_headers() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/files", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    seed_openai_passthrough_header_auth_channel_route_with_auth_config(
        &catalog,
        &format!("http://{addr}"),
        r#"{"name":"x-api-key","defaultHeaders":{"anthropic-version":"2023-06-01"}}"#,
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/google/account/main": "sk-google-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/files")
                .header("authorization", catalog.gateway_authorization_header())
                .header("x-api-key", "sk-client-should-not-win")
                .header("anthropic-version", "client-version-should-not-win")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(None, captured[0].authorization);
    assert_eq!(
        Some("sk-google-upstream".to_owned()),
        captured[0].anthropic_api_key
    );
    assert_eq!(Some("2023-06-01".to_owned()), captured[0].anthropic_version);
}

#[tokio::test]
async fn gateway_database_route_scoped_stored_chat_creation_fails_closed_without_model() {
    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/account/main": "sk-standard-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"messages":[{"role":"user","content":"hello"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("invalid_request", payload["error"]["code"]);
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("model is required"));
}

#[tokio::test]
async fn gateway_database_route_scoped_stored_chat_creation_rejects_malformed_json_before_routing()
{
    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/account/main": "sk-standard-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-4o-mini","messages":["#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("invalid_request", payload["error"]["code"]);
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("invalid request body"));
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_chat_passthrough_records_usage() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/chat/completions",
            any(capture_openai_chat_completion_with_usage),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    let pool = catalog.open_pool().await.unwrap();
    set_channel_and_credential_base_url(&pool, 3001, &format!("http://{addr}")).await;
    pool.close().await;

    let secret_ref = "vault://providers/openrouter/account/main";
    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({secret_ref: "sk-route-scoped-upstream"}).to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .header("x-request-id", "req-route-scoped-chat-usage-1")
                .header("x-trace-id", "trace-route-scoped-chat-usage-1")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}],"stream":false}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    if status != StatusCode::OK {
        eprintln!(
            "route scoped chat status={status} body={}",
            String::from_utf8_lossy(&body)
        );
    }
    assert_eq!(StatusCode::OK, status);
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("chatcmpl-route-scoped", payload["id"]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-route-scoped-upstream".to_owned()),
        captured[0].authorization
    );
    assert!(captured[0].body.contains(r#""model":"gpt-4o-mini""#));
    drop(captured);

    let read_pool = catalog.open_pool().await.unwrap();
    let usage = sqlx::query(
        r#"
        SELECT request_id, trace_id, tenant_id, organization_id, user_id, api_key_id,
               channel_group_snapshot, model, requested_model_catalog_key,
               provider_native_model, channel_id, usage_type,
               billing_meter_code, billable_quantity, prompt_tokens, completion_tokens,
               cached_tokens, total_tokens, customer_charge_amount,
               currency, pricing_plan_code, settlement_status
        FROM ai_usage
        WHERE trace_id = ?
        "#,
    )
    .bind("trace-route-scoped-chat-usage-1")
    .fetch_optional(&read_pool)
    .await
    .unwrap();
    assert!(
        usage.is_some(),
        "route-scoped OpenAI-compatible passthrough must write ai_usage"
    );
    let usage = usage.unwrap();
    let request_id = usage.get::<String, _>("request_id");
    assert_server_generated_request_id(&request_id, "req-route-scoped-chat-usage-1");
    assert_eq!(
        "trace-route-scoped-chat-usage-1",
        usage.get::<String, _>("trace_id")
    );
    assert_eq!(100001_i64, usage.get::<i64, _>("tenant_id"));
    assert_eq!(0_i64, usage.get::<i64, _>("organization_id"));
    assert_eq!(30_i64, usage.get::<i64, _>("user_id"));
    assert_eq!(100_i64, usage.get::<i64, _>("api_key_id"));
    assert_eq!(
        "standard-group",
        usage.get::<String, _>("channel_group_snapshot")
    );
    assert_eq!("gpt-4o-mini", usage.get::<String, _>("model"));
    assert_eq!(
        "openai/gpt-4o-mini",
        usage.get::<String, _>("requested_model_catalog_key")
    );
    assert_eq!(
        "gpt-4o-mini",
        usage.get::<String, _>("provider_native_model")
    );
    assert_eq!(3001_i64, usage.get::<i64, _>("channel_id"));
    assert_eq!(1_i64, usage.get::<i64, _>("usage_type"));
    assert_eq!(
        "llm_input_token",
        usage.get::<String, _>("billing_meter_code")
    );
    assert_eq!("5", usage.get::<String, _>("billable_quantity"));
    assert_eq!(7_i64, usage.get::<i64, _>("prompt_tokens"));
    assert_eq!(4_i64, usage.get::<i64, _>("completion_tokens"));
    assert_eq!(2_i64, usage.get::<i64, _>("cached_tokens"));
    assert_eq!(11_i64, usage.get::<i64, _>("total_tokens"));
    assert_eq!(
        "0.000000990000",
        usage.get::<String, _>("customer_charge_amount")
    );
    assert_eq!("USD", usage.get::<String, _>("currency"));
    assert_eq!("standard", usage.get::<String, _>("pricing_plan_code"));
    assert_eq!(0_i64, usage.get::<i64, _>("settlement_status"));
    read_pool.close().await;
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_legacy_completion_passthrough_records_usage() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/completions", any(capture_openai_completion_with_usage))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    let pool = catalog.open_pool().await.unwrap();
    set_channel_and_credential_base_url(&pool, 3001, &format!("http://{addr}")).await;
    pool.close().await;

    let secret_ref = "vault://providers/openrouter/account/main";
    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({secret_ref: "sk-route-scoped-upstream"}).to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .header("x-request-id", "req-route-scoped-completion-usage-1")
                .header("x-trace-id", "trace-route-scoped-completion-usage-1")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","prompt":"ping","stream":false}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::OK,
        response_status,
        "{}",
        String::from_utf8_lossy(&body)
    );
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("cmpl-route-scoped", payload["id"]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-route-scoped-upstream".to_owned()),
        captured[0].authorization
    );
    assert_eq!("/v1/completions", captured[0].path_and_query);
    assert!(captured[0].body.contains(r#""model":"gpt-4o-mini""#));
    drop(captured);

    let read_pool = catalog.open_pool().await.unwrap();
    let usage = sqlx::query(
        r#"
        SELECT request_id, trace_id, tenant_id, organization_id, user_id, api_key_id,
               channel_group_snapshot, model, requested_model_catalog_key,
               provider_native_model, channel_id, usage_type, billing_meter_code,
               billable_quantity, prompt_tokens, completion_tokens, cached_tokens,
               total_tokens, customer_charge_amount, currency,
               pricing_plan_code, settlement_status
        FROM ai_usage
        WHERE trace_id = ?
        "#,
    )
    .bind("trace-route-scoped-completion-usage-1")
    .fetch_optional(&read_pool)
    .await
    .unwrap();
    assert!(
        usage.is_some(),
        "route-scoped legacy completions passthrough must write ai_usage"
    );
    let usage = usage.unwrap();
    let request_id = usage.get::<String, _>("request_id");
    assert_server_generated_request_id(&request_id, "req-route-scoped-completion-usage-1");
    assert_eq!(
        "trace-route-scoped-completion-usage-1",
        usage.get::<String, _>("trace_id")
    );
    assert_eq!(100001_i64, usage.get::<i64, _>("tenant_id"));
    assert_eq!(0_i64, usage.get::<i64, _>("organization_id"));
    assert_eq!(30_i64, usage.get::<i64, _>("user_id"));
    assert_eq!(100_i64, usage.get::<i64, _>("api_key_id"));
    assert_eq!(
        "standard-group",
        usage.get::<String, _>("channel_group_snapshot")
    );
    assert_eq!("gpt-4o-mini", usage.get::<String, _>("model"));
    assert_eq!(
        "openai/gpt-4o-mini",
        usage.get::<String, _>("requested_model_catalog_key")
    );
    assert_eq!(
        "gpt-4o-mini",
        usage.get::<String, _>("provider_native_model")
    );
    assert_eq!(3001_i64, usage.get::<i64, _>("channel_id"));
    assert_eq!(1_i64, usage.get::<i64, _>("usage_type"));
    assert_eq!(
        "llm_input_token",
        usage.get::<String, _>("billing_meter_code")
    );
    assert_eq!("7", usage.get::<String, _>("billable_quantity"));
    assert_eq!(7_i64, usage.get::<i64, _>("prompt_tokens"));
    assert_eq!(4_i64, usage.get::<i64, _>("completion_tokens"));
    assert_eq!(0_i64, usage.get::<i64, _>("cached_tokens"));
    assert_eq!(11_i64, usage.get::<i64, _>("total_tokens"));
    assert_eq!(
        "0.000001386000",
        usage.get::<String, _>("customer_charge_amount")
    );
    assert_eq!("USD", usage.get::<String, _>("currency"));
    assert_eq!("standard", usage.get::<String, _>("pricing_plan_code"));
    assert_eq!(0_i64, usage.get::<i64, _>("settlement_status"));
    read_pool.close().await;
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_image_passthrough_records_image_result_usage() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_openai_image_generation_with_results),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{addr}"),
        &format!("http://{addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/images/generations")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .header("x-request-id", "req-route-scoped-image-usage-1")
                .header("x-trace-id", "trace-route-scoped-image-usage-1")
                .body(Body::from(
                    r#"{"model":"gpt-image-1","prompt":"logo","n":2}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(2, payload["data"].as_array().unwrap().len());

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured[0].authorization
    );
    assert_eq!("/v1/images/generations", captured[0].path_and_query);
    assert!(captured[0]
        .body
        .contains(r#""model":"openrouter/gpt-image-1-standard""#));
    drop(captured);

    let read_pool = catalog.open_pool().await.unwrap();
    let usage = sqlx::query(
        r#"
        SELECT request_id, trace_id, catalog_key, model, requested_model_catalog_key,
               provider_native_model, channel_id, modality, billing_meter_code,
               billable_quantity, image_count, request_count, customer_charge_amount,
               currency, pricing_plan_code, settlement_status
        FROM ai_usage
        WHERE trace_id = ?
        "#,
    )
    .bind("trace-route-scoped-image-usage-1")
    .fetch_optional(&read_pool)
    .await
    .unwrap();
    assert!(
        usage.is_some(),
        "route-scoped image passthrough must write image_result usage"
    );
    let usage = usage.unwrap();
    let request_id = usage.get::<String, _>("request_id");
    assert_server_generated_request_id(&request_id, "req-route-scoped-image-usage-1");
    assert_eq!(
        "trace-route-scoped-image-usage-1",
        usage.get::<String, _>("trace_id")
    );
    assert_eq!("gpt-image-1", usage.get::<String, _>("model"));
    assert_eq!("openai/gpt-image-1", usage.get::<String, _>("catalog_key"));
    assert_eq!(
        "openai/gpt-image-1",
        usage.get::<String, _>("requested_model_catalog_key")
    );
    assert_eq!(
        "gpt-image-1-standard",
        usage.get::<String, _>("provider_native_model")
    );
    assert_eq!(3001_i64, usage.get::<i64, _>("channel_id"));
    assert_eq!(2_i64, usage.get::<i64, _>("modality"));
    assert_eq!("image_result", usage.get::<String, _>("billing_meter_code"));
    assert_eq!("2", usage.get::<String, _>("billable_quantity"));
    assert_eq!(2_i64, usage.get::<i64, _>("image_count"));
    assert_eq!(0_i64, usage.get::<i64, _>("request_count"));
    assert_eq!(
        "0.132000000000",
        usage.get::<String, _>("customer_charge_amount")
    );
    assert_eq!("USD", usage.get::<String, _>("currency"));
    assert_eq!("standard", usage.get::<String, _>("pricing_plan_code"));
    assert_eq!(0_i64, usage.get::<i64, _>("settlement_status"));
    read_pool.close().await;
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_management_passthrough_records_api_request_usage() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/files", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{addr}"),
        &format!("http://{addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/files?purpose=assistants")
                .header("authorization", catalog.gateway_authorization_header())
                .header("user-agent", "ClawRouterTest/1.0")
                .header("x-request-id", "req-route-scoped-files-usage-1")
                .header("x-trace-id", "trace-route-scoped-files-usage-1")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("native-ok", payload["id"]);

    let captured = captured.lock().unwrap();
    assert_eq!(1, captured.len());
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured[0].authorization
    );
    assert_eq!("/v1/files?purpose=assistants", captured[0].path_and_query);
    drop(captured);

    let read_pool = catalog.open_pool().await.unwrap();
    let usage = sqlx::query(
        r#"
        SELECT request_id, trace_id, tenant_id, organization_id, user_id, api_key_id,
               channel_group_snapshot, catalog_key, model, requested_model_catalog_key,
               provider_native_model, channel_id, billing_meter_code,
               billable_quantity, request_count, customer_charge_amount,
               currency, pricing_plan_code, settlement_status
        FROM ai_usage
        WHERE trace_id = ?
        "#,
    )
    .bind("trace-route-scoped-files-usage-1")
    .fetch_optional(&read_pool)
    .await
    .unwrap();
    assert!(
        usage.is_some(),
        "route-scoped OpenAI management passthrough must write api_request usage"
    );
    let usage = usage.unwrap();
    let request_id = usage.get::<String, _>("request_id");
    assert_server_generated_request_id(&request_id, "req-route-scoped-files-usage-1");
    assert_eq!(
        "trace-route-scoped-files-usage-1",
        usage.get::<String, _>("trace_id")
    );
    assert_eq!(100001_i64, usage.get::<i64, _>("tenant_id"));
    assert_eq!(0_i64, usage.get::<i64, _>("organization_id"));
    assert_eq!(30_i64, usage.get::<i64, _>("user_id"));
    assert_eq!(100_i64, usage.get::<i64, _>("api_key_id"));
    assert_eq!(
        "standard-group",
        usage.get::<String, _>("channel_group_snapshot")
    );
    assert_eq!(
        "openai/management/files",
        usage.get::<String, _>("catalog_key")
    );
    assert_eq!("management/files", usage.get::<String, _>("model"));
    assert_eq!(
        "openai/management/files",
        usage.get::<String, _>("requested_model_catalog_key")
    );
    assert_eq!("", usage.get::<String, _>("provider_native_model"));
    assert_eq!(3001_i64, usage.get::<i64, _>("channel_id"));
    assert_eq!("api_request", usage.get::<String, _>("billing_meter_code"));
    assert_eq!("1", usage.get::<String, _>("billable_quantity"));
    assert_eq!(1_i64, usage.get::<i64, _>("request_count"));
    assert_eq!(
        "0.001320000000",
        usage.get::<String, _>("customer_charge_amount")
    );
    assert_eq!("USD", usage.get::<String, _>("currency"));
    assert_eq!("standard", usage.get::<String, _>("pricing_plan_code"));
    assert_eq!(0_i64, usage.get::<i64, _>("settlement_status"));
    read_pool.close().await;
}

#[tokio::test]
async fn gateway_database_route_scoped_stored_chat_list_uses_channel_route_without_rewriting_query_model(
) {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route("/v1/chat/completions", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route("/v1/chat/completions", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/chat/completions?model=gpt-4o-mini&limit=20")
                .header("authorization", catalog.gateway_authorization_header())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::CREATED,
        response_status,
        "{}",
        String::from_utf8_lossy(&response_body)
    );
    let captured_standard = captured_standard.lock().unwrap();
    assert_eq!(1, captured_standard.len());
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured_standard[0].authorization
    );
    assert_eq!(
        "/v1/chat/completions?model=gpt-4o-mini&limit=20",
        captured_standard[0].path_and_query
    );
    assert_eq!(0, captured_premium.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_route_scoped_stateless_openai_passthrough_failovers_to_fallback_route() {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route(
            "/v1/chat/completions",
            any(capture_retryable_native_provider_request),
        )
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route(
            "/v1/chat/completions",
            any(capture_openai_chat_completion_with_usage),
        )
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;
    seed_openai_chat_fallback_route(&catalog).await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/chat/completions")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hello"}]}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, status, "{}", String::from_utf8_lossy(&body));
    assert_eq!(1, captured_standard.lock().unwrap().len());
    let captured_premium = captured_premium.lock().unwrap();
    assert_eq!(1, captured_premium.len());
    assert_eq!(
        Some("Bearer sk-premium-upstream".to_owned()),
        captured_premium[0].authorization
    );
    assert_eq!("/v1/chat/completions", captured_premium[0].path_and_query);
    let premium_body: serde_json::Value = serde_json::from_str(&captured_premium[0].body).unwrap();
    assert_eq!("gpt-4o-mini-fallback", premium_body["model"]);
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_rewrites_delete_path_model() {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route("/v1/models/{*model}", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route("/v1/models/{*model}", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/v1/models/gpt-4o-mini")
                .header("authorization", catalog.gateway_authorization_header())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let response_status = response.status();
    let response_body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::CREATED,
        response_status,
        "{}",
        String::from_utf8_lossy(&response_body)
    );
    let captured_standard = captured_standard.lock().unwrap();
    assert_eq!(1, captured_standard.len());
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured_standard[0].authorization
    );
    assert_eq!(
        "/v1/models/gpt-4o-mini",
        captured_standard[0].path_and_query
    );
    assert_eq!(0, captured_premium.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_routes_bodyless_management_calls_by_group_channel_route(
) {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route("/v1/files", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route("/v1/files", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/files?purpose=assistants")
                .header("authorization", catalog.gateway_authorization_header())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured_standard = captured_standard.lock().unwrap();
    assert_eq!(1, captured_standard.len());
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured_standard[0].authorization
    );
    assert_eq!(
        "/v1/files?purpose=assistants",
        captured_standard[0].path_and_query
    );
    assert_eq!(0, captured_premium.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_routes_audio_voice_management_by_specific_route_key(
) {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route("/v1/audio/voices", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route("/v1/audio/voices", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let pool = catalog.open_pool().await.unwrap();
    sqlx::query(
        r#"
        UPDATE ai_routing_rule
        SET match_expression = '{"routeKey":"openai/management/audio_voices"}',
            target_model = NULL
        WHERE id = 9102
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/audio/voices?limit=20")
                .header("authorization", catalog.gateway_authorization_header())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured_standard = captured_standard.lock().unwrap();
    assert_eq!(1, captured_standard.len());
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured_standard[0].authorization
    );
    assert_eq!(
        "/v1/audio/voices?limit=20",
        captured_standard[0].path_and_query
    );
    assert_eq!(0, captured_premium.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_routes_response_resource_management_by_specific_route_key(
) {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route(
            "/v1/responses/{response_id}",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route(
            "/v1/responses/{response_id}",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let pool = catalog.open_pool().await.unwrap();
    sqlx::query(
        r#"
        UPDATE ai_routing_rule
        SET match_expression = '{"routeKey":"openai/management/responses"}',
            target_model = NULL
        WHERE id = 9102
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/responses/resp_123?include=usage")
                .header("authorization", catalog.gateway_authorization_header())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured_standard = captured_standard.lock().unwrap();
    assert_eq!(1, captured_standard.len());
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured_standard[0].authorization
    );
    assert_eq!(
        "/v1/responses/resp_123?include=usage",
        captured_standard[0].path_and_query
    );
    assert_eq!(0, captured_premium.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_routes_video_resource_management_by_specific_route_key(
) {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route(
            "/v1/videos/{video_id}/content",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route(
            "/v1/videos/{video_id}/content",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let pool = catalog.open_pool().await.unwrap();
    sqlx::query(
        r#"
        UPDATE ai_routing_rule
        SET match_expression = '{"routeKey":"openai/management/videos"}',
            target_model = NULL
        WHERE id = 9102
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/videos/video_123/content")
                .header("authorization", catalog.gateway_authorization_header())
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::CREATED, response.status());
    let captured_standard = captured_standard.lock().unwrap();
    assert_eq!(1, captured_standard.len());
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured_standard[0].authorization
    );
    assert_eq!(
        "/v1/videos/video_123/content",
        captured_standard[0].path_and_query
    );
    assert_eq!(0, captured_premium.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_routes_optional_model_calls_by_presence()
{
    let captured_standard_thread = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route(
            "/v1/threads/thread_123/runs",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/evals/eval_123/runs",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_standard_thread));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route(
            "/v1/threads/thread_123/runs",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/evals/eval_123/runs",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let channel_route_response = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/threads/thread_123/runs")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(r#"{"assistant_id":"asst_123"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    let nested_model_response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/evals/eval_123/runs")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"data_source":{"type":"responses","model":"gpt-4o-mini","input":"hello"},"name":"quality"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    let channel_route_status = channel_route_response.status();
    let channel_route_body = axum::body::to_bytes(channel_route_response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::CREATED,
        channel_route_status,
        "{}",
        String::from_utf8_lossy(&channel_route_body)
    );
    let nested_model_status = nested_model_response.status();
    let nested_model_body = axum::body::to_bytes(nested_model_response.into_body(), usize::MAX)
        .await
        .unwrap();
    assert_eq!(
        StatusCode::CREATED,
        nested_model_status,
        "{}",
        String::from_utf8_lossy(&nested_model_body)
    );
    let captured_standard = captured_standard_thread.lock().unwrap();
    assert_eq!(2, captured_standard.len());
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured_standard[0].authorization
    );
    assert_eq!("POST", captured_standard[0].method);
    assert_eq!(
        "/v1/threads/thread_123/runs",
        captured_standard[0].path_and_query
    );
    assert!(captured_standard[0].body.contains("asst_123"));
    assert_eq!("POST", captured_standard[1].method);
    assert_eq!(
        "/v1/evals/eval_123/runs",
        captured_standard[1].path_and_query
    );
    assert!(captured_standard[1]
        .body
        .contains(r#""model":"gpt-4o-mini""#));
    assert!(!captured_standard[1]
        .body
        .contains(r#""model":"openai/global/gpt-4o-mini""#));
    assert_eq!(0, captured_premium.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_rejects_malformed_optional_model_json() {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route(
            "/v1/threads/thread_123/runs",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route(
            "/v1/threads/thread_123/runs",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/threads/thread_123/runs")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(r#"{"assistant_id":"asst_123","model":"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("invalid_request", payload["error"]["code"]);
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("invalid request body"));
    assert_eq!(0, captured_standard.lock().unwrap().len());
    assert_eq!(0, captured_premium.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_rejects_blank_optional_model_before_channel_route_routing(
) {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route(
            "/v1/threads/thread_123/runs",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route(
            "/v1/threads/thread_123/runs",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/threads/thread_123/runs")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(r#"{"assistant_id":"asst_123","model":" "}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("invalid_request", payload["error"]["code"]);
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("model must not be blank"));
    assert_eq!(0, captured_standard.lock().unwrap().len());
    assert_eq!(0, captured_premium.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_rejects_non_string_optional_model_before_channel_route_routing(
) {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route(
            "/v1/threads/thread_123/runs",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route(
            "/v1/threads/thread_123/runs",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/threads/thread_123/runs")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "application/json")
                .body(Body::from(r#"{"assistant_id":"asst_123","model":null}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("invalid_request", payload["error"]["code"]);
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("model must be a string"));
    assert_eq!(0, captured_standard.lock().unwrap().len());
    assert_eq!(0, captured_premium.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_route_scoped_openai_passthrough_rejects_multipart_without_boundary_before_channel_route_routing(
) {
    let captured_standard = Arc::new(Mutex::new(Vec::new()));
    let standard_provider = Router::new()
        .route("/v1/images/edits", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_standard));
    let standard_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let standard_addr = standard_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(standard_listener, standard_provider)
            .await
            .unwrap();
    });

    let captured_premium = Arc::new(Mutex::new(Vec::new()));
    let premium_provider = Router::new()
        .route("/v1/images/edits", any(capture_native_provider_request))
        .with_state(Arc::clone(&captured_premium));
    let premium_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let premium_addr = premium_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(premium_listener, premium_provider)
            .await
            .unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{standard_addr}"),
        &format!("http://{premium_addr}"),
    )
    .await;

    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        None,
        Some(
            ProviderSecretMapConfig::from_json(
                serde_json::json!({
                    "vault://providers/openrouter/channel/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/main": "sk-standard-upstream",
                    "vault://providers/openrouter/account/premium": "sk-premium-upstream"
                })
                .to_string(),
            )
            .unwrap(),
        ),
    )
    .await
    .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/images/edits")
                .header("authorization", catalog.gateway_authorization_header())
                .header("content-type", "multipart/form-data")
                .body(Body::from("model=gpt-image-1"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::BAD_REQUEST, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("invalid_request", payload["error"]["code"]);
    assert!(payload["error"]["message"]
        .as_str()
        .unwrap()
        .contains("multipart/form-data boundary is required"));
    assert_eq!(0, captured_standard.lock().unwrap().len());
    assert_eq!(0, captured_premium.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_database_router_forwards_configured_openai_supplemental_passthrough_surface() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/conversations", any(capture_native_provider_request))
        .route("/v1/models/{*model}", any(capture_native_provider_request))
        .route("/v1/files", any(capture_native_provider_request))
        .route(
            "/v1/realtime/calls/call_123/hangup",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/fine_tuning/alpha/graders/validate",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/fine_tuning/checkpoints/ftckpt_123/permissions",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/batches/batch_123/cancel",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/vector_stores/vs_123/file_batches/batch_123/cancel",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/audio/voice_consents/consent_123",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/skills/skill_123/versions/v1/content",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/organization/costs",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/organization/projects/proj_123/archive",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/organization/admin_api_keys/key_123",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/organization/users/user_123/roles/role_123",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/organization/groups/group_123/roles",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/organization/projects/proj_123/api_keys/key_123",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/projects/proj_123/users/user_123/roles/role_123",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/containers/container_123/files/file_123/content",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });
    let global_captured = Arc::new(Mutex::new(Vec::new()));
    let global_provider = Router::new()
        .route("/{*path}", any(capture_native_provider_request))
        .with_state(Arc::clone(&global_captured));
    let global_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let global_addr = global_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(global_listener, global_provider).await.unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{addr}"),
        "http://127.0.0.1:9",
    )
    .await;
    let config =
        ProviderRelayConfig::from_parts(format!("http://{global_addr}"), "sk-openai-upstream")
            .unwrap();
    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        Some(config),
        Some(openrouter_account_pool_secret_map()),
    )
    .await
    .unwrap();

    for (method, uri, body) in [
        ("GET", "/v1/conversations?limit=20&order=desc", ""),
        ("DELETE", "/v1/models/gpt-4o-mini", ""),
        ("GET", "/v1/files?purpose=assistants", ""),
        (
            "POST",
            "/v1/realtime/calls/call_123/hangup",
            r#"{"reason":"complete"}"#,
        ),
        (
            "POST",
            "/v1/fine_tuning/alpha/graders/validate",
            r#"{"grader":{"type":"string_check"}}"#,
        ),
        (
            "GET",
            "/v1/fine_tuning/checkpoints/ftckpt_123/permissions?project_id=proj_123",
            "",
        ),
        ("POST", "/v1/batches/batch_123/cancel", ""),
        (
            "POST",
            "/v1/vector_stores/vs_123/file_batches/batch_123/cancel",
            "",
        ),
        ("DELETE", "/v1/audio/voice_consents/consent_123", ""),
        ("GET", "/v1/skills/skill_123/versions/v1/content", ""),
        (
            "GET",
            "/v1/organization/costs?start_time=1700000000&group_by=project_id",
            "",
        ),
        ("POST", "/v1/organization/projects/proj_123/archive", ""),
        ("DELETE", "/v1/organization/admin_api_keys/key_123", ""),
        (
            "DELETE",
            "/v1/organization/users/user_123/roles/role_123",
            "",
        ),
        (
            "POST",
            "/v1/organization/groups/group_123/roles",
            r#"{"role_id":"role_123"}"#,
        ),
        (
            "GET",
            "/v1/organization/projects/proj_123/api_keys/key_123",
            "",
        ),
        (
            "DELETE",
            "/v1/projects/proj_123/users/user_123/roles/role_123",
            "",
        ),
        (
            "GET",
            "/v1/containers/container_123/files/file_123/content",
            "",
        ),
    ] {
        let response = router
            .clone()
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(uri)
                    .header("authorization", catalog.gateway_authorization_header())
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(StatusCode::CREATED, response.status(), "{method} {uri}");
    }

    let captured = captured.lock().unwrap();
    assert_eq!(18, captured.len());
    assert_eq!("GET", captured[0].method);
    assert_eq!(
        "/v1/conversations?limit=20&order=desc",
        captured[0].path_and_query
    );
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured[0].authorization
    );
    assert_eq!("DELETE", captured[1].method);
    assert_eq!("/v1/models/gpt-4o-mini", captured[1].path_and_query);
    assert_eq!("GET", captured[2].method);
    assert_eq!("/v1/files?purpose=assistants", captured[2].path_and_query);
    assert_eq!("POST", captured[3].method);
    assert_eq!(
        "/v1/realtime/calls/call_123/hangup",
        captured[3].path_and_query
    );
    assert_eq!("POST", captured[4].method);
    assert_eq!(
        "/v1/fine_tuning/alpha/graders/validate",
        captured[4].path_and_query
    );
    assert_eq!("GET", captured[5].method);
    assert_eq!(
        "/v1/fine_tuning/checkpoints/ftckpt_123/permissions?project_id=proj_123",
        captured[5].path_and_query
    );
    assert_eq!("POST", captured[6].method);
    assert_eq!("/v1/batches/batch_123/cancel", captured[6].path_and_query);
    assert_eq!("POST", captured[7].method);
    assert_eq!(
        "/v1/vector_stores/vs_123/file_batches/batch_123/cancel",
        captured[7].path_and_query
    );
    assert_eq!("DELETE", captured[8].method);
    assert_eq!(
        "/v1/audio/voice_consents/consent_123",
        captured[8].path_and_query
    );
    assert_eq!("GET", captured[9].method);
    assert_eq!(
        "/v1/skills/skill_123/versions/v1/content",
        captured[9].path_and_query
    );
    assert_eq!("GET", captured[10].method);
    assert_eq!(
        "/v1/organization/costs?start_time=1700000000&group_by=project_id",
        captured[10].path_and_query
    );
    assert_eq!("POST", captured[11].method);
    assert_eq!(
        "/v1/organization/projects/proj_123/archive",
        captured[11].path_and_query
    );
    assert_eq!("DELETE", captured[12].method);
    assert_eq!(
        "/v1/organization/admin_api_keys/key_123",
        captured[12].path_and_query
    );
    assert_eq!("DELETE", captured[13].method);
    assert_eq!(
        "/v1/organization/users/user_123/roles/role_123",
        captured[13].path_and_query
    );
    assert_eq!("POST", captured[14].method);
    assert_eq!(
        "/v1/organization/groups/group_123/roles",
        captured[14].path_and_query
    );
    assert_eq!("GET", captured[15].method);
    assert_eq!(
        "/v1/organization/projects/proj_123/api_keys/key_123",
        captured[15].path_and_query
    );
    assert_eq!("DELETE", captured[16].method);
    assert_eq!(
        "/v1/projects/proj_123/users/user_123/roles/role_123",
        captured[16].path_and_query
    );
    assert_eq!(
        "/v1/containers/container_123/files/file_123/content",
        captured[17].path_and_query
    );
    drop(captured);
    assert_eq!(
        0,
        global_captured.lock().unwrap().len(),
        "supplemental OpenAI passthrough must not bypass the API-key group account pool"
    );
}

#[tokio::test]
async fn gateway_database_router_forwards_stored_chat_completion_passthrough_methods() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route("/v1/chat/completions", any(capture_native_provider_request))
        .route(
            "/v1/chat/completions/chatcmpl_123",
            any(capture_native_provider_request),
        )
        .route(
            "/v1/chat/completions/chatcmpl_123/messages",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });
    let global_captured = Arc::new(Mutex::new(Vec::new()));
    let global_provider = Router::new()
        .route("/{*path}", any(capture_native_provider_request))
        .with_state(Arc::clone(&global_captured));
    let global_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let global_addr = global_listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(global_listener, global_provider).await.unwrap();
    });

    let catalog = fork_openai_passthrough_group_route_catalog(
        &format!("http://{addr}"),
        "http://127.0.0.1:9",
    )
    .await;
    let config =
        ProviderRelayConfig::from_parts(format!("http://{global_addr}"), "sk-openai-upstream")
            .unwrap();
    let router = seeded_gateway_router_with_provider_configs(
        &catalog,
        Some(config),
        Some(openrouter_account_pool_secret_map()),
    )
    .await
    .unwrap();

    for (method, uri, body) in [
        ("GET", "/v1/chat/completions?limit=20", ""),
        ("GET", "/v1/chat/completions/chatcmpl_123", ""),
        (
            "POST",
            "/v1/chat/completions/chatcmpl_123",
            r#"{"metadata":{"tenant":"demo"}}"#,
        ),
        ("DELETE", "/v1/chat/completions/chatcmpl_123", ""),
        ("GET", "/v1/chat/completions/chatcmpl_123/messages", ""),
    ] {
        let response = router
            .clone()
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(uri)
                    .header("authorization", catalog.gateway_authorization_header())
                    .header("content-type", "application/json")
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(StatusCode::CREATED, response.status(), "{method} {uri}");
    }

    let captured = captured.lock().unwrap();
    assert_eq!(5, captured.len());
    assert_eq!("GET", captured[0].method);
    assert_eq!("/v1/chat/completions?limit=20", captured[0].path_and_query);
    assert_eq!(
        Some("Bearer sk-standard-upstream".to_owned()),
        captured[0].authorization
    );
    assert_eq!(None, captured[0].client_api_key);
    assert_eq!("GET", captured[1].method);
    assert_eq!(
        "/v1/chat/completions/chatcmpl_123",
        captured[1].path_and_query
    );
    assert_eq!("POST", captured[2].method);
    assert!(captured[2].body.contains("tenant"));
    assert_eq!("DELETE", captured[3].method);
    assert_eq!("GET", captured[4].method);
    assert_eq!(
        "/v1/chat/completions/chatcmpl_123/messages",
        captured[4].path_and_query
    );
    drop(captured);
    assert_eq!(
        0,
        global_captured.lock().unwrap().len(),
        "stored chat completion passthrough methods must route through the API-key group account pool"
    );
}

#[tokio::test]
async fn gateway_database_router_rejects_openai_standard_passthrough_without_api_key() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let provider = Router::new()
        .route(
            "/v1/images/generations",
            any(capture_native_provider_request),
        )
        .with_state(Arc::clone(&captured));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move {
        axum::serve(listener, provider).await.unwrap();
    });
    let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
        .await
        .unwrap();
    let config =
        ProviderRelayConfig::from_parts(format!("http://{addr}"), "sk-openai-upstream").unwrap();
    let router = seeded_gateway_router_with_provider_relay_config(&catalog, Some(config))
        .await
        .unwrap();

    let response = router
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/images/generations")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"model":"gpt-image-1","prompt":"logo"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(StatusCode::UNAUTHORIZED, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("invalid_api_key", payload["error"]["code"]);
    assert_eq!(0, captured.lock().unwrap().len());
}

#[tokio::test]
async fn gateway_mounts_openai_standard_passthrough_boundaries_without_404() {
    let router = sdkwork_clawrouter_cloud_gateway::router();

    for (method, uri, expected_error_path, body) in [
        (
            "POST",
            "/v1/images/generations",
            "/v1/images/generations",
            r#"{"model":"gpt-image-1","prompt":"logo"}"#,
        ),
        (
            "POST",
            "/v1/completions",
            "/v1/completions",
            r#"{"model":"gpt-3.5-turbo-instruct","prompt":"hello"}"#,
        ),
        (
            "POST",
            "/v1/moderations",
            "/v1/moderations",
            r#"{"model":"omni-moderation-latest","input":"hello"}"#,
        ),
        (
            "POST",
            "/v1/images/edits",
            "/v1/images/edits",
            r#"{"model":"gpt-image-1","prompt":"edit"}"#,
        ),
        (
            "POST",
            "/v1/videos",
            "/v1/videos",
            r#"{"model":"sora-2","prompt":"product shot"}"#,
        ),
        (
            "POST",
            "/v1/videos/characters",
            "/v1/videos/characters",
            r#"{"name":"presenter"}"#,
        ),
        (
            "GET",
            "/v1/videos/characters/character_123",
            "/v1/videos/characters/character_123",
            "",
        ),
        (
            "POST",
            "/v1/videos/extensions",
            "/v1/videos/extensions",
            r#"{"video_id":"video_123","prompt":"extend"}"#,
        ),
        (
            "POST",
            "/v1/audio/speech",
            "/v1/audio/speech",
            r#"{"model":"gpt-4o-mini-tts","input":"hello","voice":"alloy"}"#,
        ),
        (
            "POST",
            "/v1/audio/voices",
            "/v1/audio/voices",
            r#"{"name":"narrator"}"#,
        ),
        (
            "GET",
            "/v1/audio/voice_consents",
            "/v1/audio/voice_consents",
            "",
        ),
        (
            "GET",
            "/v1/audio/voice_consents/consent_123",
            "/v1/audio/voice_consents/consent_123",
            "",
        ),
        (
            "POST",
            "/v1/audio/transcriptions",
            "/v1/audio/transcriptions",
            r#"{"model":"whisper-1"}"#,
        ),
        (
            "POST",
            "/v1/threads",
            "/v1/threads",
            r#"{"metadata":{"tenant":"demo"}}"#,
        ),
        (
            "POST",
            "/v1/threads/thread_123/runs",
            "/v1/threads/thread_123/runs",
            r#"{"assistant_id":"asst_123"}"#,
        ),
        (
            "POST",
            "/v1/threads/runs",
            "/v1/threads/runs",
            r#"{"assistant_id":"asst_123","thread":{"messages":[]}}"#,
        ),
        (
            "POST",
            "/v1/vector_stores",
            "/v1/vector_stores",
            r#"{"name":"docs"}"#,
        ),
        (
            "POST",
            "/v1/vector_stores/vs_123/search",
            "/v1/vector_stores/vs_123/search",
            r#"{"query":"router docs"}"#,
        ),
        (
            "POST",
            "/v1/batches",
            "/v1/batches",
            r#"{"input_file_id":"file_123","endpoint":"/v1/responses","completion_window":"24h"}"#,
        ),
        (
            "POST",
            "/v1/batches/batch_123/cancel",
            "/v1/batches/batch_123/cancel",
            "",
        ),
        (
            "POST",
            "/v1/vector_stores/vs_123/file_batches/batch_123/cancel",
            "/v1/vector_stores/vs_123/file_batches/batch_123/cancel",
            "",
        ),
        (
            "GET",
            "/v1/fine_tuning/jobs/ftjob_123/events",
            "/v1/fine_tuning/jobs/ftjob_123/events",
            "",
        ),
        ("GET", "/v1/conversations", "/v1/conversations", ""),
        (
            "POST",
            "/v1/containers",
            "/v1/containers",
            r#"{"name":"code sandbox"}"#,
        ),
        ("GET", "/v1/evals", "/v1/evals", ""),
        (
            "POST",
            "/v1/responses/input_tokens",
            "/v1/responses/input_tokens",
            r#"{"model":"gpt-5.4","input":"hello"}"#,
        ),
        (
            "POST",
            "/v1/fine_tuning/alpha/graders/run",
            "/v1/fine_tuning/alpha/graders/run",
            r#"{"grader":{"type":"string_check"},"item":{"input":"hello"}}"#,
        ),
        (
            "GET",
            "/v1/skills/skill_123/content",
            "/v1/skills/skill_123/content",
            "",
        ),
        (
            "GET",
            "/v1/organization/usage/completions?start_time=1700000000",
            "/v1/organization/usage/completions",
            "",
        ),
        (
            "POST",
            "/v1/organization/projects/proj_123/archive",
            "/v1/organization/projects/proj_123/archive",
            "",
        ),
        (
            "GET",
            "/v1/organization/admin_api_keys/key_123",
            "/v1/organization/admin_api_keys/key_123",
            "",
        ),
        (
            "DELETE",
            "/v1/projects/proj_123/users/user_123/roles/role_123",
            "/v1/projects/proj_123/users/user_123/roles/role_123",
            "",
        ),
        (
            "POST",
            "/v1/realtime/calls/call_123/hangup",
            "/v1/realtime/calls/call_123/hangup",
            r#"{"reason":"complete"}"#,
        ),
        (
            "POST",
            "/v1/realtime/calls",
            "/v1/realtime/calls",
            r#"{"model":"gpt-realtime","sdp":"offer"}"#,
        ),
        (
            "POST",
            "/v1/realtime/translations",
            "/v1/realtime/translations",
            r#"{"model":"gpt-realtime-translate","input_audio_format":"pcm16"}"#,
        ),
        (
            "POST",
            "/v1/realtime/sessions",
            "/v1/realtime/sessions",
            r#"{"model":"gpt-realtime"}"#,
        ),
    ] {
        let response = router
            .clone()
            .oneshot(
                Request::builder()
                    .method(method)
                    .uri(uri)
                    .header("content-type", "application/json")
                    .body(Body::from(body))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(StatusCode::NOT_IMPLEMENTED, response.status(), "{uri}");
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            "openai_passthrough_not_configured",
            payload["error"]["code"]
        );
        assert_eq!(expected_error_path, payload["error"]["path"]);
    }
}

#[tokio::test]
async fn openai_passthrough_group_route_catalog_template_fork_preserves_seeded_routes() {
    let catalog = fork_openai_passthrough_group_route_catalog(
        "http://127.0.0.1:41001",
        "http://127.0.0.1:41002",
    )
    .await;
    let pool = catalog.open_pool().await.unwrap();

    let standard_channel = sqlx::query(
        r#"
        SELECT credential_ref, base_url
        FROM ai_channel
        WHERE id = 3001
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "vault://providers/openrouter/channel/main",
        standard_channel.get::<String, _>("credential_ref")
    );
    assert_eq!(
        "http://127.0.0.1:41001",
        standard_channel.get::<String, _>("base_url")
    );

    let premium_channel = sqlx::query(
        r#"
        SELECT credential_ref, base_url
        FROM ai_channel
        WHERE id = 3002
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        "vault://providers/openrouter/account/premium",
        premium_channel.get::<String, _>("credential_ref")
    );
    assert_eq!(
        "http://127.0.0.1:41002",
        premium_channel.get::<String, _>("base_url")
    );
    let image_route_channel_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(DISTINCT cr.channel_id)
        FROM ai_channel_resource cr
        JOIN ai_resource_group_item rgi
          ON rgi.tenant_id = cr.tenant_id
         AND rgi.organization_id = cr.organization_id
         AND rgi.deleted_at IS NULL
         AND rgi.status = 1
         AND (
             (cr.resource_group_id IS NOT NULL AND rgi.resource_group_id = cr.resource_group_id)
             OR (NULLIF(cr.resource_group_code, '') IS NOT NULL AND rgi.resource_group_code = cr.resource_group_code)
         )
        JOIN ai_resource r
          ON r.tenant_id = rgi.tenant_id
         AND r.organization_id = rgi.organization_id
         AND r.deleted_at IS NULL
         AND r.status = 1
         AND (
             r.id = rgi.resource_id
             OR (NULLIF(rgi.resource_code, '') IS NOT NULL AND r.resource_code = rgi.resource_code)
         )
        WHERE cr.channel_id IN (3001, 3002)
          AND cr.status = 1
          AND cr.grant_type = 'allow'
          AND r.catalog_key = 'openai/gpt-image-1'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(2, image_route_channel_count);

    let pricing_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*)
        FROM ai_model_pricing
        WHERE id IN (9001, 9002, 9003)
          AND catalog_key = 'openai/gpt-image-1'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(3, pricing_count);

    let premium_key = sqlx::query(
        r#"
        SELECT channel_group_id, key_prefix, length(key_hash) AS key_hash_len
        FROM iam_gateway_api_key
        WHERE id = 101
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(11_i64, premium_key.get::<i64, _>("channel_group_id"));
    assert_eq!("sk-premium", premium_key.get::<String, _>("key_prefix"));
    assert_eq!(64_i64, premium_key.get::<i64, _>("key_hash_len"));

    pool.close().await;
}

#[tokio::test]
async fn openai_passthrough_group_route_catalog_uses_standard_resource_api_codes() {
    let catalog = fork_openai_passthrough_group_route_catalog(
        "http://127.0.0.1:41001",
        "http://127.0.0.1:41002",
    )
    .await;
    let pool = catalog.open_pool().await.unwrap();

    let legacy_resources = sqlx::query(
        r#"
        SELECT resource_code, api_code
        FROM ai_resource
        WHERE resource_code LIKE 'api.openai.management.%'
           OR api_code LIKE 'openai/management/%'
        ORDER BY resource_code
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap()
    .into_iter()
    .map(|row| {
        format!(
            "{}={}",
            row.get::<String, _>("resource_code"),
            row.get::<String, _>("api_code")
        )
    })
    .collect::<Vec<_>>();
    assert!(
        legacy_resources.is_empty(),
        "OpenAI resource authorization scopes must use standard api_code values, not route keys: {legacy_resources:?}"
    );

    let standard_bundle_api_codes = sqlx::query(
        r#"
        SELECT r.api_code
        FROM ai_resource_group_item item
        JOIN ai_resource r ON r.id = item.resource_id
        WHERE item.resource_group_code = ?
          AND r.resource_type = 'api_endpoint'
        "#,
    )
    .bind(OPENROUTER_STANDARD_RESOURCE_GROUP_CODE)
    .fetch_all(&pool)
    .await
    .unwrap()
    .into_iter()
    .map(|row| row.get::<String, _>("api_code"))
    .collect::<BTreeSet<_>>();

    for expected in [
        "openai.audio",
        "openai.files",
        "openai.responses",
        "openai.videos",
        "openai.vector_stores",
        "openai.administration",
    ] {
        assert!(
            standard_bundle_api_codes.contains(expected),
            "standard bundle must include API scope {expected}"
        );
    }

    pool.close().await;
}

async fn capture_native_provider_request(
    State(captured): State<Arc<Mutex<Vec<CapturedNativeProviderRequest>>>>,
    headers: HeaderMap,
    request: Request<Body>,
) -> (StatusCode, HeaderMap, &'static str) {
    let (parts, body) = request.into_parts();
    let body = axum::body::to_bytes(body, usize::MAX).await.unwrap();
    captured
        .lock()
        .unwrap()
        .push(CapturedNativeProviderRequest {
            method: parts.method.to_string(),
            path_and_query: parts
                .uri
                .path_and_query()
                .map(|value| value.as_str().to_owned())
                .unwrap_or_else(|| parts.uri.path().to_owned()),
            authorization: headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            google_api_key: headers
                .get("x-goog-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            anthropic_api_key: headers
                .get("x-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            anthropic_version: headers
                .get("anthropic-version")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            vidu_token: headers
                .get("token")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            content_type: headers
                .get("content-type")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            client_api_key: headers
                .get("x-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            body: String::from_utf8(body.to_vec()).unwrap(),
        });

    let mut headers = HeaderMap::new();
    headers.insert(
        "x-provider-request-id",
        "provider-request-id".parse().unwrap(),
    );
    (
        StatusCode::CREATED,
        headers,
        r#"{"id":"native-ok","object":"provider-response"}"#,
    )
}

async fn capture_retryable_native_provider_request(
    State(captured): State<Arc<Mutex<Vec<CapturedNativeProviderRequest>>>>,
    headers: HeaderMap,
    request: Request<Body>,
) -> (StatusCode, HeaderMap, &'static str) {
    let (parts, body) = request.into_parts();
    let body = axum::body::to_bytes(body, usize::MAX).await.unwrap();
    captured
        .lock()
        .unwrap()
        .push(CapturedNativeProviderRequest {
            method: parts.method.to_string(),
            path_and_query: parts
                .uri
                .path_and_query()
                .map(|value| value.as_str().to_owned())
                .unwrap_or_else(|| parts.uri.path().to_owned()),
            authorization: headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            google_api_key: headers
                .get("x-goog-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            anthropic_api_key: headers
                .get("x-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            anthropic_version: headers
                .get("anthropic-version")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            vidu_token: headers
                .get("token")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            content_type: headers
                .get("content-type")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            client_api_key: headers
                .get("x-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            body: String::from_utf8(body.to_vec()).unwrap(),
        });

    (
        StatusCode::SERVICE_UNAVAILABLE,
        HeaderMap::new(),
        r#"{"error":"try_fallback"}"#,
    )
}

async fn capture_provider_native_adapter_request(
    State(captured): State<Arc<Mutex<Vec<CapturedProviderNativeAdapterRequest>>>>,
    headers: HeaderMap,
    axum::Json(body): axum::Json<AdapterInvocationRequest>,
) -> (StatusCode, axum::Json<AdapterInvocationResponse>) {
    captured
        .lock()
        .unwrap()
        .push(CapturedProviderNativeAdapterRequest {
            authorization: headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            body,
        });
    (
        StatusCode::ACCEPTED,
        axum::Json(
            AdapterInvocationResponse::json_task(
                202,
                json!({"id": "adapter-task-1", "status": "queued"}),
            )
            .with_provider_task_id("provider-task-1"),
        ),
    )
}

async fn capture_openai_chat_completion_with_usage(
    State(captured): State<Arc<Mutex<Vec<CapturedNativeProviderRequest>>>>,
    headers: HeaderMap,
    request: Request<Body>,
) -> (StatusCode, axum::Json<serde_json::Value>) {
    let (parts, body) = request.into_parts();
    let body = axum::body::to_bytes(body, usize::MAX).await.unwrap();
    captured
        .lock()
        .unwrap()
        .push(CapturedNativeProviderRequest {
            method: parts.method.to_string(),
            path_and_query: parts
                .uri
                .path_and_query()
                .map(|value| value.as_str().to_owned())
                .unwrap_or_else(|| parts.uri.path().to_owned()),
            authorization: headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            google_api_key: headers
                .get("x-goog-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            anthropic_api_key: headers
                .get("x-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            anthropic_version: headers
                .get("anthropic-version")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            vidu_token: headers
                .get("token")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            content_type: headers
                .get("content-type")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            client_api_key: headers
                .get("x-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            body: String::from_utf8(body.to_vec()).unwrap(),
        });

    (
        StatusCode::OK,
        axum::Json(json!({
            "id": "chatcmpl-route-scoped",
            "object": "chat.completion",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "pong"},
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 7,
                "completion_tokens": 4,
                "total_tokens": 11,
                "prompt_tokens_details": {"cached_tokens": 2}
            }
        })),
    )
}

async fn capture_openai_completion_with_usage(
    State(captured): State<Arc<Mutex<Vec<CapturedNativeProviderRequest>>>>,
    headers: HeaderMap,
    request: Request<Body>,
) -> (StatusCode, axum::Json<serde_json::Value>) {
    let (parts, body) = request.into_parts();
    let body = axum::body::to_bytes(body, usize::MAX).await.unwrap();
    captured
        .lock()
        .unwrap()
        .push(CapturedNativeProviderRequest {
            method: parts.method.to_string(),
            path_and_query: parts
                .uri
                .path_and_query()
                .map(|value| value.as_str().to_owned())
                .unwrap_or_else(|| parts.uri.path().to_owned()),
            authorization: headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            google_api_key: headers
                .get("x-goog-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            anthropic_api_key: headers
                .get("x-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            anthropic_version: headers
                .get("anthropic-version")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            vidu_token: headers
                .get("token")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            content_type: headers
                .get("content-type")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            client_api_key: headers
                .get("x-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            body: String::from_utf8(body.to_vec()).unwrap(),
        });

    (
        StatusCode::OK,
        axum::Json(json!({
            "id": "cmpl-route-scoped",
            "object": "text_completion",
            "choices": [
                {
                    "index": 0,
                    "text": "pong",
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 7,
                "completion_tokens": 4,
                "total_tokens": 11
            }
        })),
    )
}

async fn capture_openai_image_generation_with_results(
    State(captured): State<Arc<Mutex<Vec<CapturedNativeProviderRequest>>>>,
    headers: HeaderMap,
    request: Request<Body>,
) -> (StatusCode, axum::Json<serde_json::Value>) {
    let (parts, body) = request.into_parts();
    let body = axum::body::to_bytes(body, usize::MAX).await.unwrap();
    captured
        .lock()
        .unwrap()
        .push(CapturedNativeProviderRequest {
            method: parts.method.to_string(),
            path_and_query: parts
                .uri
                .path_and_query()
                .map(|value| value.as_str().to_owned())
                .unwrap_or_else(|| parts.uri.path().to_owned()),
            authorization: headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            google_api_key: headers
                .get("x-goog-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            anthropic_api_key: headers
                .get("x-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            anthropic_version: headers
                .get("anthropic-version")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            vidu_token: headers
                .get("token")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            content_type: headers
                .get("content-type")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            client_api_key: headers
                .get("x-api-key")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            body: String::from_utf8(body.to_vec()).unwrap(),
        });

    (
        StatusCode::OK,
        axum::Json(json!({
            "created": 1780000000,
            "data": [
                {"url": "https://cdn.example/image-1.png"},
                {"url": "https://cdn.example/image-2.png"}
            ]
        })),
    )
}

async fn capture_provider_native_adapter_request_with_video_usage(
    State(captured): State<Arc<Mutex<Vec<CapturedProviderNativeAdapterRequest>>>>,
    headers: HeaderMap,
    axum::Json(body): axum::Json<AdapterInvocationRequest>,
) -> (StatusCode, axum::Json<AdapterInvocationResponse>) {
    captured
        .lock()
        .unwrap()
        .push(CapturedProviderNativeAdapterRequest {
            authorization: headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .map(str::to_owned),
            body,
        });
    (
        StatusCode::ACCEPTED,
        axum::Json(
            AdapterInvocationResponse::json_task(
                202,
                json!({"id": "adapter-task-usage-1", "status": "queued"}),
            )
            .with_provider_task_id("provider-task-usage-1")
            .with_usage_line(
                AdapterUsageLine::new("api_request", "1")
                    .with_request_count(1)
                    .with_provider_native_model("vidu2.0")
                    .with_requested_model_catalog_key("tencent-cloud/vidu2.0"),
            )
            .with_usage_line(
                AdapterUsageLine::new("video_output_second", "8")
                    .with_video_seconds("8")
                    .with_provider_native_model("vidu2.0")
                    .with_requested_model_catalog_key("tencent-cloud/vidu2.0"),
            ),
        ),
    )
}

async fn openai_passthrough_group_route_template() -> &'static SeededSqliteCatalog {
    OPENAI_PASSTHROUGH_GROUP_ROUTE_TEMPLATE
        .get_or_init(|| async {
            let catalog = sdkwork_claw_test_support::seeded_sqlite_catalog()
                .await
                .unwrap();
            seed_openai_passthrough_group_channel_routes(
                &catalog,
                STANDARD_GROUP_TEMPLATE_BASE_URL,
                PREMIUM_GROUP_TEMPLATE_BASE_URL,
                PREMIUM_GROUP_API_KEY_SECRET,
            )
            .await;
            ensure_ai_provider_object_route_table(&catalog).await;
            catalog
        })
        .await
}

async fn fork_openai_passthrough_group_route_catalog(
    standard_base_url: &str,
    premium_base_url: &str,
) -> SeededSqliteCatalog {
    let catalog = openai_passthrough_group_route_template()
        .await
        .fork()
        .unwrap();
    let pool = catalog.open_pool().await.unwrap();
    set_channel_and_credential_base_url(&pool, 3001, standard_base_url).await;
    set_channel_and_credential_base_url(&pool, 3002, premium_base_url).await;
    pool.close().await;
    catalog
}

async fn ensure_ai_provider_object_route_table(catalog: &SeededSqliteCatalog) {
    let pool = catalog.open_pool().await.unwrap();
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS ai_provider_object_route (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 0,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            api_key_id INTEGER,
            channel_group_id INTEGER,
            object_type TEXT NOT NULL,
            object_id TEXT NOT NULL,
            object_key_hash TEXT NOT NULL,
            parent_object_type TEXT,
            parent_object_id TEXT,
            provider_code TEXT,
            channel_id INTEGER NOT NULL,
            vendor_code TEXT,
            api_code TEXT,
            catalog_key TEXT,
            provider_model TEXT,
            region_code TEXT,
            sticky_scope TEXT,
            expires_at TEXT,
            last_seen_at TEXT
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        CREATE UNIQUE INDEX IF NOT EXISTS uk_ai_provider_object_route_object
            ON ai_provider_object_route (tenant_id, organization_id, object_type, object_id)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_ai_provider_object_route_fast
            ON ai_provider_object_route (tenant_id, organization_id, object_key_hash, status, id)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;
}

async fn insert_resource(pool: &sqlx::SqlitePool, seed: &ResourceSeed<'_>) {
    sqlx::query(
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, resource_code, resource_type,
             display_name, vendor_code, modality_code, api_code, catalog_key, model,
             provider_native_model, status, sort_order)
        VALUES
            (?, ?, 100001, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        "#,
    )
    .bind(seed.id)
    .bind(format!("resource-{}", seed.code.replace(['.', '/'], "-")))
    .bind(seed.code)
    .bind(seed.resource_type)
    .bind(seed.display_name)
    .bind(seed.vendor_code)
    .bind(seed.modality_code)
    .bind(seed.api_code)
    .bind(seed.catalog_key)
    .bind(seed.model)
    .bind(seed.provider_native_model)
    .bind(seed.sort_order)
    .execute(pool)
    .await
    .unwrap();
}

async fn add_resource_to_openrouter_standard_bundle(
    pool: &sqlx::SqlitePool,
    item_id: i64,
    resource_id: i64,
    resource_code: &str,
    sort_order: i64,
) {
    sqlx::query(
        r#"
        INSERT INTO ai_resource_group_item
            (id, uuid, tenant_id, organization_id, resource_group_id, resource_group_code,
             item_type, resource_id, resource_code, item_role, status, sort_order)
        VALUES
            (?, ?, 100001, 0, ?, ?, 'resource', ?, ?, 'include', 1, ?)
        "#,
    )
    .bind(item_id)
    .bind(format!(
        "resource-member-openrouter-{}",
        resource_code.replace(['.', '/'], "-")
    ))
    .bind(OPENROUTER_STANDARD_RESOURCE_GROUP_ID)
    .bind(OPENROUTER_STANDARD_RESOURCE_GROUP_CODE)
    .bind(resource_id)
    .bind(resource_code)
    .bind(sort_order)
    .execute(pool)
    .await
    .unwrap();
}

async fn grant_openrouter_standard_bundle_to_channel(
    pool: &sqlx::SqlitePool,
    grant_id: i64,
    channel_id: i64,
    channel_code: &str,
    priority: i64,
    weight: i64,
) {
    sqlx::query(
        r#"
        INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code,
             resource_group_id, resource_group_code, grant_type, priority, weight, status)
        VALUES
            (?, ?, 100001, 0, ?, 'openrouter', ?, ?, ?, 'allow', ?, ?, 1)
        "#,
    )
    .bind(grant_id)
    .bind(format!("channel-resource-openrouter-{channel_code}"))
    .bind(channel_id)
    .bind(channel_code)
    .bind(OPENROUTER_STANDARD_RESOURCE_GROUP_ID)
    .bind(OPENROUTER_STANDARD_RESOURCE_GROUP_CODE)
    .bind(priority)
    .bind(weight)
    .execute(pool)
    .await
    .unwrap();
}

async fn grant_openrouter_standard_bundle_to_group(
    pool: &sqlx::SqlitePool,
    grant_id: i64,
    channel_group_id: i64,
    priority: i64,
) {
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_resource
            (id, uuid, tenant_id, organization_id, channel_group_id,
             resource_group_id, resource_group_code, grant_type, priority, status)
        VALUES
            (?, ?, 100001, 0, ?, ?, ?, 'allow', ?, 1)
        "#,
    )
    .bind(grant_id)
    .bind(format!(
        "channel-group-resource-openrouter-{channel_group_id}"
    ))
    .bind(channel_group_id)
    .bind(OPENROUTER_STANDARD_RESOURCE_GROUP_ID)
    .bind(OPENROUTER_STANDARD_RESOURCE_GROUP_CODE)
    .bind(priority)
    .execute(pool)
    .await
    .unwrap();
}

struct ChannelScopedModelMappingSeed<'a> {
    rule_id: i64,
    channel_id: i64,
    channel_code: &'a str,
    source_model: &'a str,
    source_catalog_key: &'a str,
    target_model: &'a str,
    target_catalog_key: &'a str,
    target_provider_model: &'a str,
    target_provider_native_model: &'a str,
    sort_order: i64,
}

async fn insert_channel_scoped_model_mapping(
    pool: &sqlx::SqlitePool,
    seed: &ChannelScopedModelMappingSeed<'_>,
) {
    sqlx::query(
        r#"
        INSERT INTO ai_model_mapping_rule
            (id, uuid, tenant_id, organization_id, source_vendor_code, target_vendor_code,
             mapping_mode, match_type, enabled, status)
        VALUES
            (?, ?, 100001, 0, 'openai', 'openai', 'alias', 'exact', 1, 1)
        "#,
    )
    .bind(seed.rule_id)
    .bind(format!("model-mapping-rule-channel-{}", seed.rule_id))
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_mapping_rule_binding
            (id, uuid, tenant_id, organization_id, rule_id, binding_type, binding_id,
             binding_code, binding_name_snapshot, sort_order, enabled, status)
        VALUES
            (?, ?, 100001, 0, ?, 'channel', ?, ?, ?, ?, 1, 1)
        "#,
    )
    .bind(seed.rule_id)
    .bind(format!(
        "model-mapping-rule-binding-channel-{}",
        seed.rule_id
    ))
    .bind(seed.rule_id)
    .bind(seed.channel_id)
    .bind(seed.channel_code)
    .bind(seed.channel_code)
    .bind(seed.sort_order)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_mapping_rule_item
            (id, uuid, tenant_id, organization_id, rule_id, source_model,
             source_catalog_key, target_model, target_catalog_key, target_provider_model,
             target_provider_native_model, sort_order, enabled, status)
        VALUES
            (?, ?, 100001, 0, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
        "#,
    )
    .bind(seed.rule_id)
    .bind(format!("model-mapping-rule-item-channel-{}", seed.rule_id))
    .bind(seed.rule_id)
    .bind(seed.source_model)
    .bind(seed.source_catalog_key)
    .bind(seed.target_model)
    .bind(seed.target_catalog_key)
    .bind(seed.target_provider_model)
    .bind(seed.target_provider_native_model)
    .bind(seed.sort_order)
    .execute(pool)
    .await
    .unwrap();
}

async fn grant_provider_native_api_resource(
    pool: &sqlx::SqlitePool,
    id: i64,
    channel_id: i64,
    provider_code: &str,
    vendor_code: &str,
    api_code: &str,
) {
    let resource_code = format!("api.{api_code}");
    let uuid_suffix = resource_code.replace(['.', '/'], "-");
    sqlx::query(
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, resource_code, resource_type,
             display_name, vendor_code, modality_code, api_code, status, sort_order)
        VALUES
            (?, ?, 100001, 0, ?, 'api_endpoint', ?, ?, 'video', ?, 1, ?)
        "#,
    )
    .bind(id)
    .bind(format!("resource-{uuid_suffix}"))
    .bind(&resource_code)
    .bind(api_code)
    .bind(vendor_code)
    .bind(api_code)
    .bind(id)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code,
             resource_id, resource_code, grant_type, priority, weight, status)
        VALUES
            (?, ?, 100001, 0, ?, ?, ?, ?, ?, 'allow', 1, 100, 1)
        "#,
    )
    .bind(id)
    .bind(format!("channel-resource-{provider_code}-{uuid_suffix}"))
    .bind(channel_id)
    .bind(provider_code)
    .bind(format!("{provider_code}-main"))
    .bind(id)
    .bind(&resource_code)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_resource
            (id, uuid, tenant_id, organization_id, channel_group_id,
             resource_id, resource_code, grant_type, priority, status)
        VALUES
            (?, ?, 100001, 0, 10, ?, ?, 'allow', 1, 1)
        "#,
    )
    .bind(id)
    .bind(format!(
        "channel-group-resource-{provider_code}-{uuid_suffix}"
    ))
    .bind(id)
    .bind(&resource_code)
    .execute(pool)
    .await
    .unwrap();
}

async fn grant_provider_native_api_resource_with_modality(
    pool: &sqlx::SqlitePool,
    id: i64,
    channel_id: i64,
    provider_code: &str,
    vendor_code: &str,
    api_code: &str,
    modality_code: &str,
) {
    let resource_code = format!("api.{api_code}");
    let uuid_suffix = resource_code.replace(['.', '/'], "-");
    sqlx::query(
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, resource_code, resource_type,
             display_name, vendor_code, modality_code, api_code, status, sort_order)
        VALUES
            (?, ?, 100001, 0, ?, 'api_endpoint', ?, ?, ?, ?, 1, ?)
        "#,
    )
    .bind(id)
    .bind(format!("resource-{uuid_suffix}"))
    .bind(&resource_code)
    .bind(api_code)
    .bind(vendor_code)
    .bind(modality_code)
    .bind(api_code)
    .bind(id)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code,
             resource_id, resource_code, grant_type, priority, weight, status)
        VALUES
            (?, ?, 100001, 0, ?, ?, ?, ?, ?, 'allow', 1, 100, 1)
        "#,
    )
    .bind(id)
    .bind(format!("channel-resource-{provider_code}-{uuid_suffix}"))
    .bind(channel_id)
    .bind(provider_code)
    .bind(format!("{provider_code}-main"))
    .bind(id)
    .bind(&resource_code)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_resource
            (id, uuid, tenant_id, organization_id, channel_group_id,
             resource_id, resource_code, grant_type, priority, status)
        VALUES
            (?, ?, 100001, 0, 10, ?, ?, 'allow', 1, 1)
        "#,
    )
    .bind(id)
    .bind(format!(
        "channel-group-resource-{provider_code}-{uuid_suffix}"
    ))
    .bind(id)
    .bind(&resource_code)
    .execute(pool)
    .await
    .unwrap();
}

async fn grant_provider_native_model_api_resource(
    pool: &sqlx::SqlitePool,
    id: i64,
    channel_id: i64,
    provider_code: &str,
    channel_code: &str,
    vendor_code: &str,
    api_code: &str,
    modality_code: &str,
    catalog_key: &str,
    model: &str,
    provider_native_model: &str,
) {
    let resource_code = format!("model.{}.{}", catalog_key.replace('/', "."), api_code);
    let uuid_suffix = resource_code.replace(['.', '/'], "-");
    sqlx::query(
        r#"
        INSERT INTO ai_resource
            (id, uuid, tenant_id, organization_id, resource_code, resource_type,
             display_name, vendor_code, modality_code, api_code, catalog_key, model,
             provider_native_model, status, sort_order)
        VALUES
            (?, ?, 100001, 0, ?, 'model_api', ?, ?, ?, ?, ?, ?, ?, 1, ?)
        "#,
    )
    .bind(id)
    .bind(format!("resource-{uuid_suffix}"))
    .bind(&resource_code)
    .bind(model)
    .bind(vendor_code)
    .bind(modality_code)
    .bind(api_code)
    .bind(catalog_key)
    .bind(model)
    .bind(provider_native_model)
    .bind(id)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code,
             resource_id, resource_code, grant_type, priority, weight, status)
        VALUES
            (?, ?, 100001, 0, ?, ?, ?, ?, ?, 'allow', 1, 100, 1)
        "#,
    )
    .bind(id)
    .bind(format!("channel-resource-{provider_code}-{uuid_suffix}"))
    .bind(channel_id)
    .bind(provider_code)
    .bind(channel_code)
    .bind(id)
    .bind(&resource_code)
    .execute(pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_resource
            (id, uuid, tenant_id, organization_id, channel_group_id,
             resource_id, resource_code, grant_type, priority, status)
        VALUES
            (?, ?, 100001, 0, 10, ?, ?, 'allow', 1, 1)
        "#,
    )
    .bind(id)
    .bind(format!(
        "channel-group-resource-{provider_code}-{uuid_suffix}"
    ))
    .bind(id)
    .bind(&resource_code)
    .execute(pool)
    .await
    .unwrap();
}

async fn seed_vidu_start_end2video_channel_route(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
    base_url: &str,
) {
    seed_start_end2video_channel_route(
        catalog,
        9301,
        "vidu-official",
        "vidu",
        "vidu-official",
        "vault://providers/vidu/account/main",
        "header",
        r#"{"name":"token"}"#,
        base_url,
    )
    .await;
}

async fn seed_tencent_cloud_vidu_start_end2video_channel_route(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
    base_url: &str,
) {
    seed_start_end2video_channel_route(
        catalog,
        9301,
        "tencent-cloud",
        "tencent",
        "tencent-cloud",
        "vault://providers/tencent-cloud/account/main",
        "bearer",
        "{}",
        base_url,
    )
    .await;
}

async fn seed_gemini_generate_content_channel_route(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
    base_url: &str,
) {
    let pool = catalog.open_pool().await.unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_provider
            (id, provider_code, default_vendor_code, provider_type, protocol_code, base_url, status)
        VALUES
            (9601, 'google', 'google', 'official', 'vendor_native', ?, 1)
        "#,
    )
    .bind(base_url)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel
            (id, tenant_id, organization_id, provider_id, provider_code, channel_code,
             channel_name, channel_type, protocol_code, auth_type, auth_config,
             credential_ref, base_url, status, priority, weight, health_status)
        VALUES
            (9601, 100001, 0, 9601, 'google', 'google-main', 'Google Main',
             'official', 'vendor_native', 'header', '{"name":"x-goog-api-key"}',
             'vault://providers/google/account/main', ?, 1, 10, 100, 1)
        "#,
    )
    .bind(base_url)
    .execute(&pool)
    .await
    .unwrap();
    insert_channel_credential(
        &pool,
        960101,
        9601,
        "google",
        "google-main",
        "vault://providers/google/account/main",
        base_url,
        r#"{"name":"x-goog-api-key"}"#,
    )
    .await;
    sqlx::query(
        r#"
        INSERT INTO ai_routing_profile
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at,
             updated_at, version, metadata, policy_id, profile_version, profile_name,
             release_status, traffic_percent, config_hash)
        VALUES
            (9601, 'routing-profile-gemini-chat', 100001, 0, 1, 1,
             '2026-05-10 00:00:00', '2026-05-10 00:00:00', 0, '{}',
             9601, 1, 'Gemini Chat Profile', 2, '100.000000',
             'gemini-chat-profile-hash')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_routing_policy
            (id, tenant_id, organization_id, policy_code, policy_scope, subject_id,
             capability, default_profile_id, fallback_mode, status)
        VALUES
            (9601, 100001, 0, 'gemini-chat-group-policy', 5, 10, 1, 9601, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_routing_rule
            (id, tenant_id, organization_id, profile_id, rule_code, priority,
             match_expression, target_model, candidate_channels, fallback_chain,
             constraints, status)
        VALUES
            (9601, 100001, 0, 9601, 'gemini-generate-content', 1,
             '{"routeKey":"gemini.generate_content"}',
             'gemini.generate_content', '[{"channel_id":9601,"weight":100}]',
             '[]', '{}', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_member
            (id, tenant_id, organization_id, channel_group_id, channel_id, priority, weight,
             enabled, status)
        VALUES
            (9601, 100001, 0, 10, 9601, 1, 100, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    grant_provider_native_api_resource_with_modality(
        &pool,
        19601,
        9601,
        "google",
        "google",
        "gemini.generate_content",
        "llm",
    )
    .await;
    pool.close().await;
}

async fn seed_gemini_generate_content_billing_catalog(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
) {
    let pool = catalog.open_pool().await.unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_vendor
            (id, uuid, tenant_id, organization_id, vendor_code, display_name, status, sort_order)
        VALUES
            (9601, 'vendor-google-gemini', 100001, 0, 'google', 'Google Gemini', 1, 9601)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_family
            (id, uuid, tenant_id, organization_id, vendor_id, vendor_code, family_code,
             display_name, status, sort_order)
        VALUES
            (9601, 'family-google-gemini', 100001, 0, 9601, 'google',
             'gemini', 'Gemini', 1, 9601)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name,
             vendor_id, vendor_code, vendor_name_snapshot, family_id, family_code,
             capability, capabilities, modalities, input_modalities, output_modalities,
             supports_streaming, supports_tools, supports_json_schema, api_format,
             shelf_state, routing_state, status, rank_score)
        VALUES
            (9601, 'model-google-gemini-2-5-flash', 100001, 0,
             'google/gemini-2.5-flash', 'gemini-2.5-flash', 'Gemini 2.5 Flash',
             9601, 'google', 'Google Gemini', 9601, 'gemini', 1,
             '["llm","chat"]', '["text"]', '["text"]', '["text"]',
             0, 0, 0, 'provider-native', 1, 1, 1, '70.0')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_capability
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, capability, capability_code, modality, input_modalities,
             output_modalities, supported, status, sort_order)
        VALUES
            (9601, 'cap-google-gemini-2-5-flash-chat', 100001, 0, 9601,
             'google/gemini-2.5-flash', 'gemini-2.5-flash', 'google',
             1, 'chat', 1, '["text"]', '["text"]', 1, 1, 9601)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    grant_provider_native_model_api_resource(
        &pool,
        29601,
        9601,
        "google",
        "google-main",
        "google",
        "gemini.generate_content",
        "llm",
        "google/gemini-2.5-flash",
        "gemini-2.5-flash",
        "gemini-2.5-flash",
    )
    .await;
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, status, priority)
        VALUES
            (9601, 'price-google-gemini-api-request-reference', 100001, 0, 9601,
             'google/gemini-2.5-flash', 'gemini-2.5-flash', 'google',
             'global', 1, 'api_request', '0.005000', 'USD', 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, provider_code, channel_id, status, priority)
        VALUES
            (9602, 'price-google-gemini-api-request-upstream', 100001, 0, 9601,
             'google/gemini-2.5-flash', 'gemini-2.5-flash', 'google',
             'global', 2, 'api_request', '0.003000', 'USD',
             'google', 9601, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;
}

async fn seed_kling_text_to_video_channel_route(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
    base_url: &str,
) {
    let pool = catalog.open_pool().await.unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_provider
            (id, provider_code, default_vendor_code, provider_type, protocol_code, base_url, status)
        VALUES
            (9501, 'kling', 'kling', 'official', 'vendor_native', ?, 1)
        "#,
    )
    .bind(base_url)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel
            (id, tenant_id, organization_id, provider_id, provider_code, channel_code,
             channel_name, channel_type, protocol_code, auth_type, auth_config,
             credential_ref, base_url, status, priority, weight, health_status)
        VALUES
            (9501, 100001, 0, 9501, 'kling', 'kling-main', 'Kling Main',
             'official', 'vendor_native', 'bearer', '{}',
             'vault://providers/kling/account/main', ?, 1, 10, 100, 1)
        "#,
    )
    .bind(base_url)
    .execute(&pool)
    .await
    .unwrap();
    insert_channel_credential(
        &pool,
        950101,
        9501,
        "kling",
        "kling-main",
        "vault://providers/kling/account/main",
        base_url,
        "{}",
    )
    .await;
    sqlx::query(
        r#"
        INSERT INTO ai_routing_profile
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at,
             updated_at, version, metadata, policy_id, profile_version, profile_name,
             release_status, traffic_percent, config_hash)
        VALUES
            (9501, 'routing-profile-kling-video', 100001, 0, 1, 1,
             '2026-05-10 00:00:00', '2026-05-10 00:00:00', 0, '{}',
             9501, 1, 'Kling Video Profile', 2, '100.000000',
             'kling-video-profile-hash')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_routing_policy
            (id, tenant_id, organization_id, policy_code, policy_scope, subject_id,
             capability, default_profile_id, fallback_mode, status)
        VALUES
            (9501, 100001, 0, 'kling-video-group-policy', 5, 10, 5, 9501, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_routing_rule
            (id, tenant_id, organization_id, profile_id, rule_code, priority,
             match_expression, target_model, candidate_channels, fallback_chain,
             constraints, status)
        VALUES
            (9501, 100001, 0, 9501, 'kling-text-to-video', 1,
             '{"routeKey":"kling.text_to_video"}',
             'kling.text_to_video', '[{"channel_id":9501,"weight":100}]',
             '[]', '{}', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_member
            (id, tenant_id, organization_id, channel_group_id, channel_id, priority, weight,
             enabled, status)
        VALUES
            (9501, 100001, 0, 10, 9501, 1, 100, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    grant_provider_native_api_resource(&pool, 19501, 9501, "kling", "kling", "kling.text_to_video")
        .await;
    sqlx::query(
        r#"
        INSERT INTO ai_model_vendor
            (id, uuid, tenant_id, organization_id, vendor_code, display_name, status, sort_order)
        VALUES
            (9502, 'vendor-kling', 100001, 0, 'kling', 'Kling', 1, 9502)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_family
            (id, uuid, tenant_id, organization_id, vendor_id, vendor_code, family_code,
             display_name, status, sort_order)
        VALUES
            (9502, 'family-kling-video', 100001, 0, 9502, 'kling', 'video', 'Kling Video', 1, 9502)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name,
             vendor_id, vendor_code, vendor_name_snapshot, family_id, family_code,
             capability, capabilities, modalities, input_modalities, output_modalities,
             supports_streaming, supports_tools, supports_json_schema, api_format,
             shelf_state, routing_state, status, rank_score)
        VALUES
            (9502, 'model-kling-text-to-video', 100001, 0,
             'kling/kling-v2', 'kling-v2', 'Kling V2 Text To Video',
             9502, 'kling', 'Kling', 9502, 'video', 5,
             '["video"]', '["video"]', '["text","image"]', '["video"]',
             0, 0, 0, 'provider-native', 1, 1, 1, '70.0')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, status, priority)
        VALUES
            (9502, 'price-kling-kling-v2-api-request-reference', 100001, 0, 9502,
             'kling/kling-v2', 'kling-v2', 'kling',
             'global', 1, 'api_request', '0.020000', 'USD', 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, provider_code, channel_id, status, priority)
        VALUES
            (9503, 'price-kling-kling-v2-api-request-upstream', 100001, 0, 9502,
             'kling/kling-v2', 'kling-v2', 'kling',
             'global', 2, 'api_request', '0.010000', 'USD', 'kling', 9501, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;
}

async fn seed_start_end2video_channel_route(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
    id: i64,
    provider_code: &str,
    upstream_vendor_code: &str,
    upstream_provider_code: &str,
    secret_ref: &str,
    auth_type: &str,
    auth_config: &str,
    base_url: &str,
) {
    let pool = catalog.open_pool().await.unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_provider
            (id, provider_code, default_vendor_code, provider_type, protocol_code, base_url, status)
        VALUES
            (?, ?, ?, 'relay_aggregator', ?, ?, 1)
        "#,
    )
    .bind(id)
    .bind(provider_code)
    .bind(upstream_vendor_code)
    .bind(upstream_provider_code)
    .bind(base_url)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel
            (id, tenant_id, organization_id, provider_id, provider_code, channel_code,
             channel_name, channel_type, protocol_code, auth_type, auth_config,
             credential_ref, base_url, status, priority, weight, health_status)
        VALUES
            (?, 100001, 0, ?, ?, ?, ?, 'relay', ?, ?, ?, ?, ?, 1, 10, 100, 1)
        "#,
    )
    .bind(id)
    .bind(id)
    .bind(provider_code)
    .bind(format!("{provider_code}-main"))
    .bind(format!("{provider_code} Main"))
    .bind(upstream_provider_code)
    .bind(auth_type)
    .bind(auth_config)
    .bind(secret_ref)
    .bind(base_url)
    .execute(&pool)
    .await
    .unwrap();
    insert_channel_credential(
        &pool,
        id * 100 + 1,
        id,
        provider_code,
        &format!("{provider_code}-main"),
        secret_ref,
        base_url,
        auth_config,
    )
    .await;
    sqlx::query(
        r#"
        INSERT INTO ai_routing_profile
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at,
             updated_at, version, metadata, policy_id, profile_version, profile_name,
             release_status, traffic_percent, config_hash)
        VALUES
            (9301, 'routing-profile-vidu-video', 100001, 0, 1, 1,
             '2026-05-10 00:00:00', '2026-05-10 00:00:00', 0, '{}',
             9301, 1, 'Vidu Video Profile', 2, '100.000000',
             'vidu-video-profile-hash')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_routing_policy
            (id, tenant_id, organization_id, policy_code, policy_scope, subject_id,
             capability, default_profile_id, fallback_mode, status)
        VALUES
            (9301, 100001, 0, 'vidu-video-group-policy', 5, 10, 5, 9301, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_routing_rule
            (id, tenant_id, organization_id, profile_id, rule_code, priority,
             match_expression, target_model, candidate_channels, fallback_chain,
             constraints, status)
        VALUES
            (9301, 100001, 0, 9301, 'vidu-start-end2video', 1,
             '{"routeKey":"vidu.start_end_to_video"}',
             'vidu.start_end_to_video', '[{"channel_id":9301,"weight":100}]',
             '[]', '{}', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_member
            (id, tenant_id, organization_id, channel_group_id, channel_id, priority, weight,
             enabled, status)
        VALUES
            (?, 100001, 0, 10, ?, 1, 100, 1, 1)
        "#,
    )
    .bind(id)
    .bind(id)
    .execute(&pool)
    .await
    .unwrap();
    grant_provider_native_api_resource(
        &pool,
        id + 10000,
        id,
        provider_code,
        upstream_vendor_code,
        "vidu.start_end_to_video",
    )
    .await;
    pool.close().await;
}

async fn seed_tencent_cloud_vidu_billing_catalog(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
) {
    let pool = catalog.open_pool().await.unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_vendor
            (id, uuid, tenant_id, organization_id, vendor_code, display_name, status, sort_order)
        VALUES
            (9401, 'vendor-tencent-cloud', 100001, 0, 'tencent-cloud', 'Tencent Cloud', 1, 9401)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_family
            (id, uuid, tenant_id, organization_id, vendor_id, vendor_code, family_code,
             display_name, status, sort_order)
        VALUES
            (9401, 'family-tencent-cloud-vidu', 100001, 0, 9401,
             'tencent-cloud', 'vidu', 'Vidu', 1, 9401)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name,
             vendor_id, vendor_code, vendor_name_snapshot, family_id, family_code,
             capability, capabilities, modalities, input_modalities, output_modalities,
             supports_streaming, supports_tools, supports_json_schema, api_format,
             shelf_state, routing_state, status, rank_score)
        VALUES
            (9401, 'model-tencent-cloud-vidu2', 100001, 0,
             'tencent-cloud/vidu2.0', 'vidu2.0', 'Vidu 2.0',
             9401, 'tencent-cloud', 'Tencent Cloud', 9401, 'vidu', 5,
             '["video"]', '["video"]', '["image","text"]', '["video"]',
             0, 0, 0, 'provider-native', 1, 1, 1, '70.0')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_capability
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, capability, capability_code, modality, input_modalities,
             output_modalities, supported, status, sort_order)
        VALUES
            (9401, 'cap-tencent-cloud-global-vidu2-video', 100001, 0, 9401,
             'tencent-cloud/vidu2.0', 'vidu2.0', 'tencent-cloud',
             5, 'video', 5, '["image","text"]', '["video"]', 1, 1, 9401)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    grant_provider_native_model_api_resource(
        &pool,
        19401,
        9301,
        "tencent-cloud",
        "tencent-cloud-main",
        "tencent-cloud",
        "vidu.start_end_to_video",
        "video",
        "tencent-cloud/vidu2.0",
        "vidu2.0",
        "vidu2.0",
    )
    .await;
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, status, priority)
        VALUES
            (9401, 'price-tencent-cloud-vidu-api-request-reference', 100001, 0, 9401,
             'tencent-cloud/vidu2.0', 'vidu2.0', 'tencent-cloud',
             'global', 1, 'api_request', '0.020000', 'USD', 1, 1),
            (9402, 'price-tencent-cloud-vidu-video-second-reference', 100001, 0, 9401,
             'tencent-cloud/vidu2.0', 'vidu2.0', 'tencent-cloud',
             'global', 1, 'video_output_second', '0.100000', 'USD', 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, provider_code, channel_id, status, priority)
        VALUES
            (9403, 'price-tencent-cloud-vidu-api-request-upstream', 100001, 0, 9401,
             'tencent-cloud/vidu2.0', 'vidu2.0', 'tencent-cloud',
             'global', 2, 'api_request', '0.010000', 'USD', 'tencent-cloud',
             9301, 1, 1),
            (9404, 'price-tencent-cloud-vidu-video-second-upstream', 100001, 0, 9401,
             'tencent-cloud/vidu2.0', 'vidu2.0', 'tencent-cloud',
             'global', 2, 'video_output_second', '0.060000', 'USD',
             'tencent-cloud', 9301, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;
}

async fn seed_vidu_official_billing_catalog(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
) {
    seed_vidu_billing_catalog_for_provider(catalog, 9701, "vidu-official", "Vidu Official").await;
}

async fn seed_vidu_billing_catalog_for_provider(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
    seed_id: i64,
    provider_code: &str,
    display_name: &str,
) {
    let pool = catalog.open_pool().await.unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_vendor
            (id, uuid, tenant_id, organization_id, vendor_code, display_name, status, sort_order)
        VALUES
            (?, ?, 100001, 0, ?, ?, 1, ?)
        "#,
    )
    .bind(seed_id)
    .bind(format!("vendor-{provider_code}"))
    .bind(provider_code)
    .bind(display_name)
    .bind(seed_id)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_family
            (id, uuid, tenant_id, organization_id, vendor_id, vendor_code, family_code,
             display_name, status, sort_order)
        VALUES
            (?, ?, 100001, 0, ?, ?, 'vidu', 'Vidu', 1, ?)
        "#,
    )
    .bind(seed_id)
    .bind(format!("family-{provider_code}-vidu"))
    .bind(seed_id)
    .bind(provider_code)
    .bind(seed_id)
    .execute(&pool)
    .await
    .unwrap();
    let catalog_key = format!("{provider_code}/vidu2.0");
    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name,
             vendor_id, vendor_code, vendor_name_snapshot, family_id, family_code,
             capability, capabilities, modalities, input_modalities, output_modalities,
             supports_streaming, supports_tools, supports_json_schema, api_format,
             shelf_state, routing_state, status, rank_score)
        VALUES
            (?, ?, 100001, 0, ?, 'vidu2.0', 'Vidu 2.0',
             ?, ?, ?, ?, 'vidu', 5,
             '["video"]', '["video"]', '["image","text"]', '["video"]',
             0, 0, 0, 'provider-native', 1, 1, 1, '70.0')
        "#,
    )
    .bind(seed_id)
    .bind(format!("model-{provider_code}-vidu2"))
    .bind(&catalog_key)
    .bind(seed_id)
    .bind(provider_code)
    .bind(display_name)
    .bind(seed_id)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_capability
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, capability, capability_code, modality, input_modalities,
             output_modalities, supported, status, sort_order)
        VALUES
            (?, ?, 100001, 0, ?, ?, 'vidu2.0', ?,
             5, 'video', 5, '["image","text"]', '["video"]', 1, 1, ?)
        "#,
    )
    .bind(seed_id)
    .bind(format!("cap-{provider_code}-global-vidu2-video"))
    .bind(seed_id)
    .bind(&catalog_key)
    .bind(provider_code)
    .bind(seed_id)
    .execute(&pool)
    .await
    .unwrap();
    grant_provider_native_model_api_resource(
        &pool,
        seed_id + 10000,
        9301,
        provider_code,
        &format!("{provider_code}-main"),
        provider_code,
        "vidu.start_end_to_video",
        "video",
        &catalog_key,
        "vidu2.0",
        "vidu2.0",
    )
    .await;
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, status, priority)
        VALUES
            (?, ?, 100001, 0, ?, ?, 'vidu2.0', ?,
             'global', 1, 'api_request', '0.020000', 'USD', 1, 1)
        "#,
    )
    .bind(seed_id)
    .bind(format!("price-{provider_code}-vidu-api-request-reference"))
    .bind(seed_id)
    .bind(&catalog_key)
    .bind(provider_code)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, provider_code, channel_id, status, priority)
        VALUES
            (?, ?, 100001, 0, ?, ?, 'vidu2.0', ?,
             'global', 2, 'api_request', '0.010000', 'USD', ?, 9301, 1, 1)
        "#,
    )
    .bind(seed_id + 1)
    .bind(format!("price-{provider_code}-vidu-api-request-upstream"))
    .bind(seed_id)
    .bind(&catalog_key)
    .bind(provider_code)
    .bind(provider_code)
    .execute(&pool)
    .await
    .unwrap();
    if provider_code != "vidu" {
        sqlx::query(
            r#"
            INSERT INTO ai_model_vendor
                (id, uuid, tenant_id, organization_id, vendor_code, display_name, status, sort_order)
            VALUES
                (?, ?, 100001, 0, 'vidu', 'Vidu', 1, ?)
            "#,
        )
        .bind(seed_id + 2)
        .bind(format!("vendor-vidu-alias-{seed_id}"))
        .bind(seed_id + 2)
        .execute(&pool)
        .await
        .unwrap();
        let alias_catalog_key = "vidu/vidu2.0".to_owned();
        sqlx::query(
            r#"
            INSERT INTO ai_model
                (id, uuid, tenant_id, organization_id, catalog_key, model, display_name,
                 vendor_id, vendor_code, vendor_name_snapshot, family_id, family_code,
                 capability, capabilities, modalities, input_modalities, output_modalities,
                 supports_streaming, supports_tools, supports_json_schema, api_format,
                 shelf_state, routing_state, status, rank_score)
            VALUES
                (?, ?, 100001, 0, ?, 'vidu2.0', 'Vidu 2.0',
                 ?, 'vidu', 'Vidu', ?, 'vidu', 5,
                 '["video"]', '["video"]', '["image","text"]', '["video"]',
                 0, 0, 0, 'provider-native', 1, 1, 1, '70.0')
            "#,
        )
        .bind(seed_id + 2)
        .bind(format!("model-vidu-vidu2-alias-{seed_id}"))
        .bind(&alias_catalog_key)
        .bind(seed_id + 2)
        .bind(seed_id + 2)
        .execute(&pool)
        .await
        .unwrap();
        sqlx::query(
            r#"
            INSERT INTO ai_model_pricing
                (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
                 vendor_code, region_code, price_side, billing_meter_code, unit_price,
                 currency, status, priority)
            VALUES
                (?, ?, 100001, 0, ?, ?, 'vidu2.0', 'vidu',
                 'global', 1, 'api_request', '0.020000', 'USD', 1, 1)
            "#,
        )
        .bind(seed_id + 2)
        .bind(format!("price-vidu-vidu2-api-request-reference-{seed_id}"))
        .bind(seed_id + 2)
        .bind(&alias_catalog_key)
        .execute(&pool)
        .await
        .unwrap();
        sqlx::query(
            r#"
            INSERT INTO ai_model_pricing
                (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
                 vendor_code, region_code, price_side, billing_meter_code, unit_price,
                 currency, provider_code, channel_id, status, priority)
            VALUES
                (?, ?, 100001, 0, ?, ?, 'vidu2.0', 'vidu',
                 'global', 2, 'api_request', '0.010000', 'USD', ?, 9301, 1, 1)
            "#,
        )
        .bind(seed_id + 3)
        .bind(format!("price-vidu-vidu2-api-request-upstream-{seed_id}"))
        .bind(seed_id + 2)
        .bind(&alias_catalog_key)
        .bind(provider_code)
        .execute(&pool)
        .await
        .unwrap();
    }
    pool.close().await;
}

async fn seed_openai_passthrough_group_channel_routes(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
    standard_base_url: &str,
    premium_base_url: &str,
    premium_api_key_secret: &str,
) {
    let pool = catalog.open_pool().await.unwrap();
    let api_key_config = catalog.api_key_security_config().unwrap();
    let hasher = HmacSha256ApiKeySecretHasher::new(api_key_config.pepper_secret()).unwrap();
    let premium_key_hash = hasher.hash_secret(premium_api_key_secret).unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name,
             vendor_id, vendor_code, vendor_name_snapshot, family_id,
             family_code, capability, capabilities, modalities, supports_streaming,
             supports_tools, supports_json_schema, api_format, shelf_state, routing_state,
             status, rank_score)
        VALUES
            (9001, 'model-openai-global-gpt-image-1', 100001, 0,
             'openai/gpt-image-1', 'gpt-image-1', 'GPT Image 1',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 2,
             '["image"]', '["image"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_capability
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, capability, capability_code, modality,
             input_modalities, output_modalities, supported, status, sort_order)
        VALUES
            (9001, 'cap-openai-global-gpt-image-1-image', 100001, 0, 9001,
             'openai/gpt-image-1', 'gpt-image-1', 'openai',
             2, 'image', 2, '["text","image"]', '["image"]', 1, 1, 9001)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let openai_resources = [
        ResourceSeed {
            id: 9001,
            code: "api.openai.images",
            resource_type: "api_endpoint",
            display_name: "OpenAI Images",
            vendor_code: "openai",
            modality_code: "image",
            api_code: "openai.images",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9001,
        },
        ResourceSeed {
            id: 9002,
            code: "model.openai.gpt-image-1.image",
            resource_type: "model_api",
            display_name: "GPT Image 1 Images",
            vendor_code: "openai",
            modality_code: "image",
            api_code: "openai.images",
            catalog_key: Some("openai/gpt-image-1"),
            model: Some("gpt-image-1"),
            provider_native_model: Some("gpt-image-1"),
            sort_order: 9002,
        },
        ResourceSeed {
            id: 9003,
            code: "api.openai.images.generations",
            resource_type: "api_endpoint",
            display_name: "OpenAI Image Generations",
            vendor_code: "openai",
            modality_code: "image",
            api_code: "openai.images.generations",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9003,
        },
        ResourceSeed {
            id: 9004,
            code: "api.openai.images.edits",
            resource_type: "api_endpoint",
            display_name: "OpenAI Image Edits",
            vendor_code: "openai",
            modality_code: "image",
            api_code: "openai.images.edits",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9004,
        },
        ResourceSeed {
            id: 9005,
            code: "api.openai.images.variations",
            resource_type: "api_endpoint",
            display_name: "OpenAI Image Variations",
            vendor_code: "openai",
            modality_code: "image",
            api_code: "openai.images.variations",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9005,
        },
        ResourceSeed {
            id: 9006,
            code: "model.openai.gpt-image-1.generations",
            resource_type: "model_api",
            display_name: "GPT Image 1 Generations",
            vendor_code: "openai",
            modality_code: "image",
            api_code: "openai.images.generations",
            catalog_key: Some("openai/gpt-image-1"),
            model: Some("gpt-image-1"),
            provider_native_model: Some("gpt-image-1"),
            sort_order: 9006,
        },
        ResourceSeed {
            id: 9007,
            code: "model.openai.gpt-image-1.edits",
            resource_type: "model_api",
            display_name: "GPT Image 1 Edits",
            vendor_code: "openai",
            modality_code: "image",
            api_code: "openai.images.edits",
            catalog_key: Some("openai/gpt-image-1"),
            model: Some("gpt-image-1"),
            provider_native_model: Some("gpt-image-1"),
            sort_order: 9007,
        },
        ResourceSeed {
            id: 9008,
            code: "model.openai.gpt-image-1.variations",
            resource_type: "model_api",
            display_name: "GPT Image 1 Variations",
            vendor_code: "openai",
            modality_code: "image",
            api_code: "openai.images.variations",
            catalog_key: Some("openai/gpt-image-1"),
            model: Some("gpt-image-1"),
            provider_native_model: Some("gpt-image-1"),
            sort_order: 9008,
        },
        ResourceSeed {
            id: 9010,
            code: "api.openai.files",
            resource_type: "api_endpoint",
            display_name: "OpenAI Files",
            vendor_code: "openai",
            modality_code: "network",
            api_code: "openai.files",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9010,
        },
        ResourceSeed {
            id: 9011,
            code: "api.openai.uploads",
            resource_type: "api_endpoint",
            display_name: "OpenAI Uploads",
            vendor_code: "openai",
            modality_code: "network",
            api_code: "openai.uploads",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9011,
        },
        ResourceSeed {
            id: 9012,
            code: "api.openai.audio",
            resource_type: "api_endpoint",
            display_name: "OpenAI Audio",
            vendor_code: "openai",
            modality_code: "audio",
            api_code: "openai.audio",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9012,
        },
        ResourceSeed {
            id: 9013,
            code: "api.openai.video",
            resource_type: "api_endpoint",
            display_name: "OpenAI Video",
            vendor_code: "openai",
            modality_code: "video",
            api_code: "openai.video",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9013,
        },
        ResourceSeed {
            id: 9014,
            code: "api.openai.vector_stores",
            resource_type: "api_endpoint",
            display_name: "OpenAI Vector Stores",
            vendor_code: "openai",
            modality_code: "network",
            api_code: "openai.vector_stores",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9014,
        },
        ResourceSeed {
            id: 9015,
            code: "api.openai.assistants",
            resource_type: "api_endpoint",
            display_name: "OpenAI Assistants",
            vendor_code: "openai",
            modality_code: "llm",
            api_code: "openai.assistants",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9015,
        },
        ResourceSeed {
            id: 9016,
            code: "api.openai.fine_tuning",
            resource_type: "api_endpoint",
            display_name: "OpenAI Fine Tuning",
            vendor_code: "openai",
            modality_code: "network",
            api_code: "openai.fine_tuning",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9016,
        },
        ResourceSeed {
            id: 9017,
            code: "api.openai.evals",
            resource_type: "api_endpoint",
            display_name: "OpenAI Evals",
            vendor_code: "openai",
            modality_code: "network",
            api_code: "openai.evals",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9017,
        },
        ResourceSeed {
            id: 9027,
            code: "model.openai.gpt-4o-mini.evals",
            resource_type: "model_api",
            display_name: "GPT-4o mini Evals",
            vendor_code: "openai",
            modality_code: "network",
            api_code: "openai.evals",
            catalog_key: Some("openai/gpt-4o-mini"),
            model: Some("gpt-4o-mini"),
            provider_native_model: Some("gpt-4o-mini"),
            sort_order: 9027,
        },
        ResourceSeed {
            id: 9018,
            code: "api.openai.administration",
            resource_type: "api_endpoint",
            display_name: "OpenAI Administration",
            vendor_code: "openai",
            modality_code: "network",
            api_code: "openai.administration",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9018,
        },
        ResourceSeed {
            id: 9019,
            code: "api.openai.responses",
            resource_type: "api_endpoint",
            display_name: "OpenAI Response Resources",
            vendor_code: "openai",
            modality_code: "llm",
            api_code: "openai.responses",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9019,
        },
        ResourceSeed {
            id: 9020,
            code: "api.openai.videos",
            resource_type: "api_endpoint",
            display_name: "OpenAI Video Resources",
            vendor_code: "openai",
            modality_code: "video",
            api_code: "openai.videos",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9020,
        },
        ResourceSeed {
            id: 9021,
            code: "api.openai.conversations",
            resource_type: "api_endpoint",
            display_name: "OpenAI Conversations",
            vendor_code: "openai",
            modality_code: "llm",
            api_code: "openai.conversations",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9021,
        },
        ResourceSeed {
            id: 9028,
            code: "api.openai.threads",
            resource_type: "api_endpoint",
            display_name: "OpenAI Threads",
            vendor_code: "openai",
            modality_code: "llm",
            api_code: "openai.threads",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9028,
        },
        ResourceSeed {
            id: 9022,
            code: "api.openai.containers",
            resource_type: "api_endpoint",
            display_name: "OpenAI Containers",
            vendor_code: "openai",
            modality_code: "network",
            api_code: "openai.containers",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9022,
        },
        ResourceSeed {
            id: 9023,
            code: "api.openai.audio.speech",
            resource_type: "api_endpoint",
            display_name: "OpenAI Audio Speech",
            vendor_code: "openai",
            modality_code: "audio",
            api_code: "openai.audio.speech",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9023,
        },
        ResourceSeed {
            id: 9029,
            code: "api.openai.skills",
            resource_type: "api_endpoint",
            display_name: "OpenAI Skills",
            vendor_code: "openai",
            modality_code: "network",
            api_code: "openai.skills",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9029,
        },
        ResourceSeed {
            id: 9024,
            code: "api.openai.batches",
            resource_type: "api_endpoint",
            display_name: "OpenAI Batches",
            vendor_code: "openai",
            modality_code: "network",
            api_code: "openai.batches",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9024,
        },
        ResourceSeed {
            id: 9025,
            code: "api.openai.models",
            resource_type: "api_endpoint",
            display_name: "OpenAI Models",
            vendor_code: "openai",
            modality_code: "network",
            api_code: "openai.models",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9025,
        },
        ResourceSeed {
            id: 9026,
            code: "api.openai.realtime",
            resource_type: "api_endpoint",
            display_name: "OpenAI Realtime",
            vendor_code: "openai",
            modality_code: "audio",
            api_code: "openai.realtime",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9026,
        },
    ];
    for resource in &openai_resources {
        insert_resource(&pool, resource).await;
        add_resource_to_openrouter_standard_bundle(
            &pool,
            resource.id,
            resource.id,
            resource.code,
            resource.sort_order,
        )
        .await;
    }
    add_resource_to_openrouter_standard_bundle(&pool, 9030, 2, "api.openai.chat_completions", 9030)
        .await;

    set_channel_and_credential_secret(&pool, 3001, OPENROUTER_STANDARD_SECRET_REF, "{}").await;
    set_channel_and_credential_base_url(&pool, 3001, standard_base_url).await;
    sqlx::query(
        r#"
        INSERT INTO ai_channel
            (id, uuid, tenant_id, organization_id, provider_code, channel_code,
             channel_name, channel_type, credential_ref, base_url, status, priority,
             weight, health_status)
        VALUES
            (3002, 'channel-openrouter-premium', 100001, 0, 'openrouter',
             'openrouter-premium', 'OpenRouter Premium', 'relay',
             'vault://providers/openrouter/account/premium', ?, 1, 10, 100, 1)
        "#,
    )
    .bind(premium_base_url)
    .execute(&pool)
    .await
    .unwrap();
    insert_channel_credential(
        &pool,
        300201,
        3002,
        "openrouter",
        "openrouter-premium",
        OPENROUTER_ACCOUNT_PREMIUM_SECRET_REF,
        premium_base_url,
        "{}",
    )
    .await;
    insert_channel_scoped_model_mapping(
        &pool,
        &ChannelScopedModelMappingSeed {
            rule_id: 9001,
            channel_id: 3001,
            channel_code: "openrouter-main",
            source_model: "gpt-image-1",
            source_catalog_key: "openai/gpt-image-1",
            target_model: "gpt-image-1",
            target_catalog_key: "openai/gpt-image-1",
            target_provider_model: "openrouter/gpt-image-1-standard",
            target_provider_native_model: "gpt-image-1-standard",
            sort_order: 1,
        },
    )
    .await;
    insert_channel_scoped_model_mapping(
        &pool,
        &ChannelScopedModelMappingSeed {
            rule_id: 9002,
            channel_id: 3002,
            channel_code: "openrouter-premium",
            source_model: "gpt-image-1",
            source_catalog_key: "openai/gpt-image-1",
            target_model: "gpt-image-1",
            target_catalog_key: "openai/gpt-image-1",
            target_provider_model: "openrouter/gpt-image-1-premium",
            target_provider_native_model: "gpt-image-1-premium",
            sort_order: 1,
        },
    )
    .await;
    grant_openrouter_standard_bundle_to_channel(&pool, 9002, 3002, "openrouter-premium", 1, 100)
        .await;

    sqlx::query(
        r#"
        INSERT INTO ai_channel_group
            (id, tenant_id, organization_id, group_code, group_name, pricing_plan_code,
             rate_multiplier, official_price_multiplier, status)
        VALUES
            (11, 100001, 0, 'premium-group', 'Premium Group', 'standard',
             '1.000000', '1.100000', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    grant_openrouter_standard_bundle_to_group(&pool, 9002, 11, 1).await;
    sqlx::query(
        r#"
        INSERT INTO iam_gateway_api_key
            (id, tenant_id, organization_id, user_id, channel_group_id, key_prefix, key_hash,
             idempotency_key, status)
        VALUES
            (101, 100001, 0, 31, 11, 'sk-premium', ?, 'seed-api-key-101', 1)
        "#,
    )
    .bind(premium_key_hash)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_member
            (id, uuid, tenant_id, organization_id, channel_group_id, channel_id, priority, weight,
             enabled, status)
        VALUES
            (601, 'channel-group-member-openrouter-premium', 100001, 0, 11, 3002, 1, 100, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, status, priority)
        VALUES
            (9001, 'price-openai-global-gpt-image-1-reference', 100001, 0, 9001,
             'openai/gpt-image-1', 'gpt-image-1', 'openai', 'global',
             1, 'image_result', '0.050000', 'USD', 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, provider_code, channel_id, status, priority)
        VALUES
            (9002, 'price-openai-global-gpt-image-1-standard-upstream', 100001, 0,
             9001, 'openai/gpt-image-1', 'gpt-image-1', 'openai',
             'global', 2, 'image_result', '0.030000', 'USD', 'openrouter',
             3001, 1, 1),
            (9003, 'price-openai-global-gpt-image-1-premium-upstream', 100001, 0,
             9001, 'openai/gpt-image-1', 'gpt-image-1', 'openai',
             'global', 2, 'image_result', '0.040000', 'USD', 'openrouter',
             3002, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name,
             vendor_id, vendor_code, vendor_name_snapshot, family_id,
             family_code, capability, capabilities, modalities, supports_streaming,
             supports_tools, supports_json_schema, api_format, shelf_state, routing_state,
             status, rank_score)
        VALUES
            (9013, 'model-openai-management-threads', 100001, 0,
             'openai/management/threads', 'management/threads', 'OpenAI Threads API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 1,
             '["chat"]', '["chat"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9014, 'model-openai-management-evals', 100001, 0,
             'openai/management/evals', 'management/evals', 'OpenAI Evals API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 10,
             '["network"]', '["network"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9015, 'model-openai-management-files', 100001, 0,
             'openai/management/files', 'management/files', 'OpenAI Files API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 10,
             '["network"]', '["network"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9016, 'model-openai-management-uploads', 100001, 0,
             'openai/management/uploads', 'management/uploads', 'OpenAI Uploads API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 10,
             '["network"]', '["network"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9017, 'model-openai-management-models', 100001, 0,
             'openai/management/models', 'management/models', 'OpenAI Models API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 10,
             '["network"]', '["network"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9018, 'model-openai-management-audio-voices', 100001, 0,
             'openai/management/audio_voices', 'management/audio_voices', 'OpenAI Audio Voices API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 3,
             '["audio"]', '["audio"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9019, 'model-openai-management-videos', 100001, 0,
             'openai/management/videos', 'management/videos', 'OpenAI Videos API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 5,
             '["video"]', '["video"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9020, 'model-openai-management-responses', 100001, 0,
             'openai/management/responses', 'management/responses', 'OpenAI Responses API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 1,
             '["chat"]', '["chat"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9021, 'model-openai-management-conversations', 100001, 0,
             'openai/management/conversations', 'management/conversations', 'OpenAI Conversations API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 1,
             '["chat"]', '["chat"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9030, 'model-openai-management-chat-completions', 100001, 0,
             'openai/management/chat_completions', 'management/chat_completions',
             'OpenAI Stored Chat Completions API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 1,
             '["chat"]', '["chat"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9031, 'model-openai-management-realtime', 100001, 0,
             'openai/management/realtime', 'management/realtime', 'OpenAI Realtime Management API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 10,
             '["network"]', '["network"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9032, 'model-openai-management-fine-tuning', 100001, 0,
             'openai/management/fine_tuning', 'management/fine_tuning', 'OpenAI Fine Tuning API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 10,
             '["network"]', '["network"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9033, 'model-openai-management-batches', 100001, 0,
             'openai/management/batches', 'management/batches', 'OpenAI Batches API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 10,
             '["network"]', '["network"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9034, 'model-openai-management-vector-stores', 100001, 0,
             'openai/management/vector_stores', 'management/vector_stores', 'OpenAI Vector Stores API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 6,
             '["embedding"]', '["embedding"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9035, 'model-openai-management-audio-voice-consents', 100001, 0,
             'openai/management/audio_voice_consents', 'management/audio_voice_consents',
             'OpenAI Audio Voice Consents API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 3,
             '["audio"]', '["audio"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9036, 'model-openai-management-containers', 100001, 0,
             'openai/management/containers', 'management/containers', 'OpenAI Containers API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 10,
             '["network"]', '["network"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9037, 'model-openai-management-skills', 100001, 0,
             'openai/management/skills', 'management/skills', 'OpenAI Skills API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 10,
             '["network"]', '["network"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0'),
            (9038, 'model-openai-management-administration', 100001, 0,
             'openai/management/administration', 'management/administration',
             'OpenAI Administration API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 10,
             '["network"]', '["network"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, status, priority)
        VALUES
            (9012, 'price-openai-management-threads-api-request', 100001, 0,
             9013, 'openai/management/threads', 'management/threads', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9013, 'price-openai-management-evals-api-request', 100001, 0,
             9014, 'openai/management/evals', 'management/evals', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9014, 'price-openai-management-files-api-request', 100001, 0,
             9015, 'openai/management/files', 'management/files', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9015, 'price-openai-management-uploads-api-request', 100001, 0,
             9016, 'openai/management/uploads', 'management/uploads', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9016, 'price-openai-management-models-api-request', 100001, 0,
             9017, 'openai/management/models', 'management/models', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9017, 'price-openai-management-audio-voices-api-request', 100001, 0,
             9018, 'openai/management/audio_voices', 'management/audio_voices', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9018, 'price-openai-management-videos-api-request', 100001, 0,
             9019, 'openai/management/videos', 'management/videos', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9019, 'price-openai-management-responses-api-request', 100001, 0,
             9020, 'openai/management/responses', 'management/responses', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9020, 'price-openai-management-conversations-api-request', 100001, 0,
             9021, 'openai/management/conversations', 'management/conversations', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9030, 'price-openai-management-chat-completions-api-request', 100001, 0,
             9030, 'openai/management/chat_completions', 'management/chat_completions', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9031, 'price-openai-management-realtime-api-request', 100001, 0,
             9031, 'openai/management/realtime', 'management/realtime', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9032, 'price-openai-management-fine-tuning-api-request', 100001, 0,
             9032, 'openai/management/fine_tuning', 'management/fine_tuning', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9033, 'price-openai-management-batches-api-request', 100001, 0,
             9033, 'openai/management/batches', 'management/batches', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9034, 'price-openai-management-vector-stores-api-request', 100001, 0,
             9034, 'openai/management/vector_stores', 'management/vector_stores', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9035, 'price-openai-management-audio-voice-consents-api-request', 100001, 0,
             9035, 'openai/management/audio_voice_consents', 'management/audio_voice_consents',
             'openai', 'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9036, 'price-openai-management-containers-api-request', 100001, 0,
             9036, 'openai/management/containers', 'management/containers', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9037, 'price-openai-management-skills-api-request', 100001, 0,
             9037, 'openai/management/skills', 'management/skills', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1),
            (9038, 'price-openai-management-administration-api-request', 100001, 0,
             9038, 'openai/management/administration', 'management/administration', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_routing_profile
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at,
             updated_at, version, metadata, policy_id, profile_version, profile_name,
             release_status, traffic_percent, config_hash)
        VALUES
            (9201, 'routing-profile-standard-image', 100001, 0, 1, 1,
             '2026-05-10 00:00:00', '2026-05-10 00:00:00', 0, '{}',
             9201, 1, 'Standard Image Profile', 2, '100.000000',
             'standard-image-profile-hash'),
            (9202, 'routing-profile-premium-image', 100001, 0, 1, 1,
             '2026-05-10 00:00:00', '2026-05-10 00:00:00', 0, '{}',
             9202, 1, 'Premium Image Profile', 2, '100.000000',
             'premium-image-profile-hash')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_routing_policy
            (id, tenant_id, organization_id, policy_code, policy_scope, subject_id,
             capability, default_profile_id, fallback_mode, status)
        VALUES
            (9201, 100001, 0, 'standard-image-group-policy', 5, 10, 2, 9201, 1, 1),
            (9202, 100001, 0, 'premium-image-group-policy', 5, 11, 2, 9202, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_routing_rule
            (id, tenant_id, organization_id, profile_id, rule_code, priority,
             match_expression, target_model, candidate_channels, fallback_chain,
             constraints, status)
        VALUES
            (9211, 100001, 0, 9201, 'standard-gpt-image-1', 1,
             '{"catalogKey":"openai/gpt-image-1"}',
             'openai/gpt-image-1', '[{"channel_id":3001,"weight":100}]',
             '[]', '{}', 1),
            (9212, 100001, 0, 9202, 'premium-gpt-image-1', 1,
             '{"catalogKey":"openai/gpt-image-1"}',
             'openai/gpt-image-1', '[{"channel_id":3002,"weight":100}]',
             '[]', '{}', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;
}

async fn set_channel_managed_provider_secret(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
    channel_id: i64,
    secret_ref: &str,
    secret_value: &str,
) {
    let api_key_config = catalog.api_key_security_config().unwrap();
    let codec = RingAeadApiKeySecretCodec::new(api_key_config.pepper_secret()).unwrap();
    let ciphertext = codec.encode_secret(secret_value).unwrap();
    let auth_config = json!({ "secretMaterialCiphertext": ciphertext }).to_string();
    let pool = catalog.open_pool().await.unwrap();
    set_channel_and_credential_secret(&pool, channel_id, secret_ref, &auth_config).await;
    pool.close().await;
}

async fn seed_openai_chat_fallback_route(catalog: &sdkwork_claw_test_support::SeededSqliteCatalog) {
    let pool = catalog.open_pool().await.unwrap();
    insert_channel_scoped_model_mapping(
        &pool,
        &ChannelScopedModelMappingSeed {
            rule_id: 9011,
            channel_id: 3002,
            channel_code: "openrouter-premium",
            source_model: "gpt-4o-mini",
            source_catalog_key: "openai/gpt-4o-mini",
            target_model: "gpt-4o-mini",
            target_catalog_key: "openai/gpt-4o-mini",
            target_provider_model: "gpt-4o-mini-fallback",
            target_provider_native_model: "gpt-4o-mini-fallback",
            sort_order: 1,
        },
    )
    .await;
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, provider_code, channel_id, status, priority)
        VALUES
            (9011, 'price-openai-gpt-4o-mini-fallback-input-upstream', 100001, 0,
             1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai',
             'global', 2, 'llm_input_token', '0.120000', 'USD', 'openrouter',
             3002, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_member
            (id, uuid, tenant_id, organization_id, channel_group_id, channel_id, priority, weight,
             enabled, status)
        VALUES
            (602, 'channel-group-member-openrouter-standard-fallback', 100001, 0, 10, 3002, 2, 50, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code,
             resource_group_id, resource_group_code, grant_type, priority, weight, status)
        VALUES
            (9021, 'channel-resource-openrouter-chat-fallback', 100001, 0, 3002,
             'openrouter', 'openrouter-premium', 5, 'bundle.openrouter.openai.standard',
             'allow', 2, 50, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_routing_policy
        SET fallback_mode = 2
        WHERE id = 9001
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_routing_rule
        SET fallback_chain = '[{"channel_id":3002,"weight":50}]'
        WHERE id = 9102
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;
}

async fn seed_openai_passthrough_default_channel_route_fallback(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
    group_base_url: &str,
    default_base_url: &str,
) {
    let pool = catalog.open_pool().await.unwrap();

    set_channel_and_credential_base_url(&pool, 3001, group_base_url).await;
    sqlx::query(
        r#"
        UPDATE ai_routing_rule
        SET match_expression = '{"routeKey":"openai/management/not_bound_to_group"}',
            target_model = 'openai/management/not_bound_to_group'
        WHERE id = 9102
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel
            (id, uuid, tenant_id, organization_id, provider_code, channel_code,
             channel_name, channel_type, credential_ref, base_url, status, priority,
             weight, health_status)
        VALUES
            (3004, 'channel-openrouter-default', 100001, 0, 'openrouter',
             'openrouter-default', 'OpenRouter Default', 'relay',
             'vault://providers/openrouter/account/default', ?, 1, 20, 100, 1)
        "#,
    )
    .bind(default_base_url)
    .execute(&pool)
    .await
    .unwrap();
    insert_channel_credential(
        &pool,
        300401,
        3004,
        "openrouter",
        "openrouter-default",
        "vault://providers/openrouter/account/default",
        default_base_url,
        "{}",
    )
    .await;
    sqlx::query(
        r#"
        INSERT INTO ai_routing_profile
            (id, uuid, tenant_id, organization_id, data_scope, status, created_at,
             updated_at, version, metadata, policy_id, profile_version, profile_name,
             release_status, traffic_percent, config_hash)
        VALUES
            (9304, 'routing-profile-global-image-default', 0, 0, 1, 1,
             '2026-05-10 00:00:00', '2026-05-10 00:00:00', 0, '{}',
             9304, 1, 'Global Image Default Profile', 2, '100.000000',
             'global-image-default-profile-hash')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_routing_policy
            (id, tenant_id, organization_id, policy_code, policy_scope, subject_id,
             capability, default_profile_id, fallback_mode, status)
        VALUES
            (9304, 0, 0, 'global-files-default-policy', 1, NULL, 10, 9304, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_routing_rule
            (id, tenant_id, organization_id, profile_id, rule_code, priority,
             match_expression, target_model, candidate_channels, fallback_chain,
             constraints, status)
        VALUES
            (9314, 0, 0, 9304, 'global-default-files', 1,
             '{"routeKey":"openai/management/files"}',
             'openai/management/files', '[{"channel_id":3004,"weight":100}]',
             '[]', '{}', 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_member
            (id, tenant_id, organization_id, channel_group_id, channel_id, priority, weight,
             enabled, status)
        VALUES
            (604, 100001, 0, 10, 3004, 1, 100, 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    insert_resource(
        &pool,
        &ResourceSeed {
            id: 9004,
            code: "api.openai.files",
            resource_type: "api_endpoint",
            display_name: "OpenAI Files",
            vendor_code: "openai",
            modality_code: "network",
            api_code: "openai.files",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9004,
        },
    )
    .await;
    sqlx::query(
        r#"
        INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code,
             resource_id, resource_code, grant_type, priority, weight, status)
        VALUES
            (9004, 'channel-resource-openrouter-default-files', 100001, 0, 3004,
             'openrouter', 'openrouter-default', 9004, 'api.openai.files',
             'allow', 1, 100, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_resource
            (id, uuid, tenant_id, organization_id, channel_group_id,
             resource_id, resource_code, grant_type, priority, status)
        VALUES
            (9004, 'channel-group-resource-openrouter-default-files', 100001, 0, 10,
             9004, 'api.openai.files', 'allow', 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name,
             vendor_id, vendor_code, vendor_name_snapshot, family_id,
             family_code, capability, capabilities, modalities, supports_streaming,
             supports_tools, supports_json_schema, api_format, shelf_state, routing_state,
             status, rank_score)
        VALUES
            (9034, 'model-openai-management-files-fallback', 100001, 0,
             'openai/management/files', 'management/files', 'OpenAI Files API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 10,
             '["network"]', '["network"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, status, priority)
        VALUES
            (9034, 'price-openai-management-files-fallback-api-request', 100001, 0,
             9034, 'openai/management/files', 'management/files', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    pool.close().await;
}

async fn seed_openai_passthrough_header_auth_channel_route(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
    base_url: &str,
) {
    seed_openai_passthrough_header_auth_channel_route_with_auth_config(
        catalog,
        base_url,
        r#"{"name":"x-goog-api-key"}"#,
    )
    .await;
}

async fn seed_openai_passthrough_header_auth_channel_route_with_auth_config(
    catalog: &sdkwork_claw_test_support::SeededSqliteCatalog,
    base_url: &str,
    auth_config: &str,
) {
    let pool = catalog.open_pool().await.unwrap();

    sqlx::query(
        r#"
        INSERT INTO ai_provider
            (id, provider_code, default_vendor_code, provider_type, protocol_code,
             base_url, status)
        VALUES
            (9005, 'google', 'google', 'relay_aggregator', 'google', ?, 1)
        "#,
    )
    .bind(base_url)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_channel
        SET provider_code = 'google',
            provider_id = 9005,
            channel_code = 'google-main',
            channel_name = 'Google Main',
            channel_type = 'relay',
            protocol_code = 'google',
            base_url = ?,
            credential_ref = 'vault://providers/google/account/main',
            auth_type = 'header',
            auth_config = ?
        WHERE id = 3001
        "#,
    )
    .bind(base_url)
    .bind(auth_config)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_channel_credential
        SET provider_code = 'google',
            channel_code = 'google-main',
            credential_ref = 'vault://providers/google/account/main',
            base_url = ?,
            auth_config = ?
        WHERE channel_id = 3001
        "#,
    )
    .bind(base_url)
    .bind(auth_config)
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_routing_policy
        SET capability = 10
        WHERE id = 9001
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        UPDATE ai_routing_rule
        SET match_expression = '{"routeKey":"openai/management/files"}',
            target_model = 'openai/management/files'
        WHERE id = 9102
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    insert_resource(
        &pool,
        &ResourceSeed {
            id: 9005,
            code: "api.google.files",
            resource_type: "api_endpoint",
            display_name: "Google Files",
            vendor_code: "google",
            modality_code: "network",
            api_code: "openai.files",
            catalog_key: None,
            model: None,
            provider_native_model: None,
            sort_order: 9005,
        },
    )
    .await;
    sqlx::query(
        r#"
        INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name,
             vendor_id, vendor_code, vendor_name_snapshot, family_id, family_code,
             capability, capabilities, modalities, supports_streaming,
             supports_tools, supports_json_schema, api_format, shelf_state, routing_state,
             status, rank_score)
        VALUES
            (9034, 'model-openai-management-files-header-auth', 100001, 0,
             'openai/management/files', 'management/files', 'OpenAI Files API',
             1, 'openai', 'OpenAI', 1, 'gpt-4o', 10,
             '["network"]', '["network"]', 0, 0, 0, 'openai-compatible',
             1, 1, 1, '80.0')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_model_pricing
            (id, uuid, tenant_id, organization_id, model_id, catalog_key, model,
             vendor_code, region_code, price_side, billing_meter_code, unit_price,
             currency, status, priority)
        VALUES
            (9034, 'price-openai-management-files-header-auth-api-request', 100001, 0,
             9034, 'openai/management/files', 'management/files', 'openai',
             'global', 1, 'api_request', '0.001000', 'USD', 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_resource
            (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code,
             resource_id, resource_code, grant_type, priority, weight, status)
        VALUES
            (9005, 'channel-resource-google-files', 100001, 0, 3001,
             'google', 'google-main', 9005, 'api.google.files',
             'allow', 1, 100, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query(
        r#"
        INSERT INTO ai_channel_group_resource
            (id, uuid, tenant_id, organization_id, channel_group_id,
             resource_id, resource_code, grant_type, priority, status)
        VALUES
            (9005, 'channel-group-resource-google-files', 100001, 0, 10,
             9005, 'api.google.files', 'allow', 1, 1)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    pool.close().await;
}
