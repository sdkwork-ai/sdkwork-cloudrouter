use std::sync::Arc;

use axum::extract::rejection::{JsonRejection, QueryRejection};
use axum::http::{header, HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_cloudrouter_router_service::api::admin_sql_subject::SqlScopedAdminSubject;
use sdkwork_cloudrouter_router_service::domain::{DecimalValue, DomainError};
use sdkwork_cloudrouter_router_service::ports::{
    AdminLlmProtocolConfig, AdminUpstreamAccountVerificationError, AdminUpstreamAccountVerifier,
    AdminUpstreamListQuery, AdminUpstreamPage, AdminUpstreamStore, AdminUpstreamSubject,
    LlmProtocolCode,
};
use sdkwork_models_contract_service::AdminAiResourceStore;
use sdkwork_utils_rust::{
    format_datetime, now, sha256_hash, uuid, PageInfo, PageMode, SdkWorkApiResponse,
    SdkWorkPageData, SdkWorkProblemDetail, SdkWorkResourceData, SdkWorkResultCode,
};
use serde::{Deserialize, Serialize};

pub(super) const MAX_NESTED_ITEMS: usize = 200;
pub(super) const MAX_LIST_PAGE_SIZE: usize = 200;
const MAX_SEARCH_LENGTH: usize = 256;
const MAX_IDEMPOTENCY_KEY_LENGTH: usize = 128;
pub(super) const MAX_CODE_LENGTH: usize = 128;
pub(super) const MAX_URL_LENGTH: usize = 2_048;
pub(super) const MAX_PROTOCOLS: usize = 8;

/// 单个 LLM 协议配置输入（供应商与账号共用）：协议代码 + 该协议独立的 Base URL。
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ProtocolConfigInput {
    pub protocol_code: String,
    pub base_url: String,
}

/// 解析单个协议配置：协议代码必须能被 `LlmProtocolCode` 解析，Base URL 必填。
pub(super) fn parse_protocol_config(
    item: ProtocolConfigInput,
) -> RequestResult<AdminLlmProtocolConfig> {
    let protocol_code = required_text(item.protocol_code, "protocolCode", MAX_CODE_LENGTH)?;
    let protocol_code = LlmProtocolCode::parse(&protocol_code).ok_or_else(|| {
        problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.supplier.protocolCode.enum",
            serde_json::json!({
                "allowed": [
                    "openai_chat_completions",
                    "openai_responses",
                    "anthropic_messages",
                ]
            }),
            "protocolCode is not a supported LLM protocol",
        )
    })?;
    Ok(AdminLlmProtocolConfig {
        protocol_code,
        base_url: required_text(item.base_url, "baseUrl", MAX_URL_LENGTH)?,
    })
}

/// 可选 URL 校验（与中转站 baseUrl 规则一致）：绝对 URL、HTTPS（环境 0 的开发端点允许 HTTP）、
/// 不得携带内嵌凭据/查询串/fragment。空值视为未配置。
pub(super) fn optional_https_base_url(
    value: Option<String>,
    field: &str,
    environment: i32,
) -> RequestResult<Option<String>> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = optional_text(Some(value), field, MAX_URL_LENGTH)?.unwrap_or_default();
    if value.is_empty() {
        return Ok(None);
    }
    let url = url::Url::parse(&value).map_err(|error| {
        problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.url.absolute",
            serde_json::json!({ "field": field }),
            format!("{field} must be an absolute URL: {error}"),
        )
    })?;
    let development_http = environment == 0 && url.scheme() == "http";
    if url.scheme() != "https" && !development_http {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.url.https",
            serde_json::json!({ "field": field, "environment": environment }),
            format!("{field} must use HTTPS; HTTP is allowed only for environment 0 development"),
        ));
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.url.credentials",
            serde_json::json!({ "field": field }),
            format!("{field} must not contain embedded credentials"),
        ));
    }
    if url.query().is_some() || url.fragment().is_some() {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.url.queryOrFragment",
            serde_json::json!({ "field": field }),
            format!("{field} must not contain a query string or fragment"),
        ));
    }
    Ok(Some(value))
}

pub(super) type UpstreamStore = Arc<dyn AdminUpstreamStore + Send + Sync>;
pub(super) type UpstreamVerifier = Arc<dyn AdminUpstreamAccountVerifier + Send + Sync>;
pub(super) type UpstreamResourceStore = Arc<dyn AdminAiResourceStore + Send + Sync>;
pub(super) type RequestResult<T> = Result<T, RequestProblem>;

#[derive(Debug)]
pub(super) struct RequestProblem {
    code: SdkWorkResultCode,
    detail: String,
    /// Specific localization key (`I18N_SPEC.md` §5): `validation.<domain>.<resource>.<field>.<rule>`
    /// or `business.<domain>.<capability>.<state>`. Falls back to the auto
    /// `errors.result.<code>` key when absent.
    i18n_key: Option<String>,
    /// Sanitized interpolation parameters for the `i18n_key` template.
    params: Option<serde_json::Value>,
}

