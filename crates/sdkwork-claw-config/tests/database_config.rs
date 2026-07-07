use sdkwork_claw_config::{
    DatabaseConfig, DatabaseEngine, RuntimeConfigInitializationAction, RuntimeConfigLocation,
    RuntimeConfigProfile, RuntimeTomlConfig, StartupInstallMode,
};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

static ENV_LOCK: Mutex<()> = Mutex::new(());

#[test]
fn parses_sqlite_database_urls_for_desktop_deployment() {
    let config = DatabaseConfig::from_url("sqlite::memory:").unwrap();

    assert_eq!(DatabaseEngine::Sqlite, config.engine);
    assert_eq!("sqlite::memory:", config.url);
    assert_eq!(
        DatabaseConfig::DEFAULT_MAX_CONNECTIONS,
        config.max_connections
    );
}

#[test]
fn parses_postgres_database_urls_for_server_docker_and_kubernetes() {
    let config = DatabaseConfig::from_url_with_max_connections(
        "postgres://sdkwork:sdkwork@localhost:5432/sdkwork_claw_router",
        32,
    )
    .unwrap();

    assert_eq!(DatabaseEngine::Postgres, config.engine);
    assert_eq!(32, config.max_connections);
}

#[test]
fn rejects_unsupported_or_empty_database_urls() {
    assert!(DatabaseConfig::from_url("").is_err());
    assert!(DatabaseConfig::from_url("mysql://localhost/sdkwork").is_err());
}

#[test]
fn rejects_zero_database_pool_size() {
    let error = DatabaseConfig::from_url_with_max_connections("sqlite::memory:", 0).unwrap_err();

    assert!(error.contains("max connections"));
}

#[test]
fn parses_optional_environment_database_config_parts() {
    assert_eq!(
        None,
        DatabaseConfig::from_optional_parts(None, None).unwrap()
    );

    let config = DatabaseConfig::from_optional_parts(
        Some("sqlite::memory:".to_owned()),
        Some("4".to_owned()),
    )
    .unwrap()
    .unwrap();

    assert_eq!(DatabaseEngine::Sqlite, config.engine);
    assert_eq!(4, config.max_connections);
}

#[test]
fn rejects_invalid_environment_database_pool_size() {
    let error = DatabaseConfig::from_optional_parts(
        Some("sqlite::memory:".to_owned()),
        Some("bad".to_owned()),
    )
    .unwrap_err();

    assert!(error.contains("SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS"));
}

#[test]
fn reads_database_config_from_runtime_toml_file() {
    let config_path = write_temp_config(
        "server-postgres",
        r#"
[database]
engine = "postgresql"
url = "postgresql://sdkwork:sdkwork@db.internal:5432/sdkwork_claw_router"
max_connections = 24
"#,
    );

    let config = DatabaseConfig::from_config_file(&config_path)
        .unwrap()
        .unwrap();

    assert_eq!(DatabaseEngine::Postgres, config.engine);
    assert_eq!(
        "postgresql://sdkwork:sdkwork@db.internal:5432/sdkwork_claw_router",
        config.url
    );
    assert_eq!(24, config.max_connections);
}

#[test]
fn runtime_config_file_supports_sqlite_desktop_defaults() {
    let config_path = write_temp_config(
        "desktop-sqlite",
        r#"
[database]
engine = "sqlite"
url = "sqlite:///Users/example/.sdkwork/router/data/clawrouter.sqlite"
max_connections = 1
"#,
    );

    let config = DatabaseConfig::from_config_file(&config_path)
        .unwrap()
        .unwrap();

    assert_eq!(DatabaseEngine::Sqlite, config.engine);
    assert_eq!(1, config.max_connections);
    assert!(config.url.ends_with("clawrouter.sqlite"));
}

#[test]
fn runtime_config_file_accepts_standard_toml_literal_strings() {
    let config = DatabaseConfig::from_runtime_config_toml(
        r#"
[database]
engine = 'postgresql'
url = 'postgresql://sdkwork:sdkwork@db.internal:5432/sdkwork_claw_router'
max_connections = 18
"#,
    )
    .unwrap();

    assert_eq!(DatabaseEngine::Postgres, config.engine);
    assert_eq!(
        "postgresql://sdkwork:sdkwork@db.internal:5432/sdkwork_claw_router",
        config.url
    );
    assert_eq!(18, config.max_connections);
}

