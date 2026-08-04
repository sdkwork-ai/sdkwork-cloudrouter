use crate::domain::DomainError;
use sqlx::Error;

pub(crate) fn redacted_store_error(context: &str, error: Error) -> DomainError {
    if let Error::Database(database_error) = &error {
        if database_error
            .code()
            .map(|code| code == "23505")
            .unwrap_or(false)
        {
            return DomainError::conflict(format!("{context}: resource already exists"));
        }
    }
    DomainError::new(format!("{context}: database operation failed"))
}
