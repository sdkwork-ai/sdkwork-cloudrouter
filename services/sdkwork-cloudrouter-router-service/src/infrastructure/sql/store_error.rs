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

#[cfg(test)]
mod tests {
    use super::*;
    use std::borrow::Cow;
    use std::error::Error as StdError;
    use std::fmt;

    /// Minimal `DatabaseError` stand-in so the SQLSTATE -> domain-error mapping
    /// can be asserted without a live Postgres connection.
    #[derive(Debug)]
    struct FakeDatabaseError {
        sqlstate: Option<String>,
    }

    impl fmt::Display for FakeDatabaseError {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            write!(f, "fake database error")
        }
    }

    impl StdError for FakeDatabaseError {}

    impl sqlx::error::DatabaseError for FakeDatabaseError {
        fn message(&self) -> &str {
            "fake database error"
        }

        fn code(&self) -> Option<Cow<'_, str>> {
            self.sqlstate.as_deref().map(Cow::Borrowed)
        }

        fn kind(&self) -> sqlx::error::ErrorKind {
            sqlx::error::ErrorKind::Other
        }

        fn as_error(&self) -> &(dyn StdError + Send + Sync + 'static) {
            self
        }

        fn as_error_mut(&mut self) -> &mut (dyn StdError + Send + Sync + 'static) {
            self
        }

        fn into_error(self: Box<Self>) -> Box<dyn StdError + Send + Sync + 'static> {
            self
        }
    }

    fn store_error_with_sqlstate(sqlstate: Option<&str>) -> Error {
        Error::Database(Box::new(FakeDatabaseError {
            sqlstate: sqlstate.map(str::to_string),
        }))
    }

    #[test]
    fn unique_violation_maps_to_conflict() {
        let error =
            redacted_store_error("save default region", store_error_with_sqlstate(Some("23505")));
        assert!(error.is_conflict());
        assert!(!error.is_bad_request());
    }

    #[test]
    fn data_integrity_rejections_map_to_bad_request() {
        // not_null(23502) / foreign_key(23503) / check(23514) / string_data_right_truncation(22001)
        // numeric_value_out_of_range(22003) / invalid_text_representation(22P02)
        for sqlstate in ["23502", "23503", "23514", "22001", "22003", "22P02"] {
            let error = redacted_store_error(
                "save default region",
                store_error_with_sqlstate(Some(sqlstate)),
            );
            assert!(error.is_bad_request(), "sqlstate {sqlstate} must map to bad_request");
            assert!(!error.is_conflict(), "sqlstate {sqlstate} must not map to conflict");
        }
    }

    #[test]
    fn unknown_and_driver_errors_stay_internal() {
        // No SQLSTATE (driver-level failure), insufficient privilege (42501),
        // undefined table (42P01) and connection failure (08003) must stay
        // internal errors instead of pretending the input was wrong.
        for sqlstate in [None, Some("42501"), Some("42P01"), Some("08003")] {
            let error = redacted_store_error(
                "save default region",
                store_error_with_sqlstate(sqlstate),
            );
            assert!(!error.is_bad_request(), "{sqlstate:?} must not map to bad_request");
            assert!(!error.is_conflict(), "{sqlstate:?} must not map to conflict");
            assert!(!error.is_not_found(), "{sqlstate:?} must not map to not_found");
        }
    }
}
