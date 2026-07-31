use std::collections::HashSet;
use std::sync::OnceLock;
use std::time::Duration;

use sdkwork_claw_config::{RedisConfig, RuntimeTomlConfig};
use sdkwork_database_config::{
    DatabaseConfig as StandardDatabaseConfig, DatabaseEngine as StandardDatabaseEngine,
};
use sdkwork_database_repository::RepositoryError;
use sdkwork_database_sqlx::{DatabasePool, PoolBuilder, PoolError};
use serde::Deserialize;
use sqlx::PgPool;

use crate::application::UsageSettlementWorkerConfig;

use super::runtime_id::{claw_runtime_id_is_healthy, to_standard_database_config};

pub const POSTGRES_POOL_ACQUIRE_TIMEOUT_SECONDS: u64 = 10;

/// Maximum time a single readiness probe may take before it is reported as not ready.
pub const READINESS_CHECK_TIMEOUT: Duration = Duration::from_millis(500);

const ROOT_DATABASE_MANIFEST: &str = include_str!("../../../../../database/database.manifest.json");
const GATEWAY_IAM_DATABASE_MANIFEST: &str =
    include_str!("../../../../../database/modules/gateway-iam/database.manifest.json");
const OPERATIONS_DATABASE_MANIFEST: &str =
    include_str!("../../../../../database/modules/operations/database.manifest.json");

const CRITICAL_CHAT_COLUMNS: &[&str] = &[
    "ai_chat_conversation.message_count",
    "ai_chat_conversation.turn_count",
    "ai_chat_conversation.item_count",
    "ai_chat_conversation.last_message_preview",
    "ai_chat_turn.mode",
    "ai_chat_turn.context_snapshot_count",
    "ai_chat_item.sequence_no",
    "ai_chat_message.message_no",
    "ai_chat_context_snapshot.snapshot_no",
    "ai_runtime_invocation.invocation_no",
    "ai_runtime_usage_link.user_id",
];

const CRITICAL_CHAT_INDEXES: &[&str] = &[
    "uk_ai_chat_conversation_scope_code",
    "uk_ai_chat_turn_scope_conversation_no",
    "uk_ai_chat_item_scope_conversation_sequence",
    "uk_ai_chat_message_scope_conversation_no",
    "uk_ai_chat_context_snapshot_scope_turn_no",
    "uk_ai_runtime_invocation_scope_uuid",
    "uk_ai_runtime_usage_link_scope_uuid",
];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DatabaseReadinessManifest {
    module_id: String,
    contract_version: String,
    materialized_tables: Vec<String>,
}

#[derive(Debug)]
struct ExpectedDatabaseReadiness {
    module_ids: Vec<String>,
    contract_versions: Vec<String>,
    table_names: Vec<String>,
    critical_columns: Vec<String>,
    critical_indexes: Vec<String>,
}

static EXPECTED_DATABASE_READINESS: OnceLock<Result<ExpectedDatabaseReadiness, String>> =
    OnceLock::new();

fn postgres_standard_config(database_url: &str, max_connections: u32) -> StandardDatabaseConfig {
    StandardDatabaseConfig {
        engine: StandardDatabaseEngine::Postgres,
        url: database_url.to_owned(),
        max_connections,
        ..StandardDatabaseConfig::default()
    }
}

fn pool_error_to_sqlx(error: PoolError) -> sqlx::Error {
    sqlx::Error::Configuration(error.to_string().into())
}

pub async fn connect_standard_database_pool(
    config: &sdkwork_claw_config::DatabaseConfig,
) -> Result<DatabasePool, RepositoryError> {
    let standard = to_standard_database_config(config)
        .map_err(|error| RepositoryError::Generic(error.to_string()))?;
    PoolBuilder::new(standard)
        .acquire_timeout(Duration::from_secs(POSTGRES_POOL_ACQUIRE_TIMEOUT_SECONDS))
        .build()
        .await
        .map_err(RepositoryError::from)
}

pub async fn connect_postgres_runtime_pool(
    database_url: &str,
    max_connections: u32,
) -> Result<PgPool, sqlx::Error> {
    let pool = PoolBuilder::new(postgres_standard_config(database_url, max_connections))
        .acquire_timeout(Duration::from_secs(POSTGRES_POOL_ACQUIRE_TIMEOUT_SECONDS))
        .build()
        .await
        .map_err(pool_error_to_sqlx)?;
    pool.as_postgres()
        .cloned()
        .ok_or_else(|| sqlx::Error::Configuration("expected PostgreSQL database pool".into()))
}

