//! SdkWork HTTP API response helpers (`API_SPEC.md` §15).
//!
//! Success bodies use `SdkWorkApiResponse`; failures use RFC 9457 `ProblemDetail`
//! with `application/problem+json`.

use axum::{
    http::{header, HeaderName, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use sdkwork_utils_rust::{
    legacy_wire_result_code, PageInfo, PageMode, SdkWorkApiResponse, SdkWorkPageData,
    SdkWorkProblemDetail, SdkWorkProblemRouting, SdkWorkResourceData, SdkWorkResultCode,
};
use sdkwork_web_core::WebRequestContext;
use serde::Serialize;

use crate::api::request_id::generate_server_request_id;

/// Keeps validation failures compact on successful request paths while preserving
/// the exact RFC 9457 response assembled by the API boundary.
pub(crate) struct ApiResponseError(Box<Response>);

impl std::fmt::Debug for ApiResponseError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("ApiResponseError")
            .field("status", &self.0.status())
            .finish_non_exhaustive()
    }
}

impl From<Response> for ApiResponseError {
    fn from(response: Response) -> Self {
        Self(Box::new(response))
    }
}

impl IntoResponse for ApiResponseError {
    fn into_response(self) -> Response {
        *self.0
    }
}

pub fn new_trace_id() -> String {
    generate_server_request_id().unwrap_or_else(|_| sdkwork_utils_rust::uuid())
}

pub fn resolve_trace_id(context: Option<&WebRequestContext>) -> String {
    context
        .and_then(|ctx| {
            let resolved = ctx.resolved_trace_id();
            if resolved.trim().is_empty() {
                None
            } else {
                Some(resolved)
            }
        })
        .or_else(|| {
            context
                .and_then(|ctx| ctx.trace_id.clone())
                .filter(|value| !value.trim().is_empty())
        })
        .unwrap_or_else(new_trace_id)
}

pub fn success_envelope<T: Serialize>(data: T) -> SdkWorkApiResponse<T> {
    SdkWorkApiResponse::success(data, new_trace_id())
}

/// Maps transitional legacy string wire codes to platform `ProblemDetail`.
pub fn problem_from_wire_code(
    wire_code: impl AsRef<str>,
    detail: impl Into<String>,
) -> ProblemResponse {
    ProblemResponse::from_legacy(wire_code.as_ref(), detail.into(), new_trace_id())
}

/// Keyed variant of [`problem_from_wire_code`] carrying a specific `i18nKey` and
/// sanitized interpolation params (`I18N_SPEC.md` §5/§9).
pub fn problem_from_wire_code_keyed(
    wire_code: impl AsRef<str>,
    i18n_key: &str,
    params: serde_json::Value,
    detail: impl Into<String>,
) -> ProblemResponse {
    let mut response = ProblemResponse::from_legacy(
        wire_code.as_ref(),
        detail.into(),
        new_trace_id(),
    );
    response.i18n_key = Some(i18n_key.to_owned());
    response.params = Some(params);
    response
}

