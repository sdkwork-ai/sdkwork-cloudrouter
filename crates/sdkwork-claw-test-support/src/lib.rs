mod dialect_database;

pub use dialect_database::{DialectTestContext, POSTGRES_TEST_DATABASE_URL};

use std::fs::{self, File, OpenOptions};
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

use hmac::{Hmac, Mac};
use sdkwork_claw_config::{
    ApiKeySecurityConfig, AppSessionConfig, DatabaseConfig, PaymentWebhookConfig,
    TrustedSubjectConfig,
};
use sdkwork_claw_http::{
    sign_app_session_token, sign_trusted_request_subject, TrustedRequestSubject,
};
use sha2::Sha256;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;

type HmacSha256 = Hmac<Sha256>;

static SQLITE_DB_COUNTER: AtomicU64 = AtomicU64::new(0);
const SEEDED_SQLITE_TEMPLATE_REVISION: &str = "v15";
const SQLITE_TEMPLATE_LOCK_RETRY_INITIAL_MILLIS: u64 = 10;
const SQLITE_TEMPLATE_LOCK_RETRY_MAX_MILLIS: u64 = 100;

pub const API_KEY_PEPPER: &str = "0123456789abcdef0123456789abcdef";
pub const GATEWAY_API_KEY: &str = "sk-live-unified-sqlite";
pub const TRUSTED_SUBJECT_SECRET: &str = "trusted-subject-secret-0123456789abcdef";
pub const APP_SESSION_SECRET: &str = "app-session-secret-0123456789abcdef012";
pub const PAYMENT_WEBHOOK_SECRET: &str = "payment-webhook-secret-0123456789abcdef";
/// Mirrors `sdkwork-iam-module-registry::bootstrap_subject` canonical bootstrap scope.
pub const DEFAULT_TENANT_ID: i64 = 100_001;
pub const DEFAULT_ORGANIZATION_ID: i64 = 0;
pub const DEFAULT_TENANT_CODE: &str = "SDKWORK";
pub const DEFAULT_ORGANIZATION_CODE: &str = "root";
pub const DEFAULT_TENANT_ID_STR: &str = "100001";
pub const DEFAULT_ORGANIZATION_ID_STR: &str = "0";
pub const DEFAULT_USER_ID: i64 = 30;
pub const DEFAULT_OPERATOR_TYPE: i32 = 1;

const BILLING_METER_CODES: &[(&str, &str)] = &[
    ("llm_input_token", "LLM input token"),
    ("llm_output_token", "LLM output token"),
    ("llm_reasoning_token", "LLM reasoning token"),
    ("llm_cache_write_token", "LLM cache write token"),
    ("llm_cache_read_token", "LLM cache read token"),
    (
        "llm_cache_storage_token_hour",
        "LLM cache storage token hour",
    ),
    ("embedding_input_token", "Embedding input token"),
    ("embedding_image", "Embedding image"),
    ("image_input_token", "Image input token"),
    ("image_output_token", "Image output token"),
    ("image_result", "Image result"),
    ("image_pixel", "Image pixel"),
    ("image_megapixel", "Image megapixel"),
    ("audio_input_second", "Audio input second"),
    ("audio_output_second", "Audio output second"),
    ("audio_input_minute", "Audio input minute"),
    ("audio_output_minute", "Audio output minute"),
    ("tts_input_character", "TTS input character"),
    ("speech_character", "Speech character"),
    ("stt_audio_minute", "STT audio minute"),
    ("video_input_second", "Video input second"),
    ("video_output_second", "Video output second"),
    ("video_result", "Video result"),
    ("music_output_second", "Music output second"),
    ("sfx_result", "SFX result"),
    ("rerank_search", "Rerank search"),
    ("rerank_document", "Rerank document"),
    ("api_request", "API request"),
    ("api_result", "API result"),
    ("api_item", "API item"),
    ("tool_call", "Tool call"),
    ("web_search_call", "Web search call"),
    ("file_search_call", "File search call"),
    ("code_interpreter_session", "Code interpreter session"),
    ("container_session", "Container session"),
    ("storage_gb_day", "Storage GB day"),
    ("bandwidth_gb", "Bandwidth GB"),
    ("unknown", "Unknown"),
];

#[derive(Debug, Clone)]
pub struct SeededSqliteCatalog {
    database_url: String,
}

impl SeededSqliteCatalog {
    pub fn from_database_path(path: &Path) -> SeededSqliteCatalog {
        SeededSqliteCatalog {
            database_url: sqlite_database_url(path),
        }
    }

    pub fn database_url(&self) -> &str {
        &self.database_url
    }

    pub fn database_config(&self) -> anyhow::Result<DatabaseConfig> {
        DatabaseConfig::from_url_with_max_connections(self.database_url.as_str(), 1)
            .map_err(anyhow::Error::msg)
    }

    pub fn api_key_security_config(&self) -> anyhow::Result<ApiKeySecurityConfig> {
        api_key_security_config()
    }

    pub fn trusted_subject_config(&self) -> anyhow::Result<TrustedSubjectConfig> {
        trusted_subject_config()
    }

    pub fn app_session_config(&self) -> anyhow::Result<AppSessionConfig> {
        app_session_config()
    }

    pub fn payment_webhook_config(&self) -> anyhow::Result<PaymentWebhookConfig> {
        payment_webhook_config()
    }

    pub fn gateway_api_key(&self) -> &'static str {
        GATEWAY_API_KEY
    }

    pub fn gateway_authorization_header(&self) -> String {
        format!("Bearer {}", self.gateway_api_key())
    }

    pub async fn open_pool(&self) -> anyhow::Result<SqlitePool> {
        create_sqlite_pool(&self.database_url).await
    }

    pub fn fork(&self) -> anyhow::Result<SeededSqliteCatalog> {
        let source_path = sqlite_path_from_url(self.database_url())?;
        let database_path = unique_sqlite_database_path("forked");
        copy_sqlite_database_files(&source_path, &database_path)?;

        Ok(SeededSqliteCatalog {
            database_url: sqlite_database_url(&database_path),
        })
    }

    pub async fn seed_usage_settlement_points_account(
        &self,
        pool: &SqlitePool,
        account_id: i64,
        available_amount: i64,
    ) -> anyhow::Result<()> {
        sqlx::query(
            r#"
            INSERT INTO commerce_account
                (id, tenant_id, organization_id, owner_user_id, asset_type, currency_code,
                 available_amount, frozen_amount, version, status, created_at, updated_at)
            VALUES
                (?, '100001', '0', '30', 'points', 'POINT',
                 ?, '0', 0, 'active', '2026-04-30 11:59:00', '2026-04-30 11:59:00')
            "#,
        )
        .bind(format!("account-{account_id}"))
        .bind(available_amount.to_string())
        .execute(pool)
        .await?;
        Ok(())
    }
}

pub async fn seeded_sqlite_catalog() -> anyhow::Result<SeededSqliteCatalog> {
    let template_path = ensure_seeded_sqlite_template().await?;
    let database_path = unique_sqlite_database_path("seeded");
    fs::copy(&template_path, &database_path).map_err(|error| {
        anyhow::Error::msg(format!(
            "failed to copy seeded sqlite template from {} to {}: {error}",
            template_path.display(),
            database_path.display()
        ))
    })?;

    Ok(SeededSqliteCatalog {
        database_url: sqlite_database_url(&database_path),
    })
}

pub fn api_key_security_config() -> anyhow::Result<ApiKeySecurityConfig> {
    ApiKeySecurityConfig::from_pepper_secret(API_KEY_PEPPER).map_err(anyhow::Error::msg)
}

pub fn trusted_subject_config() -> anyhow::Result<TrustedSubjectConfig> {
    TrustedSubjectConfig::from_signing_secret(TRUSTED_SUBJECT_SECRET).map_err(anyhow::Error::msg)
}

pub fn app_session_config() -> anyhow::Result<AppSessionConfig> {
    AppSessionConfig::from_signing_secret(APP_SESSION_SECRET).map_err(anyhow::Error::msg)
}

pub fn payment_webhook_config() -> anyhow::Result<PaymentWebhookConfig> {
    PaymentWebhookConfig::from_signing_secret(PAYMENT_WEBHOOK_SECRET).map_err(anyhow::Error::msg)
}

pub fn trusted_request_subject(
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
) -> TrustedRequestSubject {
    TrustedRequestSubject {
        tenant_id,
        organization_id,
        user_id,
        operator_id: user_id,
        operator_type: DEFAULT_OPERATOR_TYPE,
    }
}

pub fn default_trusted_request_subject() -> TrustedRequestSubject {
    trusted_request_subject(DEFAULT_TENANT_ID, DEFAULT_ORGANIZATION_ID, DEFAULT_USER_ID)
}

pub fn app_session_bearer_token(
    subject: TrustedRequestSubject,
    issued_at: i64,
    expires_at: i64,
) -> anyhow::Result<String> {
    let token = sign_app_session_token(&app_session_config()?, subject, issued_at, expires_at);
    Ok(format!("Bearer {token}"))
}

pub fn app_session_access_token(
    subject: TrustedRequestSubject,
    issued_at: i64,
    expires_at: i64,
) -> anyhow::Result<String> {
    Ok(sign_app_session_token(
        &app_session_config()?,
        subject,
        issued_at + 1,
        expires_at + 1,
    ))
}

pub fn app_session_dual_token_headers(
    subject: TrustedRequestSubject,
    issued_at: i64,
    expires_at: i64,
) -> anyhow::Result<(String, String)> {
    Ok((
        app_session_bearer_token(subject, issued_at, expires_at)?,
        app_session_access_token(subject, issued_at, expires_at)?,
    ))
}

pub fn trusted_subject_signature(
    subject: TrustedRequestSubject,
    timestamp: i64,
    method: &str,
    path: &str,
) -> anyhow::Result<String> {
    Ok(sign_trusted_request_subject(
        &trusted_subject_config()?,
        subject,
        timestamp,
        method,
        path,
    ))
}

async fn ensure_seeded_sqlite_template() -> anyhow::Result<PathBuf> {
    let template_path = seeded_sqlite_template_path();
    if seeded_sqlite_template_current(&template_path).await {
        return Ok(template_path);
    }

    let _lock = acquire_template_file_lock(&template_path)?;
    if seeded_sqlite_template_current(&template_path).await {
        return Ok(template_path);
    }

    if let Some(parent) = template_path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            anyhow::Error::msg(format!(
                "failed to create sqlite template directory {}: {error}",
                parent.display()
            ))
        })?;
    }
    if template_path.exists() {
        fs::remove_file(&template_path).map_err(|error| {
            anyhow::Error::msg(format!(
                "failed to remove stale sqlite template {}: {error}",
                template_path.display()
            ))
        })?;
    }

    let database_url = sqlite_database_url(&template_path);
    let pool = create_sqlite_pool(&database_url).await?;
    create_schema(&pool).await?;
    seed_billing_meters(&pool).await?;
    seed_catalog(&pool).await?;
    seed_hashed_gateway_api_key(&pool).await?;
    pool.close().await;

    Ok(template_path)
}

async fn seeded_sqlite_template_current(template_path: &Path) -> bool {
    if !template_path.exists() {
        return false;
    }

    let expected_key_hash = match hmac_sha256_api_key_hash(GATEWAY_API_KEY) {
        Ok(value) => value,
        Err(_) => return false,
    };
    let pool = match open_existing_sqlite_pool(template_path).await {
        Ok(pool) => pool,
        Err(_) => return false,
    };
    let valid = sqlite_template_contains_seed_catalog(&pool).await
        && sqlite_template_contains_current_channel_schema(&pool).await
        && sqlite_template_contains_current_model_mapping_schema(&pool).await
        && sqlite_template_contains_current_gateway_api_key_channel_group_schema(&pool).await
        && sqlite_template_contains_current_iam_membership_schema(&pool).await
        && sqlite_template_contains_current_provider_object_route_schema(&pool).await
        && sqlite_template_contains_current_gateway_policy_schema(&pool).await
        && sqlite_template_contains_gateway_key_hash(&pool, expected_key_hash.as_str()).await;
    pool.close().await;
    valid
}

async fn sqlite_template_contains_seed_catalog(pool: &SqlitePool) -> bool {
    let model_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(1) FROM ai_model WHERE catalog_key = 'openai/gpt-4o-mini'",
    )
    .fetch_one(pool)
    .await;
    let total_model_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(1) FROM ai_model")
        .fetch_one(pool)
        .await;
    let completions_resource_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(1) FROM ai_resource WHERE catalog_key = 'openai/gpt-4o-mini' AND api_code = 'openai.completions' AND resource_type = 'model_api'",
    )
    .fetch_one(pool)
    .await;
    let bundle_grant_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(1) FROM ai_channel_resource WHERE channel_id = 3001 AND resource_group_code = 'bundle.openrouter.openai.standard' AND status = 1",
    )
    .fetch_one(pool)
    .await;
    let channel_model_table_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(1) FROM sqlite_master WHERE type = 'table' AND name = 'ai_channel_model'",
    )
    .fetch_one(pool)
    .await;
    matches!(
        (
            model_count,
            total_model_count,
            completions_resource_count,
            bundle_grant_count,
            channel_model_table_count
        ),
        (Ok(1), Ok(2), Ok(1), Ok(1), Ok(0))
    )
}

