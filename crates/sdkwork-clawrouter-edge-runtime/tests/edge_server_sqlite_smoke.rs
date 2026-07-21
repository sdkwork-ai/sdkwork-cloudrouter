use std::fs::{self, File, OpenOptions};
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::{to_bytes, Body};
use axum::http::{header, Method, Request, StatusCode};
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use sdkwork_claw_config::{DeploymentMode, RequestLimitsConfig, StartupInstallMode};
use sdkwork_claw_test_support::{
    app_session_config, app_session_dual_token_headers, default_trusted_request_subject,
    payment_webhook_config, seeded_sqlite_catalog, trusted_request_subject, trusted_subject_config,
    SeededSqliteCatalog,
};
use sdkwork_clawrouter_router_service::application::{
    default_desktop_cache_manager, InMemoryRuntimeStreamBus, ModelRankingRefreshWorkerConfig,
    UsageSettlementWorkerConfig,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::catalog::RefreshableSqlPricingCatalog;
use sdkwork_clawrouter_router_service::infrastructure::sql::installer::{
    DatabaseInstallOptions, DatabaseInstaller, InstallationStatus,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::sqlite::SqlitePricingCatalogLoader;
use sdkwork_clawrouter_router_service::infrastructure::AppRuntimeGatewayHttpClient;
use sdkwork_web_core::bootstrap_access_token_jwt;
use serde_json::json;
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tower::ServiceExt;

use sdkwork_clawrouter_router_service::domain::{
    AiModel, BillingMeter, ModelPrice, ModelVendor, ModelVendorDefinition, Money, PriceSide,
};
use sdkwork_clawrouter_router_service::infrastructure::InMemoryPricingCatalog;
use sdkwork_clawrouter_router_service::ports::{
    AppRoutingApiKeyItem, AppRoutingApiKeyListPage, AppRoutingChannelCommandFuture,
    AppRoutingChannelCommandStore, AppRoutingChannelDeleteOutcome, AppRoutingChannelItem,
    AppRoutingChannelListPage, AppRoutingChannelMutationOutcome, AppRoutingChannelTestOutcome,
    AppRoutingListQuery, AppRoutingMappingRule, AppRoutingModelStats, AppRoutingReadFuture,
    AppRoutingReadStore, AppRoutingRequestTraceItem, AppRoutingRequestTraceListPage,
    AppRoutingStrategyFuture, AppRoutingStrategySnapshot, AppRoutingStrategyStore,
    AppRoutingStrategySubject, AppRoutingStrategyType, AppRoutingSubject, AppRoutingUsageData,
    AppRoutingUsageSnapshot, CreateAppRoutingChannelCommand, DeleteAppRoutingChannelCommand,
    SetAppRoutingChannelStatusCommand, TestAppRoutingChannelCommand,
    UpdateAppRoutingChannelCommand, UpdateAppRoutingStrategyCommand,
    UpdateAppRoutingStrategyOutcome,
};

const SEEDED_INSTALLED_GATEWAY_TEMPLATE_REVISION: &str = "v1";
const SQLITE_TEMPLATE_LOCK_RETRY_INITIAL_MILLIS: u64 = 10;
const SQLITE_TEMPLATE_LOCK_RETRY_MAX_MILLIS: u64 = 100;

struct RunningService {
    base_url: String,
    stop: oneshot::Sender<()>,
}

struct TemplateFileLock {
    path: PathBuf,
    _file: File,
}

impl Drop for TemplateFileLock {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

struct SeededSharedSqliteRuntime {
    pool: sqlx::SqlitePool,
    catalog: Arc<RefreshableSqlPricingCatalog>,
    database_installer: Arc<DatabaseInstaller>,
}

#[tokio::test]
async fn seeded_installed_gateway_catalog_supports_skip_startup_install_mode_for_smoke_suite() {
    let catalog = seeded_installed_gateway_catalog().await;
    let router = seeded_gateway_router(&catalog).await;

    let models = json_request(router, Method::GET, "/v1/models", Body::empty())
        .with_authorization(catalog.gateway_authorization_header())
        .send()
        .await;

    assert_eq!(StatusCode::OK, models.status);
    assert_eq!("list", models.json["object"]);
    assert_eq!("qwen3.6-max-preview", models.json["data"][0]["id"]);
    assert_eq!("alibaba", models.json["data"][0]["owned_by"]);
}

async fn seeded_installed_gateway_catalog() -> SeededSqliteCatalog {
    let template_path = seeded_installed_gateway_template_path();
    ensure_seeded_installed_gateway_template(&template_path).await;
    SeededSqliteCatalog::from_database_path(&template_path)
        .fork()
        .unwrap()
}

async fn ensure_seeded_installed_gateway_template(template_path: &Path) {
    if seeded_installed_gateway_template_current(template_path).await {
        return;
    }

    let _lock = acquire_template_file_lock(template_path).unwrap();
    if seeded_installed_gateway_template_current(template_path).await {
        return;
    }

    let source_catalog = seeded_sqlite_catalog().await.unwrap();
    let source_path = sqlite_path_from_database_url(source_catalog.database_url()).unwrap();
    let pool = source_catalog.open_pool().await.unwrap();
    DatabaseInstaller::for_sqlite(pool.clone())
        .with_options(DatabaseInstallOptions::new("test", "standard").unwrap())
        .unwrap()
        .ensure_bootstrap_data()
        .await
        .unwrap();
    sqlx::query("VACUUM").execute(&pool).await.unwrap();
    pool.close().await;

    remove_sqlite_database_files(template_path);
    copy_sqlite_database_files(&source_path, template_path).unwrap();
    remove_sqlite_database_files(&source_path);
}

async fn seeded_installed_gateway_template_current(template_path: &Path) -> bool {
    if !template_path.exists() {
        return false;
    }

    let database_url = sqlite_database_url(template_path);
    let pool = match sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect(database_url.as_str())
        .await
    {
        Ok(pool) => pool,
        Err(_) => return false,
    };
    let installed_status = DatabaseInstaller::for_sqlite(pool.clone())
        .with_options(DatabaseInstallOptions::new("test", "standard").unwrap())
        .unwrap()
        .status()
        .await
        .ok();
    let installed_model_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM ai_model
        WHERE model = 'qwen3.6-max-preview'
          AND status = 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap_or_default();
    pool.close().await;

    matches!(installed_status, Some(InstallationStatus::Installed)) && installed_model_count > 0
}

fn acquire_template_file_lock(template_path: &Path) -> anyhow::Result<TemplateFileLock> {
    let lock_path = template_lock_path(template_path);
    if let Some(parent) = lock_path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            anyhow::Error::msg(format!(
                "failed to create sqlite lock directory {}: {error}",
                parent.display()
            ))
        })?;
    }

    let started_at = SystemTime::now();
    let mut attempt = 0_u32;
    loop {
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&lock_path)
        {
            Ok(file) => {
                return Ok(TemplateFileLock {
                    path: lock_path,
                    _file: file,
                });
            }
            Err(error) if error.kind() == ErrorKind::AlreadyExists => {
                if started_at.elapsed().unwrap_or_default().as_secs() >= 120 {
                    anyhow::bail!(
                        "timed out waiting for sqlite template lock {}",
                        lock_path.display()
                    );
                }
                thread::sleep(template_lock_retry_delay(attempt));
                attempt = attempt.saturating_add(1);
            }
            Err(error) => {
                anyhow::bail!(
                    "failed to acquire sqlite template lock {}: {error}",
                    lock_path.display()
                );
            }
        }
    }
}

