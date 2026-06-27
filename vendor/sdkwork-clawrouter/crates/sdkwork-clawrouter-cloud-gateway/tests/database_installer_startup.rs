use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use sdkwork_claw_config::{ApiKeySecurityConfig, DatabaseConfig};
use sdkwork_clawrouter_cloud_gateway::runtime::router_with_database_and_api_key_config;
use sdkwork_clawrouter_router_service::infrastructure::sql::installer::{
    DatabaseInstaller, CURRENT_SCHEMA_VERSION,
};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::Row;
use std::str::FromStr;

static DB_COUNTER: AtomicU64 = AtomicU64::new(0);

#[tokio::test]
async fn gateway_startup_installs_empty_sqlite_database_before_loading_catalog() {
    let database_url = unique_sqlite_url();
    let config = DatabaseConfig::from_url_with_max_connections(database_url.as_str(), 1).unwrap();
    let api_key_config =
        ApiKeySecurityConfig::from_pepper_secret("0123456789abcdef0123456789abcdef").unwrap();

    let _router = router_with_database_and_api_key_config(config, Some(api_key_config))
        .await
        .unwrap();

    let options = SqliteConnectOptions::from_str(database_url.as_str())
        .unwrap()
        .create_if_missing(false);
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .unwrap();

    let state =
        sqlx::query("SELECT status, schema_version, catalog_version FROM system_installation_state WHERE id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!("installed", state.get::<String, _>("status"));
    assert_eq!(
        CURRENT_SCHEMA_VERSION,
        state.get::<String, _>("schema_version")
    );
    assert_eq!("2026.05.08.1", state.get::<String, _>("catalog_version"));

    let gpt_5_5_count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM ai_model WHERE model = 'gpt-5.5'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(1, gpt_5_5_count);

    let gpt_5_4_count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM ai_model WHERE model = 'gpt-5.4'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(1, gpt_5_4_count);

    let gpt_image_2_count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM ai_model WHERE model = 'gpt-image-2'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(1, gpt_image_2_count);

    let deprecated_gpt_5_2_routing_state: i64 =
        sqlx::query_scalar("SELECT routing_state FROM ai_model WHERE model = 'gpt-5.2'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(0, deprecated_gpt_5_2_routing_state);

    let ranking_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(1) FROM ai_model_rank_snapshot WHERE rank_scope = 'commercial-default'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        ranking_count >= 9,
        "gateway startup installer must seed model rankings"
    );
}

#[tokio::test]
async fn gateway_env_startup_can_skip_installer_when_workspace_already_ensured_database() {
    let database_url = unique_sqlite_url();
    let options = SqliteConnectOptions::from_str(database_url.as_str())
        .unwrap()
        .create_if_missing(true);
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .unwrap();
    DatabaseInstaller::for_sqlite(pool.clone())
        .ensure_installed()
        .await
        .unwrap();
    sqlx::query(
        "UPDATE system_installation_state SET upgraded_at = '2000-01-01 00:00:00' WHERE id = 1",
    )
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;

    let _guard = env_guard().lock().unwrap();
    let saved_database_url = std::env::var("SDKWORK_CLAW_DATABASE_URL").ok();
    let saved_max_connections = std::env::var("SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS").ok();
    let saved_api_key_pepper = std::env::var("SDKWORK_CLAW_API_KEY_PEPPER").ok();
    let saved_startup_install_mode = std::env::var("SDKWORK_CLAW_STARTUP_INSTALL_MODE").ok();
    std::env::set_var("SDKWORK_CLAW_DATABASE_URL", database_url.as_str());
    std::env::set_var("SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS", "1");
    std::env::set_var(
        "SDKWORK_CLAW_API_KEY_PEPPER",
        "0123456789abcdef0123456789abcdef",
    );
    std::env::set_var("SDKWORK_CLAW_STARTUP_INSTALL_MODE", "skip");

    let _router = sdkwork_clawrouter_cloud_gateway::runtime::router_from_env()
        .await
        .unwrap();

    restore_env_var("SDKWORK_CLAW_DATABASE_URL", saved_database_url);
    restore_env_var(
        "SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS",
        saved_max_connections,
    );
    restore_env_var("SDKWORK_CLAW_API_KEY_PEPPER", saved_api_key_pepper);
    restore_env_var(
        "SDKWORK_CLAW_STARTUP_INSTALL_MODE",
        saved_startup_install_mode,
    );

    let options = SqliteConnectOptions::from_str(database_url.as_str())
        .unwrap()
        .create_if_missing(false);
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .unwrap();
    let upgraded_at: String =
        sqlx::query_scalar("SELECT upgraded_at FROM system_installation_state WHERE id = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!("2000-01-01 00:00:00", upgraded_at);
}

#[tokio::test]
async fn gateway_env_startup_rejects_zero_config_server_placeholder_postgres() {
    let _guard = env_guard().lock().unwrap();
    let saved_database_url = std::env::var("SDKWORK_CLAW_DATABASE_URL").ok();
    let saved_deployment_mode = std::env::var("SDKWORK_CLAW_DEPLOYMENT_MODE").ok();
    let saved_config_file = std::env::var("SDKWORK_CLAW_CONFIG_FILE").ok();
    let saved_api_key_pepper = std::env::var("SDKWORK_CLAW_API_KEY_PEPPER").ok();
    let config_path = unique_runtime_config_path();
    std::env::remove_var("SDKWORK_CLAW_DATABASE_URL");
    std::env::set_var("SDKWORK_CLAW_DEPLOYMENT_MODE", "server");
    std::env::set_var("SDKWORK_CLAW_CONFIG_FILE", &config_path);
    std::env::set_var(
        "SDKWORK_CLAW_API_KEY_PEPPER",
        "0123456789abcdef0123456789abcdef",
    );

    let router_result = sdkwork_clawrouter_cloud_gateway::runtime::router_from_env().await;

    restore_env_var("SDKWORK_CLAW_DATABASE_URL", saved_database_url);
    restore_env_var("SDKWORK_CLAW_DEPLOYMENT_MODE", saved_deployment_mode);
    restore_env_var("SDKWORK_CLAW_CONFIG_FILE", saved_config_file);
    restore_env_var("SDKWORK_CLAW_API_KEY_PEPPER", saved_api_key_pepper);

    let error = router_result
        .expect_err("gateway server startup must reject placeholder PostgreSQL config")
        .to_string();
    assert!(error.contains("PostgreSQL configuration is incomplete"));
    assert!(error.contains("Server/service deployments use external PostgreSQL by default"));
    assert!(config_path.exists());
    let generated_config = std::fs::read_to_string(config_path).unwrap();
    assert!(generated_config.contains("engine = \"postgresql\""));
    assert!(generated_config.contains("deployment_mode = \"server\""));
}

fn unique_sqlite_url() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let counter = DB_COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut path = std::env::temp_dir();
    path.push(format!(
        "sdkwork-clawrouter-cloud-gateway-startup-{millis}-{counter}.sqlite"
    ));
    format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"))
}

fn unique_runtime_config_path() -> std::path::PathBuf {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let counter = DB_COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut path = std::env::temp_dir();
    path.push(format!(
        "sdkwork-clawrouter-cloud-gateway-runtime-{millis}-{counter}"
    ));
    path.push("sdkwork-clawrouter.toml");
    path
}

fn env_guard() -> &'static std::sync::Mutex<()> {
    static GUARD: std::sync::OnceLock<std::sync::Mutex<()>> = std::sync::OnceLock::new();
    GUARD.get_or_init(|| std::sync::Mutex::new(()))
}

fn restore_env_var(name: &str, value: Option<String>) {
    if let Some(value) = value {
        std::env::set_var(name, value);
    } else {
        std::env::remove_var(name);
    }
}