pub fn postgres_database_readiness_check(pool: PgPool) -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(move || {
        let pool = pool.clone();
        Box::pin(async move {
            run_with_readiness_timeout("postgres", sqlx::query("SELECT 1").execute(&pool), |_| true)
                .await
        })
    })
}

fn parse_database_readiness_manifest(source: &str) -> Result<DatabaseReadinessManifest, String> {
    let manifest = serde_json::from_str::<DatabaseReadinessManifest>(source)
        .map_err(|error| format!("invalid database readiness manifest: {error}"))?;
    if manifest.module_id.trim().is_empty() {
        return Err("database readiness manifest moduleId must not be empty".to_owned());
    }
    if manifest.contract_version.trim().is_empty() {
        return Err(format!(
            "database readiness manifest {} contractVersion must not be empty",
            manifest.module_id
        ));
    }
    if manifest.materialized_tables.is_empty() {
        return Err(format!(
            "database readiness manifest {} must declare materializedTables",
            manifest.module_id
        ));
    }
    let mut tables = HashSet::with_capacity(manifest.materialized_tables.len());
    for table in &manifest.materialized_tables {
        if table.trim().is_empty() || !tables.insert(table.as_str()) {
            return Err(format!(
                "database readiness manifest {} contains an empty or duplicate table",
                manifest.module_id
            ));
        }
    }
    Ok(manifest)
}

fn build_expected_database_readiness() -> Result<ExpectedDatabaseReadiness, String> {
    let manifests = [
        parse_database_readiness_manifest(ROOT_DATABASE_MANIFEST)?,
        parse_database_readiness_manifest(GATEWAY_IAM_DATABASE_MANIFEST)?,
        parse_database_readiness_manifest(OPERATIONS_DATABASE_MANIFEST)?,
    ];
    let mut module_ids = Vec::with_capacity(manifests.len());
    let mut contract_versions = Vec::with_capacity(manifests.len());
    let mut table_names = Vec::new();
    let mut seen_modules = HashSet::with_capacity(manifests.len());
    let mut seen_tables = HashSet::new();

    for manifest in manifests {
        if !seen_modules.insert(manifest.module_id.clone()) {
            return Err(format!(
                "duplicate database readiness module {}",
                manifest.module_id
            ));
        }
        for table in manifest.materialized_tables {
            if !seen_tables.insert(table.clone()) {
                return Err(format!("duplicate materialized database table {table}"));
            }
            table_names.push(table);
        }
        module_ids.push(manifest.module_id);
        contract_versions.push(manifest.contract_version);
    }
    table_names.sort_unstable();

    Ok(ExpectedDatabaseReadiness {
        module_ids,
        contract_versions,
        table_names,
        critical_columns: CRITICAL_CHAT_COLUMNS
            .iter()
            .map(|value| (*value).to_owned())
            .collect(),
        critical_indexes: CRITICAL_CHAT_INDEXES
            .iter()
            .map(|value| (*value).to_owned())
            .collect(),
    })
}

fn expected_database_readiness() -> Result<&'static ExpectedDatabaseReadiness, &'static str> {
    match EXPECTED_DATABASE_READINESS.get_or_init(build_expected_database_readiness) {
        Ok(expected) => Ok(expected),
        Err(error) => Err(error.as_str()),
    }
}