fn template_lock_retry_delay(attempt: u32) -> std::time::Duration {
    let factor = if attempt >= 63 {
        u64::MAX
    } else {
        1_u64 << attempt
    };
    let millis = SQLITE_TEMPLATE_LOCK_RETRY_INITIAL_MILLIS
        .saturating_mul(factor)
        .min(SQLITE_TEMPLATE_LOCK_RETRY_MAX_MILLIS);
    std::time::Duration::from_millis(millis)
}

fn template_lock_path(template_path: &Path) -> PathBuf {
    let file_name = template_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("claw-gateway-edge-server.template.db");
    template_path.with_file_name(format!("{file_name}.lock"))
}

fn seeded_installed_gateway_template_path() -> PathBuf {
    let mut path = sqlite_test_database_dir();
    path.push(format!(
        "claw-gateway-edge-server-seeded-installed-{SEEDED_INSTALLED_GATEWAY_TEMPLATE_REVISION}.template.db"
    ));
    path
}

fn sqlite_test_database_dir() -> PathBuf {
    std::env::var_os("CARGO_TARGET_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("test-dbs")
}

fn sqlite_database_url(path: &Path) -> String {
    format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"))
}

fn sqlite_path_from_database_url(database_url: &str) -> anyhow::Result<PathBuf> {
    let path = database_url.strip_prefix("sqlite://").ok_or_else(|| {
        anyhow::Error::msg(format!("unsupported sqlite database url: {database_url}"))
    })?;
    if path.is_empty() {
        anyhow::bail!("sqlite database url must include a filesystem path");
    }
    Ok(PathBuf::from(path))
}

fn copy_sqlite_database_files(source_path: &Path, destination_path: &Path) -> anyhow::Result<()> {
    if let Some(parent) = destination_path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            anyhow::Error::msg(format!(
                "failed to create sqlite template directory {}: {error}",
                parent.display()
            ))
        })?;
    }
    copy_sqlite_sidecar(source_path, destination_path, "")?;
    copy_sqlite_sidecar(source_path, destination_path, "-wal")?;
    copy_sqlite_sidecar(source_path, destination_path, "-shm")?;
    copy_sqlite_sidecar(source_path, destination_path, "-journal")?;
    Ok(())
}

fn copy_sqlite_sidecar(
    source_path: &Path,
    destination_path: &Path,
    suffix: &str,
) -> anyhow::Result<()> {
    let source = sqlite_sidecar_path(source_path, suffix);
    if !source.exists() {
        return Ok(());
    }
    let destination = sqlite_sidecar_path(destination_path, suffix);
    fs::copy(&source, &destination).map_err(|error| {
        anyhow::Error::msg(format!(
            "failed to copy sqlite catalog file from {} to {}: {error}",
            source.display(),
            destination.display()
        ))
    })?;
    Ok(())
}

fn sqlite_sidecar_path(path: &Path, suffix: &str) -> PathBuf {
    if suffix.is_empty() {
        return path.to_path_buf();
    }
    PathBuf::from(format!("{}{}", path.to_string_lossy(), suffix))
}

fn remove_sqlite_database_files(path: &Path) {
    for suffix in ["", "-wal", "-shm", "-journal"] {
        let _ = fs::remove_file(sqlite_sidecar_path(path, suffix));
    }
}

async fn seeded_shared_sqlite_runtime(catalog: &SeededSqliteCatalog) -> SeededSharedSqliteRuntime {
    let pool = catalog.open_pool().await.unwrap();
    let database_installer = Arc::new(
        DatabaseInstaller::for_sqlite(pool.clone())
            .with_options(DatabaseInstallOptions::new("test", "commercial").unwrap())
            .unwrap(),
    );
    let api_key_secret_codec =
        sdkwork_clawrouter_router_service::infrastructure::crypto::RingAeadApiKeySecretCodec::new(
            sdkwork_claw_test_support::API_KEY_PEPPER,
        )
        .unwrap();
    let snapshot = SqlitePricingCatalogLoader::with_api_key_secret_codec(
        pool.clone(),
        Arc::new(api_key_secret_codec),
    )
    .load_snapshot()
    .await
    .unwrap();

    SeededSharedSqliteRuntime {
        pool: pool.clone(),
        catalog: Arc::new(RefreshableSqlPricingCatalog::new(snapshot)),
        database_installer,
    }
}

async fn seeded_gateway_router(catalog: &SeededSqliteCatalog) -> Router {
    sdkwork_clawrouter_edge_runtime::runtime::router_with_database_api_key_provider_configs_usage_settlement_worker_config_and_startup_install_mode(
        catalog.database_config().unwrap(),
        Some(catalog.api_key_security_config().unwrap()),
        None,
        None,
        UsageSettlementWorkerConfig::disabled(),
        StartupInstallMode::Skip,
    )
    .await
    .unwrap()
}

fn seeded_admin_router(
    catalog: &SeededSqliteCatalog,
    runtime: &SeededSharedSqliteRuntime,
    trusted_subject_config: sdkwork_claw_config::TrustedSubjectConfig,
    app_session_config: sdkwork_claw_config::AppSessionConfig,
) -> Router {
    sdkwork_routes_clawrouter_backend_api::router_with_sqlite_shared_runtime(
        catalog.database_config().unwrap(),
        runtime.pool.clone(),
        Arc::clone(&runtime.catalog),
        catalog.api_key_security_config().unwrap(),
        trusted_subject_config,
        app_session_config,
        Arc::new(sdkwork_clawrouter_router_service::ports::UnconfiguredProviderHealthProbe),
        DeploymentMode::from_env().expect("test deployment lifecycle must be valid"),
        default_desktop_cache_manager(),
        Arc::clone(&runtime.database_installer),
        RequestLimitsConfig::default(),
        None,
    )
    .unwrap()
}

