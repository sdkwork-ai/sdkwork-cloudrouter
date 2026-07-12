use std::future::Future;
use std::pin::Pin;

use sdkwork_utils_rust::{base64url_decode, base64url_encode, parse_datetime};
use serde::{Deserialize, Serialize};

use crate::error::{RepositoryError, RepositoryResult};

pub const DEFAULT_GATEWAY_TRACES_PAGE_SIZE: i64 = 20;
pub const MAX_GATEWAY_TRACES_PAGE_SIZE: i64 = 200;
pub const MAX_GATEWAY_TRACES_SEARCH_LENGTH: usize = 256;
/// Fuzzy gateway trace searches are deliberately bounded to avoid turning a
/// tenant-scoped list endpoint into an unbounded substring scan. Exact trace
/// and request identifiers use a separate indexed fast path in each store.
pub const MIN_GATEWAY_TRACES_FUZZY_SEARCH_LENGTH: usize = 3;
pub const GATEWAY_TRACES_FUZZY_SEARCH_WINDOW_DAYS: u32 = 7;
const MAX_GATEWAY_TRACES_CURSOR_LENGTH: usize = 2_048;
const GATEWAY_TRACES_CURSOR_VERSION: u8 = 1;

pub type AppGatewayTracesReadFuture<'a, T> =
    Pin<Box<dyn Future<Output = RepositoryResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AppGatewayTracesSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppGatewayTracesListQuery {
    page_size: i64,
    cursor: Option<AppGatewayTracesCursor>,
    q: Option<String>,
}

impl AppGatewayTracesListQuery {
    pub fn try_new(
        page_size: Option<i64>,
        cursor: Option<String>,
        q: Option<String>,
    ) -> RepositoryResult<Self> {
        let page_size = page_size.unwrap_or(DEFAULT_GATEWAY_TRACES_PAGE_SIZE);
        if !(1..=MAX_GATEWAY_TRACES_PAGE_SIZE).contains(&page_size) {
            return Err(RepositoryError::new(format!(
                "page_size must be between 1 and {MAX_GATEWAY_TRACES_PAGE_SIZE}"
            )));
        }

        Ok(Self {
            page_size,
            cursor: cursor.map(decode_cursor).transpose()?,
            q: normalize_search_query(q)?,
        })
    }

    pub fn page_size(&self) -> i64 {
        self.page_size
    }

    pub(crate) fn cursor_key(&self) -> Option<(&str, i64)> {
        self.cursor
            .as_ref()
            .map(|cursor| (cursor.started_at.as_str(), cursor.id))
    }

    pub(crate) fn search_query(&self) -> Option<&str> {
        self.q.as_deref()
    }