#[test]
fn runtime_config_file_supports_structured_postgres_password_directly() {
    let config = DatabaseConfig::from_runtime_config_toml(
        r#"
[database]
engine = "postgresql"
host = "db.internal"
port = 5432
database = "sdkwork_claw_router"
username = "sdkwork_claw_router"
password = "secret-password"
max_connections = 18
"#,
    )
    .unwrap();

    assert_eq!(DatabaseEngine::Postgres, config.engine);
    assert_eq!(
        "postgresql://sdkwork_claw_router:secret-password@db.internal:5432/sdkwork_claw_router",
        config.url
    );
    assert_eq!(18, config.max_connections);
}

#[test]
fn runtime_config_file_supports_structured_postgres_password_from_file() {
    let secret_path = write_temp_secret("postgres-password-file", "secret-password");
    let config_path = write_temp_config(
        "structured-postgres-password-file",
        &format!(
            r#"
[database]
engine = "postgresql"
host = "db.internal"
port = 5432
database = "sdkwork_claw_router"
username = "sdkwork_claw_router"
password_file = "{}"
max_connections = 20
"#,
            slash_path(&secret_path)
        ),
    );

    let config = DatabaseConfig::from_config_file(&config_path)
        .unwrap()
        .unwrap();

    assert_eq!(DatabaseEngine::Postgres, config.engine);
    assert_eq!(
        "postgresql://sdkwork_claw_router:secret-password@db.internal:5432/sdkwork_claw_router",
        config.url
    );
    assert_eq!(20, config.max_connections);
}

#[test]
fn runtime_config_file_expands_password_file_environment_variables() {
    let _env_lock = ENV_LOCK.lock().unwrap();
    let root = temp_root("postgres-password-env-file");
    fs::create_dir_all(&root).unwrap();
    let secret_path = root.join("database.secret");
    fs::write(&secret_path, "secret-password").unwrap();
    let _guard = EnvGuard::set(&[(
        "SDKWORK_CLAW_TEST_SECRET_ROOT",
        Some(root.to_string_lossy().to_string()),
    )]);
    let config_path = write_temp_config(
        "structured-postgres-password-env-file",
        r#"
[database]
engine = "postgresql"
host = "db.internal"
port = 5432
database = "sdkwork_claw_router"
username = "sdkwork_claw_router"
password_file = "${SDKWORK_CLAW_TEST_SECRET_ROOT}/database.secret"
max_connections = 20
"#,
    );

    let config = DatabaseConfig::from_config_file(&config_path)
        .unwrap()
        .unwrap();

    assert_eq!(DatabaseEngine::Postgres, config.engine);
    assert_eq!(
        "postgresql://sdkwork_claw_router:secret-password@db.internal:5432/sdkwork_claw_router",
        config.url
    );
    assert_eq!(20, config.max_connections);
}

#[test]
fn environment_database_parts_override_runtime_config_file() {
    let _env_lock = ENV_LOCK.lock().unwrap();
    let config_path = write_temp_config(
        "env-overrides",
        r#"
[database]
engine = "postgresql"
url = "postgresql://file:file@db.internal:5432/file_db"
max_connections = 16
"#,
    );

    let env = [
        (
            "SDKWORK_CLAW_CONFIG_FILE",
            Some(config_path.to_string_lossy().to_string()),
        ),
        (
            "SDKWORK_CLAW_DATABASE_URL",
            Some("sqlite::memory:".to_owned()),
        ),
        (
            "SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS",
            Some("3".to_owned()),
        ),
    ];
    let _guard = EnvGuard::set(&env);

    let config = DatabaseConfig::from_env().unwrap().unwrap();

    assert_eq!(DatabaseEngine::Sqlite, config.engine);
    assert_eq!("sqlite::memory:", config.url);
    assert_eq!(3, config.max_connections);
}