async fn seeded_app_router(
    catalog: &SeededSqliteCatalog,
    runtime: &SeededSharedSqliteRuntime,
    trusted_subject_config: sdkwork_claw_config::TrustedSubjectConfig,
    app_session_config: sdkwork_claw_config::AppSessionConfig,
    payment_webhook_config: sdkwork_claw_config::PaymentWebhookConfig,
    deployment_mode: DeploymentMode,
) -> Router {
    sdkwork_routes_clawrouter_app_api::router_with_sqlite_shared_runtime(
        catalog.database_config().unwrap(),
        runtime.pool.clone(),
        Arc::clone(&runtime.catalog),
        catalog.api_key_security_config().unwrap(),
        trusted_subject_config,
        app_session_config,
        payment_webhook_config,
        Arc::new(sdkwork_clawrouter_router_service::ports::UnconfiguredProviderHealthProbe),
        deployment_mode,
        RequestLimitsConfig::default(),
        Arc::new(AppRuntimeGatewayHttpClient::new("http://127.0.0.1:1".to_owned()).unwrap()),
        Arc::new(InMemoryRuntimeStreamBus::default()),
        ModelRankingRefreshWorkerConfig::disabled(),
    )
    .await
    .unwrap()
}

#[tokio::test]
async fn edge_server_proxies_real_sqlite_gateway_admin_and_app_services() {
    let catalog = seeded_installed_gateway_catalog().await;
    let shared_runtime = seeded_shared_sqlite_runtime(&catalog).await;
    let trusted_subject_config = trusted_subject_config().unwrap();
    let app_session_config = app_session_config().unwrap();
    let payment_webhook_config = payment_webhook_config().unwrap();

    let gateway_router = seeded_gateway_router(&catalog).await;
    let admin_router = seeded_admin_router(
        &catalog,
        &shared_runtime,
        trusted_subject_config.clone(),
        app_session_config.clone(),
    );
    let app_router = seeded_app_router(
        &catalog,
        &shared_runtime,
        trusted_subject_config,
        app_session_config,
        payment_webhook_config,
        DeploymentMode::from_env().expect("test deployment lifecycle must be valid"),
    )
    .await;

    let gateway = spawn_router(gateway_router).await;
    let admin = spawn_router(admin_router).await;
    let app = spawn_router(app_router).await;
    let portal = spawn_router(portal_router()).await;

    let edge_router = sdkwork_clawrouter_edge_runtime::edge_server_router(
        sdkwork_clawrouter_edge_runtime::EdgeServerConfig::try_new(
            &gateway.base_url,
            &admin.base_url,
            &app.base_url,
            &portal.base_url,
        )
        .unwrap(),
    );

    let readyz = json_request(edge_router.clone(), Method::GET, "/readyz", Body::empty())
        .send()
        .await;
    assert_eq!(StatusCode::OK, readyz.status);
    assert_eq!("ok", readyz.json["status"]);
    assert_eq!("ok", readyz.json["upstreams"]["gateway"]["status"]);
    assert_eq!("ok", readyz.json["upstreams"]["backend"]["status"]);
    assert_eq!("ok", readyz.json["upstreams"]["app"]["status"]);
    assert_eq!("ok", readyz.json["upstreams"]["portal"]["status"]);

    let catalog_models = json_request(
        edge_router.clone(),
        Method::GET,
        "/v1/models",
        Body::empty(),
    )
    .with_authorization(catalog.gateway_authorization_header())
    .send()
    .await;
    assert_eq!(StatusCode::OK, catalog_models.status);
    assert_eq!("list", catalog_models.json["object"]);
    assert_eq!("qwen3.6-max-preview", catalog_models.json["data"][0]["id"]);
    assert_eq!("alibaba", catalog_models.json["data"][0]["owned_by"]);

    let admin_models = json_request(
        edge_router.clone(),
        Method::GET,
        "/backend/v3/api/ai/models",
        Body::empty(),
    )
    .with_app_session(admin_app_session_headers())
    .send()
    .await;
    assert_eq!(StatusCode::OK, admin_models.status);
    assert_eq!("2000", admin_models.json["code"]);
    let admin_model =
        model_item_by_code(&admin_models.json["data"]["items"], "qwen3.6-max-preview");
    assert!(admin_model["id"].as_str().is_some());
    assert!(admin_model["vendorId"].as_str().is_some());
    assert_eq!("alibaba", admin_model["vendorCode"]);
    assert_eq!("qwen3.6-max-preview", admin_model["model"]);
    assert_eq!("Qwen3.6 Max Preview", admin_model["displayName"]);
    assert_eq!("Chat", admin_model["type"]);
    let admin_region_prices = admin_model["regionPrices"]
        .as_array()
        .expect("admin ai model must return regional price entries");
    assert!(
        !admin_region_prices.is_empty(),
        "admin ai model must return regional price entries: {admin_model}"
    );
    let admin_global_price = admin_region_prices
        .iter()
        .find(|price| price["regionCode"] == "global")
        .or_else(|| admin_region_prices.first());
    let admin_global_price =
        admin_global_price.expect("admin ai model must return at least one regional price");
    assert!(admin_global_price["currency"].as_str().is_some());
    assert!(admin_global_price["priceIn"].as_str().is_some());
    assert!(admin_global_price["priceOut"].as_str().is_some());
    assert!(admin_model.get("priceIn").is_none());
    assert!(admin_model.get("priceOut").is_none());
    assert_eq!("active", admin_model["status"]);
    assert!(admin_model.get("priceAvailability").is_none());

    let app_models = json_request(
        edge_router.clone(),
        Method::GET,
        "/app/v3/api/ai/models",
        Body::empty(),
    )
    .send()
    .await;
    assert_eq!(StatusCode::OK, app_models.status);
    assert_eq!("2000", app_models.json["code"]);
    let app_model = model_item_by_code(&app_models.json["data"]["items"], "qwen3.6-max-preview");
    assert_eq!("qwen3.6-max-preview", app_model["model"]);
    assert_eq!("reference", app_model["priceAvailability"]["status"]);

    let portal_home = text_request(edge_router.clone(), Method::GET, "/").await;
    assert_eq!(StatusCode::OK, portal_home.status);
    assert!(portal_home.body.contains("sdkwork-clawrouter portal"));

    let gateway_openapi = json_request(
        edge_router.clone(),
        Method::GET,
        "/openapi.json",
        Body::empty(),
    )
    .send()
    .await;
    assert_eq!(StatusCode::OK, gateway_openapi.status);
    assert!(gateway_openapi.json["openapi"].is_string());

    let admin_openapi = json_request(
        edge_router.clone(),
        Method::GET,
        "/backend/v3/api/openapi.json",
        Body::empty(),
    )
    .send()
    .await;
    assert_eq!(StatusCode::OK, admin_openapi.status);
    assert!(admin_openapi.json["openapi"].is_string());

    let app_openapi = json_request(
        edge_router,
        Method::GET,
        "/app/v3/api/openapi.json",
        Body::empty(),
    )
    .send()
    .await;
    assert_eq!(StatusCode::OK, app_openapi.status);
    assert!(app_openapi.json["openapi"].is_string());

    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
    let _ = portal.stop.send(());
}

