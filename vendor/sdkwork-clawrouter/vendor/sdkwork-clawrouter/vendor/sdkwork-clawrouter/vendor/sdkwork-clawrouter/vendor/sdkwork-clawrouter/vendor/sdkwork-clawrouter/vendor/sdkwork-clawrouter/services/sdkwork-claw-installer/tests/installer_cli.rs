use sdkwork_claw_config::DatabaseConfig;
use sdkwork_clawrouter_router_service::application::{PasswordHasher, Pbkdf2Sha256PasswordHasher};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use std::{fs, path::Path, path::PathBuf};

use sqlx::sqlite::SqlitePoolOptions;
use sqlx::Row;

static DB_COUNTER: AtomicU64 = AtomicU64::new(0);

#[test]
fn installer_cli_reports_status_and_ensures_sqlite_database_once() {
    let database_url = unique_sqlite_url();
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");

    let status_before = run_installer(binary, &database_url, "status");
    assert!(status_before.status.success());
    let status_before_payload = stdout_json(&status_before);
    assert_eq!("not_installed", status_before_payload["status"]);
    assert_eq!("not_run", status_before_payload["lastCatalogRefreshStatus"]);
    assert_eq!(false, status_before_payload["changed"]);

    let ensure_first = run_installer(binary, &database_url, "ensure");
    assert!(ensure_first.status.success());
    let ensure_first_payload = stdout_json(&ensure_first);
    assert_eq!("installed", ensure_first_payload["status"]);
    assert_eq!(true, ensure_first_payload["changed"]);
    assert_eq!("not_run", ensure_first_payload["lastCatalogRefreshStatus"]);
    assert_eq!("created", ensure_first_payload["bootstrapAdmin"]["status"]);
    assert_eq!("admin", ensure_first_payload["bootstrapAdmin"]["username"]);
    assert_eq!(
        "admin@sdkwork.com",
        ensure_first_payload["bootstrapAdmin"]["email"]
    );
    assert_eq!("10", ensure_first_payload["bootstrapAdmin"]["tenantId"]);
    assert_eq!(
        "20",
        ensure_first_payload["bootstrapAdmin"]["organizationId"]
    );
    assert_eq!(
        true,
        ensure_first_payload["bootstrapAdmin"]["generatedPassword"]
    );
    assert!(
        ensure_first_payload["bootstrapAdmin"]["initialPassword"]
            .as_str()
            .is_some_and(|value| value.len() >= 12),
        "first installer ensure output must expose the one-time initial admin password"
    );

    let status_after = run_installer(binary, &database_url, "status");
    assert!(status_after.status.success());
    let status_after_payload = stdout_json(&status_after);
    assert_eq!("installed", status_after_payload["status"]);
    assert_eq!(false, status_after_payload["changed"]);

    let ensure_second = run_installer(binary, &database_url, "ensure");
    assert!(ensure_second.status.success());
    let ensure_second_payload = stdout_json(&ensure_second);
    assert_eq!("installed", ensure_second_payload["status"]);
    assert_eq!(false, ensure_second_payload["changed"]);
    assert!(
        ensure_second_payload.get("bootstrapAdmin").is_none()
            || ensure_second_payload["bootstrapAdmin"].is_null(),
        "re-running ensure must not expose or reset the initial admin password"
    );

    let refresh = run_installer_with_args(
        binary,
        &database_url,
        &["refresh-catalog", "--vendor", "openai"],
    );
    assert!(
        refresh.status.success(),
        "refresh-catalog failed: {}",
        stderr_trim(&refresh)
    );
    let refresh_payload = stdout_json(&refresh);
    assert_eq!("refreshed_catalog", refresh_payload["status"]);
    assert_eq!("2026.05.08.1", refresh_payload["catalogVersion"]);
    assert_eq!(
        serde_json::json!(["openai"]),
        refresh_payload["vendorCodes"]
    );
    assert_eq!(1, refresh_payload["vendorCount"]);
    assert!(refresh_payload["meterCount"].as_i64().unwrap() > 0);
    assert!(refresh_payload["familyCount"].as_i64().unwrap() > 0);
    assert!(refresh_payload["modelCount"].as_i64().unwrap() > 0);
    assert!(refresh_payload["capabilityCount"].as_i64().unwrap() > 0);
    assert!(refresh_payload["priceCount"].as_i64().unwrap() > 0);
    assert!(refresh_payload["rankingCount"].as_i64().unwrap() > 0);
    assert!(
        refresh_payload["acceptedCount"].as_i64().unwrap()
            > refresh_payload["modelCount"].as_i64().unwrap(),
        "refresh output must expose complete imported fact count, not only model count"
    );
    assert_eq!("success", refresh_payload["lastCatalogRefreshStatus"]);

    let status_after_refresh = run_installer(binary, &database_url, "status");
    assert!(status_after_refresh.status.success());
    assert_eq!(
        "success",
        stdout_json(&status_after_refresh)["lastCatalogRefreshStatus"]
    );

    let dry_run_refresh = run_installer_with_args(
        binary,
        &database_url,
        &["refresh-catalog", "--vendor", "openai", "--dry-run"],
    );
    assert!(dry_run_refresh.status.success());
    let dry_run_payload = stdout_json(&dry_run_refresh);
    assert_eq!("catalog_refresh_dry_run", dry_run_payload["status"]);
    assert_eq!(false, dry_run_payload["synced"]);
    assert_eq!("dry_run", dry_run_payload["mode"]);
    assert_eq!(1, dry_run_payload["vendorCount"]);
    assert!(dry_run_payload["acceptedCount"].as_i64().unwrap() > 0);
    assert_eq!("dry_run", dry_run_payload["lastCatalogRefreshStatus"]);

    let invalid_refresh = run_installer_with_args(
        binary,
        &database_url,
        &["refresh-catalog", "--mode", "manual"],
    );
    assert!(!invalid_refresh.status.success());
    let invalid_refresh_payload = stderr_json(&invalid_refresh);
    assert_eq!("error", invalid_refresh_payload["status"]);
    assert_eq!("invalid_argument", invalid_refresh_payload["errorCode"]);
    assert!(invalid_refresh_payload["message"]
        .as_str()
        .unwrap()
        .contains(
            "mode must be official_refresh, vendor_refresh, catalog_version_refresh, or dry_run"
        ));

    let failed_refresh = run_installer_with_args(
        binary,
        &database_url,
        &["refresh-catalog", "--vendor", "missing_vendor"],
    );
    assert!(!failed_refresh.status.success());
    let failed_refresh_payload = stderr_json(&failed_refresh);
    assert_eq!("error", failed_refresh_payload["status"]);
    assert_eq!("invalid_state", failed_refresh_payload["errorCode"]);
    assert!(failed_refresh_payload["message"]
        .as_str()
        .unwrap()
        .contains("missing_vendor"));

    let status_after_failed_refresh = run_installer(binary, &database_url, "status");
    assert!(status_after_failed_refresh.status.success());
    assert_eq!(
        "failed",
        stdout_json(&status_after_failed_refresh)["lastCatalogRefreshStatus"]
    );
}

