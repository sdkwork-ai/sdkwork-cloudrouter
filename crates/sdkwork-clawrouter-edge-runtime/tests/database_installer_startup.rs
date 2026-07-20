use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static PATH_COUNTER: AtomicU64 = AtomicU64::new(0);

#[tokio::test]
async fn gateway_env_startup_rejects_zero_config_server_placeholder_postgres() {
    let _guard = env_guard().lock().unwrap();
    let saved_database_url = std::env::var("SDKWORK_CLAW_DATABASE_URL").ok();
    let saved_deployment_mode = std::env::var("SDKWORK_CLAW_DEPLOYMENT_MODE").ok();
    let saved_config_file = std::env::var("SDKWORK_CLAW_CONFIG_FILE").ok();
    let saved_snowflake_node_id = std::env::var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID").ok();
    let saved_api_key_pepper = std::env::var("SDKWORK_CLAW_API_KEY_PEPPER").ok();
    let config_path = unique_runtime_config_path();
    std::env::remove_var("SDKWORK_CLAW_DATABASE_URL");
    std::env::set_var("SDKWORK_CLAW_DEPLOYMENT_MODE", "server");
    std::env::set_var("SDKWORK_CLAW_CONFIG_FILE", &config_path);
    std::env::set_var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID", "17");
    std::env::set_var(
        "SDKWORK_CLAW_API_KEY_PEPPER",
        "0123456789abcdef0123456789abcdef",
    );

    let router_result = sdkwork_clawrouter_edge_runtime::runtime::router_from_env().await;

    restore_env_var("SDKWORK_CLAW_DATABASE_URL", saved_database_url);
    restore_env_var("SDKWORK_CLAW_DEPLOYMENT_MODE", saved_deployment_mode);
    restore_env_var("SDKWORK_CLAW_CONFIG_FILE", saved_config_file);
    restore_env_var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID", saved_snowflake_node_id);
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

#[tokio::test]
async fn gateway_env_startup_rejects_missing_server_snowflake_node_id_before_database_bootstrap() {
    let _guard = env_guard().lock().unwrap();
    let saved_database_url = std::env::var("SDKWORK_CLAW_DATABASE_URL").ok();
    let saved_deployment_mode = std::env::var("SDKWORK_CLAW_DEPLOYMENT_MODE").ok();
    let saved_config_file = std::env::var("SDKWORK_CLAW_CONFIG_FILE").ok();
    let saved_snowflake_node_id = std::env::var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID").ok();
    let config_path = unique_runtime_config_path();
    std::env::remove_var("SDKWORK_CLAW_DATABASE_URL");
    std::env::set_var("SDKWORK_CLAW_DEPLOYMENT_MODE", "server");
    std::env::set_var("SDKWORK_CLAW_CONFIG_FILE", &config_path);
    std::env::remove_var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID");

    let router_result = sdkwork_clawrouter_edge_runtime::runtime::router_from_env().await;

    restore_env_var("SDKWORK_CLAW_DATABASE_URL", saved_database_url);
    restore_env_var("SDKWORK_CLAW_DEPLOYMENT_MODE", saved_deployment_mode);
    restore_env_var("SDKWORK_CLAW_CONFIG_FILE", saved_config_file);
    restore_env_var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID", saved_snowflake_node_id);

    let error = router_result
        .expect_err("gateway server startup must require an explicit Snowflake node ID")
        .to_string();
    assert!(error.contains("SDKWORK_CLAW_SNOWFLAKE_NODE_ID"));
    assert!(error.contains("server"));
    assert!(
        !config_path.exists(),
        "Snowflake validation must fail before database bootstrap creates runtime configuration"
    );
}

fn unique_runtime_config_path() -> std::path::PathBuf {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let counter = PATH_COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut path = std::env::temp_dir();
    path.push(format!(
        "sdkwork-clawrouter-edge-runtime-runtime-{millis}-{counter}"
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