#[test]
fn explicit_runtime_config_file_is_used_when_database_env_is_absent() {
    let _env_lock = ENV_LOCK.lock().unwrap();
    let config_path = write_temp_config(
        "explicit-file",
        r#"
[database]
engine = "postgresql"
url = "postgresql://file:file@db.internal:5432/file_db"
max_connections = 12
"#,
    );
    let _guard = EnvGuard::set(&[
        (
            "SDKWORK_CLAW_CONFIG_FILE",
            Some(config_path.to_string_lossy().to_string()),
        ),
        ("SDKWORK_CLAW_DATABASE_URL", None),
        ("SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS", None),
    ]);

    let config = DatabaseConfig::from_env().unwrap().unwrap();

    assert_eq!(DatabaseEngine::Postgres, config.engine);
    assert_eq!(
        "postgresql://file:file@db.internal:5432/file_db",
        config.url
    );
    assert_eq!(12, config.max_connections);
}

#[test]
fn runtime_config_locations_follow_platform_conventions() {
    let linux_server = RuntimeConfigLocation::for_platform("linux", RuntimeConfigProfile::Server);
    assert_eq!(
        PathBuf::from("/etc/sdkwork/router/clawrouter.toml"),
        linux_server.config_file
    );
    assert_eq!(
        PathBuf::from("/var/lib/sdkwork/router"),
        linux_server.data_directory
    );

    let linux_desktop = RuntimeConfigLocation::for_platform("linux", RuntimeConfigProfile::Desktop);
    assert_eq!(
        PathBuf::from("~/.sdkwork/router/config/clawrouter.toml"),
        linux_desktop.config_file
    );
    assert_eq!(
        PathBuf::from("~/.sdkwork/router/data"),
        linux_desktop.data_directory
    );

    let windows_server =
        RuntimeConfigLocation::for_platform("windows", RuntimeConfigProfile::Server);
    assert_eq!(
        PathBuf::from("%ProgramData%/sdkwork/router/clawrouter.toml"),
        windows_server.config_file
    );

    let windows_desktop =
        RuntimeConfigLocation::for_platform("windows", RuntimeConfigProfile::Desktop);
    assert_eq!(
        PathBuf::from("%USERPROFILE%/.sdkwork/router/config/clawrouter.toml"),
        windows_desktop.config_file
    );
    assert_eq!(
        PathBuf::from("%USERPROFILE%/.sdkwork/router/data"),
        windows_desktop.data_directory
    );

    let macos_desktop = RuntimeConfigLocation::for_platform("macos", RuntimeConfigProfile::Desktop);
    assert_eq!(
        PathBuf::from("~/.sdkwork/router/config/clawrouter.toml"),
        macos_desktop.config_file
    );
}

#[test]
fn runtime_config_locations_expose_desktop_sqlite_database_paths() {
    let linux_desktop = RuntimeConfigLocation::for_platform("linux", RuntimeConfigProfile::Desktop);
    assert_eq!(
        PathBuf::from("~/.sdkwork/router/data/clawrouter.sqlite"),
        linux_desktop.sqlite_database_path()
    );

    let windows_desktop =
        RuntimeConfigLocation::for_platform("windows", RuntimeConfigProfile::Desktop);
    assert_eq!(
        PathBuf::from("%USERPROFILE%/.sdkwork/router/data/clawrouter.sqlite"),
        windows_desktop.sqlite_database_path()
    );
}

#[test]
fn initializes_default_desktop_runtime_config_at_explicit_location() {
    let root = temp_root("desktop-runtime-init");
    let location = RuntimeConfigLocation {
        config_file: root.join("config").join("clawrouter.toml"),
        data_directory: root.join("data"),
    };

    let report = DatabaseConfig::initialize_default_runtime_config_at(
        RuntimeConfigProfile::Desktop,
        &location,
    )
    .unwrap();

    assert_eq!(RuntimeConfigInitializationAction::Created, report.action);
    assert_eq!(DatabaseEngine::Sqlite, report.database.engine);
    assert_eq!(8, report.database.max_connections);
    assert_eq!(
        format!("sqlite://{}", slash_path(&location.sqlite_database_path())),
        report.database.url
    );
    assert!(location.config_file.exists());
    assert!(location.data_directory.exists());

    let content = fs::read_to_string(&location.config_file).unwrap();
    assert!(content.contains("engine = \"sqlite\""));
    assert!(content.contains("max_connections = 8"));
    assert!(content.contains("[runtime]"));
}