#[tokio::test]
async fn installer_cli_repairs_drifted_sqlite_unique_index_definition_on_ensure() {
    let database_url = unique_sqlite_url();
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");

    let ensure = run_installer(binary, &database_url, "ensure");
    assert!(
        ensure.status.success(),
        "initial ensure failed: {}",
        stderr_trim(&ensure)
    );

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .unwrap();
    sqlx::query("DROP INDEX IF EXISTS uk_ai_model_rank_snapshot_scope_catalog_key")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query(
        r#"
        CREATE UNIQUE INDEX uk_ai_model_rank_snapshot_scope_catalog_key
        ON ai_model_rank_snapshot (tenant_id, organization_id, snapshot_date, snapshot_period, rank_scope, catalog_key)
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();
    pool.close().await;

    let repaired = run_installer(binary, &database_url, "ensure");
    assert!(
        repaired.status.success(),
        "ensure must repair drifted SQLite indexes without reinstalling manually: {}",
        stderr_trim(&repaired)
    );

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .unwrap();
    let index_sql: String = sqlx::query_scalar(
        r#"
        SELECT sql
        FROM sqlite_master
        WHERE type = 'index'
          AND name = 'uk_ai_model_rank_snapshot_scope_catalog_key'
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        index_sql.contains("vendor_code") && index_sql.contains("region_code"),
        "ensure must rebuild the model ranking unique index with the current upsert conflict target; got {index_sql}"
    );
    pool.close().await;
}

#[tokio::test]
async fn installer_cli_resets_admin_password_without_printing_secret() {
    let database_url = unique_sqlite_url();
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");

    let ensure = Command::new(binary)
        .arg("ensure")
        .env("SDKWORK_CLAW_DATABASE_URL", &database_url)
        .env("SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS", "1")
        .env("SDKWORK_CLAW_DEPLOYMENT_MODE", "desktop")
        .env("SDKWORK_CLAW_INSTALL_ENVIRONMENT", "test")
        .env("SDKWORK_CLAW_INSTALL_SEED_PROFILE", "commercial")
        .env(
            "SDKWORK_CLAW_BOOTSTRAP_ADMIN_PASSWORD",
            "Admin-Cli-Original-Password-2026!",
        )
        .output()
        .unwrap();
    assert!(
        ensure.status.success(),
        "ensure failed: {}",
        stderr_trim(&ensure)
    );

    let reset = run_installer_with_args(
        binary,
        &database_url,
        &[
            "reset-admin",
            "--password",
            "Admin-Cli-Rotated-Password-2026!",
        ],
    );
    assert!(
        reset.status.success(),
        "reset-admin failed: {}",
        stderr_trim(&reset)
    );
    let reset_payload = stdout_json(&reset);
    assert_eq!("reset_admin", reset_payload["status"]);
    assert_eq!("admin", reset_payload["username"]);
    assert_eq!("admin@sdkwork.com", reset_payload["email"]);
    assert_eq!("10", reset_payload["tenantId"]);
    assert_eq!("20", reset_payload["organizationId"]);
    assert_eq!("1", reset_payload["userId"]);
    assert_eq!(true, reset_payload["passwordChanged"]);
    assert!(
        reset_payload.get("initialPassword").is_none(),
        "reset-admin output must not print the provided password"
    );

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .unwrap();
    let password_hash: String = sqlx::query_scalar(
        r#"
        SELECT c.credential_hash
        FROM iam_user u
        JOIN iam_credential c
          ON c.tenant_id = u.tenant_id
         AND c.user_id = u.id
         AND c.credential_type = 'password'
         AND c.status = 'active'
        WHERE u.tenant_id = '100001'
          AND u.username = 'admin'
        ORDER BY c.updated_at DESC, c.id DESC
        LIMIT 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        !Pbkdf2Sha256PasswordHasher
            .verify_password("Admin-Cli-Original-Password-2026!", &password_hash)
            .unwrap(),
        "reset-admin must make the old password invalid"
    );
    assert!(
        Pbkdf2Sha256PasswordHasher
            .verify_password("Admin-Cli-Rotated-Password-2026!", &password_hash)
            .unwrap(),
        "reset-admin must write the new password using the normal IAM hash format"
    );
    pool.close().await;
}

#[tokio::test]
async fn installer_cli_refresh_catalog_auto_install_uses_requested_catalog_root() {
    let database_url = unique_sqlite_url();
    let catalog_root = single_vendor_catalog_root("openai");
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");

    let refresh = run_installer_with_args(
        binary,
        &database_url,
        &[
            "refresh-catalog",
            "--catalog-root",
            catalog_root.to_string_lossy().as_ref(),
            "--force",
        ],
    );
    assert!(refresh.status.success());
    let refresh_payload = stdout_json(&refresh);
    assert_eq!("refreshed_catalog", refresh_payload["status"]);
    assert_eq!("2026.05.08.1", refresh_payload["catalogVersion"]);
    assert_eq!(
        serde_json::json!(["openai"]),
        refresh_payload["vendorCodes"]
    );
    assert_eq!(1, refresh_payload["vendorCount"]);
    assert_eq!("installed", refresh_payload["installationStatus"]);
    assert_eq!(true, refresh_payload["externalCatalog"]);
    assert_eq!("created", refresh_payload["bootstrapAdmin"]["status"]);
    assert_eq!("admin", refresh_payload["bootstrapAdmin"]["username"]);
    assert_eq!(
        "admin@sdkwork.com",
        refresh_payload["bootstrapAdmin"]["email"]
    );
    assert_eq!("10", refresh_payload["bootstrapAdmin"]["tenantId"]);
    assert_eq!("20", refresh_payload["bootstrapAdmin"]["organizationId"]);
    assert_eq!(true, refresh_payload["bootstrapAdmin"]["generatedPassword"]);
    assert!(
        refresh_payload["bootstrapAdmin"]["initialPassword"]
            .as_str()
            .is_some_and(|value| value.len() >= 12),
        "first refresh-catalog output must expose the one-time initial admin password when it performs the full install"
    );
    assert_eq!(
        catalog_root.to_string_lossy().as_ref(),
        refresh_payload["catalogSource"]
    );
    assert_eq!("success", refresh_payload["lastCatalogRefreshStatus"]);

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .unwrap();
    let vendor_count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM ai_model_vendor WHERE status = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        1, vendor_count,
        "auto-install during refresh-catalog must use the requested external catalog root, not seed the bundled catalog first"
    );

    let model = sqlx::query(
        r#"
        SELECT capabilities, context_tokens, supports_tools, supports_json_schema
        FROM ai_model
        WHERE model = 'gpt-5.5'
          AND vendor_code = 'openai'
          AND status = 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        serde_json::json!(["chat"]),
        serde_json::from_str::<serde_json::Value>(model.get::<String, _>("capabilities").as_str())
            .unwrap()
    );
    assert_eq!(1_050_000, model.get::<i64, _>("context_tokens"));
    assert_eq!(1, model.get::<i64, _>("supports_tools"));
    assert_eq!(1, model.get::<i64, _>("supports_json_schema"));

    let price_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_model_pricing
        WHERE model = 'gpt-5.5'
          AND vendor_code = 'openai'
          AND billing_meter_code IN ('llm_input_token', 'llm_cache_read_token', 'llm_output_token')
          AND status = 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        3, price_count,
        "refresh-catalog must import the model pricing rows from the requested sdkwork-models catalog"
    );

    remove_catalog_root(catalog_root);
}