/// Resolves a stable shared validation template to its semantic `i18nKey` and
/// interpolation params (`I18N_SPEC.md` §5).
///
/// Cross-module validation helpers (pagination, search text, header checks,
/// entity-not-found) emit frozen English templates. Mapping those stable
/// templates here — once, at the response boundary — gives every list/retrieve
/// endpoint translatable metadata without per-site duplication. Non-matching
/// messages keep the platform `errors.result.<code>` key. The mapping is
/// presentation-only: machine state remains the numeric result code.
fn shared_validation_message_key(detail: &str) -> Option<(&'static str, serde_json::Value)> {
    const EXACT: &[(&str, &str)] = &[
        // pagination / list
        ("at least one domain is required", "validation.common.domain.atLeastOne"),
        ("domain must be a hostname or URL host", "validation.common.domain.hostname"),
        ("storage query parameters are invalid", "validation.admin.storage.query.invalid"),
        // service node
        ("status must be enabled or disabled", "validation.common.status.enabledOrDisabled"),
        ("status must be changed through status endpoint", "business.admin.serviceNode.statusEndpoint"),
        ("service node update fields are required", "validation.admin.serviceNode.update.required"),
        // api keys / auth
        ("keyPrefix must identify an existing API key prefix", "validation.admin.apiKey.keyPrefix.identifies"),
        ("appId is invalid", "validation.common.appId.invalid"),
        ("apiKeyId must be a positive integer", "validation.common.apiKeyId.positiveInteger"),
        // common
        ("ip must be a valid IPv4 or IPv6 address", "validation.common.ip.invalid"),
        ("base URL must be a valid URL", "validation.common.baseUrl.invalid"),
        ("deployment profile must be standalone or cloud", "validation.common.deploymentProfile.enum"),
        // app-facing
        ("notificationId is invalid", "validation.app.notification.notificationId.invalid"),
        ("invite code is invalid or inactive", "validation.app.invite.code.invalidOrInactive"),
        ("datasets must not be empty", "validation.app.chat.datasets.notEmpty"),
        ("a user cannot invite themselves", "business.app.invite.selfInvite.denied"),
        // upstream
        ("accountGroup must identify an existing upstream account group", "validation.admin.upstream.accountGroup.identifies"),
    ];
    if let Some((_, key)) = EXACT.iter().find(|(template, _)| *template == detail) {
        return Some((key, serde_json::Value::Null));
    }

    // Pagination messages carry bounds as interpolation params.
    if detail == "page must be greater than or equal to 1" {
        return Some((
            "validation.common.list.page.min",
            serde_json::json!({ "min": 1 }),
        ));
    }
    if detail == "page and page_size produce an unsupported offset" {
        return Some((
            "validation.common.list.offset.overflow",
            serde_json::Value::Null,
        ));
    }

    if let Some(max) = detail.strip_prefix("page must be between 1 and ") {
        if !max.is_empty() && max.chars().all(|c| c.is_ascii_digit()) {
            return Some((
                "validation.common.list.page.max",
                serde_json::json!({ "max": max }),
            ));
        }
    }
    if let Some(max) = detail.strip_prefix("page_size must be between 1 and ") {
        if !max.is_empty() && max.chars().all(|c| c.is_ascii_digit()) {
            return Some((
                "validation.common.list.pageSize.range",
                serde_json::json!({ "min": 1, "max": max }),
            ));
        }
    }
    if let Some(rest) = detail.strip_suffix(" characters") {
        if let Some((field, max)) = rest.rsplit_once(" and at most ") {
            if !max.is_empty() && max.chars().all(|c| c.is_ascii_digit()) {
                if let Some(field) = field.strip_suffix(" must be visible text") {
                    return Some((
                        "validation.common.field.visibleText",
                        serde_json::json!({ "field": field.trim(), "maxLength": max }),
                    ));
                }
            }
        }
    }
    if let Some(field) = detail.strip_suffix(" must be a non-negative int64 string") {
        return Some((
            "validation.common.field.nonNegativeInt64",
            serde_json::json!({ "field": field.trim() }),
        ));
    }
    if let Some(field) = detail.strip_suffix(" must be a positive integer or null") {
        return Some((
            "validation.common.field.positiveIntegerOrNull",
            serde_json::json!({ "field": field.trim() }),
        ));
    }
    if let Some(field) = detail.strip_suffix(" must be a positive integer") {
        return Some((
            "validation.common.field.positiveInteger",
            serde_json::json!({ "field": field.trim() }),
        ));
    }
    if let Some(field) = detail.strip_suffix(" must be a MediaResource object") {
        return Some((
            "validation.common.field.mediaResource",
            serde_json::json!({ "field": field.trim() }),
        ));
    }
    if let Some(field) = detail.strip_suffix(" must be a JSON object") {
        return Some((
            "validation.common.field.jsonObject",
            serde_json::json!({ "field": field.trim() }),
        ));
    }
    if let Some(field) = detail.strip_suffix(" must be a JSON array") {
        return Some((
            "validation.common.field.jsonArray",
            serde_json::json!({ "field": field.trim() }),
        ));
    }
    if let Some((field, pattern)) = detail.split_once(" must match ") {
        return Some((
            "validation.common.field.pattern",
            serde_json::json!({ "field": field.trim(), "pattern": pattern.trim() }),
        ));
    }
    if let Some(name) = detail.strip_suffix(" header must be visible ASCII") {
        return Some((
            "validation.common.header.visibleAscii",
            serde_json::json!({ "name": name.trim() }),
        ));
    }
    if let Some(name) = detail.strip_suffix(" header is required") {
        return Some((
            "validation.common.header.required",
            serde_json::json!({ "name": name.trim() }),
        ));
    }
    if let Some(field) = detail.strip_suffix(" is required") {
        return Some((
            "validation.common.field.required",
            serde_json::json!({ "field": field.trim() }),
        ));
    }
    for (prefix, key) in [
        ("refund cancel request body is invalid: ", "validation.payment.refundCancel.body.invalid"),
        ("payment refund request body is invalid: ", "validation.payment.refund.body.invalid"),
        ("payment intent request body is invalid: ", "validation.payment.intent.body.invalid"),
    ] {
        if let Some(error) = detail.strip_prefix(prefix) {
            return Some((key, serde_json::json!({ "error": error.trim() })));
        }
    }
    if let Some(entity) = detail.strip_suffix(" was not found") {
        return Some((
            "business.common.notFound",
            serde_json::json!({ "entity": entity.trim() }),
        ));
    }
    None
}