    pub(crate) fn search_pattern(&self) -> Option<String> {
        self.q
            .as_deref()
            .map(|value| format!("%{}%", escape_like_literal(value)))
    }
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppGatewayTraceItems<T> {
    pub items: Vec<T>,
}

impl<T> AppGatewayTraceItems<T> {
    pub fn new(items: Vec<T>) -> Self {
        Self { items }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct AppGatewayTracesListPage {
    pub items: Vec<AppGatewayTraceItem>,
    pub page_size: i64,
    pub next_cursor: Option<String>,
    pub has_more: bool,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppGatewayTraceItem {
    pub id: String,
    pub time: String,
    pub ip: String,
    pub endpoint: String,
    pub method: String,
    pub status: i64,
    pub duration: String,
    pub channel: String,
}

pub trait AppGatewayTracesReadStore {
    fn load_gateway_traces<'a>(
        &'a self,
        subject: Option<AppGatewayTracesSubject>,
        query: AppGatewayTracesListQuery,
    ) -> AppGatewayTracesReadFuture<'a, AppGatewayTracesListPage>;
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AppGatewayTracesCursor {
    version: u8,
    started_at: String,
    id: i64,
}

pub(crate) fn encode_cursor(started_at: &str, id: i64) -> RepositoryResult<String> {
    validate_cursor_key(started_at, id)?;
    let payload = serde_json::to_vec(&AppGatewayTracesCursor {
        version: GATEWAY_TRACES_CURSOR_VERSION,
        started_at: started_at.to_owned(),
        id,
    })
    .map_err(|error| {
        RepositoryError::new(format!("failed to encode gateway traces cursor: {error}"))
    })?;
    Ok(base64url_encode(&payload))
}

pub(crate) fn validate_subject(subject: &AppGatewayTracesSubject) -> RepositoryResult<()> {
    if subject.tenant_id <= 0 {
        return Err(RepositoryError::new(
            "gateway traces tenant_id must be positive",
        ));
    }
    if subject.organization_id < 0 {
        return Err(RepositoryError::new(
            "gateway traces organization_id must be non-negative",
        ));
    }
    if subject.user_id <= 0 {
        return Err(RepositoryError::new(
            "gateway traces user_id must be positive",
        ));
    }
    Ok(())
}

fn decode_cursor(value: String) -> RepositoryResult<AppGatewayTracesCursor> {
    if value.is_empty() || value.trim() != value {
        return Err(invalid_cursor_error());
    }
    if value.len() > MAX_GATEWAY_TRACES_CURSOR_LENGTH {
        return Err(RepositoryError::new(format!(
            "cursor must not exceed {MAX_GATEWAY_TRACES_CURSOR_LENGTH} characters"
        )));
    }
    let payload = base64url_decode(&value).ok_or_else(invalid_cursor_error)?;
    let cursor: AppGatewayTracesCursor =
        serde_json::from_slice(&payload).map_err(|_| invalid_cursor_error())?;
    if cursor.version != GATEWAY_TRACES_CURSOR_VERSION {
        return Err(invalid_cursor_error());
    }
    validate_cursor_key(&cursor.started_at, cursor.id)?;
    Ok(cursor)
}

fn validate_cursor_key(started_at: &str, id: i64) -> RepositoryResult<()> {
    if started_at.is_empty()
        || started_at.len() > 64
        || parse_datetime(started_at, None).is_none()
        || id <= 0
    {
        return Err(invalid_cursor_error());
    }
    Ok(())
}

fn invalid_cursor_error() -> RepositoryError {
    RepositoryError::new("cursor must be a valid opaque gateway traces cursor")
}

fn normalize_search_query(value: Option<String>) -> RepositoryResult<Option<String>> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > MAX_GATEWAY_TRACES_SEARCH_LENGTH {
        return Err(RepositoryError::new(format!(
            "q must be at most {MAX_GATEWAY_TRACES_SEARCH_LENGTH} characters"
        )));
    }
    if value.chars().count() < MIN_GATEWAY_TRACES_FUZZY_SEARCH_LENGTH {
        return Err(RepositoryError::new(format!(
            "q must contain at least {MIN_GATEWAY_TRACES_FUZZY_SEARCH_LENGTH} characters"
        )));
    }
    Ok(Some(value.to_owned()))
}

fn escape_like_literal(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len());
    for character in value.chars() {
        if matches!(character, '\\' | '%' | '_') {
            escaped.push('\\');
        }
        escaped.push(character);
    }
    escaped
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn query_rejects_invalid_page_sizes_and_search_length() {
        for page_size in [0, -1, MAX_GATEWAY_TRACES_PAGE_SIZE + 1] {
            let error = AppGatewayTracesListQuery::try_new(Some(page_size), None, None)
                .expect_err("invalid page size must fail");
            assert!(error
                .to_string()
                .contains("page_size must be between 1 and 200"));
        }

        let error = AppGatewayTracesListQuery::try_new(
            None,
            None,
            Some("x".repeat(MAX_GATEWAY_TRACES_SEARCH_LENGTH + 1)),
        )
        .expect_err("oversized search query must fail");
        assert!(error
            .to_string()
            .contains("q must be at most 256 characters"));

        let error = AppGatewayTracesListQuery::try_new(None, None, Some("ab".to_owned()))
            .expect_err("short fuzzy searches must fail");
        assert!(error
            .to_string()
            .contains("q must contain at least 3 characters"));
    }

    #[test]
    fn cursor_round_trip_preserves_key_and_rejects_malformed_tokens() {
        let token = encode_cursor("2026-05-05T10:00:00.123456Z", 42).expect("cursor");
        let query = AppGatewayTracesListQuery::try_new(None, Some(token), None).expect("query");
        assert_eq!(
            Some(("2026-05-05T10:00:00.123456Z", 42)),
            query.cursor_key()
        );

        for token in ["not-base64", "", " eyJ2ZXJzaW9uIjoxfQ"] {
            AppGatewayTracesListQuery::try_new(None, Some(token.to_owned()), None)
                .expect_err("malformed cursor must fail");
        }
    }

    #[test]
    fn search_pattern_escapes_like_metacharacters() {
        let query =
            AppGatewayTracesListQuery::try_new(None, None, Some(r"literal%_\value".to_owned()))
                .expect("query");
        assert_eq!(
            Some(r"%literal\%\_\\value%".to_owned()),
            query.search_pattern()
        );
    }
}
