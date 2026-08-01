use std::sync::Arc;

use axum::extract::rejection::{JsonRejection, QueryRejection};
use axum::http::{header, HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_clawrouter_router_service::api::admin_sql_subject::SqlScopedAdminSubject;
use sdkwork_clawrouter_router_service::domain::{DecimalValue, DomainError};
use sdkwork_clawrouter_router_service::ports::{
    AdminUpstreamAccountVerificationError, AdminUpstreamAccountVerifier, AdminUpstreamListQuery,
    AdminUpstreamPage, AdminUpstreamStore, AdminUpstreamSubject,
};
use sdkwork_utils_rust::{
    format_datetime, now, sha256_hash, uuid, PageInfo, PageMode, SdkWorkApiResponse,
    SdkWorkPageData, SdkWorkProblemDetail, SdkWorkResourceData, SdkWorkResultCode,
};
use serde::{Deserialize, Serialize};

pub(super) const MAX_NESTED_ITEMS: usize = 200;
const MAX_SEARCH_LENGTH: usize = 256;
const MAX_IDEMPOTENCY_KEY_LENGTH: usize = 128;

pub(super) type UpstreamStore = Arc<dyn AdminUpstreamStore + Send + Sync>;
pub(super) type UpstreamVerifier = Arc<dyn AdminUpstreamAccountVerifier + Send + Sync>;
pub(super) type RequestResult<T> = Result<T, RequestProblem>;

#[derive(Debug)]
pub(super) struct RequestProblem {
    code: SdkWorkResultCode,
    detail: String,
}

impl IntoResponse for RequestProblem {
    fn into_response(self) -> Response {
        let trace_id = uuid();
        let body = SdkWorkProblemDetail::platform(self.code, self.detail, trace_id.clone());
        let status = StatusCode::from_u16(body.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        let mut response = (
            status,
            [(header::CONTENT_TYPE, "application/problem+json")],
            Json(body),
        )
            .into_response();
        attach_trace_id(&mut response, &trace_id);
        response
    }
}

#[derive(Clone)]
pub(super) struct UpstreamState {
    pub store: UpstreamStore,
    pub verifier: UpstreamVerifier,
}

#[derive(Debug, Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct ListQuery {
    pub page: Option<i64>,
    #[serde(rename = "page_size")]
    pub page_size: Option<i64>,
    pub q: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CollectionItem<T> {
    items: Vec<T>,
}

pub(super) fn subject(scoped: SqlScopedAdminSubject) -> AdminUpstreamSubject {
    AdminUpstreamSubject {
        tenant_id: scoped.tenant_id,
        organization_id: scoped.organization_id,
        operator_id: scoped.operator_id,
        operator_type: scoped.operator_type,
    }
}

pub(super) fn list_query(
    subject: AdminUpstreamSubject,
    query: ListQuery,
) -> RequestResult<AdminUpstreamListQuery> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(20);
    if page < 1 {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "page must be greater than or equal to 1",
        ));
    }
    if !(1..=200).contains(&page_size) {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "page_size must be between 1 and 200",
        ));
    }
    let offset = (page - 1).checked_mul(page_size).ok_or_else(|| {
        problem(
            SdkWorkResultCode::InvalidParameter,
            "page and page_size produce an unsupported offset",
        )
    })?;
    let q = query
        .q
        .map(|value| normalize_visible_text(value, "q", MAX_SEARCH_LENGTH))
        .transpose()?
        .filter(|value| !value.is_empty());
    Ok(AdminUpstreamListQuery {
        subject,
        q,
        page,
        page_size,
        offset,
    })
}

pub(super) fn parse_id(value: String, field: &str) -> RequestResult<i64> {
    value
        .parse::<i64>()
        .ok()
        .filter(|value| *value > 0)
        .ok_or_else(|| {
            problem(
                SdkWorkResultCode::InvalidParameter,
                format!("{field} must be a positive integer string"),
            )
        })
}

pub(super) fn parse_if_match(headers: &HeaderMap) -> RequestResult<i64> {
    let value = headers.get(header::IF_MATCH).ok_or_else(|| {
        problem(
            SdkWorkResultCode::PreconditionRequired,
            "If-Match is required for this operation",
        )
    })?;
    let value = value.to_str().map_err(|_| {
        problem(
            SdkWorkResultCode::InvalidParameter,
            "If-Match must contain a valid version",
        )
    })?;
    let value = value.trim().strip_prefix("W/").unwrap_or(value.trim());
    let value = value.trim_matches('"');
    value
        .parse::<i64>()
        .ok()
        .filter(|version| *version >= 0)
        .ok_or_else(|| {
            problem(
                SdkWorkResultCode::InvalidParameter,
                "If-Match must contain a non-negative integer version",
            )
        })
}