pub fn problem_from_wire_code_for_context(
    context: Option<&WebRequestContext>,
    wire_code: impl AsRef<str>,
    detail: impl Into<String>,
) -> ProblemResponse {
    ProblemResponse::from_legacy_enriched(
        wire_code.as_ref(),
        detail.into(),
        resolve_trace_id(context),
        problem_routing(context),
    )
}

pub fn platform_problem(
    result_code: SdkWorkResultCode,
    detail: impl Into<String>,
) -> ProblemResponse {
    ProblemResponse::platform(result_code, detail, new_trace_id())
}

fn problem_routing(context: Option<&WebRequestContext>) -> SdkWorkProblemRouting {
    context
        .map(WebRequestContext::problem_routing)
        .unwrap_or_default()
}

pub fn platform_problem_for_context(
    context: Option<&WebRequestContext>,
    result_code: SdkWorkResultCode,
    detail: impl Into<String>,
) -> ProblemResponse {
    ProblemResponse::platform_enriched(
        result_code,
        detail,
        resolve_trace_id(context),
        problem_routing(context),
    )
}

pub fn validation_problem_for_context(
    context: Option<&WebRequestContext>,
    detail: impl Into<String>,
) -> ProblemResponse {
    platform_problem_for_context(context, SdkWorkResultCode::ValidationError, detail)
}

pub fn validation_problem(detail: impl Into<String>) -> ProblemResponse {
    platform_problem(SdkWorkResultCode::ValidationError, detail)
}

/// Keyed validation problem (`validation.<domain>.<resource>.<field>.<rule>`).
pub fn validation_problem_keyed(
    i18n_key: &str,
    params: serde_json::Value,
    detail: impl Into<String>,
) -> ProblemResponse {
    platform_problem_keyed(SdkWorkResultCode::ValidationError, i18n_key, params, detail)
}

/// Keyed platform problem (`I18N_SPEC.md` §5/§9).
pub fn platform_problem_keyed(
    result_code: SdkWorkResultCode,
    i18n_key: &str,
    params: serde_json::Value,
    detail: impl Into<String>,
) -> ProblemResponse {
    ProblemResponse::platform_keyed(result_code, i18n_key, params, detail, new_trace_id())
}

pub fn not_found_problem(detail: impl Into<String>) -> ProblemResponse {
    platform_problem(SdkWorkResultCode::NotFound, detail)
}

pub fn internal_problem(detail: impl Into<String>) -> ProblemResponse {
    platform_problem(SdkWorkResultCode::InternalError, detail)
}

pub fn service_unavailable_problem(detail: impl Into<String>) -> ProblemResponse {
    platform_problem(SdkWorkResultCode::ServiceUnavailable, detail)
}

