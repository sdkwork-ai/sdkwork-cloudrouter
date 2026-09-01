use crate::domain::DomainError;
use sqlx::Error;

/// Maps a Postgres failure onto a domain error that is safe to return to the
/// caller.
///
/// The response is deliberately redacted: a raw driver message leaks schema,
/// constraint and row details. The full cause is still emitted through
/// `tracing` so operators can diagnose the failure from server logs; without
/// this, every unmapped failure surfaced to clients as an anonymous
/// `Internal server error` and was effectively undiagnosable.
pub(crate) fn redacted_store_error(context: &str, error: Error) -> DomainError {
    let sqlstate = match &error {
        Error::Database(database_error) => database_error.code().map(|code| code.to_string()),
        _ => None,
    };
    tracing::error!(
        context,
        sqlstate = sqlstate.as_deref().unwrap_or("none"),
        "admin pricing store operation failed: {error}"
    );
    match sqlstate.as_deref() {
        // unique_violation
        Some("23505") => DomainError::conflict(format!("{context}: resource already exists")),
        // Data-shape rejections (not_null, check, foreign_key, invalid input,
        // string truncation, ...) are input problems, not server faults: the
        // caller can act on them, so they must not be reported as 5xx.
        Some(code) if code.starts_with("23") || code.starts_with("22") => {
            DomainError::bad_request(format!(
                "{context}: the write was rejected by a data integrity rule ({code})"
            ))
        }
        _ => DomainError::new(format!("{context}: database operation failed")),
    }
}
