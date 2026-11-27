#![forbid(unsafe_code)]
//! PostgreSQL repository for the admin data-center governance plane.
//!
//! Implements [`sdkwork_cloudrouter_router_service::ports::DataCenterStore`]
//! over the `dc_*` tables: data sources, the landed-table catalog, governed
//! export jobs, and the data-access audit trail.

mod error;
mod postgres;

pub use error::RepositoryError;
pub use postgres::PostgresAdminDataCenterStore;