async fn sqlite_template_contains_current_channel_schema(pool: &SqlitePool) -> bool {
    matches!(
        sqlx::query_scalar::<_, i64>(
            r#"
        SELECT COUNT(1)
        FROM pragma_table_info('ai_channel')
        WHERE name IN (
            'credential_rotation_strategy',
            'site_id',
            'site_service_id',
            'site_code',
            'site_service_code',
            'site_channel_role'
        )
        "#,
        )
        .fetch_one(pool)
        .await,
        Ok(6)
    )
}

async fn sqlite_template_contains_current_model_mapping_schema(pool: &SqlitePool) -> bool {
    matches!(
        sqlx::query_scalar::<_, i64>(
            r#"
        SELECT COUNT(1)
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN (
              'ai_model_mapping_rule',
              'ai_model_mapping_rule_binding',
              'ai_model_mapping_rule_item'
        )
        "#,
        )
        .fetch_one(pool)
        .await,
        Ok(3)
    )
}

async fn sqlite_template_contains_current_gateway_api_key_channel_group_schema(
    pool: &SqlitePool,
) -> bool {
    let required_column_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM pragma_table_info('iam_gateway_api_key_channel_group')
        WHERE name IN (
            'uuid',
            'tenant_id',
            'organization_id',
            'user_id',
            'api_key_id',
            'channel_group_id',
            'channel_group_code',
            'binding_role',
            'routing_strategy',
            'priority',
            'weight',
            'status'
        )
        "#,
    )
    .fetch_one(pool)
    .await;
    let seed_binding_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM iam_gateway_api_key_channel_group
        WHERE api_key_id = 100
          AND channel_group_id = 10
          AND channel_group_code = 'standard-group'
          AND status = 1
        "#,
    )
    .fetch_one(pool)
    .await;
    matches!((required_column_count, seed_binding_count), (Ok(12), Ok(1)))
}

async fn sqlite_template_contains_current_iam_membership_schema(pool: &SqlitePool) -> bool {
    let required_column_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM pragma_table_info('iam_organization_membership')
        WHERE name IN (
            'id',
            'tenant_id',
            'organization_id',
            'user_id',
            'membership_kind',
            'display_name',
            'is_primary',
            'status',
            'joined_at',
            'left_at',
            'remark',
            'created_at',
            'updated_at'
        )
        "#,
    )
    .fetch_one(pool)
    .await;
    let admin_membership_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM iam_organization_membership
        WHERE tenant_id = '100001'
          AND organization_id = '0'
          AND user_id = '1'
          AND status = 'active'
          AND LOWER(COALESCE(membership_kind, '')) = 'admin'
        "#,
    )
    .fetch_one(pool)
    .await;
    matches!(
        (required_column_count, admin_membership_count),
        (Ok(13), Ok(1))
    )
}

async fn sqlite_template_contains_current_provider_object_route_schema(pool: &SqlitePool) -> bool {
    let required_column_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM pragma_table_info('ai_provider_object_route')
        WHERE name IN (
            'id',
            'uuid',
            'tenant_id',
            'organization_id',
            'data_scope',
            'status',
            'created_at',
            'updated_at',
            'version',
            'deleted_at',
            'deleted_by',
            'metadata',
            'api_key_id',
            'channel_group_id',
            'object_type',
            'object_id',
            'object_key_hash',
            'parent_object_type',
            'parent_object_id',
            'provider_code',
            'channel_id',
            'vendor_code',
            'api_code',
            'catalog_key',
            'provider_model',
            'region_code',
            'sticky_scope',
            'expires_at',
            'last_seen_at'
        )
        "#,
    )
    .fetch_one(pool)
    .await;
    let unique_index_count = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM sqlite_master
        WHERE type = 'index'
          AND name = 'uk_ai_provider_object_route_object'
          AND tbl_name = 'ai_provider_object_route'
        "#,
    )
    .fetch_one(pool)
    .await;
    matches!((required_column_count, unique_index_count), (Ok(29), Ok(1)))
}

async fn sqlite_template_contains_current_gateway_policy_schema(pool: &SqlitePool) -> bool {
    let quota_rate_limit_columns = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM pragma_table_info('ai_quota_policy')
        WHERE name IN ('requests_per_second', 'requests_per_day', 'burst_limit')
        "#,
    )
    .fetch_one(pool)
    .await;
    let risk_rule_table = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(1)
        FROM sqlite_master
        WHERE type = 'table'
          AND name = 'iam_gateway_risk_rule'
        "#,
    )
    .fetch_one(pool)
    .await;
    matches!((quota_rate_limit_columns, risk_rule_table), (Ok(3), Ok(1)))
}

async fn sqlite_template_contains_gateway_key_hash(pool: &SqlitePool, expected: &str) -> bool {
    match sqlx::query_scalar::<_, String>("SELECT key_hash FROM iam_gateway_api_key WHERE id = 100")
        .fetch_optional(pool)
        .await
    {
        Ok(Some(actual)) => actual == expected,
        _ => false,
    }
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
                    return Err(anyhow::Error::msg(format!(
                        "timed out waiting for sqlite template lock {}",
                        lock_path.display()
                    )));
                }
                thread::sleep(template_lock_retry_delay(attempt));
                attempt = attempt.saturating_add(1);
            }
            Err(error) => {
                return Err(anyhow::Error::msg(format!(
                    "failed to acquire sqlite template lock {}: {error}",
                    lock_path.display()
                )));
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
        .unwrap_or("claw-test-support-template.db");
    template_path.with_file_name(format!("{file_name}.lock"))
}

fn seeded_sqlite_template_path() -> PathBuf {
    let mut path = sqlite_test_database_dir();
    path.push(format!(
        "claw-test-support-seeded-{SEEDED_SQLITE_TEMPLATE_REVISION}.template.db"
    ));
    path
}

fn unique_sqlite_database_path(label: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let counter = SQLITE_DB_COUNTER.fetch_add(1, Ordering::Relaxed);
    let process_id = std::process::id();
    let mut path = sqlite_test_database_dir();
    fs::create_dir_all(&path).unwrap();
    path.push(format!(
        "claw-test-support-{label}-{process_id}-{nonce}-{counter}.db"
    ));
    path
}

fn sqlite_database_url(path: &Path) -> String {
    format!("sqlite://{}", path.to_string_lossy().replace('\\', "/"))
}

