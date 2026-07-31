//! Retired compatibility module.
//!
//! PostgreSQL model catalog mutation is owned by
//! `sdkwork_models_catalog_repository_sqlx::PostgresModelCatalogAdminStore`.
//! Claw Router injects that store into `DatabaseInstaller`; no local importer
//! or duplicate SQL authority is retained here.