#[tokio::test]
async fn installer_cli_dry_run_prepares_schema_without_importing_catalog_facts() {
    let database_url = unique_sqlite_url();
    let catalog_root = single_vendor_catalog_root("openai");
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");

    let dry_run = run_installer_with_args(
        binary,
        &database_url,
        &[
            "refresh-catalog",
            "--catalog-root",
            catalog_root.to_string_lossy().as_ref(),
            "--dry-run",
        ],
    );
    assert!(
        dry_run.status.success(),
        "dry-run refresh-catalog failed: {}",
        stderr_trim(&dry_run)
    );
    let dry_run_payload = stdout_json(&dry_run);
    assert_eq!("catalog_refresh_dry_run", dry_run_payload["status"]);
    assert_eq!(false, dry_run_payload["synced"]);
    assert_eq!("dry_run", dry_run_payload["mode"]);
    assert_eq!("incomplete", dry_run_payload["installationStatus"]);
    assert_eq!(true, dry_run_payload["externalCatalog"]);
    assert_eq!(
        catalog_root.to_string_lossy().as_ref(),
        dry_run_payload["catalogSource"]
    );
    assert_eq!("dry_run", dry_run_payload["lastCatalogRefreshStatus"]);

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .unwrap();
    let vendor_count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM ai_model_vendor WHERE status = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    let model_count: i64 = sqlx::query_scalar("SELECT COUNT(1) FROM ai_model WHERE status = 1")
        .fetch_one(&pool)
        .await
        .unwrap();
    let pricing_count: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM ai_model_pricing WHERE status = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    let dry_run_audit_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM ai_model_catalog_sync_run
        WHERE run_status = 1
          AND json_extract(metadata, '$.dryRun') = 1
        "#,
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(0, vendor_count, "dry-run must not import catalog vendors");
    assert_eq!(0, model_count, "dry-run must not import catalog models");
    assert_eq!(0, pricing_count, "dry-run must not import catalog pricing");
    assert_eq!(1, dry_run_audit_count, "dry-run must leave an audit row");
    pool.close().await;

    let refresh = run_installer_with_args(
        binary,
        &database_url,
        &[
            "refresh-catalog",
            "--catalog-root",
            catalog_root.to_string_lossy().as_ref(),
            "--force",
        ],
    );
    assert!(
        refresh.status.success(),
        "refresh-catalog after dry-run failed: {}",
        stderr_trim(&refresh)
    );
    let refresh_payload = stdout_json(&refresh);
    assert_eq!("refreshed_catalog", refresh_payload["status"]);
    assert_eq!("installed", refresh_payload["installationStatus"]);
    assert_eq!("success", refresh_payload["lastCatalogRefreshStatus"]);

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .unwrap();
    let vendor_count_after_refresh: i64 =
        sqlx::query_scalar("SELECT COUNT(1) FROM ai_model_vendor WHERE status = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(
        1, vendor_count_after_refresh,
        "a real refresh after dry-run must import the requested catalog"
    );

    pool.close().await;
    remove_catalog_root(catalog_root);
}