fn copy_sqlite_database_files(source_path: &Path, destination_path: &Path) -> anyhow::Result<()> {
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

fn sqlite_path_from_url(database_url: &str) -> anyhow::Result<PathBuf> {
    let path = database_url.strip_prefix("sqlite://").ok_or_else(|| {
        anyhow::Error::msg(format!("unsupported sqlite database url: {database_url}"))
    })?;
    if path.is_empty() {
        anyhow::bail!("sqlite database url must include a filesystem path");
    }
    Ok(PathBuf::from(path))
}

fn sqlite_test_database_dir() -> PathBuf {
    std::env::var_os("CARGO_TARGET_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("test-dbs")
}

async fn create_sqlite_pool(database_url: &str) -> anyhow::Result<SqlitePool> {
    let options = SqliteConnectOptions::from_str(database_url)?.create_if_missing(true);
    Ok(SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await?)
}

async fn open_existing_sqlite_pool(path: &Path) -> Result<SqlitePool, sqlx::Error> {
    let database_url = sqlite_database_url(path);
    SqlitePoolOptions::new()
        .max_connections(1)
        .connect(database_url.as_str())
        .await
}

async fn seed_hashed_gateway_api_key(pool: &SqlitePool) -> anyhow::Result<()> {
    let key_hash = hmac_sha256_api_key_hash(GATEWAY_API_KEY)?;
    sqlx::query("UPDATE iam_gateway_api_key SET key_hash = ? WHERE id = 100")
        .bind(key_hash)
        .execute(pool)
        .await?;
    Ok(())
}

fn hmac_sha256_api_key_hash(secret: &str) -> anyhow::Result<String> {
    let pepper_secret = API_KEY_PEPPER.trim();
    if pepper_secret.is_empty() {
        anyhow::bail!("api key pepper must not be blank");
    }
    let mut mac = HmacSha256::new_from_slice(pepper_secret.as_bytes())
        .map_err(|_| anyhow::Error::msg("api key pepper is invalid"))?;
    mac.update(secret.as_bytes());
    Ok(hex::encode(mac.finalize().into_bytes()))
}

async fn create_schema(pool: &SqlitePool) -> anyhow::Result<()> {
    for statement in [
        r#"CREATE TABLE ai_model_vendor (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'model-vendor-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            vendor_code TEXT NOT NULL,
            display_name TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            status INTEGER NOT NULL,
            deleted_at TEXT,
            deleted_by INTEGER,
            legal_name TEXT,
            description TEXT,
            website_url TEXT,
            docs_url TEXT,
            logo_media_resource_id TEXT,
            logo_object_blob_id INTEGER,
            logo_resource_snapshot TEXT,
            icon_media_resource_id TEXT,
            icon_object_blob_id INTEGER,
            icon_resource_snapshot TEXT,
            color_token TEXT,
            country_region TEXT,
            vendor_type INTEGER,
            model_families TEXT,
            capabilities TEXT,
            open_source INTEGER,
            sort_order INTEGER NOT NULL
        )"#,
        r#"CREATE TABLE ai_modality (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'modality-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            modality_code TEXT NOT NULL,
            display_name TEXT NOT NULL,
            modality_group TEXT,
            description TEXT,
            input_supported INTEGER,
            output_supported INTEGER,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_api_endpoint (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'api-endpoint-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            endpoint_code TEXT NOT NULL,
            protocol_code TEXT NOT NULL,
            display_name TEXT,
            method TEXT,
            path_template TEXT NOT NULL,
            request_schema TEXT,
            response_schema TEXT,
            streaming_supported INTEGER,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_vendor_modality (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'vendor-modality-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            vendor_id INTEGER,
            vendor_code TEXT NOT NULL,
            modality_id INTEGER,
            modality_code TEXT NOT NULL,
            supported INTEGER,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_vendor_api_endpoint (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'vendor-api-endpoint-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            vendor_id INTEGER,
            vendor_code TEXT NOT NULL,
            api_endpoint_id INTEGER,
            endpoint_code TEXT NOT NULL,
            supported INTEGER,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_modality_api_endpoint (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'modality-api-endpoint-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            modality_id INTEGER,
            modality_code TEXT NOT NULL,
            api_endpoint_id INTEGER,
            endpoint_code TEXT NOT NULL,
            supported INTEGER,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_model_family (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'model-family-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            vendor_id INTEGER,
            vendor_code TEXT,
            family_code TEXT,
            display_name TEXT,
            description TEXT,
            docs_url TEXT,
            icon_media_resource_id TEXT,
            icon_object_blob_id INTEGER,
            icon_resource_snapshot TEXT,
            color_token TEXT,
            family_type INTEGER,
            primary_modality INTEGER,
            model_count INTEGER,
            default_model_id INTEGER,
            default_model TEXT,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_model (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'model-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            model TEXT NOT NULL,
            display_name TEXT NOT NULL,
            vendor_id INTEGER,
            vendor_code TEXT NOT NULL,
            vendor_name_snapshot TEXT,
            family_id INTEGER,
            family_code TEXT,
            provider_hint TEXT,
            model_family TEXT,
            model_version TEXT,
            model_aliases TEXT,
            capability INTEGER,
            capabilities TEXT NOT NULL DEFAULT '[]',
            modalities TEXT,
            input_modalities TEXT,
            output_modalities TEXT,
            icon_media_resource_id TEXT,
            icon_object_blob_id INTEGER,
            icon_resource_snapshot TEXT,
            color_token TEXT,
            docs_url TEXT,
            license_type INTEGER,
            api_format TEXT,
            capability_intro TEXT,
            limitations TEXT,
            supported_languages TEXT,
            use_cases TEXT,
            training_data_cutoff TEXT,
            context_tokens INTEGER,
            max_input_tokens INTEGER,
            max_output_tokens INTEGER,
            max_duration_seconds INTEGER,
            supports_streaming INTEGER,
            supports_tools INTEGER,
            supports_json_schema INTEGER,
            performance_profile TEXT,
            default_pricing_id INTEGER,
            rank_score TEXT,
            release_stage INTEGER NOT NULL DEFAULT 1,
            shelf_state INTEGER NOT NULL DEFAULT 1,
            routing_state INTEGER NOT NULL DEFAULT 1,
            deprecated_at TEXT,
            retired_at TEXT,
            replacement_model TEXT,
            description TEXT,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            catalog_key TEXT NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            deleted_by INTEGER,
            UNIQUE (tenant_id, organization_id, catalog_key)
        )"#,
        r#"CREATE TABLE ai_model_capability (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'model-capability-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            model_id INTEGER,
            catalog_key TEXT NOT NULL,
            model TEXT,
            vendor_code TEXT,
            capability INTEGER,
            capability_code TEXT,
            modality INTEGER,
            input_modalities TEXT,
            output_modalities TEXT,
            endpoint_formats TEXT,
            parameter_name TEXT,
            parameter_schema TEXT,
            supported INTEGER,
            limit_unit TEXT,
            limit_value TEXT,
            schema_version TEXT,
            sort_order INTEGER,
            description TEXT
        )"#,
        r#"CREATE TABLE ai_model_modality (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'model-modality-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            model_id INTEGER,
            catalog_key TEXT NOT NULL,
            model TEXT,
            vendor_code TEXT,
            modality_id INTEGER,
            modality_code TEXT NOT NULL,
            direction TEXT,
            supported INTEGER,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_model_api_endpoint (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'model-api-endpoint-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            model_id INTEGER,
            catalog_key TEXT NOT NULL,
            model TEXT,
            vendor_code TEXT,
            api_endpoint_id INTEGER,
            endpoint_code TEXT NOT NULL,
            provider_native_model TEXT,
            default_parameters TEXT,
            supports_streaming INTEGER,
            supported INTEGER,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_resource (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'resource-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            resource_code TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            display_name TEXT,
            vendor_id INTEGER,
            vendor_code TEXT,
            modality_id INTEGER,
            modality_code TEXT,
            api_endpoint_id INTEGER,
            api_code TEXT,
            model_id INTEGER,
            model_code TEXT,
            catalog_key TEXT,
            model TEXT,
            provider_native_model TEXT,
            resource_schema TEXT,
            metadata_schema TEXT,
            description TEXT,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_resource_group (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'resource-group-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            group_code TEXT NOT NULL,
            group_name TEXT NOT NULL,
            group_type TEXT,
            selection_mode TEXT,
            description TEXT,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_resource_group_item (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'resource-group-item-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            resource_group_id INTEGER NOT NULL,
            resource_group_code TEXT,
            item_type TEXT NOT NULL,
            resource_id INTEGER,
            resource_code TEXT,
            child_resource_group_id INTEGER,
            child_resource_group_code TEXT,
            item_role TEXT,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_model_catalog_source (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL DEFAULT 'model-catalog-source-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            source_code TEXT NOT NULL,
            vendor_code TEXT,
            provider_code TEXT,
            source_name TEXT NOT NULL,
            source_url TEXT,
            source_kind INTEGER NOT NULL,
            trust_level INTEGER NOT NULL,
            parser_kind TEXT NOT NULL,
            refresh_interval_seconds INTEGER,
            last_observed_at TEXT,
            last_success_at TEXT,
            catalog_version TEXT,
            source_hash TEXT,
            raw_payload_ref TEXT,
            normalized_payload_hash TEXT,
            schema_version TEXT,
            error_message_masked TEXT,
            UNIQUE (tenant_id, organization_id, source_code)
        )"#,
        r#"CREATE TABLE ai_model_catalog_sync_run (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL DEFAULT 'model-catalog-sync-run-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            user_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            payload_hash TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            retention_until TEXT,
            legal_hold INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            source_type TEXT,
            source_id INTEGER,
            source_version INTEGER,
            source_code TEXT NOT NULL,
            vendor_code TEXT,
            provider_code TEXT,
            run_status INTEGER NOT NULL,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            observed_at TEXT,
            catalog_version TEXT,
            source_hash TEXT,
            observed_vendor_count INTEGER,
            observed_model_count INTEGER,
            observed_meter_count INTEGER,
            observed_price_count INTEGER,
            accepted_count INTEGER,
            rejected_count INTEGER,
            skipped_count INTEGER,
            change_summary TEXT,
            error_message_masked TEXT
        )"#,
        r#"CREATE TABLE ai_billing_meter (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'billing-meter-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            meter_code TEXT NOT NULL,
            display_name TEXT NOT NULL,
            description TEXT,
            modality INTEGER,
            usage_type INTEGER,
            billing_mode INTEGER,
            default_unit INTEGER,
            default_unit_size TEXT,
            quantity_precision INTEGER,
            quantity_source INTEGER,
            aggregation_mode INTEGER,
            supports_tier INTEGER,
            supports_expression INTEGER,
            allow_negative_quantity INTEGER,
            canonical_price_item_type INTEGER,
            sort_order INTEGER
        )"#,
        r#"CREATE TABLE ai_provider (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'provider-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            provider_code TEXT NOT NULL,
            display_name TEXT,
            default_vendor_code TEXT,
            provider_type TEXT,
            protocol_code TEXT,
            base_url TEXT,
            auth_type INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_channel (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'channel-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            provider_id INTEGER,
            provider_code TEXT NOT NULL,
            site_id INTEGER,
            site_service_id INTEGER,
            site_code TEXT,
            site_service_code TEXT,
            site_channel_role TEXT,
            channel_code TEXT,
            channel_name TEXT,
            channel_type TEXT NOT NULL DEFAULT 'relay',
            protocol_code TEXT,
            auth_type INTEGER,
            credential_rotation_strategy TEXT NOT NULL DEFAULT 'default',
            auth_config TEXT,
            credential_ref TEXT,
            credential_hash TEXT,
            base_url TEXT,
            timeout_ms INTEGER,
            retry_policy TEXT,
            region_code TEXT,
            quota_limit TEXT,
            quota_used TEXT,
            priority INTEGER NOT NULL DEFAULT 100,
            weight INTEGER NOT NULL DEFAULT 100,
            health_status INTEGER,
            last_latency_ms INTEGER,
            consecutive_error_count INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_channel_credential (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'channel-credential-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            channel_id INTEGER NOT NULL,
            provider_code TEXT,
            channel_code TEXT,
            credential_name TEXT NOT NULL,
            auth_type INTEGER,
            auth_config TEXT NOT NULL DEFAULT '{}',
            credential_ref TEXT,
            credential_hash TEXT,
            masked_label TEXT,
            base_url TEXT,
            priority INTEGER NOT NULL DEFAULT 100,
            weight INTEGER NOT NULL DEFAULT 100,
            health_status INTEGER NOT NULL DEFAULT 1,
            last_latency_ms INTEGER,
            consecutive_error_count INTEGER
        )"#,
        r#"CREATE TABLE ai_channel_resource (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'channel-resource-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            channel_id INTEGER NOT NULL,
            provider_code TEXT,
            channel_code TEXT,
            resource_id INTEGER,
            resource_code TEXT,
            resource_group_id INTEGER,
            resource_group_code TEXT,
            grant_type TEXT NOT NULL DEFAULT 'allow',
            priority INTEGER,
            weight INTEGER,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_routing_policy (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'routing-policy-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            policy_code TEXT,
            name TEXT,
            policy_scope INTEGER,
            subject_id INTEGER,
            capability INTEGER,
            default_profile_id INTEGER,
            fallback_mode INTEGER,
            slo_latency_ms INTEGER,
            slo_success_rate TEXT,
            cost_ceiling TEXT,
            currency TEXT
        )"#,
        r#"CREATE TABLE ai_routing_profile (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'routing-profile-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            policy_id INTEGER,
            profile_version INTEGER,
            profile_name TEXT,
            release_status INTEGER,
            traffic_percent TEXT,
            config_hash TEXT,
            published_at TEXT,
            published_by INTEGER,
            rollback_from_profile_id INTEGER
        )"#,
        r#"CREATE TABLE ai_routing_rule (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'routing-rule-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
            deleted_by INTEGER,
            metadata TEXT NOT NULL DEFAULT '{}',
            profile_id INTEGER,
            rule_code TEXT,
            priority INTEGER,
            match_expression TEXT,
            target_model TEXT,
            candidate_channels TEXT,
            fallback_chain TEXT,
            constraints TEXT,
            rate_limit_policy_id INTEGER,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_model_mapping_rule (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'model-mapping-rule-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            source_vendor_id INTEGER,
            source_vendor_code TEXT NOT NULL DEFAULT '',
            target_vendor_id INTEGER,
            target_vendor_code TEXT NOT NULL DEFAULT '',
            mapping_mode TEXT NOT NULL DEFAULT 'alias',
            match_type TEXT NOT NULL DEFAULT 'exact',
            enabled INTEGER NOT NULL DEFAULT 1
        )"#,
        r#"CREATE TABLE ai_model_mapping_rule_binding (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'model-mapping-rule-binding-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            rule_id INTEGER NOT NULL DEFAULT 0,
            rule_uuid TEXT,
            binding_type TEXT NOT NULL DEFAULT 'global',
            binding_id INTEGER,
            binding_code TEXT,
            binding_name_snapshot TEXT,
            sort_order INTEGER NOT NULL DEFAULT 100,
            enabled INTEGER NOT NULL DEFAULT 1
        )"#,
        r#"CREATE TABLE ai_model_mapping_rule_item (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'model-mapping-rule-item-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            deleted_by INTEGER,
            rule_id INTEGER NOT NULL DEFAULT 0,
            rule_uuid TEXT,
            source_model TEXT NOT NULL DEFAULT '',
            source_catalog_key TEXT,
            target_model TEXT NOT NULL DEFAULT '',
            target_catalog_key TEXT,
            target_provider_model TEXT,
            target_provider_native_model TEXT,
            sort_order INTEGER NOT NULL DEFAULT 100,
            enabled INTEGER NOT NULL DEFAULT 1
        )"#,
        r#"CREATE TABLE ai_pricing_plan (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'pricing-plan-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            plan_code TEXT NOT NULL,
            plan_name TEXT,
            plan_scope INTEGER,
            base_price_side INTEGER NOT NULL,
            default_multiplier TEXT NOT NULL,
            default_markup_amount TEXT NOT NULL,
            currency TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            status INTEGER NOT NULL,
            deleted_at TEXT,
            priority INTEGER NOT NULL,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_pricing_plan_binding (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'pricing-plan-binding-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            pricing_plan_id INTEGER,
            pricing_plan_code TEXT,
            subject_type INTEGER,
            subject_id INTEGER,
            subject_code TEXT,
            binding_source INTEGER,
            multiplier_override TEXT,
            priority INTEGER,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_pricing_rule (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'pricing-rule-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            pricing_plan_id INTEGER,
            pricing_plan_code TEXT,
            rule_code TEXT,
            model TEXT,
            provider_code TEXT,
            channel_id INTEGER,
            billing_meter_code TEXT,
            price_side INTEGER,
            multiplier TEXT,
            markup_amount TEXT,
            unit_price_override TEXT,
            priority INTEGER,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_pricing_tier (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'pricing-tier-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            deleted_at TEXT,
            pricing_rule_id INTEGER,
            model_pricing_id INTEGER,
            tier_code TEXT,
            billing_meter_code TEXT,
            min_quantity TEXT,
            max_quantity TEXT,
            input_unit_price TEXT,
            output_unit_price TEXT,
            multiplier TEXT,
            currency TEXT,
            sort_order INTEGER,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_channel_group (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'channel-group-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            group_code TEXT NOT NULL,
            group_name TEXT,
            group_type TEXT,
            pricing_plan_code TEXT NOT NULL,
            rate_multiplier TEXT NOT NULL,
            official_price_multiplier TEXT NOT NULL,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE ai_channel_group_member (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'channel-group-member-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            channel_group_id INTEGER NOT NULL,
            channel_id INTEGER NOT NULL,
            priority INTEGER,
            weight INTEGER,
            enabled INTEGER,
            effective_from TEXT,
            effective_to TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_channel_group_resource (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'channel-group-resource-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 0,
            organization_id INTEGER NOT NULL DEFAULT 0,
            channel_group_id INTEGER NOT NULL,
            resource_id INTEGER,
            resource_code TEXT,
            resource_group_id INTEGER,
            resource_group_code TEXT,
            grant_type TEXT NOT NULL DEFAULT 'allow',
            priority INTEGER,
            effective_from TEXT,
            effective_to TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT
        )"#,
        r#"CREATE TABLE ai_provider_object_route (
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
        )"#,
        r#"CREATE UNIQUE INDEX uk_ai_provider_object_route_uuid
            ON ai_provider_object_route (uuid)"#,
        r#"CREATE UNIQUE INDEX uk_ai_provider_object_route_object
            ON ai_provider_object_route (tenant_id, organization_id, object_type, object_id)"#,
        r#"CREATE INDEX idx_ai_provider_object_route_fast
            ON ai_provider_object_route (tenant_id, organization_id, object_key_hash, status, id)"#,
        r#"CREATE INDEX idx_ai_provider_object_route_parent
            ON ai_provider_object_route (tenant_id, organization_id, parent_object_type, parent_object_id, status, id)"#,
        r#"CREATE INDEX idx_ai_provider_object_route_channel
            ON ai_provider_object_route (tenant_id, organization_id, channel_group_id, channel_id, status, id)"#,
        r#"CREATE INDEX idx_ai_provider_object_route_expiry
            ON ai_provider_object_route (tenant_id, organization_id, expires_at, status, id)"#,
        r#"CREATE TABLE iam_gateway_api_key (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            channel_group_id INTEGER NOT NULL,
            name TEXT,
            key_prefix TEXT NOT NULL,
            key_display_masked TEXT,
            key_hash TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            policy_id INTEGER,
            quota_policy_id INTEGER,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            deleted_at TEXT,
            revoked_at TEXT,
            expire_at TEXT,
            updated_at TEXT,
            metadata TEXT NOT NULL DEFAULT '{}'
        )"#,
        r#"CREATE TABLE iam_gateway_api_key_channel_group (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'gateway-api-key-channel-group-uuid',
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL DEFAULT 0,
            api_key_id INTEGER NOT NULL,
            channel_group_id INTEGER NOT NULL,
            channel_group_code TEXT,
            binding_role TEXT NOT NULL DEFAULT 'route',
            routing_strategy TEXT NOT NULL DEFAULT 'auto',
            priority INTEGER NOT NULL DEFAULT 100,
            weight INTEGER NOT NULL DEFAULT 100,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE iam_gateway_access_policy (
            id INTEGER PRIMARY KEY,
            allowed_capabilities TEXT,
            ip_allowlist TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            deleted_by INTEGER,
            effective_from TEXT,
            effective_to TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE ai_quota_policy (
            id INTEGER PRIMARY KEY,
            channel_group_id INTEGER,
            model TEXT,
            quota_limit TEXT,
            requests_per_second INTEGER,
            requests_per_day INTEGER,
            burst_limit TEXT,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT,
            updated_at TEXT
        )"#,
        r#"CREATE TABLE iam_gateway_risk_rule (
            id INTEGER PRIMARY KEY,
            tenant_id INTEGER,
            organization_id INTEGER,
            rule_category INTEGER,
            rule_type INTEGER,
            scope_type INTEGER,
            scope_id INTEGER,
            target_type INTEGER,
            target_value TEXT,
            match_mode INTEGER,
            action INTEGER,
            priority INTEGER,
            requests_per_second INTEGER,
            requests_per_minute INTEGER,
            requests_per_day INTEGER,
            burst_limit TEXT,
            block_duration_seconds INTEGER,
            status INTEGER NOT NULL,
            deleted_at TEXT,
            effective_from TEXT,
            effective_to TEXT
        )"#,
        r#"CREATE TABLE ai_channel_group_metric_snapshot (
            id INTEGER PRIMARY KEY,
            channel_group_id INTEGER NOT NULL,
            group_code TEXT,
            capacity_used TEXT,
            capacity_limit TEXT,
            usage_amount_total TEXT,
            snapshot_at TEXT,
            status INTEGER NOT NULL
        )"#,
        r#"CREATE TABLE ai_request_trace (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT NOT NULL,
            trace_id TEXT,
            status INTEGER NOT NULL,
            attempt_no INTEGER,
            api_key_id INTEGER,
            api_key_name_snapshot TEXT,
            channel_group_id INTEGER,
            channel_group_snapshot TEXT,
            owner_type INTEGER,
            owner_id INTEGER,
            channel_id INTEGER,
            channel_name_snapshot TEXT,
            requested_model TEXT,
            requested_model_catalog_key TEXT,
            provider_model TEXT,
            provider_native_model TEXT,
            region_code TEXT,
            endpoint TEXT,
            request_path TEXT,
            http_method TEXT,
            http_status INTEGER,
            provider_error_code TEXT,
            error_type TEXT,
            error_message_masked TEXT,
            latency_ms INTEGER,
            ttft_ms INTEGER,
            started_at TEXT,
            ended_at TEXT,
            streaming INTEGER,
            prompt_tokens INTEGER,
            cached_tokens INTEGER,
            completion_tokens INTEGER,
            total_tokens INTEGER,
            metadata TEXT,
            user_agent_hash TEXT,
            UNIQUE (tenant_id, organization_id, request_id, attempt_no)
        )"#,
        r#"CREATE TABLE ai_usage (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT NOT NULL,
            trace_id TEXT,
            status INTEGER NOT NULL,
            api_key_id INTEGER,
            api_key_name_snapshot TEXT,
            channel_group_id INTEGER,
            channel_group_snapshot TEXT,
            owner_type INTEGER,
            owner_id INTEGER,
            catalog_key TEXT,
            requested_model_catalog_key TEXT,
            model TEXT,
            provider_native_model TEXT,
            region_code TEXT,
            channel_id INTEGER,
            modality INTEGER,
            usage_type INTEGER,
            billing_meter_code TEXT,
            billable_quantity TEXT,
            prompt_tokens INTEGER,
            cached_tokens INTEGER,
            completion_tokens INTEGER,
            total_tokens INTEGER,
            request_count INTEGER,
            result_count INTEGER,
            item_count INTEGER,
            character_count INTEGER,
            image_count INTEGER,
            audio_seconds TEXT,
            video_seconds TEXT,
            unit_price_snapshot TEXT,
            base_input_unit_price TEXT,
            base_output_unit_price TEXT,
            cache_read_unit_price TEXT,
            rate_multiplier TEXT,
            reference_multiplier TEXT,
            official_reference_amount TEXT,
            upstream_cost_amount TEXT,
            customer_charge_amount TEXT,
            cost_amount TEXT,
            currency TEXT,
            pricing_plan_code TEXT,
            pricing_snapshot TEXT,
            occurred_at TEXT,
            settlement_status INTEGER,
            settlement_id INTEGER,
            UNIQUE (tenant_id, organization_id, request_id, usage_type)
        )"#,
        r#"CREATE TABLE iam_user (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            username TEXT NOT NULL,
            display_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            avatar_media_resource_id TEXT,
            avatar_object_blob_id TEXT,
            avatar_resource_snapshot TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, username)
        )"#,
        r#"CREATE TABLE iam_organization_membership (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            membership_kind TEXT NOT NULL,
            employee_no TEXT,
            display_name TEXT,
            is_primary INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            joined_at TEXT NOT NULL,
            left_at TEXT,
            remark TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, organization_id, user_id, membership_kind)
        )"#,
        r#"CREATE TABLE commerce_usage_settlement (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT,
            trace_id TEXT,
            status INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            metadata TEXT NOT NULL,
            settlement_no TEXT,
            usage_fact_id INTEGER NOT NULL,
            account_id TEXT,
            account_ledger_entry_id TEXT,
            asset_type TEXT,
            direction TEXT,
            amount TEXT,
            points INTEGER,
            tokens INTEGER,
            currency TEXT,
            price_snapshot TEXT,
            settlement_status INTEGER,
            settled_at TEXT,
            failure_code TEXT,
            failure_message TEXT,
            UNIQUE (tenant_id, organization_id, usage_fact_id)
        )"#,
        r#"CREATE TABLE commerce_account (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            owner_user_id TEXT NOT NULL,
            asset_type TEXT NOT NULL,
            currency_code TEXT,
            available_amount TEXT NOT NULL DEFAULT '0',
            frozen_amount TEXT NOT NULL DEFAULT '0',
            version INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE (tenant_id, organization_id, owner_user_id, asset_type, currency_code)
        )"#,
        r#"CREATE TABLE commerce_account_ledger_entry (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            organization_id TEXT,
            account_id TEXT NOT NULL,
            owner_user_id TEXT NOT NULL,
            asset_type TEXT NOT NULL,
            direction TEXT NOT NULL,
            amount TEXT NOT NULL,
            balance_after TEXT NOT NULL,
            business_type TEXT NOT NULL,
            transaction_no TEXT NOT NULL,
            request_no TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            source_type TEXT,
            source_id TEXT,
            remark TEXT,
            created_at TEXT NOT NULL,
            UNIQUE (tenant_id, transaction_no)
        )"#,
        r#"CREATE TABLE ai_chat_conversation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}',
            conversation_code TEXT NOT NULL,
            title TEXT NOT NULL,
            source_surface TEXT NOT NULL,
            default_provider TEXT,
            default_model TEXT,
            agent_id TEXT,
            agent_session_id TEXT,
            memory_space_id TEXT,
            last_message_preview TEXT,
            message_count INTEGER NOT NULL DEFAULT 0,
            turn_count INTEGER NOT NULL DEFAULT 0,
            UNIQUE (tenant_id, organization_id, user_id, conversation_code)
        )"#,
        r#"CREATE TABLE ai_chat_turn (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            conversation_id INTEGER NOT NULL,
            turn_no INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            provider TEXT,
            model TEXT,
            agent_id TEXT,
            agent_session_id TEXT,
            runtime_invocation_id TEXT,
            context_snapshot_id INTEGER,
            started_at TEXT,
            completed_at TEXT,
            error_code TEXT,
            error_message TEXT,
            metadata TEXT NOT NULL DEFAULT '{}',
            UNIQUE (tenant_id, organization_id, conversation_id, turn_no)
        )"#,
        r#"CREATE TABLE ai_chat_item (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            conversation_id INTEGER NOT NULL,
            turn_id INTEGER,
            sequence_no INTEGER NOT NULL,
            item_type TEXT NOT NULL,
            role TEXT,
            direction TEXT NOT NULL,
            status TEXT NOT NULL,
            content_text TEXT,
            content_json TEXT,
            provider_payload TEXT,
            runtime_invocation_id TEXT,
            created_at TEXT NOT NULL,
            completed_at TEXT,
            metadata TEXT NOT NULL DEFAULT '{}',
            UNIQUE (tenant_id, organization_id, conversation_id, sequence_no)
        )"#,
        r#"CREATE TABLE ai_chat_message (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            conversation_id INTEGER NOT NULL,
            turn_id INTEGER,
            item_id INTEGER NOT NULL,
            message_no INTEGER NOT NULL,
            role TEXT NOT NULL,
            message_kind TEXT NOT NULL,
            direction TEXT NOT NULL,
            status TEXT NOT NULL,
            content_text TEXT NOT NULL DEFAULT '',
            model TEXT,
            provider TEXT,
            runtime TEXT,
            runtime_invocation_id TEXT,
            usage_link_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}',
            UNIQUE (tenant_id, organization_id, conversation_id, message_no)
        )"#,
        r#"CREATE TABLE ai_chat_message_part (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            message_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            part_no INTEGER NOT NULL,
            part_type TEXT NOT NULL,
            text_content TEXT,
            json_content TEXT,
            artifact_id TEXT,
            mime_type TEXT,
            created_at TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}',
            UNIQUE (tenant_id, organization_id, message_id, part_no)
        )"#,
        r#"CREATE TABLE ai_chat_context_snapshot (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT,
            trace_id TEXT,
            payload_hash TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            retention_until TEXT,
            legal_hold INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            conversation_id INTEGER NOT NULL,
            turn_id INTEGER,
            runtime_invocation_id INTEGER,
            snapshot_no INTEGER NOT NULL,
            strategy TEXT NOT NULL,
            included_item_ids TEXT,
            excluded_item_ids TEXT,
            included_memory_ids TEXT,
            excluded_memory_ids TEXT,
            memory_pack TEXT,
            memory_token_count INTEGER,
            provider_conversation_id TEXT,
            previous_response_id TEXT,
            input_token_estimate INTEGER,
            truncation_reason TEXT,
            context_json TEXT
        )"#,
        r#"CREATE TABLE ai_agent_session (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            agent_id TEXT NOT NULL,
            agent_version_id TEXT,
            session_code TEXT NOT NULL,
            title TEXT NOT NULL,
            session_kind TEXT NOT NULL,
            source_surface TEXT NOT NULL,
            status TEXT NOT NULL,
            chat_conversation_id TEXT,
            memory_space_id TEXT,
            runtime TEXT,
            cwd TEXT,
            sandbox_policy TEXT,
            approval_policy TEXT,
            permission_mode TEXT,
            default_model TEXT,
            run_count INTEGER NOT NULL DEFAULT 0,
            step_count INTEGER NOT NULL DEFAULT 0,
            last_run_id TEXT,
            last_step_id INTEGER,
            last_active_at TEXT,
            tool_call_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}',
            UNIQUE (tenant_id, organization_id, user_id, session_code)
        )"#,
        r#"CREATE TABLE ai_agent_run (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            request_id TEXT NOT NULL,
            trace_id TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT NOT NULL DEFAULT '{}',
            agent_id INTEGER NOT NULL,
            agent_version_id INTEGER NOT NULL,
            agent_session_id TEXT,
            memory_space_id TEXT,
            runtime TEXT,
            model TEXT,
            run_uuid TEXT NOT NULL,
            run_status TEXT NOT NULL,
            source_surface TEXT,
            input_message TEXT,
            output_message TEXT,
            target_modality INTEGER,
            planner_model TEXT,
            execution_mode TEXT,
            started_at TEXT,
            completed_at TEXT,
            cancelled_at TEXT,
            failed_at TEXT,
            error_message_masked TEXT,
            metering_status INTEGER,
            usage_fact_id INTEGER,
            usage_json TEXT,
            total_steps INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            cached_tokens INTEGER,
            total_tokens INTEGER,
            image_count INTEGER,
            audio_seconds TEXT,
            video_seconds TEXT,
            UNIQUE (tenant_id, organization_id, request_id)
        )"#,
        r#"CREATE INDEX idx_ai_agent_run_session_created ON ai_agent_run (tenant_id, organization_id, user_id, agent_session_id, created_at, id)"#,
        r#"CREATE TABLE ai_agent_run_step (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT NOT NULL DEFAULT '{}',
            run_id INTEGER NOT NULL,
            agent_id INTEGER,
            agent_version_id INTEGER,
            step_index INTEGER NOT NULL,
            step_type INTEGER NOT NULL,
            step_status TEXT NOT NULL,
            title TEXT,
            tool_binding_id INTEGER,
            tool_name TEXT,
            skill_id INTEGER,
            mcp_server_id INTEGER,
            model TEXT,
            runtime_invocation_id TEXT,
            input_snapshot TEXT,
            output_snapshot TEXT,
            usage_json TEXT,
            error_message_masked TEXT,
            started_at TEXT,
            completed_at TEXT,
            latency_ms INTEGER,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            cached_tokens INTEGER,
            total_tokens INTEGER,
            image_count INTEGER,
            audio_seconds TEXT,
            video_seconds TEXT,
            usage_fact_id INTEGER,
            UNIQUE (tenant_id, organization_id, run_id, step_index)
        )"#,
        r#"CREATE INDEX idx_ai_agent_run_step_runtime_invocation ON ai_agent_run_step (tenant_id, organization_id, runtime_invocation_id)"#,
        r#"CREATE TABLE ai_runtime_invocation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            conversation_id TEXT,
            chat_turn_id TEXT,
            chat_item_id TEXT,
            agent_session_id TEXT,
            agent_run_id TEXT,
            agent_run_step_id TEXT,
            invocation_no INTEGER NOT NULL,
            invocation_type TEXT NOT NULL,
            runtime TEXT NOT NULL,
            endpoint TEXT,
            attempt_no INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL,
            request_id TEXT,
            trace_id TEXT,
            provider_response_id TEXT,
            provider_session_id TEXT,
            provider_conversation_id TEXT,
            provider_step_id TEXT,
            model TEXT,
            provider TEXT,
            channel_id INTEGER,
            tool_name TEXT,
            tool_call_id TEXT,
            mcp_server_id TEXT,
            skill_id TEXT,
            cwd TEXT,
            sandbox_policy TEXT,
            approval_policy TEXT,
            permission_mode TEXT,
            streaming INTEGER NOT NULL DEFAULT 0,
            started_at TEXT,
            completed_at TEXT,
            latency_ms INTEGER,
            ttft_ms INTEGER,
            exit_code INTEGER,
            finish_reason TEXT,
            error_type TEXT,
            error_code TEXT,
            error_message_masked TEXT,
            request_json TEXT,
            response_json TEXT,
            usage_json TEXT,
            created_at TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}'
        )"#,
        r#"CREATE TABLE ai_runtime_invocation_event (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            invocation_id INTEGER NOT NULL,
            conversation_id TEXT,
            chat_turn_id TEXT,
            agent_session_id TEXT,
            agent_run_id TEXT,
            agent_run_step_id TEXT,
            event_no INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            event_source TEXT NOT NULL,
            payload_json TEXT,
            text_delta TEXT,
            created_at TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}',
            UNIQUE (tenant_id, organization_id, invocation_id, event_no)
        )"#,
        r#"CREATE TABLE ai_runtime_usage_link (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            conversation_id TEXT,
            chat_turn_id TEXT,
            chat_item_id TEXT,
            message_id TEXT,
            agent_session_id TEXT,
            agent_run_id TEXT,
            agent_run_step_id TEXT,
            runtime_invocation_id TEXT,
            usage_fact_id INTEGER,
            usage_type TEXT NOT NULL,
            provider TEXT,
            model TEXT,
            request_id TEXT,
            trace_id TEXT,
            input_tokens INTEGER NOT NULL DEFAULT 0,
            output_tokens INTEGER NOT NULL DEFAULT 0,
            cached_tokens INTEGER,
            reasoning_tokens INTEGER,
            total_tokens INTEGER NOT NULL DEFAULT 0,
            cost_amount TEXT,
            currency TEXT,
            occurred_at TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}'
        )"#,
        r#"CREATE UNIQUE INDEX uk_ai_runtime_usage_link_agent_scope
            ON ai_runtime_usage_link (tenant_id, organization_id, user_id, agent_run_id, usage_type, COALESCE(agent_run_step_id, ''))"#,
        r#"CREATE TABLE ai_runtime_artifact (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL,
            organization_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            conversation_id TEXT,
            chat_turn_id TEXT,
            message_id TEXT,
            chat_item_id TEXT,
            agent_session_id TEXT,
            agent_run_id TEXT,
            agent_run_step_id TEXT,
            runtime_invocation_id TEXT,
            artifact_type TEXT NOT NULL,
            name TEXT,
            mime_type TEXT,
            content_text TEXT,
            content_json TEXT,
            storage_key TEXT,
            storage_url TEXT,
            sha256 TEXT,
            size_bytes INTEGER,
            created_at TEXT NOT NULL,
            metadata TEXT NOT NULL DEFAULT '{}'
        )"#,
        r#"CREATE TABLE ai_model_pricing (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'model-pricing-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            data_scope INTEGER NOT NULL DEFAULT 1,
            model_id INTEGER,
            catalog_key TEXT NOT NULL,
            model TEXT NOT NULL,
            vendor_code TEXT,
            region_code TEXT NOT NULL,
            price_side INTEGER NOT NULL,
            pricing_scope INTEGER DEFAULT 1,
            billing_type INTEGER,
            billing_mode INTEGER,
            billing_meter_id INTEGER,
            billing_meter_code TEXT NOT NULL,
            price_item_type INTEGER,
            unit INTEGER,
            unit_price TEXT NOT NULL,
            currency TEXT NOT NULL,
            provider_code TEXT,
            channel_id INTEGER,
            pricing_plan_id INTEGER,
            pricing_plan_code TEXT,
            unit_size TEXT,
            metering_mode INTEGER,
            quantity_source INTEGER,
            minimum_quantity TEXT,
            quantity_step TEXT,
            included_quantity TEXT,
            rounding_mode INTEGER,
            min_charge_amount TEXT,
            pricing_formula_mode INTEGER,
            price_origin INTEGER,
            reference_multiplier TEXT,
            markup_amount TEXT,
            price_version TEXT,
            source_url TEXT,
            observed_at TEXT,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            status INTEGER NOT NULL,
            deleted_at TEXT,
            deleted_by INTEGER,
            effective_from TEXT,
            effective_to TEXT,
            priority INTEGER NOT NULL
        )"#,
        r#"CREATE TABLE ai_pricing_import_snapshot (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL,
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            user_id INTEGER,
            request_id TEXT,
            trace_id TEXT,
            payload_hash TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            retention_until TEXT,
            legal_hold INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            import_source INTEGER,
            source_name TEXT,
            source_hash TEXT,
            data_format TEXT,
            row_count INTEGER,
            accepted_count INTEGER,
            rejected_count INTEGER,
            currency TEXT,
            observed_at TEXT
        )"#,
        r#"CREATE TABLE ai_model_rank_snapshot (
            id INTEGER PRIMARY KEY,
            uuid TEXT NOT NULL DEFAULT 'model-rank-snapshot-uuid',
            tenant_id INTEGER NOT NULL DEFAULT 100001,
            organization_id INTEGER NOT NULL DEFAULT 0,
            source_type TEXT,
            source_id INTEGER,
            source_version INTEGER,
            status INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            updated_at TEXT NOT NULL DEFAULT '2026-04-10 20:55:41',
            rebuild_version INTEGER NOT NULL DEFAULT 0,
            metadata TEXT NOT NULL DEFAULT '{}',
            snapshot_date TEXT,
            snapshot_period INTEGER,
            rank_scope TEXT,
            model_id INTEGER,
            catalog_key TEXT NOT NULL,
            model TEXT,
            vendor_code TEXT,
            region_code TEXT NOT NULL,
            vendor_name_snapshot TEXT,
            provider_code TEXT,
            modality INTEGER,
            rank_no INTEGER,
            previous_rank_no INTEGER,
            base_volume INTEGER,
            cost_indicator INTEGER,
            context_size_text TEXT,
            is_new INTEGER,
            color_token TEXT,
            pricing_text TEXT,
            license_type INTEGER,
            strengths TEXT,
            request_count INTEGER,
            token_count INTEGER,
            cost_amount TEXT,
            currency TEXT,
            latency_p50_ms INTEGER,
            latency_p95_ms INTEGER,
            success_rate TEXT,
            win_rate TEXT,
            trend_score TEXT,
            rank_payload TEXT
        )"#,
    ] {
        sqlx::query(statement).execute(pool).await?;
    }
    Ok(())
}