impl IntoResponse for RequestProblem {
    fn into_response(self) -> Response {
        let trace_id = uuid();
        let body = SdkWorkProblemDetail::platform(self.code, self.detail, trace_id.clone());
        let mut payload = serde_json::to_value(body).expect("problem detail is serializable");
        if let Some(key) = self.i18n_key {
            payload["i18nKey"] = serde_json::Value::String(key);
        }
        if let Some(params) = self.params {
            payload["params"] = params;
        }
        let status = StatusCode::from_u16(payload["status"].as_u64().unwrap_or(500) as u16)
            .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        let mut response = (
            status,
            [(header::CONTENT_TYPE, "application/problem+json")],
            Json(payload),
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
    pub resource_store: Option<UpstreamResourceStore>,
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
    id: String,
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
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.list.page.min",
            serde_json::json!({ "min": 1 }),
            "page must be greater than or equal to 1",
        ));
    }
    if !(1..=200).contains(&page_size) {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.list.pageSize.range",
            serde_json::json!({ "min": 1, "max": MAX_LIST_PAGE_SIZE }),
            format!("page_size must be between 1 and {MAX_LIST_PAGE_SIZE}"),
        ));
    }
    let offset = (page - 1).checked_mul(page_size).ok_or_else(|| {
        problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.list.offset.overflow",
            serde_json::json!({ "page": page, "pageSize": page_size }),
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
            problem_keyed(
                SdkWorkResultCode::InvalidParameter,
                "validation.admin.upstream.id.positiveInteger",
                serde_json::json!({ "field": field }),
                format!("{field} must be a positive integer string"),
            )
        })
}

pub(super) fn parse_if_match(headers: &HeaderMap) -> RequestResult<i64> {
    let value = headers.get(header::IF_MATCH).ok_or_else(|| {
        problem_keyed(
            SdkWorkResultCode::PreconditionRequired,
            "validation.admin.upstream.version.header.required",
            serde_json::Value::Null,
            "If-Match is required for this operation",
        )
    })?;
    let value = value.to_str().map_err(|_| {
        problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.version.header.format",
            serde_json::Value::Null,
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
            problem_keyed(
                SdkWorkResultCode::InvalidParameter,
                "validation.admin.upstream.version.header.nonNegativeInteger",
                serde_json::Value::Null,
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
        problem_keyed(
            SdkWorkResultCode::PreconditionRequired,
            "validation.admin.upstream.idempotency.header.required",
            serde_json::Value::Null,
            "Idempotency-Key is required for this create operation",
        )
    })?;
    let key = key.to_str().map_err(|_| {
        problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.idempotency.header.visibleText",
            serde_json::Value::Null,
            "Idempotency-Key must be valid visible text",
        )
    })?;
    let key = normalize_visible_text(
        key.to_owned(),
        "Idempotency-Key",
        MAX_IDEMPOTENCY_KEY_LENGTH,
    )?;
    if key.is_empty() {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.idempotency.header.notBlank",
            serde_json::Value::Null,
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
        return Err(problem_keyed(
            SdkWorkResultCode::MissingRequiredField,
            "validation.admin.upstream.field.required",
            serde_json::json!({ "field": field }),
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
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.field.visibleText",
            serde_json::json!({ "field": field, "maxLength": max_length }),
            format!("{field} must be visible text with at most {max_length} characters"),
        ));
    }
    Ok(value.trim().to_owned())
}

pub(super) fn positive_decimal(value: String, field: &str) -> RequestResult<String> {
    let value = required_text(value, field, 64)?;
    let decimal = DecimalValue::parse(&value).map_err(|_| {
        problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.field.positiveDecimal",
            serde_json::json!({ "field": field, "maxFractionDigits": 12 }),
            format!("{field} must be a positive decimal with at most 12 fractional digits"),
        )
    })?;
    if decimal <= DecimalValue::ZERO {
        return Err(problem_keyed(
            SdkWorkResultCode::InvalidParameter,
            "validation.admin.upstream.field.greaterThanZero",
            serde_json::json!({ "field": field }),
            format!("{field} must be greater than zero"),
        ));
    }
    Ok(value)
}

pub(super) fn decode_json<T>(payload: Result<Json<T>, JsonRejection>) -> RequestResult<T> {
    payload.map(|Json(value)| value).map_err(|rejection| {
        problem_keyed(
            SdkWorkResultCode::MalformedRequest,
            "validation.admin.upstream.body.malformed",
            serde_json::json!({ "error": rejection.body_text() }),
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
            problem_keyed(
                SdkWorkResultCode::InvalidParameter,
                "validation.admin.upstream.query.invalid",
                serde_json::json!({ "error": rejection.body_text() }),
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

pub(super) fn collection_item_response<T: Serialize>(parent_id: i64, items: Vec<T>) -> Response {
    item_response(
        StatusCode::OK,
        CollectionItem {
            id: parent_id.to_string(),
            items,
        },
    )
}

pub(super) fn no_content_response() -> Response {
    let trace_id = uuid();
    let mut response = StatusCode::NO_CONTENT.into_response();
    attach_trace_id(&mut response, &trace_id);
    response
}

pub(super) fn success_response<T: Serialize>(status: StatusCode, data: T) -> Response {
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
    problem_keyed(
        SdkWorkResultCode::InternalError,
        "business.admin.upstream.operation.failed",
        serde_json::Value::Null,
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
    problem_keyed(
        SdkWorkResultCode::NotFound,
        "business.admin.upstream.notFound",
        serde_json::json!({ "entity": entity }),
        format!("{entity} was not found"),
    )
    .into_response()
}

pub(super) fn problem(code: SdkWorkResultCode, detail: impl Into<String>) -> RequestProblem {
    RequestProblem {
        code,
        detail: detail.into(),
        i18n_key: None,
        params: None,
    }
}

/// Builds a problem with a specific `i18nKey` and sanitized interpolation params
/// (`I18N_SPEC.md` §5/§9). The English `detail` is preserved as the safe fallback
/// display text; frontends translate by key.
pub(super) fn problem_keyed(
    code: SdkWorkResultCode,
    i18n_key: &str,
    params: serde_json::Value,
    detail: impl Into<String>,
) -> RequestProblem {
    RequestProblem {
        code,
        detail: detail.into(),
        i18n_key: Some(i18n_key.to_owned()),
        params: Some(params),
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