#[tokio::test]
async fn installer_cli_vendor_refresh_on_empty_database_imports_only_requested_vendor() {
    let database_url = unique_sqlite_url();
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");

    let refresh = run_installer_with_args(
        binary,
        &database_url,
        &["refresh-catalog", "--vendor", "openai", "--force"],
    );
    assert!(refresh.status.success());
    let refresh_payload = stdout_json(&refresh);
    assert_eq!("refreshed_catalog", refresh_payload["status"]);
    assert_eq!("incomplete", refresh_payload["installationStatus"]);
    assert_eq!(
        serde_json::json!(["openai"]),
        refresh_payload["vendorCodes"]
    );
    assert_eq!(1, refresh_payload["vendorCount"]);
    assert_eq!("success", refresh_payload["lastCatalogRefreshStatus"]);

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .unwrap();
    let vendor_codes = sqlx::query_scalar::<_, String>(
        r#"
        SELECT vendor_code
        FROM ai_model_vendor
        WHERE status = 1
        ORDER BY vendor_code
        "#,
    )
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(
        vec!["openai".to_owned()],
        vendor_codes,
        "vendor-scoped refresh must not seed unrelated bundled catalog vendors before applying the requested refresh"
    );
    pool.close().await;
}

#[tokio::test]
async fn installer_cli_recovers_from_failed_first_catalog_refresh() {
    let database_url = unique_sqlite_url();
    let catalog_root = single_vendor_catalog_root("openai");
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");
    let mut missing_catalog_root = std::env::temp_dir();
    missing_catalog_root.push(format!(
        "sdkwork-installer-missing-catalog-{}",
        DB_COUNTER.fetch_add(1, Ordering::Relaxed)
    ));

    let failed_refresh = run_installer_with_args(
        binary,
        &database_url,
        &[
            "refresh-catalog",
            "--catalog-root",
            missing_catalog_root.to_string_lossy().as_ref(),
            "--force",
        ],
    );
    assert!(!failed_refresh.status.success());
    assert_eq!("", stdout_trim(&failed_refresh));
    let failed_payload = stderr_json(&failed_refresh);
    assert_eq!("error", failed_payload["status"]);
    assert_eq!("invalid_state", failed_payload["errorCode"]);

    let status_after_failed_refresh = run_installer(binary, &database_url, "status");
    assert!(status_after_failed_refresh.status.success());
    let status_payload = stdout_json(&status_after_failed_refresh);
    assert_eq!("incomplete", status_payload["status"]);
    assert_eq!("failed", status_payload["lastCatalogRefreshStatus"]);

    let recovered_refresh = run_installer_with_args(
        binary,
        &database_url,
        &[
            "refresh-catalog",
            "--catalog-root",
            catalog_root.to_string_lossy().as_ref(),
            "--force",
        ],
    );
    assert!(
        recovered_refresh.status.success(),
        "recovered refresh-catalog failed: {}",
        stderr_trim(&recovered_refresh)
    );
    let recovered_payload = stdout_json(&recovered_refresh);
    assert_eq!("refreshed_catalog", recovered_payload["status"]);
    assert_eq!("installed", recovered_payload["installationStatus"]);
    assert_eq!("success", recovered_payload["lastCatalogRefreshStatus"]);
    assert_eq!(
        catalog_root.to_string_lossy().as_ref(),
        recovered_payload["catalogSource"]
    );

    let final_status = run_installer(binary, &database_url, "status");
    assert!(final_status.status.success());
    let final_status_payload = stdout_json(&final_status);
    assert_eq!("installed", final_status_payload["status"]);
    assert_eq!("success", final_status_payload["lastCatalogRefreshStatus"]);

    remove_catalog_root(catalog_root);
}

