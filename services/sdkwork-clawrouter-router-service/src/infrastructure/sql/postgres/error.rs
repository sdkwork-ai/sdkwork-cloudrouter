use std::error::Error;
use std::fmt::{Display, Formatter};

use crate::domain::DomainError;
use crate::infrastructure::sql::model_catalog_import::CatalogImportError;

#[derive(Debug)]
pub enum PostgresCatalogLoadError {
    Database(sqlx::Error),
    Dictionary(String),
    Domain(DomainError),
}

impl Display for PostgresCatalogLoadError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Database(error) => write!(f, "catalog database load failed: {error}"),
            Self::Domain(error) => write!(f, "catalog row mapping failed: {error}"),
            Self::Dictionary(error) => write!(f, "catalog dictionary load failed: {error}"),
        }
    }
}

impl From<CatalogImportError> for PostgresCatalogLoadError {
    fn from(value: CatalogImportError) -> Self {
        Self::Dictionary(value.to_string())
    }
}

impl Error for PostgresCatalogLoadError {}

impl From<sqlx::Error> for PostgresCatalogLoadError {
    fn from(value: sqlx::Error) -> Self {
        Self::Database(value)
    }
}

impl From<DomainError> for PostgresCatalogLoadError {
    fn from(value: DomainError) -> Self {
        Self::Domain(value)
    }
}