async fn seed_catalog(pool: &SqlitePool) -> anyhow::Result<()> {
    for statement in [
        "INSERT INTO ai_model_vendor (id, uuid, tenant_id, organization_id, vendor_code, display_name, status, sort_order) VALUES (1, 'vendor-openai', 100001, 0, 'openai', 'OpenAI', 1, 1)",
        "INSERT INTO ai_modality (id, uuid, tenant_id, organization_id, modality_code, display_name, modality_group, input_supported, output_supported, status, sort_order) VALUES (1, 'modality-chat', 100001, 0, 'chat', 'Chat', 'llm', 1, 1, 1, 1)",
        "INSERT INTO ai_modality (id, uuid, tenant_id, organization_id, modality_code, display_name, modality_group, input_supported, output_supported, status, sort_order) VALUES (2, 'modality-embedding', 100001, 0, 'embedding', 'Embedding', 'embedding', 1, 1, 1, 2)",
        "INSERT INTO ai_api_endpoint (id, uuid, tenant_id, organization_id, endpoint_code, protocol_code, display_name, method, path_template, streaming_supported, status, sort_order) VALUES (1, 'endpoint-openai-chat-completions', 100001, 0, 'openai.chat_completions', 'openai_v1', 'OpenAI Chat Completions', 'POST', '/v1/chat/completions', 1, 1, 1)",
        "INSERT INTO ai_api_endpoint (id, uuid, tenant_id, organization_id, endpoint_code, protocol_code, display_name, method, path_template, streaming_supported, status, sort_order) VALUES (2, 'endpoint-openai-embeddings', 100001, 0, 'openai.embeddings', 'openai_v1', 'OpenAI Embeddings', 'POST', '/v1/embeddings', 0, 1, 2)",
        "INSERT INTO ai_api_endpoint (id, uuid, tenant_id, organization_id, endpoint_code, protocol_code, display_name, method, path_template, streaming_supported, status, sort_order) VALUES (3, 'endpoint-openai-responses', 100001, 0, 'openai.responses', 'openai_v1', 'OpenAI Responses', 'POST', '/v1/responses', 1, 1, 3)",
        "INSERT INTO ai_vendor_modality (id, uuid, tenant_id, organization_id, vendor_id, vendor_code, modality_id, modality_code, supported, status, sort_order) VALUES (1, 'vendor-openai-chat', 100001, 0, 1, 'openai', 1, 'chat', 1, 1, 1)",
        "INSERT INTO ai_vendor_modality (id, uuid, tenant_id, organization_id, vendor_id, vendor_code, modality_id, modality_code, supported, status, sort_order) VALUES (2, 'vendor-openai-embedding', 100001, 0, 1, 'openai', 2, 'embedding', 1, 1, 2)",
        "INSERT INTO ai_vendor_api_endpoint (id, uuid, tenant_id, organization_id, vendor_id, vendor_code, api_endpoint_id, endpoint_code, supported, status, sort_order) VALUES (1, 'vendor-openai-chat-completions', 100001, 0, 1, 'openai', 1, 'openai.chat_completions', 1, 1, 1)",
        "INSERT INTO ai_vendor_api_endpoint (id, uuid, tenant_id, organization_id, vendor_id, vendor_code, api_endpoint_id, endpoint_code, supported, status, sort_order) VALUES (2, 'vendor-openai-embeddings', 100001, 0, 1, 'openai', 2, 'openai.embeddings', 1, 1, 2)",
        "INSERT INTO ai_vendor_api_endpoint (id, uuid, tenant_id, organization_id, vendor_id, vendor_code, api_endpoint_id, endpoint_code, supported, status, sort_order) VALUES (3, 'vendor-openai-responses', 100001, 0, 1, 'openai', 3, 'openai.responses', 1, 1, 3)",
        "INSERT INTO ai_modality_api_endpoint (id, uuid, tenant_id, organization_id, modality_id, modality_code, api_endpoint_id, endpoint_code, supported, status, sort_order) VALUES (1, 'chat-openai-chat-completions', 100001, 0, 1, 'chat', 1, 'openai.chat_completions', 1, 1, 1)",
        "INSERT INTO ai_modality_api_endpoint (id, uuid, tenant_id, organization_id, modality_id, modality_code, api_endpoint_id, endpoint_code, supported, status, sort_order) VALUES (2, 'embedding-openai-embeddings', 100001, 0, 2, 'embedding', 2, 'openai.embeddings', 1, 1, 2)",
        "INSERT INTO ai_modality_api_endpoint (id, uuid, tenant_id, organization_id, modality_id, modality_code, api_endpoint_id, endpoint_code, supported, status, sort_order) VALUES (3, 'chat-openai-responses', 100001, 0, 1, 'chat', 3, 'openai.responses', 1, 1, 3)",
        "INSERT INTO ai_model_family (id, uuid, tenant_id, organization_id, vendor_id, vendor_code, family_code, display_name, status, sort_order) VALUES (1, 'family-openai-gpt-4o', 100001, 0, 1, 'openai', 'gpt-4o', 'GPT-4o', 1, 1)",
        r#"INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name, vendor_id, vendor_code, vendor_name_snapshot, family_id, family_code, capability, capabilities, modalities, context_tokens, max_input_tokens, max_output_tokens, supports_streaming, supports_tools, supports_json_schema, api_format, shelf_state, routing_state, status, rank_score)
            VALUES (1, 'model-openai-gpt-4o-mini', 100001, 0, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'GPT-4o mini', 1, 'openai', 'OpenAI', 1, 'gpt-4o', 1, '["chat","responses"]', '["chat"]', 128000, 128000, 16384, 1, 1, 1, 'openai_responses', 1, 1, 1, '100.0')"#,
        r#"INSERT INTO ai_model
            (id, uuid, tenant_id, organization_id, catalog_key, model, display_name, vendor_id, vendor_code, vendor_name_snapshot, family_id, family_code, capability, capabilities, modalities, input_modalities, output_modalities, supports_streaming, supports_tools, supports_json_schema, api_format, shelf_state, routing_state, status, rank_score)
            VALUES (2, 'model-openai-text-embedding-3-small', 100001, 0, 'openai/text-embedding-3-small', 'text-embedding-3-small', 'Text Embedding 3 Small', 1, 'openai', 'OpenAI', 1, 'gpt-4o', 1, '["embedding"]', '["embedding"]', '["embedding"]', '["embedding"]', 0, 0, 0, 'openai-compatible', 1, 1, 1, '50.0')"#,
        "INSERT INTO ai_model_capability (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, capability, capability_code, modality, input_modalities, output_modalities, supported, status, sort_order) VALUES (1, 'cap-openai-gpt-4o-mini-chat', 100001, 0, 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 1, 'chat', 1, '[\"text\"]', '[\"text\"]', 1, 1, 1)",
        "INSERT INTO ai_model_capability (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, capability, capability_code, modality, input_modalities, output_modalities, supported, status, sort_order) VALUES (2, 'cap-openai-text-embedding-3-small', 100001, 0, 2, 'openai/text-embedding-3-small', 'text-embedding-3-small', 'openai', 1, 'embedding', 1, '[\"embedding\"]', '[\"embedding\"]', 1, 1, 2)",
        "INSERT INTO ai_model_modality (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, modality_id, modality_code, direction, supported, status, sort_order) VALUES (1, 'model-gpt-4o-mini-chat-input', 100001, 0, 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 1, 'chat', 'input_output', 1, 1, 1)",
        "INSERT INTO ai_model_modality (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, modality_id, modality_code, direction, supported, status, sort_order) VALUES (2, 'model-embedding-small-input', 100001, 0, 2, 'openai/text-embedding-3-small', 'text-embedding-3-small', 'openai', 2, 'embedding', 'input_output', 1, 1, 2)",
        "INSERT INTO ai_model_api_endpoint (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, api_endpoint_id, endpoint_code, provider_native_model, supports_streaming, supported, status, sort_order) VALUES (1, 'model-gpt-4o-mini-chat-completions', 100001, 0, 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 1, 'openai.chat_completions', 'gpt-4o-mini', 1, 1, 1, 1)",
        "INSERT INTO ai_model_api_endpoint (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, api_endpoint_id, endpoint_code, provider_native_model, supports_streaming, supported, status, sort_order) VALUES (2, 'model-embedding-small-embeddings', 100001, 0, 2, 'openai/text-embedding-3-small', 'text-embedding-3-small', 'openai', 2, 'openai.embeddings', 'text-embedding-3-small', 0, 1, 1, 2)",
        "INSERT INTO ai_model_api_endpoint (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, api_endpoint_id, endpoint_code, provider_native_model, supports_streaming, supported, status, sort_order) VALUES (3, 'model-gpt-4o-mini-responses', 100001, 0, 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 3, 'openai.responses', 'gpt-4o-mini', 1, 1, 1, 3)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_id, vendor_code, status, sort_order) VALUES (1, 'resource-openai-vendor', 100001, 0, 'vendor.openai', 'vendor', 'OpenAI', 1, 'openai', 1, 1)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_id, vendor_code, modality_id, modality_code, api_endpoint_id, api_code, status, sort_order) VALUES (2, 'resource-openai-chat-completions', 100001, 0, 'api.openai.chat_completions', 'api_endpoint', 'OpenAI Chat Completions', 1, 'openai', 1, 'chat', 1, 'openai.chat_completions', 1, 2)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_id, vendor_code, modality_id, modality_code, api_endpoint_id, api_code, model_id, model_code, catalog_key, model, provider_native_model, status, sort_order) VALUES (3, 'resource-openai-gpt-4o-mini-chat', 100001, 0, 'model.openai.gpt-4o-mini.chat', 'model_api', 'GPT-4o mini Chat', 1, 'openai', 1, 'chat', 1, 'openai.chat_completions', 1, 'gpt-4o-mini', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini', 1, 3)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_id, vendor_code, modality_id, modality_code, api_endpoint_id, api_code, model_id, model_code, catalog_key, model, provider_native_model, status, sort_order) VALUES (4, 'resource-openai-embedding-small', 100001, 0, 'model.openai.text-embedding-3-small.embedding', 'model_api', 'Text Embedding 3 Small', 1, 'openai', 2, 'embedding', 2, 'openai.embeddings', 2, 'text-embedding-3-small', 'openai/text-embedding-3-small', 'text-embedding-3-small', 'text-embedding-3-small', 1, 4)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_id, vendor_code, modality_id, modality_code, api_endpoint_id, api_code, model_id, model_code, catalog_key, model, provider_native_model, status, sort_order) VALUES (6, 'resource-openai-gpt-4o-mini-responses', 100001, 0, 'model.openai.gpt-4o-mini.responses', 'model_api', 'GPT-4o mini Responses', 1, 'openai', 1, 'chat', 3, 'openai.responses', 1, 'gpt-4o-mini', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini', 1, 5)",
        "INSERT INTO ai_resource_group (id, uuid, tenant_id, organization_id, group_code, group_name, group_type, selection_mode, status, sort_order) VALUES (5, 'resource-group-openrouter-openai-standard', 100001, 0, 'bundle.openrouter.openai.standard', 'OpenRouter OpenAI Standard', 'relay_bundle', 'manual', 1, 5)",
        "INSERT INTO ai_resource_group_item (id, uuid, tenant_id, organization_id, resource_group_id, resource_group_code, item_type, resource_id, resource_code, item_role, status, sort_order) VALUES (1, 'resource-member-openrouter-gpt-4o-mini', 100001, 0, 5, 'bundle.openrouter.openai.standard', 'resource', 3, 'model.openai.gpt-4o-mini.chat', 'include', 1, 1)",
        "INSERT INTO ai_resource_group_item (id, uuid, tenant_id, organization_id, resource_group_id, resource_group_code, item_type, resource_id, resource_code, item_role, status, sort_order) VALUES (2, 'resource-member-openrouter-embedding-small', 100001, 0, 5, 'bundle.openrouter.openai.standard', 'resource', 4, 'model.openai.text-embedding-3-small.embedding', 'include', 1, 2)",
        "INSERT INTO ai_resource_group_item (id, uuid, tenant_id, organization_id, resource_group_id, resource_group_code, item_type, resource_id, resource_code, item_role, status, sort_order) VALUES (3, 'resource-member-openrouter-gpt-4o-mini-responses', 100001, 0, 5, 'bundle.openrouter.openai.standard', 'resource', 6, 'model.openai.gpt-4o-mini.responses', 'include', 1, 3)",
        "INSERT INTO ai_provider (id, uuid, tenant_id, organization_id, provider_code, display_name, default_vendor_code, provider_type, protocol_code, base_url, status) VALUES (2, 'provider-openrouter', 100001, 0, 'openrouter', 'OpenRouter', 'openai', 'relay', 'openai_v1', 'http://provider-proxy.internal/openrouter-template', 1)",
        "INSERT INTO ai_channel (id, uuid, tenant_id, organization_id, provider_code, channel_code, channel_name, channel_type, credential_ref, base_url, status, priority, weight) VALUES (3001, 'channel-openrouter-main', 100001, 0, 'openrouter', 'openrouter-main', 'OpenRouter Main', 'relay', 'vault://providers/openrouter/account/main', 'http://provider-proxy.internal/openrouter', 1, 10, 100)",
        "INSERT INTO ai_channel_credential (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code, credential_name, auth_config, credential_ref, credential_hash, base_url, priority, weight, health_status, status) VALUES (300101, 'channel-credential-openrouter-main', 100001, 0, 3001, 'openrouter', 'openrouter-main', 'primary', '{}', 'vault://providers/openrouter/account/main', 'hash:openrouter-main', 'http://provider-proxy.internal/openrouter', 1, 100, 1, 1)",
        "INSERT INTO ai_channel_resource (id, uuid, tenant_id, organization_id, channel_id, provider_code, channel_code, resource_group_id, resource_group_code, grant_type, priority, weight, status) VALUES (1, 'channel-resource-openrouter-bundle', 100001, 0, 3001, 'openrouter', 'openrouter-main', 5, 'bundle.openrouter.openai.standard', 'allow', 1, 100, 1)",
        r#"INSERT INTO ai_routing_profile
            (id, uuid, tenant_id, organization_id, policy_id, profile_version, profile_name, release_status, traffic_percent, config_hash, status)
            VALUES (9101, 'routing-profile-standard-group', 100001, 0, 9001, 1, 'Standard Group Profile', 2, '100.000000', 'standard-group-profile-hash', 1)"#,
        r#"INSERT INTO ai_routing_policy
            (id, uuid, tenant_id, organization_id, policy_code, name, policy_scope, subject_id, capability, default_profile_id, fallback_mode, status)
            VALUES (9001, 'routing-policy-standard-group', 100001, 0, 'standard-group-policy', 'Standard Group Policy', 5, 100001, NULL, 9101, 1, 1)"#,
        r#"INSERT INTO ai_routing_rule
            (id, uuid, tenant_id, organization_id, profile_id, rule_code, priority, match_expression, target_model, candidate_channels, fallback_chain, constraints, status)
            VALUES (9102, 'routing-rule-standard-group-default', 100001, 0, 9101, 'standard-group-default', 1, '{"catalogKey":"*"}', NULL, '[{"channel_id":3001,"weight":100}]', '[]', '{}', 1)"#,
        "INSERT INTO ai_pricing_plan (id, uuid, tenant_id, organization_id, plan_code, plan_name, plan_scope, base_price_side, default_multiplier, default_markup_amount, currency, status, priority) VALUES (1, 'pricing-plan-standard', 100001, 0, 'standard', 'Standard', 1, 1, '1.200000', '0.000000', 'USD', 1, 1)",
        "INSERT INTO ai_pricing_plan_binding (id, uuid, tenant_id, organization_id, pricing_plan_id, pricing_plan_code, subject_type, subject_id, subject_code, multiplier_override, status, priority) VALUES (1, 'pricing-plan-binding-standard-group', 100001, 0, 1, 'standard', 1, 100001, 'standard-group', '1.000000', 1, 1)",
        "INSERT INTO ai_channel_group (id, uuid, tenant_id, organization_id, group_code, group_name, pricing_plan_code, rate_multiplier, official_price_multiplier, status) VALUES (10, 'channel-group-standard', 100001, 0, 'standard-group', 'Standard Group', 'standard', '1.000000', '1.100000', 1)",
        "INSERT INTO ai_channel_group_member (id, uuid, tenant_id, organization_id, channel_group_id, channel_id, priority, weight, enabled, status) VALUES (600, 'channel-group-member-openrouter', 100001, 0, 10, 3001, 1, 100, 1, 1)",
        "INSERT INTO ai_channel_group_resource (id, uuid, tenant_id, organization_id, channel_group_id, resource_group_id, resource_group_code, grant_type, priority, status) VALUES (1, 'channel-group-resource-openrouter-standard', 100001, 0, 10, 5, 'bundle.openrouter.openai.standard', 'allow', 1, 1)",
        "INSERT INTO iam_gateway_api_key (id, tenant_id, organization_id, user_id, channel_group_id, key_prefix, key_hash, idempotency_key, status) VALUES (100, 100001, 0, 30, 10, 'sk-live', 'hash:placeholder', 'seed-api-key-100', 1)",
        "INSERT INTO iam_gateway_api_key_channel_group (id, uuid, tenant_id, organization_id, user_id, api_key_id, channel_group_id, channel_group_code, binding_role, routing_strategy, priority, weight, status) VALUES (1000, 'gateway-api-key-channel-group-standard', 100001, 0, 30, 100, 10, 'standard-group', 'route', 'auto', 100, 100, 1)",
        r#"INSERT INTO iam_user (id, tenant_id, username, display_name, email, phone, avatar_media_resource_id, avatar_object_blob_id, avatar_resource_snapshot, status, created_at, updated_at) VALUES ('1', '100001', 'bootstrap-admin', 'Bootstrap Admin', 'bootstrap-admin@example.com', '', 'media-bootstrap-admin-avatar', 'iam-user-avatar:bootstrap-admin', '{"kind":"image","source":"provider_asset","uri":"iam-user-avatar:bootstrap-admin"}', 'active', '2026-04-01 08:00:00', '2026-04-29 08:30:00')"#,
        "INSERT INTO iam_organization_membership (id, tenant_id, organization_id, user_id, membership_kind, display_name, is_primary, status, joined_at, left_at, remark, created_at, updated_at) VALUES ('member-1-admin', '100001', '0', '1', 'admin', 'Bootstrap Admin', 1, 'active', '2026-04-01 08:00:00', NULL, 'seed bootstrap admin membership', '2026-04-01 08:00:00', '2026-04-29 08:30:00')",
        "INSERT INTO ai_model_pricing (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, region_code, price_side, billing_meter_code, unit_price, currency, status, priority) VALUES (1, 'price-openai-global-gpt-4o-mini-input-reference', 100001, 0, 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 'global', 1, 'llm_input_token', '0.150000', 'USD', 1, 1)",
        "INSERT INTO ai_model_pricing (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, region_code, price_side, billing_meter_code, unit_price, currency, provider_code, channel_id, status, priority) VALUES (2, 'price-openai-global-gpt-4o-mini-input-upstream', 100001, 0, 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 'global', 2, 'llm_input_token', '0.110000', 'USD', 'openrouter', 3001, 1, 1)",
        "INSERT INTO ai_model_pricing (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, region_code, price_side, billing_meter_code, unit_price, currency, status, priority) VALUES (3, 'price-openai-global-gpt-4o-mini-output-reference', 100001, 0, 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 'global', 1, 'llm_output_token', '0.600000', 'USD', 1, 1)",
        "INSERT INTO ai_model_pricing (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, region_code, price_side, billing_meter_code, unit_price, currency, provider_code, channel_id, status, priority) VALUES (4, 'price-openai-global-gpt-4o-mini-output-upstream', 100001, 0, 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 'global', 2, 'llm_output_token', '0.440000', 'USD', 'openrouter', 3001, 1, 1)",
        "INSERT INTO ai_model_pricing (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, region_code, price_side, billing_meter_code, unit_price, currency, status, priority) VALUES (5, 'price-openai-global-text-embedding-3-small-input-reference', 100001, 0, 2, 'openai/text-embedding-3-small', 'text-embedding-3-small', 'openai', 'global', 1, 'embedding_input_token', '0.020000', 'USD', 1, 1)",
        "INSERT INTO ai_model_pricing (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, region_code, price_side, billing_meter_code, unit_price, currency, provider_code, channel_id, status, priority) VALUES (6, 'price-openai-global-text-embedding-3-small-input-upstream', 100001, 0, 2, 'openai/text-embedding-3-small', 'text-embedding-3-small', 'openai', 'global', 2, 'embedding_input_token', '0.010000', 'USD', 'openrouter', 3001, 1, 1)",
        "INSERT INTO ai_pricing_import_snapshot (id, uuid, tenant_id, organization_id, request_id, status, import_source, source_name, source_hash, data_format, row_count, accepted_count, rejected_count, currency, observed_at) VALUES (1, 'pricing-import-seed', 100001, 0, 'seed-pricing-import', 1, 1, 'seed', 'seed-hash', 'database', 6, 6, 0, 'USD', '2026-04-10 20:55:41')",
        "INSERT INTO ai_model_rank_snapshot (id, uuid, tenant_id, organization_id, source_type, source_id, source_version, status, snapshot_date, snapshot_period, rank_scope, model_id, catalog_key, model, vendor_code, region_code, vendor_name_snapshot, modality, rank_no, request_count, cost_amount, currency) VALUES (1, 'rank-openai-global-gpt-4o-mini', 100001, 0, 'seed', 1, 1, 1, '2026-04-10', 1, 'global', 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 'global', 'OpenAI', 1, 1, 100, '0.000000', 'USD')",
    ] {
        sqlx::query(statement).execute(pool).await?;
    }
    seed_openai_standard_passthrough_extensions(pool).await?;
    Ok(())
}