#[tokio::test]
async fn installer_cli_status_remains_machine_readable_when_persisted_external_catalog_is_missing()
{
    let database_url = unique_sqlite_url();
    let catalog_root = single_vendor_catalog_root("openai");
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");

    let refresh = run_installer_with_args(
        binary,
        &database_url,
        &[
            "refresh-catalog",
            "--catalog-root",
            catalog_root.to_string_lossy().as_ref(),
            "--force",
        ],
    );
    assert!(
        refresh.status.success(),
        "refresh-catalog failed: {}",
        stderr_trim(&refresh)
    );
    assert_eq!("installed", stdout_json(&refresh)["installationStatus"]);

    remove_catalog_root(catalog_root);

    let status = run_installer(binary, &database_url, "status");
    assert!(
        status.status.success(),
        "status must remain usable for automation even when a persisted external catalog path is no longer mounted: {}",
        stderr_trim(&status)
    );
    let payload = stdout_json(&status);
    assert_eq!("catalog_unavailable", payload["status"]);
    assert_eq!("success", payload["lastCatalogRefreshStatus"]);
    assert_eq!(true, payload["externalCatalog"]);
}

#[test]
fn installer_cli_auto_initializes_server_postgres_template_and_rejects_placeholder_config() {
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");
    let config_path = unique_runtime_config_path("server-postgres");

    let output = Command::new(binary)
        .arg("status")
        .env("SDKWORK_CLAW_DEPLOYMENT_MODE", "server")
        .env("SDKWORK_CLAW_CONFIG_FILE", &config_path)
        .env_remove("SDKWORK_CLAW_DATABASE_URL")
        .output()
        .unwrap();

    assert!(
        !output.status.success(),
        "server installer startup must reject placeholder PostgreSQL config"
    );
    assert_eq!("", stdout_trim(&output));
    let payload = stderr_json(&output);
    assert_eq!("error", payload["status"]);
    assert_eq!("missing_database_url", payload["errorCode"]);
    assert!(payload["message"]
        .as_str()
        .unwrap()
        .contains("PostgreSQL configuration is incomplete"));
    assert!(
        config_path.exists(),
        "missing server runtime TOML must be initialized automatically"
    );
    let generated_config = fs::read_to_string(config_path).unwrap();
    assert!(generated_config.contains("engine = \"postgresql\""));
    assert!(generated_config.contains("deployment_mode = \"server\""));
    assert!(generated_config.contains("host = \"db.example.com\""));
    assert!(generated_config.contains("password_file ="));
}

#[test]
fn installer_cli_auto_initializes_desktop_sqlite_runtime_config() {
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");
    let config_path = unique_runtime_config_path("desktop-sqlite");
    let output = Command::new(binary)
        .arg("status")
        .env("SDKWORK_CLAW_DEPLOYMENT_MODE", "desktop")
        .env("SDKWORK_CLAW_CONFIG_FILE", &config_path)
        .env_remove("SDKWORK_CLAW_DATABASE_URL")
        .output()
        .unwrap();

    assert!(
        output.status.success(),
        "desktop installer startup should initialize SQLite config and continue: {}",
        stderr_trim(&output)
    );
    assert_eq!("not_installed", stdout_json(&output)["status"]);
    assert!(config_path.exists());
    let generated_config = fs::read_to_string(config_path).unwrap();
    assert!(generated_config.contains("engine = \"sqlite\""));
    assert!(generated_config.contains(&format!(
        "max_connections = {}",
        DatabaseConfig::DESKTOP_SQLITE_DEFAULT_MAX_CONNECTIONS
    )));
}

#[test]
fn installer_cli_reports_argument_errors_as_machine_readable_errors() {
    let database_url = unique_sqlite_url();
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");

    let unsupported_command = run_installer(binary, &database_url, "unknown-command");
    assert!(!unsupported_command.status.success());
    let unsupported_command_payload = stderr_json(&unsupported_command);
    assert_eq!("error", unsupported_command_payload["status"]);
    assert_eq!("invalid_argument", unsupported_command_payload["errorCode"]);
    assert!(unsupported_command_payload["message"]
        .as_str()
        .unwrap()
        .contains("unsupported installer command"));

    let missing_value =
        run_installer_with_args(binary, &database_url, &["refresh-catalog", "--vendor"]);
    assert!(!missing_value.status.success());
    let missing_value_payload = stderr_json(&missing_value);
    assert_eq!("error", missing_value_payload["status"]);
    assert_eq!("invalid_argument", missing_value_payload["errorCode"]);
    assert!(missing_value_payload["message"]
        .as_str()
        .unwrap()
        .contains("--vendor requires a value"));

    let missing_reset_password = run_installer_with_args(binary, &database_url, &["reset-admin"]);
    assert!(!missing_reset_password.status.success());
    let missing_reset_payload = stderr_json(&missing_reset_password);
    assert_eq!("error", missing_reset_payload["status"]);
    assert_eq!("invalid_argument", missing_reset_payload["errorCode"]);
    assert!(missing_reset_payload["message"]
        .as_str()
        .unwrap()
        .contains("reset-admin requires --password or SDKWORK_CLAW_ADMIN_RESET_PASSWORD"));
}

