use std::fmt::{Display, Formatter, Result as FmtResult};

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