#[test]
fn from_env_or_initialize_creates_server_postgres_template_and_requires_real_database() {
    let _env_lock = ENV_LOCK.lock().unwrap();
    let root = temp_root("server-runtime-init");
    let config_path = root.join("config").join("clawrouter.toml");
    let program_data = root.join("program-data");
    let _guard = EnvGuard::set(&[
        (
            "SDKWORK_CLAW_CONFIG_FILE",
            Some(config_path.to_string_lossy().to_string()),
        ),
        ("SDKWORK_CLAW_DATABASE_URL", None),
        ("SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS", None),
        ("SDKWORK_CLAW_DEPLOYMENT_MODE", Some("server".to_owned())),
        (
            "ProgramData",
            Some(program_data.to_string_lossy().to_string()),
        ),
        (
            "PROGRAMDATA",
            Some(program_data.to_string_lossy().to_string()),
        ),
    ]);

    let error = DatabaseConfig::from_env_or_initialize().unwrap_err();

    assert!(config_path.exists());
    let content = fs::read_to_string(&config_path).unwrap();
    assert!(error.contains("PostgreSQL configuration is incomplete"));
    assert!(error.contains("default placeholder host or password"));
    assert!(content.contains("engine = \"postgresql\""));
    assert!(content.contains("host = \"db.example.com\""));
    assert!(content.contains("port = 5432"));
    assert!(content.contains("database = \"sdkwork_ai_prod\""));
    assert!(content.contains("username = \"sdkwork_ai_prod\""));
    assert!(content.contains(&format!(
        "password_file = \"{}\"",
        slash_path(&config_path.parent().unwrap().join("database.secret"))
    )));
    assert!(content.contains("# password = \"change-me\""));
    assert!(content.contains("ssl_mode = \"require\""));
    assert!(content.contains("max_connections = 16"));
    assert!(content.contains("deployment_mode = \"server\""));
}

#[test]
fn explicit_runtime_config_file_uses_neighbor_data_directory_for_server_template_paths() {
    let _env_lock = ENV_LOCK.lock().unwrap();
    let root = temp_root("explicit-config-neighbor-data");
    let config_path = root.join("custom").join("clawrouter.toml");
    let program_data = root.join("program-data");
    let _guard = EnvGuard::set(&[
        (
            "SDKWORK_CLAW_CONFIG_FILE",
            Some(config_path.to_string_lossy().to_string()),
        ),
        ("SDKWORK_CLAW_DATABASE_URL", None),
        ("SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS", None),
        ("SDKWORK_CLAW_DEPLOYMENT_MODE", Some("server".to_owned())),
        (
            "ProgramData",
            Some(program_data.to_string_lossy().to_string()),
        ),
        (
            "PROGRAMDATA",
            Some(program_data.to_string_lossy().to_string()),
        ),
    ]);

    let error = DatabaseConfig::from_env_or_initialize().unwrap_err();
    let expected_data_directory = config_path.parent().unwrap().join("Data");

    assert!(error.contains("PostgreSQL configuration is incomplete"));
    assert!(expected_data_directory.exists());
    let content = fs::read_to_string(config_path).unwrap();
    assert!(content.contains("engine = \"postgresql\""));
    assert!(content.contains(&format!(
        "password_file = \"{}\"",
        slash_path(&root.join("custom").join("database.secret"))
    )));
    assert!(content.contains(&format!(
        "data_directory = \"{}\"",
        slash_path(&expected_data_directory)
    )));
    assert!(
        !program_data.join("SdkWork").exists(),
        "explicit config files must not silently reuse or create the global server data directory"
    );
}