#[test]
fn installer_cli_reports_invalid_env_catalog_root_as_machine_readable_config_error() {
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");
    let database_url = unique_sqlite_url();

    let output = Command::new(binary)
        .arg("status")
        .env("SDKWORK_CLAW_DATABASE_URL", database_url)
        .env("SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS", "1")
        .env("SDKWORK_CLAW_DEPLOYMENT_MODE", "desktop")
        .env("SDKWORK_CLAW_INSTALL_ENVIRONMENT", "test")
        .env("SDKWORK_CLAW_INSTALL_SEED_PROFILE", "commercial")
        .env("SDKWORK_MODELS_CATALOG_ROOT", "target/sdkwork-models\nbad")
        .output()
        .unwrap();

    assert!(!output.status.success());
    assert_eq!("", stdout_trim(&output));
    let payload = stderr_json(&output);
    assert_eq!("error", payload["status"]);
    assert_eq!("invalid_state", payload["errorCode"]);
    assert!(payload["message"]
        .as_str()
        .unwrap()
        .contains("SDKWORK_MODELS_CATALOG_ROOT must not contain control characters"));
}

#[test]
fn installer_cli_validates_arguments_before_database_environment() {
    let binary = env!("CARGO_BIN_EXE_clawrouterctl");

    let unsupported_command = Command::new(binary)
        .arg("unknown-command")
        .env_remove("SDKWORK_CLAW_DATABASE_URL")
        .output()
        .unwrap();
    assert!(!unsupported_command.status.success());
    assert_eq!("", stdout_trim(&unsupported_command));
    let unsupported_command_payload = stderr_json(&unsupported_command);
    assert_eq!("error", unsupported_command_payload["status"]);
    assert_eq!("invalid_argument", unsupported_command_payload["errorCode"]);
    assert!(unsupported_command_payload["message"]
        .as_str()
        .unwrap()
        .contains("unsupported installer command"));

    let unsupported_refresh_option = Command::new(binary)
        .args(["refresh-catalog", "--unknown"])
        .env_remove("SDKWORK_CLAW_DATABASE_URL")
        .output()
        .unwrap();
    assert!(!unsupported_refresh_option.status.success());
    assert_eq!("", stdout_trim(&unsupported_refresh_option));
    let unsupported_refresh_option_payload = stderr_json(&unsupported_refresh_option);
    assert_eq!("error", unsupported_refresh_option_payload["status"]);
    assert_eq!(
        "invalid_argument",
        unsupported_refresh_option_payload["errorCode"]
    );
    assert!(unsupported_refresh_option_payload["message"]
        .as_str()
        .unwrap()
        .contains("unsupported refresh-catalog option"));

    let unexpected_status_argument = Command::new(binary)
        .args(["status", "--force"])
        .env_remove("SDKWORK_CLAW_DATABASE_URL")
        .output()
        .unwrap();
    assert!(!unexpected_status_argument.status.success());
    assert_eq!("", stdout_trim(&unexpected_status_argument));
    let unexpected_status_argument_payload = stderr_json(&unexpected_status_argument);
    assert_eq!("error", unexpected_status_argument_payload["status"]);
    assert_eq!(
        "invalid_argument",
        unexpected_status_argument_payload["errorCode"]
    );
    assert!(unexpected_status_argument_payload["message"]
        .as_str()
        .unwrap()
        .contains("status does not accept extra arguments"));

    let invalid_source = Command::new(binary)
        .args(["refresh-catalog", "--source", "sdkwork models"])
        .env_remove("SDKWORK_CLAW_DATABASE_URL")
        .output()
        .unwrap();
    assert!(!invalid_source.status.success());
    assert_eq!("", stdout_trim(&invalid_source));
    let invalid_source_payload = stderr_json(&invalid_source);
    assert_eq!("error", invalid_source_payload["status"]);
    assert_eq!("invalid_argument", invalid_source_payload["errorCode"]);
    assert!(invalid_source_payload["message"]
        .as_str()
        .unwrap()
        .contains("source must contain only letters, numbers, -, and _"));

    let invalid_catalog_version = Command::new(binary)
        .args(["refresh-catalog", "--catalog-version", "2026/05/07"])
        .env_remove("SDKWORK_CLAW_DATABASE_URL")
        .output()
        .unwrap();
    assert!(!invalid_catalog_version.status.success());
    assert_eq!("", stdout_trim(&invalid_catalog_version));
    let invalid_catalog_version_payload = stderr_json(&invalid_catalog_version);
    assert_eq!("error", invalid_catalog_version_payload["status"]);
    assert_eq!(
        "invalid_argument",
        invalid_catalog_version_payload["errorCode"]
    );
    assert!(invalid_catalog_version_payload["message"]
        .as_str()
        .unwrap()
        .contains("catalog version must contain only letters, numbers, ., -, and _"));

    let mut many_vendors_args = vec!["refresh-catalog".to_owned()];
    for index in 0..33 {
        many_vendors_args.push("--vendor".to_owned());
        many_vendors_args.push(format!("vendor_{index}"));
    }
    let too_many_vendors = Command::new(binary)
        .args(many_vendors_args)
        .env_remove("SDKWORK_CLAW_DATABASE_URL")
        .output()
        .unwrap();
    assert!(!too_many_vendors.status.success());
    assert_eq!("", stdout_trim(&too_many_vendors));
    let too_many_vendors_payload = stderr_json(&too_many_vendors);
    assert_eq!("error", too_many_vendors_payload["status"]);
    assert_eq!("invalid_argument", too_many_vendors_payload["errorCode"]);
    assert!(too_many_vendors_payload["message"]
        .as_str()
        .unwrap()
        .contains("vendor codes must contain 32 items or fewer"));
}