#[derive(Debug, Clone)]
pub struct ProblemResponse {
    pub problem: SdkWorkProblemDetail,
    /// Specific localization key (`I18N_SPEC.md` §5): `validation.<domain>.<resource>.<field>.<rule>`
    /// or `business.<domain>.<capability>.<state>`. Falls back to the auto
    /// `errors.result.<code>` key when absent.
    pub i18n_key: Option<String>,
    /// Sanitized interpolation parameters for the `i18n_key` template.
    pub params: Option<serde_json::Value>,
}

impl ProblemResponse {
    fn with_shared_validation_key(mut self, detail: &str) -> Self {
        if self.i18n_key.is_none() {
            if let Some((key, params)) = shared_validation_message_key(detail) {
                self.i18n_key = Some(key.to_owned());
                self.params = Some(params);
            }
        }
        self
    }

    pub fn from_legacy(wire_code: &str, detail: String, trace_id: String) -> Self {
        Self::from_legacy_enriched(
            wire_code,
            detail,
            trace_id,
            SdkWorkProblemRouting::default(),
        )
    }

    pub fn from_legacy_enriched(
        wire_code: &str,
        detail: String,
        trace_id: String,
        routing: SdkWorkProblemRouting,
    ) -> Self {
        let result_code = legacy_wire_result_code(wire_code);
        Self {
            problem: SdkWorkProblemDetail::platform_enriched(
                result_code,
                detail.clone(),
                trace_id,
                routing,
            ),
            i18n_key: None,
            params: None,
        }
        .with_shared_validation_key(&detail)
    }

    pub fn platform(
        result_code: SdkWorkResultCode,
        detail: impl Into<String>,
        trace_id: impl Into<String>,
    ) -> Self {
        Self::platform_enriched(
            result_code,
            detail,
            trace_id,
            SdkWorkProblemRouting::default(),
        )
    }

    pub fn platform_enriched(
        result_code: SdkWorkResultCode,
        detail: impl Into<String>,
        trace_id: impl Into<String>,
        routing: SdkWorkProblemRouting,
    ) -> Self {
        let detail = detail.into();
        Self {
            problem: SdkWorkProblemDetail::platform_enriched(
                result_code,
                detail.clone(),
                trace_id,
                routing,
            ),
            i18n_key: None,
            params: None,
        }
        .with_shared_validation_key(&detail)
    }

    /// Builds a problem with a specific `i18nKey` and sanitized interpolation
    /// params (`I18N_SPEC.md` §5/§9). The English `detail` is preserved as the
    /// safe fallback display text; frontends translate by key.
    pub fn platform_keyed(
        result_code: SdkWorkResultCode,
        i18n_key: &str,
        params: serde_json::Value,
        detail: impl Into<String>,
        trace_id: impl Into<String>,
    ) -> Self {
        Self {
            problem: SdkWorkProblemDetail::platform_enriched(
                result_code,
                detail,
                trace_id,
                SdkWorkProblemRouting::default(),
            ),
            i18n_key: Some(i18n_key.to_owned()),
            params: Some(params),
        }
    }
}