#[tokio::test]
async fn all_in_one_edge_router_serves_sqlite_gateway_admin_and_app_without_service_ports() {
    let catalog = seeded_installed_gateway_catalog().await;
    let shared_runtime = seeded_shared_sqlite_runtime(&catalog).await;
    let trusted_subject_config = trusted_subject_config().unwrap();
    let app_session_config = app_session_config().unwrap();
    let payment_webhook_config = payment_webhook_config().unwrap();
    let gateway_router = seeded_gateway_router(&catalog).await;
    let admin_router = seeded_admin_router(
        &catalog,
        &shared_runtime,
        trusted_subject_config.clone(),
        app_session_config.clone(),
    );
    let app_router = seeded_app_router(
        &catalog,
        &shared_runtime,
        trusted_subject_config,
        app_session_config,
        payment_webhook_config,
        DeploymentMode::Desktop,
    )
    .await;
    let portal = spawn_router(portal_router()).await;

    let edge_router = sdkwork_clawrouter_edge_runtime::edge_server_router_with_in_process_upstreams(
        sdkwork_clawrouter_edge_runtime::EdgeServerConfig::try_new(
            "http://127.0.0.1:1",
            "http://127.0.0.1:1",
            "http://127.0.0.1:1",
            &portal.base_url,
        )
        .unwrap(),
        sdkwork_clawrouter_edge_runtime::EdgeInProcessUpstreams::new(
            gateway_router,
            admin_router,
            app_router,
        ),
    );

    let readyz = json_request(edge_router.clone(), Method::GET, "/readyz", Body::empty())
        .send()
        .await;
    assert_eq!(StatusCode::OK, readyz.status);
    assert_eq!("ok", readyz.json["status"]);
    assert_eq!("ok", readyz.json["upstreams"]["gateway"]["status"]);
    assert_eq!("ok", readyz.json["upstreams"]["backend"]["status"]);
    assert_eq!("ok", readyz.json["upstreams"]["app"]["status"]);
    assert_eq!("ok", readyz.json["upstreams"]["portal"]["status"]);

    let catalog_models = json_request(
        edge_router.clone(),
        Method::GET,
        "/v1/models",
        Body::empty(),
    )
    .with_authorization(catalog.gateway_authorization_header())
    .send()
    .await;
    assert_eq!(StatusCode::OK, catalog_models.status);
    assert_eq!("list", catalog_models.json["object"]);
    assert_eq!("qwen3.6-max-preview", catalog_models.json["data"][0]["id"]);

    let admin_models = json_request(
        edge_router.clone(),
        Method::GET,
        "/backend/v3/api/ai/models",
        Body::empty(),
    )
    .with_app_session(admin_app_session_headers())
    .send()
    .await;
    assert_eq!(StatusCode::OK, admin_models.status);
    assert_eq!("2000", admin_models.json["code"]);
    assert_eq!(
        "qwen3.6-max-preview",
        model_item_by_code(&admin_models.json["data"]["items"], "qwen3.6-max-preview")["model"]
    );

    let app_models = json_request(
        edge_router.clone(),
        Method::GET,
        "/app/v3/api/ai/models",
        Body::empty(),
    )
    .send()
    .await;
    assert_eq!(StatusCode::OK, app_models.status);
    assert_eq!("2000", app_models.json["code"]);
    assert_eq!(
        "qwen3.6-max-preview",
        model_item_by_code(&app_models.json["data"]["items"], "qwen3.6-max-preview")["model"]
    );

    let membership_package_groups = json_request(
        edge_router,
        Method::GET,
        "/app/v3/api/memberships/package_groups?page=1&page_size=200",
        Body::empty(),
    )
    .send()
    .await;
    assert_eq!(StatusCode::OK, membership_package_groups.status);
    assert_eq!(0, membership_package_groups.json["code"]);
    assert!(membership_package_groups.json["data"]["items"].is_array());

    let _ = portal.stop.send(());
}