async fn seed_openai_standard_passthrough_extensions(pool: &SqlitePool) -> anyhow::Result<()> {
    for statement in [
        "INSERT INTO ai_api_endpoint (id, uuid, tenant_id, organization_id, endpoint_code, protocol_code, display_name, method, path_template, streaming_supported, status, sort_order) VALUES (4, 'endpoint-openai-completions', 100001, 0, 'openai.completions', 'openai_v1', 'OpenAI Completions', 'POST', '/v1/completions', 1, 1, 4)",
        "INSERT INTO ai_api_endpoint (id, uuid, tenant_id, organization_id, endpoint_code, protocol_code, display_name, method, path_template, streaming_supported, status, sort_order) VALUES (5, 'endpoint-openai-models', 100001, 0, 'openai.models', 'openai_v1', 'OpenAI Models', 'GET', '/v1/models', 0, 1, 5)",
        "INSERT INTO ai_vendor_api_endpoint (id, uuid, tenant_id, organization_id, vendor_id, vendor_code, api_endpoint_id, endpoint_code, supported, status, sort_order) VALUES (4, 'vendor-openai-completions', 100001, 0, 1, 'openai', 4, 'openai.completions', 1, 1, 4)",
        "INSERT INTO ai_vendor_api_endpoint (id, uuid, tenant_id, organization_id, vendor_id, vendor_code, api_endpoint_id, endpoint_code, supported, status, sort_order) VALUES (5, 'vendor-openai-models', 100001, 0, 1, 'openai', 5, 'openai.models', 1, 1, 5)",
        "INSERT INTO ai_modality_api_endpoint (id, uuid, tenant_id, organization_id, modality_id, modality_code, api_endpoint_id, endpoint_code, supported, status, sort_order) VALUES (4, 'chat-openai-completions', 100001, 0, 1, 'chat', 4, 'openai.completions', 1, 1, 4)",
        "INSERT INTO ai_modality_api_endpoint (id, uuid, tenant_id, organization_id, modality_id, modality_code, api_endpoint_id, endpoint_code, supported, status, sort_order) VALUES (5, 'network-openai-models', 100001, 0, 1, 'chat', 5, 'openai.models', 1, 1, 5)",
        "INSERT INTO ai_model_api_endpoint (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, api_endpoint_id, endpoint_code, provider_native_model, supports_streaming, supported, status, sort_order) VALUES (4, 'model-gpt-4o-mini-completions', 100001, 0, 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 4, 'openai.completions', 'gpt-4o-mini', 1, 1, 1, 4)",
        "INSERT INTO ai_model_api_endpoint (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, api_endpoint_id, endpoint_code, provider_native_model, supports_streaming, supported, status, sort_order) VALUES (5, 'model-gpt-4o-mini-models', 100001, 0, 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 5, 'openai.models', 'gpt-4o-mini', 0, 1, 1, 5)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_id, vendor_code, modality_id, modality_code, api_endpoint_id, api_code, status, sort_order) VALUES (7, 'resource-openai-completions', 100001, 0, 'api.openai.completions', 'api_endpoint', 'OpenAI Completions', 1, 'openai', 1, 'chat', 4, 'openai.completions', 1, 7)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_id, vendor_code, modality_id, modality_code, api_endpoint_id, api_code, status, sort_order) VALUES (8, 'resource-openai-models', 100001, 0, 'api.openai.models', 'api_endpoint', 'OpenAI Models', 1, 'openai', 1, 'network', 5, 'openai.models', 1, 8)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_id, vendor_code, modality_id, modality_code, api_endpoint_id, api_code, model_id, model_code, catalog_key, model, provider_native_model, status, sort_order) VALUES (9, 'resource-openai-gpt-4o-mini-completions', 100001, 0, 'model.openai.gpt-4o-mini.completions', 'model_api', 'GPT-4o mini Completions', 1, 'openai', 1, 'chat', 4, 'openai.completions', 1, 'gpt-4o-mini', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini', 1, 9)",
        "INSERT INTO ai_resource (id, uuid, tenant_id, organization_id, resource_code, resource_type, display_name, vendor_id, vendor_code, modality_id, modality_code, api_endpoint_id, api_code, model_id, model_code, catalog_key, model, provider_native_model, status, sort_order) VALUES (10, 'resource-openai-gpt-4o-mini-models', 100001, 0, 'model.openai.gpt-4o-mini.models', 'model_api', 'GPT-4o mini Models', 1, 'openai', 1, 'network', 5, 'openai.models', 1, 'gpt-4o-mini', 'openai/gpt-4o-mini', 'gpt-4o-mini', 'gpt-4o-mini', 1, 10)",
        "INSERT INTO ai_resource_group_item (id, uuid, tenant_id, organization_id, resource_group_id, resource_group_code, item_type, resource_id, resource_code, item_role, status, sort_order) VALUES (4, 'resource-member-openrouter-openai-completions', 100001, 0, 5, 'bundle.openrouter.openai.standard', 'resource', 7, 'api.openai.completions', 'include', 1, 4)",
        "INSERT INTO ai_resource_group_item (id, uuid, tenant_id, organization_id, resource_group_id, resource_group_code, item_type, resource_id, resource_code, item_role, status, sort_order) VALUES (5, 'resource-member-openrouter-openai-models', 100001, 0, 5, 'bundle.openrouter.openai.standard', 'resource', 8, 'api.openai.models', 'include', 1, 5)",
        "INSERT INTO ai_resource_group_item (id, uuid, tenant_id, organization_id, resource_group_id, resource_group_code, item_type, resource_id, resource_code, item_role, status, sort_order) VALUES (6, 'resource-member-openrouter-gpt-4o-mini-completions', 100001, 0, 5, 'bundle.openrouter.openai.standard', 'resource', 9, 'model.openai.gpt-4o-mini.completions', 'include', 1, 6)",
        "INSERT INTO ai_resource_group_item (id, uuid, tenant_id, organization_id, resource_group_id, resource_group_code, item_type, resource_id, resource_code, item_role, status, sort_order) VALUES (7, 'resource-member-openrouter-gpt-4o-mini-models', 100001, 0, 5, 'bundle.openrouter.openai.standard', 'resource', 10, 'model.openai.gpt-4o-mini.models', 'include', 1, 7)",
        "INSERT INTO ai_model_pricing (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, region_code, price_side, billing_meter_code, unit_price, currency, status, priority) VALUES (7, 'price-openai-global-gpt-4o-mini-api-request-reference', 100001, 0, 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 'global', 1, 'api_request', '0.001000', 'USD', 1, 1)",
        "INSERT INTO ai_model_pricing (id, uuid, tenant_id, organization_id, model_id, catalog_key, model, vendor_code, region_code, price_side, billing_meter_code, unit_price, currency, provider_code, channel_id, status, priority) VALUES (8, 'price-openai-global-gpt-4o-mini-api-request-upstream', 100001, 0, 1, 'openai/gpt-4o-mini', 'gpt-4o-mini', 'openai', 'global', 2, 'api_request', '0.000500', 'USD', 'openrouter', 3001, 1, 1)",
        "UPDATE ai_pricing_import_snapshot SET row_count = 8, accepted_count = 8 WHERE id = 1",
    ] {
        sqlx::query(statement).execute(pool).await?;
    }
    Ok(())
}