#[test]
fn startup_help_text_covers_standard_config_paths_and_database_guidance() {
    let linux_server = RuntimeConfigLocation::for_platform("linux", RuntimeConfigProfile::Server);
    let server_help = DatabaseConfig::startup_help_lines_for_location(
        RuntimeConfigProfile::Server,
        &linux_server,
    )
    .join("\n");
    assert!(server_help.contains("/etc/sdkwork/router/clawrouter.toml"));
    assert!(server_help.contains("SDKWORK_CLAW_DATABASE_URL"));
    assert!(server_help.contains("SDKWORK_CLAW_CONFIG_FILE"));
    assert!(server_help.contains("PostgreSQL"));
    assert!(server_help.contains("password/password_file"));

    let linux_desktop = RuntimeConfigLocation::for_platform("linux", RuntimeConfigProfile::Desktop);
    let desktop_help = DatabaseConfig::startup_help_lines_for_location(
        RuntimeConfigProfile::Desktop,
        &linux_desktop,
    )
    .join("\n");
    assert!(desktop_help.contains("~/.sdkwork/router/config/clawrouter.toml"));
    assert!(desktop_help.contains("~/.sdkwork/router/data/clawrouter.sqlite"));
    assert!(desktop_help.contains("SDKWORK_CLAW_CONFIG_FILE"));
    assert!(desktop_help.contains("SQLite"));
}

#[test]
fn server_runtime_validation_rejects_placeholder_postgres_host_and_password() {
    let location = RuntimeConfigLocation::for_platform("linux", RuntimeConfigProfile::Server);

    for url in [
        "postgresql://sdkwork_ai_prod:change-me@db.example.com:5432/sdkwork_ai_prod?sslmode=require",
        "postgresql://sdkwork_ai_prod:secret@db.example.com:5432/sdkwork_ai_prod?sslmode=require",
        "postgresql://sdkwork_ai_prod:change-me@db.internal:5432/sdkwork_ai_prod?sslmode=require",
        "postgresql://sdkworkprod%402026%2B%2B:change-me@db.example.com:5432/sdkwork_ai_prod?sslmode=require",
        "postgresql://sdkworkprod%402026%2B%2B:secret@db.example.com:5432/sdkwork_ai_prod?sslmode=require",
        "postgresql://sdkwork:change-me@db.example.com:5432/sdkwork?sslmode=require",
        "postgresql://sdkwork_claw_router:change-me@db.example.com:5432/sdkwork_claw_router?sslmode=require",
        "postgresql://sdkwork_claw_router:secret@db.example.com:5432/sdkwork_claw_router?sslmode=require",
        "postgresql://sdkwork_claw_router:change-me@db.internal:5432/sdkwork_claw_router?sslmode=require",
        "postgresql://sdkwork_claw_router:change-me@localhost:5432/sdkwork_claw_router",
        // <CHANGE_ME> placeholder from .env.postgres.example (percent-encoded in URL).
        "postgresql://sdkwork_ai_prod:%3CCHANGE_ME%3E@db.internal:5432/sdkwork_ai_prod?sslmode=require",
        "postgresql://sdkwork_ai_prod:%3Cchange_me%3E@db.internal:5432/sdkwork_ai_prod?sslmode=require",
        "postgresql://sdkwork_ai_prod:%3CCHANGE-ME%3E@db.internal:5432/sdkwork_ai_prod?sslmode=require",
        // Raw <CHANGE_ME> token that breaks URL parsing (caught by substring scan).
        "postgresql://sdkwork_ai_prod:<CHANGE_ME>@db.internal:5432/sdkwork_ai_prod?sslmode=require",
        // Known dev/example passwords leaked by previous .env templates.
        "postgresql://sdkwork_ai_dev:sdkworkdev123@db.internal:5432/sdkwork_ai_dev?sslmode=require",
        "postgresql://postgres:postgres_admin_pass@db.internal:5432/postgres?sslmode=require",
        "postgresql://sdkwork_claw_test:sdkwork_claw_test_password@db.internal:5432/sdkwork_claw_test?sslmode=require",
    ] {
        let config = DatabaseConfig::from_url(url).unwrap();
        match config.validate_for_runtime_profile_at(RuntimeConfigProfile::Server, &location) {
            Ok(()) => panic!("expected placeholder rejection for url: {url}"),
            Err(error) => assert!(
                error.contains("PostgreSQL configuration is incomplete"),
                "unexpected error for url: {url}: {error}"
            ),
        }
    }
}