#[tokio::test]
async fn edge_server_proxies_app_router_console_routing_api_through_generated_sdk_paths() {
    let catalog = seeded_installed_gateway_catalog().await;
    let shared_runtime = seeded_shared_sqlite_runtime(&catalog).await;
    let trusted_subject_config = trusted_subject_config().unwrap();
    let app_session_config = app_session_config().unwrap();
    let routing_store = Arc::new(InMemoryAppRoutingStore::default());
    let app_router = sdkwork_claw_http::service_router_with_contract_routes(
        "sdkwork-clawrouter-standalone-gateway-routing-smoke",
        sdkwork_claw_http::ApiSurface::App,
    )
    .merge(
        sdkwork_clawrouter_router_service::api::app_model_catalog_router(Arc::new(
            app_smoke_model_catalog(),
        )),
    )
    .merge(
        sdkwork_clawrouter_router_service::api::app_routing_router_with_read_store(
            routing_store.clone(),
        ),
    )
    .merge(
        sdkwork_clawrouter_router_service::api::app_routing_strategy_router_with_store(
            routing_store.clone(),
            Arc::new(DeterministicEntityUuidGenerator),
        ),
    )
    .merge(
        sdkwork_clawrouter_router_service::api::app_routing_channel_command_router_with_store(
            routing_store,
            Arc::new(DeterministicEntityUuidGenerator),
        ),
    )
    .layer(axum::middleware::from_fn_with_state(
        sdkwork_claw_http::AppSubjectBoundaryConfig::new(
            trusted_subject_config.clone(),
            app_session_config.clone(),
        ),
        sdkwork_claw_http::app_request_subject_boundary,
    ));
    let gateway_router = seeded_gateway_router(&catalog).await;
    let admin_router = seeded_admin_router(
        &catalog,
        &shared_runtime,
        trusted_subject_config,
        app_session_config,
    );

    let gateway = spawn_router(gateway_router).await;
    let admin = spawn_router(admin_router).await;
    let app = spawn_router(app_router).await;
    let portal = spawn_router(portal_router()).await;
    let edge_router = sdkwork_clawrouter_edge_runtime::edge_server_router(
        sdkwork_clawrouter_edge_runtime::EdgeServerConfig::try_new(
            &gateway.base_url,
            &admin.base_url,
            &app.base_url,
            &portal.base_url,
        )
        .unwrap(),
    );
    let app_session = app_session_headers();

    let models = json_request(
        edge_router.clone(),
        Method::GET,
        "/app/v3/api/ai/models",
        Body::empty(),
    )
    .with_app_session(app_session.clone())
    .send()
    .await;
    assert_eq!(StatusCode::OK, models.status);
    assert_eq!("2000", models.json["code"]);
    assert_eq!("gpt-4o-mini", models.json["data"]["items"][0]["model"]);

    let channels = json_request(
        edge_router.clone(),
        Method::GET,
        "/app/v3/api/ai/routing/channels",
        Body::empty(),
    )
    .with_app_session(app_session.clone())
    .send()
    .await;
    assert_eq!(StatusCode::OK, channels.status);
    assert_eq!("2000", channels.json["code"]);
    assert_eq!("OpenAI Primary", channels.json["data"]["items"][0]["name"]);
    assert_eq!(
        "ref:***openai-main",
        channels.json["data"]["items"][0]["apiKey"]
    );

    let api_keys = json_request(
        edge_router.clone(),
        Method::GET,
        "/app/v3/api/ai/routing/api_keys",
        Body::empty(),
    )
    .with_app_session(app_session.clone())
    .send()
    .await;
    assert_eq!(StatusCode::OK, api_keys.status);
    assert_eq!("Owner Key", api_keys.json["data"]["items"][0]["name"]);

    let traces = json_request(
        edge_router.clone(),
        Method::GET,
        "/app/v3/api/ai/routing/request_traces",
        Body::empty(),
    )
    .with_app_session(app_session.clone())
    .send()
    .await;
    assert_eq!(StatusCode::OK, traces.status);
    assert_eq!("trace-1", traces.json["data"]["items"][0]["id"]);
    assert_eq!("gpt-4o-mini", traces.json["data"]["items"][0]["model"]);

    let usage = json_request(
        edge_router.clone(),
        Method::GET,
        "/app/v3/api/ai/routing/usage",
        Body::empty(),
    )
    .with_app_session(app_session.clone())
    .send()
    .await;
    assert_eq!(StatusCode::OK, usage.status);
    assert_eq!(1, usage.json["data"]["chartData"][0]["requests"]);
    assert_eq!("gpt-4o-mini", usage.json["data"]["modelStats"][0]["m"]);

    let strategy = json_request(
        edge_router.clone(),
        Method::GET,
        "/app/v3/api/ai/routing/strategy",
        Body::empty(),
    )
    .with_app_session(app_session.clone())
    .send()
    .await;
    assert_eq!(StatusCode::OK, strategy.status);
    assert_eq!("weighted", strategy.json["data"]["strategy"]);
    assert_eq!(
        "gpt-4",
        strategy.json["data"]["mappingRules"][0]["sourceModel"]
    );

    let updated_strategy = json_request(
        edge_router.clone(),
        Method::PUT,
        "/app/v3/api/ai/routing/strategy",
        Body::from(
            json!({
                "strategy": "cost",
                "mappingRules": [
                    {
                        "id": "rule-edge",
                        "sourceModel": "gpt-4o",
                        "targetModel": "openai-gpt-4o-low-cost"
                    }
                ]
            })
            .to_string(),
        ),
    )
    .with_app_session(app_session.clone())
    .with_content_type("application/json")
    .send()
    .await;
    assert_eq!(StatusCode::OK, updated_strategy.status);
    assert_eq!(true, updated_strategy.json["data"]["success"]);

    let create_channel = json_request(
        edge_router.clone(),
        Method::POST,
        "/app/v3/api/ai/routing/channels",
        Body::from(
            json!({
                "name": "Edge Created OpenAI",
                "vendor": "OpenAI",
                "protocol": "OpenAI",
                "accessType": "Standard API Key",
                "baseUrl": "https://edge-created.example/v1",
                "secretRef": "vault://providers/openai/edge-created",
                "models": ["gpt-4o-mini"],
                "capabilities": ["llm"],
                "weight": 25,
                "status": "active"
            })
            .to_string(),
        ),
    )
    .with_app_session(app_session.clone())
    .with_content_type("application/json")
    .send()
    .await;
    assert_eq!(StatusCode::OK, create_channel.status);
    assert_eq!("2000", create_channel.json["code"]);
    assert_eq!(
        "Edge Created OpenAI",
        create_channel.json["data"]["item"]["name"]
    );
    let created_channel_id = create_channel.json["data"]["item"]["id"]
        .as_str()
        .unwrap()
        .to_owned();

    let update_channel = json_request(
        edge_router.clone(),
        Method::PUT,
        &format!("/app/v3/api/ai/routing/channels/{created_channel_id}"),
        Body::from(
            json!({
                "name": "Edge Updated OpenAI",
                "models": ["gpt-4o"],
                "weight": 30
            })
            .to_string(),
        ),
    )
    .with_app_session(app_session.clone())
    .with_content_type("application/json")
    .send()
    .await;
    assert_eq!(StatusCode::OK, update_channel.status);
    assert_eq!(
        "Edge Updated OpenAI",
        update_channel.json["data"]["item"]["name"]
    );
    assert_eq!(30, update_channel.json["data"]["item"]["weight"]);

    let status = json_request(
        edge_router.clone(),
        Method::PUT,
        &format!("/app/v3/api/ai/routing/channels/{created_channel_id}/status"),
        Body::from(r#"{"status":"disabled"}"#),
    )
    .with_app_session(app_session.clone())
    .with_content_type("application/json")
    .send()
    .await;
    assert_eq!(StatusCode::OK, status.status);
    assert_eq!("disabled", status.json["data"]["item"]["status"]);

    let test_channel = json_request(
        edge_router.clone(),
        Method::POST,
        &format!("/app/v3/api/ai/routing/channels/{created_channel_id}/verify"),
        Body::empty(),
    )
    .with_app_session(app_session.clone())
    .send()
    .await;
    assert_eq!(StatusCode::OK, test_channel.status);
    assert_eq!(true, test_channel.json["data"]["success"]);
    assert_eq!(created_channel_id, test_channel.json["data"]["channelId"]);

    let delete_channel = json_request(
        edge_router,
        Method::DELETE,
        &format!("/app/v3/api/ai/routing/channels/{created_channel_id}"),
        Body::empty(),
    )
    .with_app_session(app_session)
    .send()
    .await;
    assert_eq!(StatusCode::OK, delete_channel.status);
    assert_eq!(true, delete_channel.json["data"]["deleted"]);

    let _ = gateway.stop.send(());
    let _ = admin.stop.send(());
    let _ = app.stop.send(());
    let _ = portal.stop.send(());
}

#[tokio::test]
async fn iam_credential_entry_allows_bootstrap_access_token_jwt() {
    let catalog = seeded_installed_gateway_catalog().await;
    let shared_runtime = seeded_shared_sqlite_runtime(&catalog).await;
    let trusted_subject_config = trusted_subject_config().unwrap();
    let app_session_config = app_session_config().unwrap();
    let payment_webhook_config = payment_webhook_config().unwrap();
    let app_router = seeded_app_router(
        &catalog,
        &shared_runtime,
        trusted_subject_config,
        app_session_config,
        payment_webhook_config,
        DeploymentMode::Desktop,
    )
    .await;
    let bootstrap_access = bootstrap_access_token_jwt("100001", "sdkwork-clawrouter");

    let device_authorization = json_request(
        app_router.clone(),
        Method::POST,
        "/app/v3/api/oauth/device_authorizations",
        Body::from(r#"{"purpose":"login"}"#),
    )
    .with_content_type("application/json")
    .with_access_token(bootstrap_access.clone())
    .send()
    .await;
    assert_eq!(
        StatusCode::OK,
        device_authorization.status,
        "device authorization create must pass IAM bootstrap access gate: {}",
        device_authorization.json
    );
    assert_eq!("2000", device_authorization.json["code"]);
    assert!(
        device_authorization.json["data"]["sessionKey"]
            .as_str()
            .is_some_and(|value| !value.is_empty()),
        "device authorization must return sessionKey: {}",
        device_authorization.json
    );

    let invalid_login = json_request(
        app_router.clone(),
        Method::POST,
        "/app/v3/api/auth/sessions",
        Body::from(
            json!({
                "grantType": "password",
                "username": "no-such-user@sdkwork-iam.local",
                "password": "wrong-password"
            })
            .to_string(),
        ),
    )
    .with_content_type("application/json")
    .with_access_token(bootstrap_access.clone())
    .send()
    .await;
    assert!(
        invalid_login.json["detail"].as_str()
            != Some("IAM database session resolution is unavailable in this deployment")
            && invalid_login.json["msg"].as_str()
                != Some("protected routes require authenticated credentials"),
        "login must pass IAM bootstrap access gate: {}",
        invalid_login.json
    );
    assert!(
        invalid_login.json.get("code").is_some(),
        "credential-entry request must reach application auth handler: {}",
        invalid_login.json
    );

    let device_auth_id = device_authorization.json["data"]["sessionKey"]
        .as_str()
        .expect("device authorization sessionKey");
    let password_completion_path =
        format!("/app/v3/api/oauth/device_authorizations/{device_auth_id}/password_completions");
    let password_completion = json_request(
        app_router,
        Method::POST,
        &password_completion_path,
        Body::from(
            json!({
                "username": "no-such-user@sdkwork-iam.local",
                "password": "wrong-password"
            })
            .to_string(),
        ),
    )
    .with_content_type("application/json")
    .with_access_token(bootstrap_access.clone())
    .send()
    .await;
    assert_ne!(
        password_completion.json["detail"].as_str(),
        Some("local IAM app-api requires a PostgreSQL database pool"),
        "sqlite QR password completion must use local auth bridge: {}",
        password_completion.json
    );
    assert_ne!(
        password_completion.json["msg"].as_str(),
        Some("local IAM app-api requires a PostgreSQL database pool"),
        "sqlite QR password completion must use local auth bridge: {}",
        password_completion.json
    );
    assert!(
        password_completion.json.get("code").is_some(),
        "sqlite QR password completion must reach handler: {}",
        password_completion.json
    );
}

fn model_item_by_code<'a>(items: &'a serde_json::Value, model: &str) -> &'a serde_json::Value {
    items
        .as_array()
        .unwrap_or_else(|| panic!("expected model array, got {items}"))
        .iter()
        .find(|item| item.get("model").and_then(|value| value.as_str()) == Some(model))
        .unwrap_or_else(|| panic!("expected seeded model {model} in {items}"))
}