async fn seed_billing_meters(pool: &SqlitePool) -> anyhow::Result<()> {
    for (index, (meter_code, display_name)) in BILLING_METER_CODES.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO ai_billing_meter
                (id, uuid, tenant_id, organization_id, meter_code, display_name, status, sort_order)
            VALUES
                (?, ?, 100001, 0, ?, ?, 1, ?)
            "#,
        )
        .bind((index + 1) as i64)
        .bind(format!("meter-{meter_code}"))
        .bind(meter_code)
        .bind(display_name)
        .bind((index + 1) as i64)
        .execute(pool)
        .await?;
    }
    Ok(())
}

/// Asserts gateway/router responses use a server-generated RFC 4122 UUID v4 request id
/// instead of honoring a client-supplied `x-request-id`.
pub fn assert_server_generated_request_id(actual: &str, client_request_id: &str) {
    assert_ne!(
        client_request_id, actual,
        "gateway must ignore client supplied x-request-id and use a server request id"
    );
    assert_eq!(36, actual.len(), "server request id must be a UUID");
    assert_eq!(Some('-'), actual.chars().nth(8));
    assert_eq!(Some('-'), actual.chars().nth(13));
    assert_eq!(Some('-'), actual.chars().nth(18));
    assert_eq!(Some('-'), actual.chars().nth(23));
    assert_eq!(Some('4'), actual.chars().nth(14));
    let variant = actual
        .chars()
        .nth(19)
        .expect("server request id must include UUID variant");
    assert!(
        matches!(variant, '8' | '9' | 'a' | 'b'),
        "server request id must be an RFC 4122 variant UUID"
    );
}