fn run_installer(binary: &str, database_url: &str, command: &str) -> std::process::Output {
    run_installer_with_args(binary, database_url, &[command])
}

fn run_installer_with_args(
    binary: &str,
    database_url: &str,
    args: &[&str],
) -> std::process::Output {
    Command::new(binary)
        .args(args)
        .env("SDKWORK_CLAW_DATABASE_URL", database_url)
        .env("SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS", "1")
        .env("SDKWORK_CLAW_DEPLOYMENT_MODE", "desktop")
        .env("SDKWORK_CLAW_INSTALL_ENVIRONMENT", "test")
        .env("SDKWORK_CLAW_INSTALL_SEED_PROFILE", "commercial")
        .output()
        .unwrap()
}

fn stdout_trim(output: &std::process::Output) -> String {
    String::from_utf8_lossy(&output.stdout).trim().to_owned()
}

fn stderr_trim(output: &std::process::Output) -> String {
    String::from_utf8_lossy(&output.stderr).trim().to_owned()
}

fn stdout_json(output: &std::process::Output) -> serde_json::Value {
    serde_json::from_str(stdout_trim(output).as_str()).unwrap()
}

fn stderr_json(output: &std::process::Output) -> serde_json::Value {
    serde_json::from_str(stderr_trim(output).as_str()).unwrap()
}

fn unique_sqlite_url() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let counter = DB_COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut path = std::env::temp_dir();
    path.push(format!("sdkwork-claw-installer-{millis}-{counter}.sqlite"));
    format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"))
}

fn unique_runtime_config_path(label: &str) -> PathBuf {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let counter = DB_COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut path = std::env::temp_dir();
    path.push(format!("sdkwork-claw-installer-{label}-{millis}-{counter}"));
    path.push("sdkwork-clawrouter.toml");
    path
}

fn single_vendor_catalog_root(vendor_code: &str) -> PathBuf {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let counter = DB_COUNTER.fetch_add(1, Ordering::Relaxed);
    let mut root = std::env::temp_dir();
    root.push(format!(
        "sdkwork-installer-single-{vendor_code}-{millis}-{counter}"
    ));
    if root.exists() {
        fs::remove_dir_all(&root).unwrap();
    }
    fs::create_dir_all(root.join("models")).unwrap();
    fs::copy(
        sdkwork_models_source_root().join("sdkwork-models.json"),
        root.join("sdkwork-models.json"),
    )
    .unwrap();
    fs::copy(
        sdkwork_models_source_root()
            .join("models")
            .join("meters.json"),
        root.join("models").join("meters.json"),
    )
    .unwrap();
    fs::copy(
        sdkwork_models_source_root()
            .join("models")
            .join("protocols.json"),
        root.join("models").join("protocols.json"),
    )
    .unwrap();
    copy_dir_recursive(
        &sdkwork_models_source_root()
            .join("models")
            .join(vendor_code),
        &root.join("models").join(vendor_code),
    );
    write_single_vendor_index_files(&root, vendor_code);
    root
}

fn remove_catalog_root(catalog_root: PathBuf) {
    if catalog_root.exists() {
        fs::remove_dir_all(catalog_root).unwrap();
    }
}

fn sdkwork_models_source_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../data/sdkwork-models")
}

fn copy_dir_recursive(from: &Path, to: &Path) {
    fs::create_dir_all(to).unwrap();
    for entry in fs::read_dir(from).unwrap() {
        let entry = entry.unwrap();
        let destination = to.join(entry.file_name());
        if entry.file_type().unwrap().is_dir() {
            copy_dir_recursive(&entry.path(), &destination);
        } else {
            fs::copy(entry.path(), destination).unwrap();
        }
    }
}

fn write_single_vendor_index_files(catalog_root: &Path, vendor_code: &str) {
    let source_models_root = sdkwork_models_source_root().join("models");
    let target_models_root = catalog_root.join("models");

    let mut index: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(source_models_root.join("index.json")).unwrap())
            .unwrap();
    retain_vendor_region_entries(&mut index, vendor_code);
    refresh_index_counts(&mut index, vendor_code, &target_models_root);
    fs::write(
        target_models_root.join("index.json"),
        serde_json::to_string_pretty(&index).unwrap(),
    )
    .unwrap();

    let mut vendors: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(source_models_root.join("vendors.json")).unwrap())
            .unwrap();
    retain_vendor_entries(&mut vendors, vendor_code);
    refresh_vendors_counts(&mut vendors, vendor_code, &target_models_root);
    fs::write(
        target_models_root.join("vendors.json"),
        serde_json::to_string_pretty(&vendors).unwrap(),
    )
    .unwrap();
}