struct JsonRequestBuilder {
    router: Router,
    method: Method,
    uri: String,
    body: Body,
    authorization: Option<String>,
    access_token: Option<String>,
    content_type: Option<&'static str>,
}

impl JsonRequestBuilder {
    fn with_authorization(mut self, authorization: String) -> Self {
        self.authorization = Some(authorization);
        self
    }

    fn with_app_session(mut self, headers: AppSessionHeaders) -> Self {
        self.authorization = Some(headers.authorization);
        self.access_token = Some(headers.access_token);
        self
    }

    fn with_access_token(mut self, access_token: impl Into<String>) -> Self {
        self.access_token = Some(access_token.into());
        self
    }

    fn with_content_type(mut self, content_type: &'static str) -> Self {
        self.content_type = Some(content_type);
        self
    }

    async fn send(self) -> JsonResponse {
        let mut builder = Request::builder()
            .method(self.method)
            .uri(self.uri)
            .header(header::HOST, "sdkwork.example.test");
        if let Some(authorization) = self.authorization {
            builder = builder.header(header::AUTHORIZATION, authorization);
        }
        if let Some(access_token) = self.access_token {
            builder = builder.header("Access-Token", access_token);
        }
        if let Some(content_type) = self.content_type {
            builder = builder.header(header::CONTENT_TYPE, content_type);
        }

        let response = self
            .router
            .oneshot(builder.body(self.body).unwrap())
            .await
            .unwrap();
        let status = response.status();
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let json = serde_json::from_slice(&body).unwrap_or_else(|error| {
            panic!(
                "expected JSON response but got parse error {error}; body={}",
                String::from_utf8_lossy(&body)
            )
        });
        JsonResponse { status, json }
    }
}

struct JsonResponse {
    status: StatusCode,
    json: serde_json::Value,
}

struct TextResponse {
    status: StatusCode,
    body: String,
}

