use std::env;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{PgPool, SqlitePool};

pub const POSTGRES_TEST_DATABASE_URL: &str = "SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL";

static SCHEMA_COUNTER: AtomicU64 = AtomicU64::new(0);

pub struct DialectTestContext {
    sqlite_pool: SqlitePool,
    postgres_pool: PgPool,
    postgres_database_url: String,
    postgres_schema: String,
}

impl DialectTestContext {
    pub async fn require(label: &str) -> Result<Self> {
        let postgres_database_url = env::var(POSTGRES_TEST_DATABASE_URL)
            .ok()
            .filter(|value| !value.trim().is_empty())
            .with_context(|| {
                format!(
                    "{POSTGRES_TEST_DATABASE_URL} is required; PostgreSQL parity tests must not skip"
                )
            })?;
        let sqlite_pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .context("connect in-memory SQLite parity database")?;

        let postgres_schema = unique_schema_name(label);
        let quoted_schema = quote_identifier(&postgres_schema);
        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .acquire_timeout(Duration::from_secs(10))
            .connect(&postgres_database_url)
            .await
            .with_context(|| {
                format!(
                    "connect PostgreSQL parity database from {POSTGRES_TEST_DATABASE_URL}"
                )
            })?;
        sqlx::query(&format!("CREATE SCHEMA {quoted_schema}"))
            .execute(&admin_pool)
            .await
            .context("create isolated PostgreSQL parity schema")?;
        admin_pool.close().await;

        let schema_for_connections = postgres_schema.clone();
        let postgres_pool = PgPoolOptions::new()
            .max_connections(2)
            .acquire_timeout(Duration::from_secs(10))
            .after_connect(move |connection, _metadata| {
                let schema = schema_for_connections.clone();
                Box::pin(async move {
                    sqlx::query(&format!(
                        "SET search_path TO {}",
                        quote_identifier(&schema)
                    ))
                    .execute(&mut *connection)
                    .await?;
                    Ok(())
                })
            })
            .connect(&postgres_database_url)
            .await
            .context("connect isolated PostgreSQL parity pool")?;

        Ok(Self {
            sqlite_pool,
            postgres_pool,
            postgres_database_url,
            postgres_schema,
        })
    }

    pub fn sqlite_pool(&self) -> SqlitePool {
        self.sqlite_pool.clone()
    }

    pub fn postgres_pool(&self) -> PgPool {
        self.postgres_pool.clone()
    }

    pub async fn execute_both(&self, statement: &str) -> Result<()> {
        sqlx::query(statement)
            .execute(&self.sqlite_pool)
            .await
            .context("execute SQLite parity fixture statement")?;
        sqlx::query(statement)
            .execute(&self.postgres_pool)
            .await
            .context("execute PostgreSQL parity fixture statement")?;
        Ok(())
    }

    pub async fn cleanup(self) -> Result<()> {
        let Self {
            sqlite_pool,
            postgres_pool,
            postgres_database_url,
            postgres_schema,
        } = self;
        sqlite_pool.close().await;
        postgres_pool.close().await;

        let admin_pool = PgPoolOptions::new()
            .max_connections(1)
            .acquire_timeout(Duration::from_secs(10))
            .connect(&postgres_database_url)
            .await
            .context("reconnect PostgreSQL parity database for cleanup")?;
        sqlx::query(&format!(
            "DROP SCHEMA IF EXISTS {} CASCADE",
            quote_identifier(&postgres_schema)
        ))
        .execute(&admin_pool)
        .await
        .context("drop isolated PostgreSQL parity schema")?;
        admin_pool.close().await;
        Ok(())
    }
}

fn unique_schema_name(label: &str) -> String {
    let normalized_label: String = label
        .chars()
        .filter_map(|character| {
            if character.is_ascii_alphanumeric() {
                Some(character.to_ascii_lowercase())
            } else if character == '_' || character == '-' {
                Some('_')
            } else {
                None
            }
        })
        .take(20)
        .collect();
    let label = if normalized_label.is_empty() {
        "repository"
    } else {
        normalized_label.as_str()
    };
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let counter = SCHEMA_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!(
        "claw_parity_{label}_{}_{}_{}",
        std::process::id(),
        timestamp,
        counter
    )
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