#[test]
fn server_runtime_validation_accepts_workspace_development_postgres_on_localhost() {
    let location = RuntimeConfigLocation::for_platform("linux", RuntimeConfigProfile::Server);
    for url in [
        "postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable",
        "postgresql://sdkwork_ai_dev:sdkworkdev123@localhost:5432/sdkwork_ai_dev?sslmode=disable",
        "postgresql://postgres:postgres_admin_pass@127.0.0.1:5432/postgres?sslmode=disable",
    ] {
        let config = DatabaseConfig::from_url(url).unwrap();
        config
            .validate_for_runtime_profile_at(RuntimeConfigProfile::Server, &location)
            .unwrap_or_else(|error| {
                panic!("expected localhost dev acceptance for url: {url}: {error}")
            });
    }
}

#[test]
fn server_runtime_validation_accepts_real_postgres_location_and_password() {
    let location = RuntimeConfigLocation::for_platform("linux", RuntimeConfigProfile::Server);
    let config = DatabaseConfig::from_url(
        "postgresql://sdkwork_ai_prod:real-password@db.internal:5432/sdkwork_ai_prod?sslmode=require",
    )
    .unwrap();

    config
        .validate_for_runtime_profile_at(RuntimeConfigProfile::Server, &location)
        .unwrap();
}

#[test]
fn runtime_config_locations_resolve_to_real_os_paths_for_process_lookup() {
    let windows_server = RuntimeConfigLocation::for_platform_resolved(
        "windows",
        RuntimeConfigProfile::Server,
        |key| match key {
            "ProgramData" => Some("C:/ProgramData".to_owned()),
            _ => None,
        },
    );
    assert_eq!(
        "C:/ProgramData/sdkwork/router/clawrouter.toml",
        slash_path(&windows_server.config_file)
    );

    let windows_desktop = RuntimeConfigLocation::for_platform_resolved(
        "windows",
        RuntimeConfigProfile::Desktop,
        |key| match key {
            "USERPROFILE" => Some("C:/Users/Ada".to_owned()),
            _ => None,
        },
    );
    assert_eq!(
        "C:/Users/Ada/.sdkwork/router/config/clawrouter.toml",
        slash_path(&windows_desktop.config_file)
    );
    assert_eq!(
        "C:/Users/Ada/.sdkwork/router/data",
        slash_path(&windows_desktop.data_directory)
    );

    let linux_desktop = RuntimeConfigLocation::for_platform_resolved(
        "linux",
        RuntimeConfigProfile::Desktop,
        |key| match key {
            "HOME" => Some("/home/ada".to_owned()),
            _ => None,
        },
    );
    assert_eq!(
        "/home/ada/.sdkwork/router/config/clawrouter.toml",
        slash_path(&linux_desktop.config_file)
    );
    assert_eq!(
        "/home/ada/.sdkwork/router/data",
        slash_path(&linux_desktop.data_directory)
    );

    let linux_desktop_fallback = RuntimeConfigLocation::for_platform_resolved(
        "linux",
        RuntimeConfigProfile::Desktop,
        |key| match key {
            "HOME" => Some("/home/ada".to_owned()),
            _ => None,
        },
    );
    assert_eq!(
        "/home/ada/.sdkwork/router/config/clawrouter.toml",
        slash_path(&linux_desktop_fallback.config_file)
    );
    assert_eq!(
        "/home/ada/.sdkwork/router/data",
        slash_path(&linux_desktop_fallback.data_directory)
    );

    let macos_desktop = RuntimeConfigLocation::for_platform_resolved(
        "macos",
        RuntimeConfigProfile::Desktop,
        |key| match key {
            "HOME" => Some("/Users/ada".to_owned()),
            _ => None,
        },
    );
    assert_eq!(
        "/Users/ada/.sdkwork/router/config/clawrouter.toml",
        slash_path(&macos_desktop.config_file)
    );
}