fn json_request(router: Router, method: Method, uri: &str, body: Body) -> JsonRequestBuilder {
    JsonRequestBuilder {
        router,
        method,
        uri: uri.to_owned(),
        body,
        authorization: None,
        access_token: None,
        content_type: None,
    }
}

async fn text_request(router: Router, method: Method, uri: &str) -> TextResponse {
    let response = router
        .oneshot(
            Request::builder()
                .method(method)
                .uri(uri)
                .header(header::HOST, "sdkwork.example.test")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    TextResponse {
        status,
        body: String::from_utf8_lossy(&body).into_owned(),
    }
}

async fn spawn_router(router: Router) -> RunningService {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let (stop, stopped) = oneshot::channel::<()>();

    tokio::spawn(async move {
        axum::serve(listener, router)
            .with_graceful_shutdown(async {
                let _ = stopped.await;
            })
            .await
            .unwrap();
    });

    RunningService {
        base_url: format!("http://{address}"),
        stop,
    }
}

fn portal_router() -> Router {
    Router::new()
        .route(
            "/healthz",
            get(|| async {
                Json(json!({
                    "status": "ok",
                    "service": "sdkwork-clawrouter-pc",
                }))
                .into_response()
            }),
        )
        .fallback(|| async { "sdkwork-clawrouter portal" })
}

#[derive(Clone)]
struct AppSessionHeaders {
    authorization: String,
    access_token: String,
}

fn app_session_headers() -> AppSessionHeaders {
    app_session_headers_for_subject(default_trusted_request_subject())
}

fn admin_app_session_headers() -> AppSessionHeaders {
    app_session_headers_for_subject(trusted_request_subject(100_001, 0, 1))
}

fn app_session_headers_for_subject(
    subject: sdkwork_claw_http::TrustedRequestSubject,
) -> AppSessionHeaders {
    let issued_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0);
    let expires_at = issued_at + 300;
    let (authorization, access_token) =
        app_session_dual_token_headers(subject, issued_at, expires_at).unwrap();
    AppSessionHeaders {
        authorization,
        access_token,
    }
}

fn app_smoke_model_catalog() -> InMemoryPricingCatalog {
    let mut catalog = InMemoryPricingCatalog::default();
    catalog.add_vendor(ModelVendorDefinition::new(
        "openai",
        ModelVendor::OpenAi,
        "OpenAI",
    ));
    catalog.add_model(AiModel::new(
        "gpt-4o-mini",
        "GPT-4o mini",
        "openai",
        vec!["chat", "tools"],
    ));
    catalog.add_price(ModelPrice::new_for_catalog_key(
        "openai/gpt-4o-mini",
        "gpt-4o-mini",
        PriceSide::OfficialReference,
        BillingMeter::LlmInputToken,
        Money::usd("0.150000").unwrap(),
    ));
    catalog
}

#[derive(Default)]
struct InMemoryAppRoutingStore {
    channels: Mutex<Vec<AppRoutingChannelItem>>,
    strategy: Mutex<AppRoutingStrategySnapshot>,
}

impl InMemoryAppRoutingStore {
    fn channels_snapshot(&self) -> Vec<AppRoutingChannelItem> {
        let mut channels = self.channels.lock().unwrap();
        if channels.is_empty() {
            channels.push(default_routing_channel("3001", "OpenAI Primary"));
        }
        channels.clone()
    }

    fn strategy_snapshot(&self) -> AppRoutingStrategySnapshot {
        let mut strategy = self.strategy.lock().unwrap();
        if strategy.mapping_rules.is_empty() {
            *strategy = AppRoutingStrategySnapshot {
                strategy: AppRoutingStrategyType::Weighted,
                mapping_rules: vec![AppRoutingMappingRule {
                    id: "rule-1".to_owned(),
                    source_model: "gpt-4".to_owned(),
                    target_model: "azure-gpt4-32k".to_owned(),
                }],
            };
        }
        strategy.clone()
    }
}

impl AppRoutingReadStore for InMemoryAppRoutingStore {
    fn load_routing_channels<'a>(
        &'a self,
        _subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
    ) -> AppRoutingReadFuture<'a, AppRoutingChannelListPage> {
        Box::pin(async move {
            let items = self.channels_snapshot();
            Ok(AppRoutingChannelListPage {
                total: items.len() as i64,
                items,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn load_routing_api_keys<'a>(
        &'a self,
        _subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
    ) -> AppRoutingReadFuture<'a, AppRoutingApiKeyListPage> {
        Box::pin(async move {
            let items = vec![AppRoutingApiKeyItem {
                id: "100".to_owned(),
                name: "Owner Key".to_owned(),
                display_key: "sk-owner********ABCD".to_owned(),
                copyable_key: Some("sk-owner-secret".to_owned()),
                status: "enabled".to_owned(),
                total_usage: "5".to_owned(),
                created_at: "2026-04-29 12:00:00".to_owned(),
            }];
            Ok(AppRoutingApiKeyListPage {
                total: items.len() as i64,
                items,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn load_routing_request_traces<'a>(
        &'a self,
        _subject: Option<AppRoutingSubject>,
        query: AppRoutingListQuery,
    ) -> AppRoutingReadFuture<'a, AppRoutingRequestTraceListPage> {
        Box::pin(async move {
            let items = vec![AppRoutingRequestTraceItem {
                id: "trace-1".to_owned(),
                time: "2026-04-29 12:01:00".to_owned(),
                model: "gpt-4o-mini".to_owned(),
                channel: "OpenAI Primary".to_owned(),
                status: 200,
                duration: "345ms".to_owned(),
                tokens: 150,
                trace_id: "trace-1".to_owned(),
                request_id: "request-1".to_owned(),
                request_path: "/v1/chat/completions".to_owned(),
                http_method: "POST".to_owned(),
                request_payload_hash: "sha256:req".to_owned(),
                response_payload_hash: "sha256:res".to_owned(),
                request_bytes: 256,
                response_bytes: 1024,
                provider_error_code: String::new(),
                error_type: String::new(),
                error_message_masked: String::new(),
                started_at: "2026-04-29 12:01:00".to_owned(),
                ended_at: "2026-04-29 12:01:00.345".to_owned(),
                streaming: false,
            }];
            Ok(AppRoutingRequestTraceListPage {
                total: items.len() as i64,
                items,
                page_no: query.page_no,
                page_size: query.page_size,
            })
        })
    }

    fn load_routing_usage<'a>(
        &'a self,
        _subject: Option<AppRoutingSubject>,
    ) -> AppRoutingReadFuture<'a, AppRoutingUsageSnapshot> {
        Box::pin(async move {
            Ok(AppRoutingUsageSnapshot {
                chart_data: vec![AppRoutingUsageData {
                    time: "2026-04-29".to_owned(),
                    requests: 1,
                    latency: 345,
                }],
                model_stats: vec![AppRoutingModelStats {
                    m: "gpt-4o-mini".to_owned(),
                    req: "1".to_owned(),
                    sr: "100.0%".to_owned(),
                    tok: "150".to_owned(),
                    lat: "345ms".to_owned(),
                }],
            })
        })
    }
}

impl AppRoutingStrategyStore for InMemoryAppRoutingStore {
    fn load_routing_strategy<'a>(
        &'a self,
        _subject: Option<AppRoutingStrategySubject>,
    ) -> AppRoutingStrategyFuture<'a, AppRoutingStrategySnapshot> {
        Box::pin(async move { Ok(self.strategy_snapshot()) })
    }

    fn update_routing_strategy<'a>(
        &'a self,
        command: UpdateAppRoutingStrategyCommand,
    ) -> AppRoutingStrategyFuture<'a, UpdateAppRoutingStrategyOutcome> {
        Box::pin(async move {
            *self.strategy.lock().unwrap() = command.snapshot;
            Ok(UpdateAppRoutingStrategyOutcome { success: true })
        })
    }
}