#[cfg(test)]
mod tests {
    use sdkwork_claw_http::{
        verified_signed_trusted_request_subject, verify_app_session_authorization_header,
    };
    use sqlx::Row;

    use axum::http::{HeaderMap, HeaderValue};

    use super::seeded_sqlite_catalog;

    const STANDARD_AI_TABLES: &[&str] = &[
        "ai_chat_conversation",
        "ai_chat_turn",
        "ai_chat_item",
        "ai_chat_message",
        "ai_chat_message_part",
        "ai_chat_context_snapshot",
        "ai_agent_session",
        "ai_agent_run",
        "ai_agent_run_step",
        "ai_runtime_invocation",
        "ai_runtime_invocation_event",
        "ai_runtime_usage_link",
        "ai_runtime_artifact",
    ];

    #[test]
    fn sqlite_template_lock_retry_delay_starts_small_and_caps() {
        assert_eq!(
            std::time::Duration::from_millis(10),
            super::template_lock_retry_delay(0)
        );
        assert_eq!(
            std::time::Duration::from_millis(20),
            super::template_lock_retry_delay(1)
        );
        assert_eq!(
            std::time::Duration::from_millis(40),
            super::template_lock_retry_delay(2)
        );
        assert_eq!(
            std::time::Duration::from_millis(80),
            super::template_lock_retry_delay(3)
        );
        assert_eq!(
            std::time::Duration::from_millis(100),
            super::template_lock_retry_delay(4)
        );
        assert_eq!(
            std::time::Duration::from_millis(100),
            super::template_lock_retry_delay(12)
        );
    }