#[test]
fn runtime_config_profile_reads_runtime_toml_with_env_override() {
    let _env_lock = ENV_LOCK.lock().unwrap();
    let _guard = EnvGuard::set(&[("SDKWORK_CLAW_DEPLOYMENT_MODE", None)]);
    let runtime_toml = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_mode = "desktop"
"#,
    )
    .unwrap();

    assert_eq!(
        RuntimeConfigProfile::Desktop,
        RuntimeConfigProfile::from_env_or_runtime_toml(Some(&runtime_toml)).unwrap()
    );

    let _guard = EnvGuard::set(&[("SDKWORK_CLAW_DEPLOYMENT_MODE", Some("server".to_owned()))]);
    assert_eq!(
        RuntimeConfigProfile::Server,
        RuntimeConfigProfile::from_env_or_runtime_toml(Some(&runtime_toml)).unwrap()
    );
}

#[test]
fn parses_startup_install_mode_from_optional_environment_part() {
    assert_eq!(
        StartupInstallMode::Ensure,
        StartupInstallMode::from_optional_part(None).unwrap()
    );
    assert_eq!(
        StartupInstallMode::Ensure,
        StartupInstallMode::from_optional_part(Some("ensure".to_owned())).unwrap()
    );
    assert_eq!(
        StartupInstallMode::Skip,
        StartupInstallMode::from_optional_part(Some("SKIP".to_owned())).unwrap()
    );
    assert!(
        StartupInstallMode::from_optional_part(Some("repair".to_owned()))
            .unwrap_err()
            .contains("SDKWORK_CLAW_STARTUP_INSTALL_MODE")
    );
}

#[test]
fn production_environment_defaults_startup_install_mode_to_skip_without_explicit_override() {
    let _guard = EnvGuard::set(&[(
        StartupInstallMode::ENV_ROUTER_ENVIRONMENT,
        Some("production".to_owned()),
    )]);
    assert_eq!(
        StartupInstallMode::Skip,
        StartupInstallMode::from_env_or_runtime_toml(None).unwrap()
    );
}

#[test]
fn production_environment_rejects_explicit_startup_install_mode_ensure() {
    let runtime_toml = RuntimeTomlConfig::from_toml_str(
        r#"
[install]
environment = "production"
"#,
    )
    .unwrap();
    assert!(
        sdkwork_claw_config::ensure_production_startup_install_policy(
            Some(&runtime_toml),
            StartupInstallMode::Ensure,
        )
        .unwrap_err()
        .contains("SDKWORK_CLAW_STARTUP_INSTALL_MODE")
    );
}

fn write_temp_config(label: &str, content: &str) -> PathBuf {
    let root = temp_root(label);
    fs::create_dir_all(&root).unwrap();
    let path = root.join("clawrouter.toml");
    fs::write(&path, content.trim()).unwrap();
    path
}

fn write_temp_secret(label: &str, content: &str) -> PathBuf {
    let root = temp_root(label);
    fs::create_dir_all(&root).unwrap();
    let path = root.join("database.secret");
    fs::write(&path, content.trim()).unwrap();
    path
}

fn temp_root(label: &str) -> PathBuf {
    let mut root = env::temp_dir();
    root.push("sdkwork-claw-config-tests");
    root.push(format!(
        "{}-{}",
        label,
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    root
}

fn slash_path(path: &PathBuf) -> String {
    path.to_string_lossy().replace('\\', "/")
}

struct EnvGuard {
    previous: Vec<(&'static str, Option<String>)>,
}

impl EnvGuard {
    fn set(values: &[(&'static str, Option<String>)]) -> Self {
        let previous = values
            .iter()
            .map(|(key, _)| (*key, env::var(key).ok()))
            .collect::<Vec<_>>();
        for (key, value) in values {
            match value {
                Some(value) => env::set_var(key, value),
                None => env::remove_var(key),
            }
        }
        Self { previous }
    }
}

impl Drop for EnvGuard {
    fn drop(&mut self) {
        for (key, value) in &self.previous {
            match value {
                Some(value) => env::set_var(key, value),
                None => env::remove_var(key),
            }
        }
    }
}