impl AppRoutingChannelCommandStore for InMemoryAppRoutingStore {
    fn create_channel<'a>(
        &'a self,
        command: CreateAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, AppRoutingChannelMutationOutcome> {
        Box::pin(async move {
            let mut channels = self.channels.lock().unwrap();
            let id = (channels.len() + 4001).to_string();
            let item = AppRoutingChannelItem {
                id,
                name: command.name,
                vendor: command.vendor.clone(),
                provider: command.vendor,
                provider_code: command.provider_code,
                protocol: command.protocol,
                access_type: command.access_type,
                base_url: command.base_url.unwrap_or_default(),
                api_key: "ref:***edge-created".to_owned(),
                models: Vec::new(),
                capabilities: command.capabilities,
                is_multimodal: command.is_multimodal,
                timeout_ms: command.timeout_ms,
                retry_policy: None,
                circuit_breaker_policy: None,
                weight: command.weight,
                status: command.status,
                latency: "N/A".to_owned(),
                rpm: 0,
                balance: "N/A".to_owned(),
                errors: 0,
            };
            channels.push(item.clone());
            Ok(AppRoutingChannelMutationOutcome { item })
        })
    }

    fn update_channel<'a>(
        &'a self,
        command: UpdateAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelMutationOutcome>> {
        Box::pin(async move {
            let mut channels = self.channels.lock().unwrap();
            let Some(item) = channels
                .iter_mut()
                .find(|item| item.id == command.channel_id.to_string())
            else {
                return Ok(None);
            };
            if let Some(name) = command.name {
                item.name = name;
            }
            if let Some(vendor) = command.vendor {
                item.vendor = vendor.clone();
                item.provider = vendor;
            }
            if let Some(provider_code) = command.provider_code {
                item.provider_code = provider_code;
            }
            if let Some(protocol) = command.protocol {
                item.protocol = protocol;
            }
            if let Some(access_type) = command.access_type {
                item.access_type = access_type;
            }
            if let Some(base_url) = command.base_url {
                item.base_url = base_url.unwrap_or_default();
            }
            if let Some(capabilities) = command.capabilities {
                item.capabilities = capabilities;
            }
            if let Some(weight) = command.weight {
                item.weight = weight;
            }
            if let Some(status) = command.status {
                item.status = status;
            }
            Ok(Some(AppRoutingChannelMutationOutcome {
                item: item.clone(),
            }))
        })
    }

    fn set_channel_status<'a>(
        &'a self,
        command: SetAppRoutingChannelStatusCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelMutationOutcome>> {
        Box::pin(async move {
            let mut channels = self.channels.lock().unwrap();
            let Some(item) = channels
                .iter_mut()
                .find(|item| item.id == command.channel_id.to_string())
            else {
                return Ok(None);
            };
            item.status = command.status;
            Ok(Some(AppRoutingChannelMutationOutcome {
                item: item.clone(),
            }))
        })
    }

    fn delete_channel<'a>(
        &'a self,
        command: DeleteAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, AppRoutingChannelDeleteOutcome> {
        Box::pin(async move {
            let mut channels = self.channels.lock().unwrap();
            let before = channels.len();
            channels.retain(|item| item.id != command.channel_id.to_string());
            Ok(AppRoutingChannelDeleteOutcome {
                deleted: before != channels.len(),
            })
        })
    }

    fn test_channel<'a>(
        &'a self,
        command: TestAppRoutingChannelCommand,
    ) -> AppRoutingChannelCommandFuture<'a, Option<AppRoutingChannelTestOutcome>> {
        Box::pin(async move {
            let channels = self.channels.lock().unwrap();
            let Some(item) = channels
                .iter()
                .find(|item| item.id == command.channel_id.to_string())
                .cloned()
            else {
                return Ok(None);
            };
            Ok(Some(AppRoutingChannelTestOutcome {
                channel_id: command.channel_id.to_string(),
                success: true,
                status: item.status.clone(),
                latency: "12ms".to_owned(),
                item,
            }))
        })
    }
}

struct DeterministicEntityUuidGenerator;

impl sdkwork_clawrouter_router_service::application::EntityUuidGenerator
    for DeterministicEntityUuidGenerator
{
    fn generate_entity_uuid(
        &self,
    ) -> sdkwork_clawrouter_router_service::domain::DomainResult<String> {
        Ok("edge-smoke-uuid".to_owned())
    }
}

fn default_routing_channel(id: &str, name: &str) -> AppRoutingChannelItem {
    AppRoutingChannelItem {
        id: id.to_owned(),
        name: name.to_owned(),
        vendor: "OpenAI".to_owned(),
        provider: "OpenAI".to_owned(),
        provider_code: "openai".to_owned(),
        protocol: "OpenAI".to_owned(),
        access_type: "Standard API Key".to_owned(),
        base_url: "https://api.openai.example/v1".to_owned(),
        api_key: "ref:***openai-main".to_owned(),
        models: vec!["gpt-4o-mini".to_owned()],
        capabilities: vec!["llm".to_owned()],
        is_multimodal: false,
        timeout_ms: Some(60_000),
        retry_policy: None,
        circuit_breaker_policy: None,
        weight: 100,
        status: "active".to_owned(),
        latency: "120ms".to_owned(),
        rpm: 60,
        balance: "N/A".to_owned(),
        errors: 0,
    }
}
