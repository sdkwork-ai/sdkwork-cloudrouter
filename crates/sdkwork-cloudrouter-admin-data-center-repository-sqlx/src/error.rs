use std::fmt::{Display, Formatter, Result as FmtResult};

/// Repository-layer failure for the data-center governance store.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RepositoryError(String);

impl RepositoryError {
    pub fn new(message: impl Into<String>) -> Self {
        Self(message.into())
    }
}

impl Display for RepositoryError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> FmtResult {
        self.0.fmt(formatter)
    }
}

impl std::error::Error for RepositoryError {}

pub type RepositoryResult<T> = Result<T, RepositoryError>;

pub(crate) fn store_error(context: &str, error: sqlx::Error) -> RepositoryError {
    RepositoryError::new(format!("{context}: {error}"))
}

pub(crate) fn row_decode_error(column: &str, error: sqlx::Error) -> RepositoryError {
    RepositoryError::new(format!("failed to decode data center {column}: {error}"))
}