pub async fn postgres_runtime_schema_ready(pool: &PgPool) -> Result<bool, sqlx::Error> {
    let expected = match expected_database_readiness() {
        Ok(expected) => expected,
        Err(error) => {
            tracing::error!(error, "database readiness contract is invalid");
            return Ok(false);
        }
    };

    sqlx::query_scalar::<_, bool>(
        r#"
        WITH expected_tables(table_name) AS (
            SELECT unnest($1::text[])
        ),
        expected_modules(module_id, contract_version) AS (
            SELECT * FROM unnest($2::text[], $3::text[])
        ),
        expected_columns(column_key) AS (
            SELECT unnest($4::text[])
        ),
        expected_indexes(index_name) AS (
            SELECT unnest($5::text[])
        )
        SELECT
            NOT EXISTS (
                SELECT 1
                FROM expected_tables expected
                LEFT JOIN information_schema.tables actual
                  ON actual.table_schema = current_schema()
                 AND actual.table_type = 'BASE TABLE'
                 AND actual.table_name = expected.table_name
                WHERE actual.table_name IS NULL
            )
            AND NOT EXISTS (
                SELECT 1
                FROM expected_modules expected
                LEFT JOIN ops_database_installation_state actual
                  ON actual.module_id = expected.module_id
                 AND actual.contract_version = expected.contract_version
                 AND actual.status IN ('schema_current', 'seeded')
                WHERE actual.module_id IS NULL
            )
            AND NOT EXISTS (
                SELECT 1
                FROM expected_columns expected
                LEFT JOIN information_schema.columns actual
                  ON actual.table_schema = current_schema()
                 AND actual.table_name || '.' || actual.column_name = expected.column_key
                WHERE actual.column_name IS NULL
            )
            AND NOT EXISTS (
                SELECT 1
                FROM expected_indexes expected
                LEFT JOIN pg_indexes actual
                  ON actual.schemaname = current_schema()
                 AND actual.indexname = expected.index_name
                WHERE actual.indexname IS NULL
            )
        "#,
    )
    .bind(&expected.table_names)
    .bind(&expected.module_ids)
    .bind(&expected.contract_versions)
    .bind(&expected.critical_columns)
    .bind(&expected.critical_indexes)
    .fetch_one(pool)
    .await
}

pub fn postgres_runtime_schema_readiness_check(
    pool: PgPool,
) -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(move || {
        let pool = pool.clone();
        Box::pin(async move {
            run_with_readiness_timeout(
                "postgres-runtime-schema",
                postgres_runtime_schema_ready(&pool),
                |ready| ready,
            )
            .await
        })
    })
}

async fn run_with_readiness_timeout<F, T, E>(probe: &'static str, future: F, evaluate: E) -> bool
where
    F: std::future::Future<Output = Result<T, sqlx::Error>>,
    E: FnOnce(T) -> bool,
{
    match tokio::time::timeout(READINESS_CHECK_TIMEOUT, future).await {
        Ok(Ok(result)) => {
            let ready = evaluate(result);
            if !ready {
                tracing::warn!(probe, "readiness probe reported not ready");
            }
            ready
        }
        Ok(Err(error)) => {
            tracing::warn!(probe, error = %error, "readiness probe failed");
            false
        }
        Err(_) => {
            tracing::warn!(
                probe,
                timeout_ms = READINESS_CHECK_TIMEOUT.as_millis() as u64,
                "readiness probe timed out; reporting not ready"
            );
            false
        }
    }
}

pub fn redis_readiness_check(redis_url: String) -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(move || {
        let redis_url = redis_url.clone();
        Box::pin(async move {
            match tokio::time::timeout(READINESS_CHECK_TIMEOUT, async {
                let client = match redis::Client::open(redis_url.as_str()) {
                    Ok(client) => client,
                    Err(_) => return false,
                };
                let mut connection = match client.get_multiplexed_async_connection().await {
                    Ok(connection) => connection,
                    Err(_) => return false,
                };
                match redis::cmd("PING")
                    .query_async::<String>(&mut connection)
                    .await
                {
                    Ok(pong) => pong.eq_ignore_ascii_case("PONG"),
                    Err(_) => false,
                }
            })
            .await
            {
                Ok(ready) => ready,
                Err(_) => {
                    tracing::warn!(
                        timeout_ms = READINESS_CHECK_TIMEOUT.as_millis() as u64,
                        "redis readiness check timed out; reporting not ready"
                    );
                    false
                }
            }
        })
    })
}

pub async fn postgres_usage_settlement_schema_ready(pool: &PgPool) -> Result<bool, sqlx::Error> {
    let table_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name IN ('ai_usage', 'commerce_settlement')
        "#,
    )
    .fetch_one(pool)
    .await?;
    let usage_column_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'ai_usage'
          AND column_name IN ('settlement_status', 'settlement_id', 'pricing_snapshot')
        "#,
    )
    .fetch_one(pool)
    .await?;
    Ok(table_count == 2 && usage_column_count == 3)
}

