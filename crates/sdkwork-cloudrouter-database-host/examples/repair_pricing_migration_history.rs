//! One-shot dev repair for pricing migration history after splitting 0002.
//!
//! Run from the repository root with `.env.postgres` loaded:
//! `cargo run -p sdkwork-cloudrouter-database-host --example repair-pricing_migration_history`

use std::path::{Path, PathBuf};

use sdkwork_database_config::{DatabaseConfig, DatabaseEngine};
use sdkwork_database_sqlx::{create_pool_from_config, DatabasePool};
use sha2::{Digest, Sha256};

#[tokio::main]
async fn main() -> Result<(), String> {
    let _ = dotenvy::from_filename(".env.postgres");
    let config = DatabaseConfig::from_env("CLOUD_ROUTER")
        .map_err(|error| format!("read database config failed: {error}"))?;
    if config.engine != DatabaseEngine::Postgres {
        return Err("repair requires PostgreSQL".to_owned());
    }

    let pool = create_pool_from_config(config)
        .await
        .map_err(|error| format!("connect database failed: {error}"))?;
    let app_root = resolve_app_root();
    let migration_root = app_root.join("database/modules/pricing/migrations/postgres");
    let migration_0001 = migration_root.join("0001_pricing_rate_book_dimension_columns.up.sql");
    let migration_0002 = migration_root.join("0002_pricing_integrity_guards.up.sql");
    let checksum_0001 = file_checksum(&migration_0001)?;
    let checksum_0002 = file_checksum(&migration_0002)?;

    repair_history(&pool, &checksum_0001, &checksum_0002).await?;
    println!("pricing migration history repair complete");
    Ok(())
}

async fn repair_history(
    pool: &DatabasePool,
    checksum_0001: &str,
    checksum_0002: &str,
) -> Result<(), String> {
    let postgres = pool
        .as_postgres()
        .ok_or_else(|| "expected PostgreSQL pool".to_owned())?;

    sqlx::query(
        r#"
        INSERT INTO ops_schema_migration_history (
            module_id, version, name, engine, checksum, applied_by
        )
        VALUES (
            'pricing', '0001', 'pricing_rate_book_dimension_columns', 'postgres', $1,
            'repair-pricing-migration-history'
        )
        ON CONFLICT (module_id, version, engine) DO UPDATE
        SET checksum = EXCLUDED.checksum
        "#,
    )
    .bind(checksum_0001)
    .execute(postgres)
    .await
    .map_err(|error| format!("record pricing migration 0001 failed: {error}"))?;

    let updated = sqlx::query(
        r#"
        UPDATE ops_schema_migration_history
        SET checksum = $1,
            applied_by = COALESCE(applied_by, 'repair-pricing-migration-history')
        WHERE module_id = 'pricing'
          AND version = '0002'
          AND engine = 'postgres'
        "#,
    )
    .bind(checksum_0002)
    .execute(postgres)
    .await
    .map_err(|error| format!("update pricing migration 0002 checksum failed: {error}"))?;

    if updated.rows_affected() == 0 {
        return Err(
            "pricing migration 0002 is not recorded; run cloudrouterctl ensure on a fresh database instead"
                .to_owned(),
        );
    }

    Ok(())
}

fn resolve_app_root() -> PathBuf {
    std::env::var("SDKWORK_CLOUDROUTER_ROUTER_APP_ROOT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../..")
                .canonicalize()
                .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
        })
}

fn file_checksum(path: &Path) -> Result<String, String> {
    let bytes = std::fs::read(path)
        .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
    Ok(hex::encode(Sha256::digest(bytes)))
}