fn retain_vendor_region_entries(payload: &mut serde_json::Value, vendor_code: &str) {
    let entries = payload["vendors"].as_array_mut().unwrap();
    entries.retain(|entry| entry["vendorCode"].as_str() == Some(vendor_code));
}

fn retain_vendor_entries(payload: &mut serde_json::Value, vendor_code: &str) {
    let entries = payload["vendors"].as_array_mut().unwrap();
    entries.retain(|entry| entry["vendorCode"].as_str() == Some(vendor_code));
}

fn refresh_index_counts(
    payload: &mut serde_json::Value,
    vendor_code: &str,
    target_models_root: &Path,
) {
    let mut model_count = 0usize;
    let mut pricing_count = 0usize;
    let mut region_count = 0usize;
    for entry in payload["vendors"].as_array_mut().unwrap() {
        let Some(region_code) = entry["regionCode"].as_str().map(str::to_owned) else {
            continue;
        };
        let counts = vendor_region_counts(target_models_root, vendor_code, &region_code);
        entry["modelCount"] = serde_json::json!(counts.model_count);
        entry["pricingFileCount"] = serde_json::json!(counts.pricing_file_count);
        entry["rankingSnapshotCount"] = serde_json::json!(counts.ranking_snapshot_count);
        entry["modelFiles"] = serde_json::json!(counts.model_files);
        entry["pricingFiles"] = serde_json::json!(counts.pricing_files);
        model_count += counts.model_count;
        pricing_count += counts.pricing_file_count;
        region_count += 1;
    }
    payload["vendorCount"] = serde_json::json!(if region_count == 0 { 0 } else { 1 });
    payload["regionCount"] = serde_json::json!(region_count);
    payload["modelCount"] = serde_json::json!(model_count);
    payload["pricingFileCount"] = serde_json::json!(pricing_count);
}

fn refresh_vendors_counts(
    payload: &mut serde_json::Value,
    vendor_code: &str,
    target_models_root: &Path,
) {
    for vendor in payload["vendors"].as_array_mut().unwrap() {
        let mut vendor_model_count = 0usize;
        let mut vendor_pricing_count = 0usize;
        let mut vendor_ranking_count = 0usize;
        for region in vendor["regions"].as_array_mut().unwrap() {
            let Some(region_code) = region["regionCode"].as_str().map(str::to_owned) else {
                continue;
            };
            let counts = vendor_region_counts(target_models_root, vendor_code, &region_code);
            region["modelCount"] = serde_json::json!(counts.model_count);
            region["pricingFileCount"] = serde_json::json!(counts.pricing_file_count);
            region["rankingSnapshotCount"] = serde_json::json!(counts.ranking_snapshot_count);
            vendor_model_count += counts.model_count;
            vendor_pricing_count += counts.pricing_file_count;
            vendor_ranking_count += counts.ranking_snapshot_count;
        }
        vendor["modelCount"] = serde_json::json!(vendor_model_count);
        vendor["pricingFileCount"] = serde_json::json!(vendor_pricing_count);
        vendor["rankingSnapshotCount"] = serde_json::json!(vendor_ranking_count);
    }
}

#[derive(Debug, Clone)]
struct VendorRegionCounts {
    model_count: usize,
    pricing_file_count: usize,
    ranking_snapshot_count: usize,
    model_files: Vec<String>,
    pricing_files: Vec<String>,
}

fn vendor_region_counts(
    target_models_root: &Path,
    vendor_code: &str,
    region_code: &str,
) -> VendorRegionCounts {
    let region_root = target_models_root.join(vendor_code).join(region_code);
    let model_files = json_file_refs(target_models_root, &region_root.join("models"));
    let pricing_files = json_file_refs(target_models_root, &region_root.join("pricing"));
    VendorRegionCounts {
        model_count: model_files.len(),
        pricing_file_count: pricing_files.len(),
        ranking_snapshot_count: ranking_snapshot_count(&region_root.join("rankings.json")),
        model_files,
        pricing_files,
    }
}

fn json_file_refs(target_models_root: &Path, path: &Path) -> Vec<String> {
    let mut paths = Vec::new();
    collect_json_file_paths(path, &mut paths);
    let mut refs: Vec<String> = paths
        .into_iter()
        .map(|path| {
            path.strip_prefix(target_models_root)
                .unwrap()
                .to_string_lossy()
                .replace('\\', "/")
        })
        .collect();
    refs.sort();
    refs
}

fn collect_json_file_paths(path: &Path, paths: &mut Vec<PathBuf>) {
    for entry in fs::read_dir(path).unwrap() {
        let entry = entry.unwrap();
        let entry_path = entry.path();
        if entry.file_type().unwrap().is_dir() {
            collect_json_file_paths(&entry_path, paths);
        } else if entry_path.extension().and_then(|value| value.to_str()) == Some("json") {
            paths.push(entry_path);
        }
    }
}

fn ranking_snapshot_count(path: &Path) -> usize {
    let rankings: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(path).unwrap()).unwrap();
    rankings["snapshots"].as_array().unwrap().len()
}