pub(super) fn idempotency_uuid(
    headers: &HeaderMap,
    subject: &AdminUpstreamSubject,
    account_id: i64,
) -> RequestResult<String> {
    let key = headers.get("idempotency-key").ok_or_else(|| {
        problem(
            SdkWorkResultCode::PreconditionRequired,
            "Idempotency-Key is required for this create operation",
        )
    })?;
    let key = key.to_str().map_err(|_| {
        problem(
            SdkWorkResultCode::InvalidParameter,
            "Idempotency-Key must be valid visible text",
        )
    })?;
    let key = normalize_visible_text(
        key.to_owned(),
        "Idempotency-Key",
        MAX_IDEMPOTENCY_KEY_LENGTH,
    )?;
    if key.is_empty() {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            "Idempotency-Key must not be blank",
        ));
    }
    let digest = sha256_hash(
        format!(
            "{}:{}:{}:{}",
            subject.tenant_id, subject.organization_id, account_id, key
        )
        .as_bytes(),
    );
    Ok(format!(
        "{}-{}-{}-{}-{}",
        &digest[0..8],
        &digest[8..12],
        &digest[12..16],
        &digest[16..20],
        &digest[20..32]
    ))
}

pub(super) fn requested_at() -> String {
    format_datetime(now(), None)
}

pub(super) fn required_text(
    value: String,
    field: &str,
    max_length: usize,
) -> RequestResult<String> {
    let value = normalize_visible_text(value, field, max_length)?;
    if value.is_empty() {
        return Err(problem(
            SdkWorkResultCode::MissingRequiredField,
            format!("{field} is required"),
        ));
    }
    Ok(value)
}

pub(super) fn optional_text(
    value: Option<String>,
    field: &str,
    max_length: usize,
) -> RequestResult<Option<String>> {
    value
        .map(|value| normalize_visible_text(value, field, max_length))
        .transpose()
        .map(|value| value.filter(|value| !value.is_empty()))
}

fn normalize_visible_text(value: String, field: &str, max_length: usize) -> RequestResult<String> {
    if value.chars().any(char::is_control) || value.chars().count() > max_length {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            format!("{field} must be visible text with at most {max_length} characters"),
        ));
    }
    Ok(value.trim().to_owned())
}

pub(super) fn positive_decimal(value: String, field: &str) -> RequestResult<String> {
    let value = required_text(value, field, 64)?;
    let decimal = DecimalValue::parse(&value).map_err(|_| {
        problem(
            SdkWorkResultCode::InvalidParameter,
            format!("{field} must be a positive decimal with at most 12 fractional digits"),
        )
    })?;
    if decimal <= DecimalValue::ZERO {
        return Err(problem(
            SdkWorkResultCode::InvalidParameter,
            format!("{field} must be greater than zero"),
        ));
    }
    Ok(value)
}

pub(super) fn decode_json<T>(payload: Result<Json<T>, JsonRejection>) -> RequestResult<T> {
    payload.map(|Json(value)| value).map_err(|rejection| {
        problem(
            SdkWorkResultCode::MalformedRequest,
            format!("request body is invalid: {}", rejection.body_text()),
        )
    })
}

pub(super) fn decode_query(
    query: Result<axum::extract::Query<ListQuery>, QueryRejection>,
) -> RequestResult<ListQuery> {
    query
        .map(|axum::extract::Query(value)| value)
        .map_err(|rejection| {
            problem(
                SdkWorkResultCode::InvalidParameter,
                format!("query parameters are invalid: {}", rejection.body_text()),
            )
        })
}

pub(super) fn list_response<T: Serialize>(page: AdminUpstreamPage<T>) -> Response {
    paged_response(page.items, page.page, page.page_size, page.total)
}

pub(super) fn bounded_list_response<T: Serialize>(items: Vec<T>) -> Response {
    let total = i64::try_from(items.len()).unwrap_or(i64::MAX);
    paged_response(items, 1, total.max(1), total)
}

fn paged_response<T: Serialize>(items: Vec<T>, page: i64, page_size: i64, total: i64) -> Response {
    let total_pages = if total == 0 {
        0
    } else {
        (total + page_size - 1) / page_size
    };
    success_response(
        StatusCode::OK,
        SdkWorkPageData {
            items,
            page_info: PageInfo {
                mode: PageMode::Offset,
                page: i32::try_from(page).ok(),
                page_size: i32::try_from(page_size).ok(),
                total_items: Some(total.to_string()),
                total_pages: i32::try_from(total_pages).ok(),
                next_cursor: None,
                has_more: Some(page < total_pages),
            },
        },
    )
}