    #[tokio::test]
    async fn seeded_sqlite_catalog_reopens_pool_for_real_route_tests() {
        let catalog = seeded_sqlite_catalog().await.unwrap();
        let pool = catalog.open_pool().await.unwrap();

        let row =
            sqlx::query("SELECT catalog_key, model, display_name FROM ai_model WHERE catalog_key = 'openai/gpt-4o-mini'")
                .fetch_one(&pool)
                .await
                .unwrap();

        assert_eq!("openai/gpt-4o-mini", row.get::<String, _>("catalog_key"));
        assert_eq!("gpt-4o-mini", row.get::<String, _>("model"));
        assert_eq!("GPT-4o mini", row.get::<String, _>("display_name"));
    }

    #[tokio::test]
    async fn seeded_sqlite_catalog_contains_embedding_model_and_route() {
        let catalog = seeded_sqlite_catalog().await.unwrap();
        let pool = catalog.open_pool().await.unwrap();

        let row = sqlx::query(
            r#"
            SELECT m.model, r.provider_native_model, cri.resource_group_code
            FROM ai_model m
            JOIN ai_resource r ON r.catalog_key = m.catalog_key
            JOIN ai_resource_group_item rgi ON rgi.resource_code = r.resource_code
            JOIN ai_channel_resource cri ON cri.resource_group_code = rgi.resource_group_code
            WHERE m.catalog_key = 'openai/text-embedding-3-small'
              AND r.resource_type = 'model_api'
              AND r.api_code = 'openai.embeddings'
              AND cri.channel_id = 3001
              AND cri.status = 1
            "#,
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!("text-embedding-3-small", row.get::<String, _>("model"));
        assert_eq!(
            "text-embedding-3-small",
            row.get::<String, _>("provider_native_model")
        );
        assert_eq!(
            "bundle.openrouter.openai.standard",
            row.get::<String, _>("resource_group_code")
        );
    }

    #[tokio::test]
    async fn seeded_sqlite_catalog_contains_gateway_api_key_channel_group_binding() {
        let catalog = seeded_sqlite_catalog().await.unwrap();
        let pool = catalog.open_pool().await.unwrap();

        let row = sqlx::query(
            r#"
            SELECT kg.channel_group_id, kg.channel_group_code
            FROM iam_gateway_api_key_channel_group kg
            WHERE kg.api_key_id = 100
              AND kg.status = 1
            "#,
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(10_i64, row.get::<i64, _>("channel_group_id"));
        assert_eq!("standard-group", row.get::<String, _>("channel_group_code"));
    }

    #[tokio::test]
    async fn seeded_sqlite_catalog_contains_admin_iam_membership_fixture() {
        let catalog = seeded_sqlite_catalog().await.unwrap();
        let pool = catalog.open_pool().await.unwrap();

        let row = sqlx::query(
            r#"
            SELECT id, tenant_id, organization_id, user_id, membership_kind, status
            FROM iam_organization_membership
            WHERE tenant_id = '100001'
              AND organization_id = '0'
              AND user_id = '1'
              AND status = 'active'
              AND LOWER(COALESCE(membership_kind, '')) = 'admin'
            "#,
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!("member-1-admin", row.get::<String, _>("id"));
        assert_eq!("100001", row.get::<String, _>("tenant_id"));
        assert_eq!("0", row.get::<String, _>("organization_id"));
        assert_eq!("1", row.get::<String, _>("user_id"));
        assert_eq!("admin", row.get::<String, _>("membership_kind"));
        assert_eq!("active", row.get::<String, _>("status"));
    }

    #[tokio::test]
    async fn seeded_sqlite_catalog_contains_route_scoped_sticky_object_route_schema() {
        let catalog = seeded_sqlite_catalog().await.unwrap();
        let pool = catalog.open_pool().await.unwrap();

        let required_column_count = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(1)
            FROM pragma_table_info('ai_provider_object_route')
            WHERE name IN (
                'id',
                'uuid',
                'tenant_id',
                'organization_id',
                'status',
                'api_key_id',
                'channel_group_id',
                'object_type',
                'object_id',
                'object_key_hash',
                'parent_object_type',
                'parent_object_id',
                'provider_code',
                'channel_id',
                'vendor_code',
                'api_code',
                'catalog_key',
                'provider_model',
                'region_code',
                'sticky_scope',
                'last_seen_at'
            )
            "#,
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        let unique_index_count = sqlx::query_scalar::<_, i64>(
            r#"
            SELECT COUNT(1)
            FROM sqlite_master
            WHERE type = 'index'
              AND name = 'uk_ai_provider_object_route_object'
              AND tbl_name = 'ai_provider_object_route'
            "#,
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(21_i64, required_column_count);
        assert_eq!(1_i64, unique_index_count);
    }

    #[tokio::test]
    async fn seeded_sqlite_catalog_can_seed_usage_settlement_appbase_points_account() {
        let catalog = seeded_sqlite_catalog().await.unwrap();
        let pool = catalog.open_pool().await.unwrap();

        catalog
            .seed_usage_settlement_points_account(&pool, 701, 1000)
            .await
            .unwrap();

        let points: i64 =
            sqlx::query_scalar(
                "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-701'",
            )
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(1000, points);
    }

    #[tokio::test]
    async fn seeded_sqlite_catalog_returns_isolated_database_copies() {
        let first = seeded_sqlite_catalog().await.unwrap();
        let first_pool = first.open_pool().await.unwrap();
        first
            .seed_usage_settlement_points_account(&first_pool, 702, 1500)
            .await
            .unwrap();

        let second = seeded_sqlite_catalog().await.unwrap();
        let second_pool = second.open_pool().await.unwrap();
        let points: Option<i64> = sqlx::query_scalar(
            "SELECT CAST(available_amount AS INTEGER) FROM commerce_account WHERE id = 'account-702'",
        )
        .fetch_optional(&second_pool)
        .await
        .unwrap();

        assert_eq!(
            None, points,
            "seeded sqlite catalog copies must stay isolated between tests"
        );
    }

    #[tokio::test]
    async fn seeded_sqlite_catalog_can_fork_existing_database_state_and_keep_isolation() {
        let source = seeded_sqlite_catalog().await.unwrap();
        let source_pool = source.open_pool().await.unwrap();
        sqlx::query(
            r#"
            UPDATE ai_model
            SET display_name = 'Fork source marker'
            WHERE catalog_key = 'openai/gpt-4o-mini'
            "#,
        )
        .execute(&source_pool)
        .await
        .unwrap();

        let fork = source.fork().unwrap();
        let fork_pool = fork.open_pool().await.unwrap();
        let fork_display_name: String = sqlx::query_scalar(
            "SELECT display_name FROM ai_model WHERE catalog_key = 'openai/gpt-4o-mini'",
        )
        .fetch_one(&fork_pool)
        .await
        .unwrap();
        assert_eq!(
            "Fork source marker", fork_display_name,
            "forked sqlite catalogs must preserve the source database state"
        );

        sqlx::query(
            r#"
            UPDATE ai_model
            SET display_name = 'Fork only marker'
            WHERE catalog_key = 'openai/gpt-4o-mini'
            "#,
        )
        .execute(&fork_pool)
        .await
        .unwrap();
        let fork_only_display_name: String = sqlx::query_scalar(
            "SELECT display_name FROM ai_model WHERE catalog_key = 'openai/gpt-4o-mini'",
        )
        .fetch_one(&fork_pool)
        .await
        .unwrap();
        assert_eq!("Fork only marker", fork_only_display_name);
        fork_pool.close().await;

        let source_display_name: String = sqlx::query_scalar(
            "SELECT display_name FROM ai_model WHERE catalog_key = 'openai/gpt-4o-mini'",
        )
        .fetch_one(&source_pool)
        .await
        .unwrap();
        assert_eq!(
            "Fork source marker", source_display_name,
            "forked sqlite catalogs must stay isolated from their source database"
        );
        source_pool.close().await;
    }

    #[tokio::test]
    async fn seeded_sqlite_catalog_exposes_standard_gateway_auth_fixture() {
        let catalog = seeded_sqlite_catalog().await.unwrap();

        assert_eq!("sk-live-unified-sqlite", catalog.gateway_api_key());
        assert_eq!(
            "Bearer sk-live-unified-sqlite",
            catalog.gateway_authorization_header()
        );
        assert!(catalog.api_key_security_config().is_ok());
    }

    #[tokio::test]
    async fn seeded_sqlite_catalog_exposes_standard_runtime_security_configs() {
        let catalog = seeded_sqlite_catalog().await.unwrap();

        assert!(catalog.trusted_subject_config().is_ok());
        assert!(catalog.app_session_config().is_ok());
        assert!(catalog.payment_webhook_config().is_ok());
    }

    #[tokio::test]
    async fn seeded_sqlite_catalog_contains_standard_chat_agent_memory_runtime_tables() {
        let catalog = seeded_sqlite_catalog().await.unwrap();
        let pool = catalog.open_pool().await.unwrap();

        for table in STANDARD_AI_TABLES {
            let exists: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?",
            )
            .bind(table)
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(1, exists, "seeded sqlite catalog must create {table}");
        }

        let usage_link_unique_index_exists: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM sqlite_master
            WHERE type = 'index'
              AND name = 'uk_ai_runtime_usage_link_agent_scope'
              AND tbl_name = 'ai_runtime_usage_link'
              AND sql LIKE '%COALESCE(agent_run_step_id, '''')%'
            "#,
        )
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(
            1, usage_link_unique_index_exists,
            "seeded sqlite catalog must enforce idempotent agent run usage links"
        );
    }

    #[tokio::test]
    async fn standard_runtime_subject_helpers_create_verifiable_tokens_and_signatures() {
        let subject = super::default_trusted_request_subject();
        let issued_at = 1_800_000_000;
        let expires_at = issued_at + 300;
        let authorization =
            super::app_session_bearer_token(subject, issued_at, expires_at).unwrap();

        let verified_subject = verify_app_session_authorization_header(
            &super::app_session_config().unwrap(),
            authorization.as_str(),
            issued_at + 1,
        )
        .unwrap();

        assert_eq!(10, verified_subject.tenant_id);
        assert_eq!(20, verified_subject.organization_id);
        assert_eq!(30, verified_subject.user_id);

        let signature = super::trusted_subject_signature(
            subject,
            issued_at,
            "GET",
            "/backend/v3/api/ai/models",
        )
        .unwrap();
        let mut headers = HeaderMap::new();
        headers.insert("x-sdkwork-subject-tenant-id", subject.tenant_id.into());
        headers.insert(
            "x-sdkwork-subject-organization-id",
            subject.organization_id.into(),
        );
        headers.insert("x-sdkwork-subject-user-id", subject.user_id.into());
        headers.insert("x-sdkwork-subject-timestamp", issued_at.into());
        headers.insert(
            "x-sdkwork-subject-signature",
            HeaderValue::from_str(signature.as_str()).unwrap(),
        );

        let verified_subject = verified_signed_trusted_request_subject(
            &mut headers,
            "GET",
            "/backend/v3/api/ai/models",
            &super::trusted_subject_config().unwrap(),
            issued_at + 1,
        )
        .unwrap()
        .unwrap();

        assert_eq!(subject, verified_subject);
        assert!(headers.get("x-sdkwork-tenant-id").is_none());
        assert!(headers.get("x-sdkwork-organization-id").is_none());
        assert!(headers.get("x-sdkwork-user-id").is_none());
    }
}