pub fn postgres_usage_settlement_readiness_check(
    pool: PgPool,
    required: bool,
) -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(move || {
        let pool = pool.clone();
        Box::pin(async move {
            if !required {
                return true;
            }
            run_with_readiness_timeout(
                "postgres-usage-settlement-schema",
                postgres_usage_settlement_schema_ready(&pool),
                |ready| ready,
            )
            .await
        })
    })
}

pub fn runtime_id_lease_readiness_check() -> sdkwork_claw_http::ReadinessCheckFn {
    std::sync::Arc::new(|| Box::pin(async { claw_runtime_id_is_healthy() }))
}

pub fn postgres_runtime_readiness_check(
    pool: PgPool,
    runtime_toml: Option<&RuntimeTomlConfig>,
    settlement_config: UsageSettlementWorkerConfig,
) -> Option<sdkwork_claw_http::ReadinessCheckFn> {
    let settlement_required = settlement_config.normalized().enabled;
    let mut checks = vec![
        postgres_database_readiness_check(pool.clone()),
        postgres_runtime_schema_readiness_check(pool.clone()),
        postgres_usage_settlement_readiness_check(pool, settlement_required),
        runtime_id_lease_readiness_check(),
    ];
    if let Ok(Some(redis_config)) = RedisConfig::from_env_or_runtime_toml(runtime_toml) {
        checks.push(redis_readiness_check(redis_config.url().to_owned()));
    }
    sdkwork_claw_http::combine_readiness_checks(checks)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn database_readiness_contract_covers_all_declared_modules_and_chat_tables() {
        let expected = expected_database_readiness().expect("valid database readiness manifests");

        assert_eq!(
            ["clawrouter", "gateway-iam", "operations"],
            expected.module_ids.as_slice()
        );
        assert!(expected
            .contract_versions
            .iter()
            .all(|version| version == "0.4.0"));
        for table in [
            "ai_chat_conversation",
            "ai_chat_turn",
            "ai_chat_item",
            "ai_chat_message",
            "ai_chat_message_part",
            "ai_chat_context_snapshot",
            "ai_runtime_invocation",
            "ai_runtime_usage_link",
            "iam_gateway_api_key",
            "ops_gateway_instance",
        ] {
            assert!(
                expected.table_names.iter().any(|actual| actual == table),
                "missing readiness table {table}"
            );
        }
    }

    #[test]
    fn database_readiness_manifest_rejects_duplicate_tables() {
        let error = parse_database_readiness_manifest(
            r#"{
                "moduleId": "demo",
                "contractVersion": "1.0.0",
                "materializedTables": ["demo_item", "demo_item"]
            }"#,
        )
        .expect_err("duplicate tables must fail closed");

        assert!(error.contains("duplicate table"));
    }

    #[tokio::test]
    async fn readiness_timeout_preserves_false_probe_results() {
        let ready = run_with_readiness_timeout(
            "test-false-probe",
            async { Ok::<_, sqlx::Error>(false) },
            |result| result,
        )
        .await;

        assert!(
            !ready,
            "a successful false schema probe must fail readiness"
        );
    }

    #[tokio::test]
    async fn readiness_timeout_accepts_successful_non_boolean_queries() {
        let ready = run_with_readiness_timeout(
            "test-query-probe",
            async { Ok::<_, sqlx::Error>(42_u8) },
            |_| true,
        )
        .await;

        assert!(ready, "a successful connectivity query must pass readiness");
    }

    #[tokio::test]
    async fn redis_readiness_check_returns_false_for_unreachable_url() {
        let check = redis_readiness_check("redis://127.0.0.1:1".to_owned());
        assert!(!check().await, "unreachable redis must not report ready");
    }

    #[tokio::test]
    async fn redis_readiness_check_times_out_when_server_is_silent() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move { while listener.accept().await.is_ok() {} });

        let check = redis_readiness_check(format!("redis://{address}"));
        let ready = tokio::time::timeout(READINESS_CHECK_TIMEOUT + Duration::from_secs(2), check())
            .await
            .expect("readiness check must not hang beyond its timeout");

        assert!(!ready, "silent redis must time out and report not ready");
        server.abort();
    }
}