pub(super) fn item_response<T: Serialize>(status: StatusCode, item: T) -> Response {
    success_response(status, SdkWorkResourceData { item })
}

pub(super) fn collection_item_response<T: Serialize>(items: Vec<T>) -> Response {
    item_response(StatusCode::OK, CollectionItem { items })
}

pub(super) fn no_content_response() -> Response {
    let trace_id = uuid();
    let mut response = StatusCode::NO_CONTENT.into_response();
    attach_trace_id(&mut response, &trace_id);
    response
}

fn success_response<T: Serialize>(status: StatusCode, data: T) -> Response {
    let trace_id = uuid();
    let body = SdkWorkApiResponse::success(data, trace_id.clone());
    let mut response = (status, Json(body)).into_response();
    attach_trace_id(&mut response, &trace_id);
    response
}

pub(super) fn domain_error(error: DomainError) -> Response {
    if error.is_not_found() {
        return problem(SdkWorkResultCode::NotFound, error.to_string()).into_response();
    }
    if error.is_conflict() {
        let detail = error.to_string();
        let code = if detail.contains("version mismatch") || detail.contains("version changed") {
            SdkWorkResultCode::PreconditionFailed
        } else {
            SdkWorkResultCode::Conflict
        };
        return problem(code, detail).into_response();
    }
    problem(
        SdkWorkResultCode::InternalError,
        "upstream management operation failed",
    )
    .into_response()
}

pub(super) fn verification_error(error: AdminUpstreamAccountVerificationError) -> Response {
    let code = match error {
        AdminUpstreamAccountVerificationError::TargetNotFound => SdkWorkResultCode::NotFound,
        AdminUpstreamAccountVerificationError::UnsupportedProtocol
        | AdminUpstreamAccountVerificationError::UnsupportedAuthType
        | AdminUpstreamAccountVerificationError::InvalidConfiguration => {
            SdkWorkResultCode::UnprocessableEntity
        }
        AdminUpstreamAccountVerificationError::Internal => SdkWorkResultCode::InternalError,
    };
    problem(code, error.to_string()).into_response()
}

pub(super) fn not_found(entity: &str) -> Response {
    problem(
        SdkWorkResultCode::NotFound,
        format!("{entity} was not found"),
    )
    .into_response()
}

pub(super) fn problem(code: SdkWorkResultCode, detail: impl Into<String>) -> RequestProblem {
    RequestProblem {
        code,
        detail: detail.into(),
    }
}

fn attach_trace_id(response: &mut Response, trace_id: &str) {
    if let Ok(value) = HeaderValue::from_str(trace_id) {
        response
            .headers_mut()
            .insert(HeaderName::from_static("x-sdkwork-trace-id"), value);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn if_match_accepts_strong_and_weak_integer_etags() {
        for value in ["7", "\"7\"", "W/\"7\""] {
            let mut headers = HeaderMap::new();
            headers.insert(header::IF_MATCH, HeaderValue::from_str(value).unwrap());
            assert_eq!(7, parse_if_match(&headers).unwrap());
        }
    }

    #[test]
    fn idempotency_uuid_is_stable_and_scope_bound() {
        let mut headers = HeaderMap::new();
        headers.insert("idempotency-key", HeaderValue::from_static("rotation-1"));
        let subject = AdminUpstreamSubject {
            tenant_id: 10,
            organization_id: 20,
            operator_id: 30,
            operator_type: 1,
        };
        let first = idempotency_uuid(&headers, &subject, 40).unwrap();
        assert_eq!(first, idempotency_uuid(&headers, &subject, 40).unwrap());
        assert_ne!(first, idempotency_uuid(&headers, &subject, 41).unwrap());
    }

    #[test]
    fn verification_errors_map_to_stable_problem_statuses() {
        for (error, status) in [
            (
                AdminUpstreamAccountVerificationError::TargetNotFound,
                StatusCode::NOT_FOUND,
            ),
            (
                AdminUpstreamAccountVerificationError::UnsupportedProtocol,
                StatusCode::UNPROCESSABLE_ENTITY,
            ),
            (
                AdminUpstreamAccountVerificationError::UnsupportedAuthType,
                StatusCode::UNPROCESSABLE_ENTITY,
            ),
            (
                AdminUpstreamAccountVerificationError::InvalidConfiguration,
                StatusCode::UNPROCESSABLE_ENTITY,
            ),
            (
                AdminUpstreamAccountVerificationError::Internal,
                StatusCode::INTERNAL_SERVER_ERROR,
            ),
        ] {
            assert_eq!(status, verification_error(error).status());
        }
    }
}
