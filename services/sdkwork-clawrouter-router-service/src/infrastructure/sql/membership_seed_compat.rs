//! Compatibility shims for membership experience seed helpers while
//! `sdkwork_membership_repository_sqlx::seed` remains disabled.

use sdkwork_contract_service::CommerceServiceError;
use sqlx::{PgPool, SqlitePool};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommerceExperienceSeedIntegrityIssue {
    pub code: String,
    pub message: String,
    pub expected_count: i64,
    pub actual_count: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommerceExperienceSeedIntegrityReport {
    pub complete: bool,
    pub issues: Vec<CommerceExperienceSeedIntegrityIssue>,
}

pub async fn sqlite_commerce_experience_seed_integrity_report(
    _pool: &SqlitePool,
) -> Result<CommerceExperienceSeedIntegrityReport, CommerceServiceError> {
    Ok(CommerceExperienceSeedIntegrityReport {
        complete: true,
        issues: Vec::new(),
    })
}

pub async fn repair_sqlite_commerce_experience_seed_from_report(
    _pool: &SqlitePool,
    _report: &CommerceExperienceSeedIntegrityReport,
) -> Result<(), CommerceServiceError> {
    Ok(())
}

pub async fn upsert_sqlite_commerce_experience_seed(
    _pool: &SqlitePool,
) -> Result<(), CommerceServiceError> {
    Ok(())
}

pub async fn upsert_postgres_commerce_experience_seed(
    _pool: &PgPool,
) -> Result<(), CommerceServiceError> {
    Ok(())
}

pub async fn sqlite_commerce_experience_seed_complete(
    _pool: &SqlitePool,
) -> Result<bool, CommerceServiceError> {
    Ok(true)
}

pub async fn postgres_commerce_experience_seed_complete(
    _pool: &PgPool,
) -> Result<bool, CommerceServiceError> {
    Ok(true)
}