impl IntoResponse for ProblemResponse {
    fn into_response(self) -> Response {
        let trace_id = self.problem.trace_id.clone();
        let status =
            StatusCode::from_u16(self.problem.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
        let mut payload = serde_json::to_value(self.problem).expect("problem detail is serializable");
        if let Some(key) = self.i18n_key {
            payload["i18nKey"] = serde_json::Value::String(key);
        }
        if let Some(params) = self.params {
            payload["params"] = params;
        }
        let mut response = (
            status,
            [(header::CONTENT_TYPE, "application/problem+json")],
            Json(payload),
        )
            .into_response();
        attach_trace_header(&mut response, &trace_id);
        response
    }
}

pub fn attach_trace_header(response: &mut Response, trace_id: &str) {
    if let Ok(value) = HeaderValue::from_str(trace_id) {
        response
            .headers_mut()
            .insert(HeaderName::from_static("x-sdkwork-trace-id"), value);
    }
}

pub fn json_success_response<T: Serialize>(
    context: Option<&WebRequestContext>,
    data: T,
) -> Response {
    let trace_id = resolve_trace_id(context);
    let envelope = SdkWorkApiResponse::success(data, trace_id.clone());
    let mut response = (StatusCode::OK, Json(envelope)).into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

/// Default list query values per `API_SPEC.md` §14.1.1.
pub fn json_created_response<T: Serialize>(
    context: Option<&WebRequestContext>,
    data: T,
) -> Response {
    let trace_id = resolve_trace_id(context);
    let envelope = SdkWorkApiResponse::success(data, trace_id.clone());
    let mut response = (StatusCode::CREATED, Json(envelope)).into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

pub fn no_content_response(context: Option<&WebRequestContext>) -> Response {
    let trace_id = resolve_trace_id(context);
    let mut response = StatusCode::NO_CONTENT.into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

pub const DEFAULT_LIST_PAGE_NO: i64 = 1;
pub const DEFAULT_LIST_PAGE_SIZE: i64 = 20;
pub const MAX_LIST_PAGE_SIZE: i64 = 200;
pub const MAX_LIST_PAGE_NO: i64 = i32::MAX as i64;
pub const MAX_LIST_SEARCH_LEN: usize = 256;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ParsedOffsetListQuery {
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

pub fn parse_offset_list_query(
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<ParsedOffsetListQuery, String> {
    let page_no = page.unwrap_or(DEFAULT_LIST_PAGE_NO);
    if page_no < 1 {
        return Err("page must be greater than or equal to 1".to_owned());
    }
    if page_no > MAX_LIST_PAGE_NO {
        return Err(format!("page must be between 1 and {MAX_LIST_PAGE_NO}"));
    }
    let page_size = page_size.unwrap_or(DEFAULT_LIST_PAGE_SIZE);
    if !(1..=MAX_LIST_PAGE_SIZE).contains(&page_size) {
        return Err(format!(
            "page_size must be between 1 and {MAX_LIST_PAGE_SIZE}"
        ));
    }
    let offset = (page_no - 1)
        .checked_mul(page_size)
        .ok_or_else(|| "page and page_size produce an unsupported offset".to_owned())?;
    Ok(ParsedOffsetListQuery {
        page_no,
        page_size,
        offset,
    })
}

pub fn normalize_list_search_query(
    value: Option<String>,
    field: &str,
) -> Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    let contains_control_character = value.chars().any(char::is_control);
    let value = value.trim();
    if value.is_empty() {
        return if contains_control_character {
            Err(format!(
                "{field} must be visible text and at most {MAX_LIST_SEARCH_LEN} characters"
            ))
        } else {
            Ok(None)
        };
    }
    if contains_control_character || value.chars().count() > MAX_LIST_SEARCH_LEN {
        return Err(format!(
            "{field} must be visible text and at most {MAX_LIST_SEARCH_LEN} characters"
        ));
    }
    Ok(Some(value.to_owned()))
}

/// Offset pagination metadata for list responses (`API_SPEC.md` §16).
pub fn offset_page_info(page_no: i64, page_size: i64, total_items: i64) -> PageInfo {
    let total_page_count = if page_size > 0 && total_items >= 0 {
        total_items
            .checked_add(page_size - 1)
            .map(|total_with_remainder| total_with_remainder / page_size)
    } else {
        None
    };
    let total_pages = total_page_count.and_then(|value| i32::try_from(value).ok());
    let has_more = total_page_count.is_some_and(|value| page_no > 0 && page_no < value);
    PageInfo {
        mode: PageMode::Offset,
        page: i32::try_from(page_no).ok(),
        page_size: i32::try_from(page_size).ok(),
        total_items: Some(total_items.to_string()),
        total_pages,
        next_cursor: None,
        has_more: Some(has_more),
    }
}

/// List success body (`API_SPEC.md` §15.4 List → `data.items` + `data.pageInfo`).
pub fn json_success_list_response<T: Serialize>(
    context: Option<&WebRequestContext>,
    items: Vec<T>,
    page_info: PageInfo,
) -> Response {
    let trace_id = resolve_trace_id(context);
    let envelope =
        SdkWorkApiResponse::success(SdkWorkPageData { items, page_info }, trace_id.clone());
    let mut response = (StatusCode::OK, Json(envelope)).into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

/// Single-resource success body (`API_SPEC.md` §15.4 Retrieve → `data.item`).
pub fn json_success_item_response<T: Serialize>(
    context: Option<&WebRequestContext>,
    item: T,
) -> Response {
    let trace_id = resolve_trace_id(context);
    let envelope = SdkWorkApiResponse::success(SdkWorkResourceData { item }, trace_id.clone());
    let mut response = (StatusCode::OK, Json(envelope)).into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_validation_messages_resolve_to_keys_with_params() {
        let cases = [
            ("page must be greater than or equal to 1", "validation.common.list.page.min"),
            ("page must be between 1 and 2147483647", "validation.common.list.page.max"),
            ("page_size must be between 1 and 200", "validation.common.list.pageSize.range"),
            ("q must be visible text and at most 256 characters", "validation.common.field.visibleText"),
            ("displayName is required", "validation.common.field.required"),
            ("name header is required", "validation.common.header.required"),
            ("If-Match header must be visible ASCII", "validation.common.header.visibleAscii"),
            ("offset must be a non-negative int64 string", "validation.common.field.nonNegativeInt64"),
            ("limit must be a positive integer or null", "validation.common.field.positiveIntegerOrNull"),
            ("priority must be a positive integer", "validation.common.field.positiveInteger"),
            ("config must be a JSON object", "validation.common.field.jsonObject"),
            ("items must be a JSON array", "validation.common.field.jsonArray"),
            ("logo must be a MediaResource object", "validation.common.field.mediaResource"),
            ("code must match ^[a-z]+$", "validation.common.field.pattern"),
            ("api key was not found", "business.common.notFound"),
            ("payment intent request body is invalid: bad json", "validation.payment.intent.body.invalid"),
        ];
        for (message, expected_key) in cases {
            let (key, _) = shared_validation_message_key(message)
                .unwrap_or_else(|| panic!("no key for {message:?}"));
            assert_eq!(expected_key, key);
        }
    }

    #[test]
    fn shared_validation_params_extract_field_and_max_length() {
        let (_, params) = shared_validation_message_key(
            "search must be visible text and at most 256 characters",
        )
        .unwrap();
        assert_eq!("search", params["field"]);
        assert_eq!("256", params["maxLength"]);
    }

    #[test]
    fn shared_validation_key_is_not_applied_to_arbitrary_messages() {
        assert!(shared_validation_message_key("An internal error occurred").is_none());
        assert!(shared_validation_message_key("db connection reset").is_none());
        assert!(shared_validation_message_key("Idempotency-Key is required for this create operation").is_none());
    }

    #[test]
    fn keyed_problem_response_carries_i18n_key_and_params() {
        let response = problem_from_wire_code_keyed(
            "4001",
            "validation.app.chat.datasets.notEmpty",
            serde_json::json!({}),
            "datasets must not be empty",
        )
        .into_response();
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        let bytes = rt
            .block_on(async { axum::body::to_bytes(response.into_body(), usize::MAX).await })
            .expect("body");
        let payload: serde_json::Value = serde_json::from_slice(&bytes).expect("json");
        assert_eq!(
            "validation.app.chat.datasets.notEmpty",
            payload["i18nKey"].as_str().unwrap()
        );
        assert_eq!(40001, payload["code"].as_i64().unwrap());
    }

    #[test]
    fn legacy_problem_response_resolves_shared_validation_key() {
        let response = problem_from_wire_code("4001", "page must be greater than or equal to 1")
            .into_response();
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        let bytes = rt
            .block_on(async { axum::body::to_bytes(response.into_body(), usize::MAX).await })
            .expect("body");
        let payload: serde_json::Value = serde_json::from_slice(&bytes).expect("json");
        assert_eq!(
            "validation.common.list.page.min",
            payload["i18nKey"].as_str().unwrap()
        );
        assert_eq!(1, payload["params"]["min"].as_i64().unwrap());
    }

    #[test]
    fn success_envelope_uses_sdkwork_v3_shape() {
        let body = success_envelope(serde_json::json!({"items": []}));
        assert_eq!(0, body.code);
        assert!(!body.trace_id.is_empty());
    }

    #[test]
    fn wire_code_not_found_maps_to_problem_detail() {
        let response = problem_from_wire_code("4040", "missing resource");
        assert_eq!(404, response.problem.status);
        assert_eq!(40401, response.problem.code);
    }

    #[test]
    fn wire_code_4004_maps_to_not_found() {
        let response = problem_from_wire_code("4004", "missing resource");
        assert_eq!(40401, response.problem.code);
    }

    #[test]
    fn normalize_list_search_query_rejects_control_characters() {
        let expected = Err("q must be visible text and at most 256 characters".to_owned());

        assert_eq!(
            expected,
            normalize_list_search_query(Some("bad\nterm".to_owned()), "q")
        );
        assert_eq!(
            Err("q must be visible text and at most 256 characters".to_owned()),
            normalize_list_search_query(Some("\t".to_owned()), "q")
        );
    }

    #[test]
    fn normalize_list_search_query_trims_visible_text_and_accepts_absence() {
        assert_eq!(
            Ok(Some("edge-node".to_owned())),
            normalize_list_search_query(Some(" edge-node ".to_owned()), "q")
        );
        assert_eq!(Ok(None), normalize_list_search_query(None, "q"));
        assert_eq!(
            Ok(None),
            normalize_list_search_query(Some("   ".to_owned()), "q")
        );
    }

    #[test]
    fn parse_offset_list_query_rejects_page_outside_page_info_range() {
        assert_eq!(
            Err(format!("page must be between 1 and {MAX_LIST_PAGE_NO}")),
            parse_offset_list_query(Some(MAX_LIST_PAGE_NO + 1), Some(1))
        );
    }

    #[test]
    fn offset_page_info_does_not_wrap_large_total_page_counts() {
        let page_info = offset_page_info(1, 1, i64::MAX);

        assert_eq!(Some(1), page_info.page);
        assert_eq!(Some(1), page_info.page_size);
        assert_eq!(Some(i64::MAX.to_string()), page_info.total_items);
        assert_eq!(None, page_info.total_pages);
        assert_eq!(Some(true), page_info.has_more);
    }

    #[test]
    fn offset_page_info_reports_first_final_and_empty_page_continuation() {
        assert_eq!(Some(true), offset_page_info(1, 10, 11).has_more);
        assert_eq!(Some(false), offset_page_info(2, 10, 11).has_more);
        assert_eq!(Some(false), offset_page_info(1, 20, 0).has_more);
    }

    #[test]
    fn problem_response_sets_problem_json_content_type() {
        let response = problem_from_wire_code("4010", "auth required").into_response();
        assert_eq!(
            Some("application/problem+json"),
            response
                .headers()
                .get(header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
        );
    }

    #[test]
    fn json_success_list_response_uses_sdkwork_page_data_envelope() {
        let response = json_success_list_response(
            None,
            vec![serde_json::json!({"id": "1"})],
            offset_page_info(1, 10, 1),
        );
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        let bytes = rt
            .block_on(async { axum::body::to_bytes(response.into_body(), usize::MAX).await })
            .expect("body");
        let payload: serde_json::Value = serde_json::from_slice(&bytes).expect("json");
        assert_eq!(0, payload["code"].as_i64().unwrap());
        assert_eq!(1, payload["data"]["items"].as_array().unwrap().len());
        assert_eq!(
            "offset",
            payload["data"]["pageInfo"]["mode"].as_str().unwrap()
        );
        assert_eq!(false, payload["data"]["pageInfo"]["hasMore"]);
        assert_eq!(1, payload["data"]["pageInfo"]["page"].as_i64().unwrap());
    }

    #[test]
    fn json_success_item_response_uses_sdkwork_resource_data_envelope() {
        use sdkwork_web_core::{
            ServerRequestId, WebApiSurface, WebAuthMode, WebOperationBinding, WebTransportFacts,
        };

        let context = WebRequestContext {
            request_id: ServerRequestId("req-item".to_owned()),
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            principal: None,
            transport: WebTransportFacts {
                path: "/app/v3/api/ai/dashboard/overview".to_owned(),
                method: "GET".to_owned(),
                auth_token_present: true,
                access_token_present: true,
                api_key_present: false,
                ingress_token_present: false,
                oauth_bearer_present: false,
                agent_token_present: false,
            },
            locale: None,
            client_kind: None,
            operation: Some(WebOperationBinding {
                operation_id: "dashboard.overview.retrieve".to_owned(),
                route_template: "/app/v3/api/ai/dashboard/overview".to_owned(),
                rate_limit_tier: None,
                idempotent: false,
            }),
            trace_id: Some("trace-item".to_owned()),
            idempotency_key: None,
        };
        let response =
            json_success_item_response(Some(&context), serde_json::json!({"summary": {}}));
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        let bytes = rt
            .block_on(async { axum::body::to_bytes(response.into_body(), usize::MAX).await })
            .expect("body");
        let payload: serde_json::Value = serde_json::from_slice(&bytes).expect("json");
        assert_eq!(0, payload["code"].as_i64().unwrap());
        assert!(payload["data"]["item"]["summary"].is_object());
    }

    #[test]
    fn json_created_response_uses_created_status_and_sdkwork_envelope() {
        let response = json_created_response(None, serde_json::json!({"item": {"id": "1"}}));
        assert_eq!(StatusCode::CREATED, response.status());
        let trace_header = response
            .headers()
            .get(HeaderName::from_static("x-sdkwork-trace-id"))
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned);
        assert!(trace_header
            .as_deref()
            .is_some_and(|value| !value.is_empty()));

        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        let bytes = rt
            .block_on(async { axum::body::to_bytes(response.into_body(), usize::MAX).await })
            .expect("body");
        let payload: serde_json::Value = serde_json::from_slice(&bytes).expect("json");
        assert_eq!(0, payload["code"].as_i64().unwrap());
        assert_eq!("1", payload["data"]["item"]["id"].as_str().unwrap());
        assert_eq!(trace_header.unwrap(), payload["traceId"].as_str().unwrap());
    }

    #[test]
    fn no_content_response_uses_204_with_no_json_body() {
        let response = no_content_response(None);
        assert_eq!(StatusCode::NO_CONTENT, response.status());
        assert!(response.headers().get(header::CONTENT_TYPE).is_none());
        assert!(response
            .headers()
            .get(HeaderName::from_static("x-sdkwork-trace-id"))
            .and_then(|value| value.to_str().ok())
            .is_some_and(|value| !value.is_empty()));

        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        let bytes = rt
            .block_on(async { axum::body::to_bytes(response.into_body(), usize::MAX).await })
            .expect("body");
        assert!(bytes.is_empty());
    }

    #[test]
    fn platform_problem_for_context_includes_routing_fields() {
        use sdkwork_web_core::{
            ServerRequestId, WebApiSurface, WebAuthMode, WebOperationBinding, WebTransportFacts,
        };

        let context = WebRequestContext {
            request_id: ServerRequestId("req-wallet".to_owned()),
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            principal: None,
            transport: WebTransportFacts {
                path: "/app/v3/api/wallet/transactions".to_owned(),
                method: "GET".to_owned(),
                auth_token_present: true,
                access_token_present: true,
                api_key_present: false,
                ingress_token_present: false,
                oauth_bearer_present: false,
                agent_token_present: false,
            },
            locale: None,
            client_kind: None,
            operation: Some(WebOperationBinding {
                operation_id: "wallet.transactions.list".to_owned(),
                route_template: "/app/v3/api/wallet/transactions".to_owned(),
                rate_limit_tier: None,
                idempotent: false,
            }),
            trace_id: Some("trace-wallet".to_owned()),
            idempotency_key: None,
        };
        let response =
            platform_problem_for_context(Some(&context), SdkWorkResultCode::InternalError, "db")
                .into_response();
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        let bytes = rt
            .block_on(async { axum::body::to_bytes(response.into_body(), usize::MAX).await })
            .expect("body");
        let payload: serde_json::Value = serde_json::from_slice(&bytes).expect("json");
        assert_eq!(
            "GET /app/v3/api/wallet/transactions",
            payload["instance"].as_str().unwrap()
        );
        assert_eq!(
            "wallet.transactions.list",
            payload["operationId"].as_str().unwrap()
        );
        assert_eq!(
            "An internal error occurred",
            payload["detail"].as_str().unwrap()
        );
    }
}
