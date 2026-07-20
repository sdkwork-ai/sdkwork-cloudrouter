use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{
    json_success_list_response, offset_page_info, parse_offset_list_query, problem_from_wire_code,
    success_envelope,
};
use crate::domain::DomainError;
use crate::ports::{
    AdminInventoryCollection, AdminInventoryJsonRecord, AdminInventoryStore,
    ListAdminInventoryRecordsQuery, UpdateAdminInventoryStockCommand,
};

const MAX_ID_LEN: usize = 128;
const MAX_CODE_LEN: usize = 128;
const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";
const STOCK_STATUSES: &[&str] = &["active", "inactive", "locked"];

#[derive(Clone)]
struct AdminInventoryState {
    store: Arc<dyn AdminInventoryStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
struct InventoryListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
    status: Option<String>,
    sku_id: Option<String>,
    warehouse_id: Option<String>,
    order_id: Option<String>,
    checkout_session_id: Option<String>,
    source_type: Option<String>,
    source_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct StockUpdateRequest {
    available_quantity: Option<i64>,
    reserved_quantity: Option<i64>,
    status: Option<String>,
    version: i64,
    reason_code: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InventoryResourceResponse {
    item: AdminInventoryJsonRecord,
}

pub fn admin_inventory_router_with_store(
    store: Arc<dyn AdminInventoryStore + Send + Sync>,
) -> Router {
    Router::new()
        .route("/backend/v3/api/inventory/stocks", get(list_stocks))
        .route(
            "/backend/v3/api/inventory/stocks/{stock_id}",
            axum::routing::patch(update_stock),
        )
        .route(
            "/backend/v3/api/inventory/reservations",
            get(list_reservations),
        )
        .route(
            "/backend/v3/api/inventory/ledger_entries",
            get(list_ledger_entries),
        )
        .with_state(AdminInventoryState { store })
}

async fn list_stocks(
    State(state): State<AdminInventoryState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<InventoryListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_stocks(query)).await
}

async fn list_reservations(
    State(state): State<AdminInventoryState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<InventoryListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_reservations(query)).await
}

async fn list_ledger_entries(
    State(state): State<AdminInventoryState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<InventoryListQueryRequest>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_ledger_entries(query)
    })
    .await
}

async fn update_stock(
    State(state): State<AdminInventoryState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(stock_id): Path<String>,
    body: Bytes,
) -> Response {
    let request = match parse_json_body::<StockUpdateRequest>(&body, "stock") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match stock_update_command(scoped, &headers, stock_id, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.update_stock(command).await {
        Ok(item) => Json(success_envelope(InventoryResourceResponse { item })).into_response(),
        Err(error) => domain_error_response("inventory stock command failed", error),
    }
}

async fn list_response<'a, F>(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    query: InventoryListQueryRequest,
    load: F,
) -> Response
where
    F: FnOnce(
        ListAdminInventoryRecordsQuery,
    ) -> crate::ports::AdminInventoryFuture<'a, AdminInventoryCollection>,
{
    let query = match validated_list_query(scoped, query) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match load(query).await {
        Ok(collection) => json_success_list_response(
            None,
            collection.items,
            offset_page_info(collection.page_no, collection.page_size, collection.total),
        ),
        Err(error) => domain_error_response("inventory collection is unavailable", error),
    }
}

fn validated_list_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    request: InventoryListQueryRequest,
) -> Result<ListAdminInventoryRecordsQuery, Response> {
    let subject = scoped.into();
    let pagination =
        parse_offset_list_query(request.page, request.page_size).map_err(bad_request)?;
    Ok(ListAdminInventoryRecordsQuery {
        subject,
        page_no: pagination.page_no,
        page_size: pagination.page_size,
        offset: pagination.offset,
        status: normalize_optional_text(request.status, "status", MAX_CODE_LEN)?
            .map(|value| value.to_ascii_lowercase()),
        sku_id: normalize_optional_text(request.sku_id, "skuId", MAX_ID_LEN)?,
        warehouse_id: normalize_optional_text(request.warehouse_id, "warehouseId", MAX_ID_LEN)?,
        order_id: normalize_optional_text(request.order_id, "orderId", MAX_ID_LEN)?,
        checkout_session_id: normalize_optional_text(
            request.checkout_session_id,
            "checkoutSessionId",
            MAX_ID_LEN,
        )?,
        source_type: normalize_optional_text(request.source_type, "sourceType", MAX_CODE_LEN)?,
        source_id: normalize_optional_text(request.source_id, "sourceId", MAX_ID_LEN)?,
    })
}

fn stock_update_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    stock_id: String,
    request: StockUpdateRequest,
) -> Result<UpdateAdminInventoryStockCommand, Response> {
    if request.version < 0 {
        return Err(bad_request("version must be greater than or equal to 0"));
    }
    if let Some(quantity) = request.available_quantity {
        if quantity < 0 {
            return Err(bad_request(
                "availableQuantity must be greater than or equal to 0",
            ));
        }
    }
    if let Some(quantity) = request.reserved_quantity {
        if quantity < 0 {
            return Err(bad_request(
                "reservedQuantity must be greater than or equal to 0",
            ));
        }
    }
    Ok(UpdateAdminInventoryStockCommand {
        subject: scoped.into(),
        stock_id: normalize_required_text(stock_id, "stockId", MAX_ID_LEN)?,
        available_quantity: request.available_quantity,
        reserved_quantity: request.reserved_quantity,
        status: request
            .status
            .map(|value| normalize_enum(value, "status", STOCK_STATUSES))
            .transpose()?,
        version: request.version,
        reason_code: normalize_optional_text(request.reason_code, "reasonCode", MAX_CODE_LEN)?,
        idempotency_key: required_header(headers, IDEMPOTENCY_KEY_HEADER)?,
        request_id: server_request_id()?,
        requested_at: current_timestamp_string(),
    })
}

fn parse_json_body<T>(body: &Bytes, resource: &str) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
{
    serde_json::from_slice(body).map_err(|error| format!("invalid {resource} payload: {error}"))
}

fn server_request_id() -> Result<String, Response> {
    generate_server_request_id().map_err(request_id_error_response)
}

fn request_id_error_response(error: RequestIdError) -> Response {
    match error {
        RequestIdError::Invalid(message) => bad_request(message),
        RequestIdError::System(message) => {
            domain_error_response("request id generation failed", DomainError::new(message))
        }
    }
}

fn required_header(headers: &HeaderMap, name: &str) -> Result<String, Response> {
    optional_header(headers, name)?.ok_or_else(|| bad_request(format!("{name} header is required")))
}

fn optional_header(headers: &HeaderMap, name: &str) -> Result<Option<String>, Response> {
    let Some(value) = headers.get(name) else {
        return Ok(None);
    };
    let value = value
        .to_str()
        .map_err(|_| bad_request(format!("{name} header must be visible ASCII")))?;
    normalize_optional_text(Some(value.to_owned()), name, MAX_ID_LEN)
}

fn normalize_enum(
    value: String,
    field_name: &str,
    allowed_values: &[&str],
) -> Result<String, Response> {
    let value = normalize_required_text(value, field_name, MAX_CODE_LEN)?.to_ascii_lowercase();
    if !allowed_values.contains(&value.as_str()) {
        return Err(bad_request(format!(
            "{field_name} must be one of {}",
            allowed_values.join(", ")
        )));
    }
    Ok(value)
}

fn normalize_required_text(
    value: String,
    field_name: &str,
    max_len: usize,
) -> Result<String, Response> {
    normalize_optional_text(Some(value), field_name, max_len)?
        .ok_or_else(|| bad_request(format!("{field_name} is required")))
}

fn normalize_optional_text(
    value: Option<String>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, Response> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    if value.chars().count() > max_len || !value.bytes().all(|byte| (0x20..=0x7e).contains(&byte)) {
        return Err(bad_request(format!(
            "{field_name} must be visible ASCII and at most {max_len} characters"
        )));
    }
    Ok(Some(value.to_owned()))
}

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn domain_error_response(context: &str, error: DomainError) -> Response {
    if error.is_conflict() {
        return problem_from_wire_code("4090", error.to_string()).into_response();
    }
    if error.is_not_found() {
        return problem_from_wire_code("4040", error.to_string()).into_response();
    }
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}

fn current_timestamp_string() -> String {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0);
    format_unix_timestamp(seconds)
}

fn format_unix_timestamp(seconds: i64) -> String {
    let days = seconds.div_euclid(86_400);
    let seconds_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);
    let hour = seconds_of_day / 3_600;
    let minute = (seconds_of_day % 3_600) / 60;
    let second = seconds_of_day % 60;
    format!("{year:04}-{month:02}-{day:02} {hour:02}:{minute:02}:{second:02}")
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let days = days + 719_468;
    let era = if days >= 0 { days } else { days - 146_096 } / 146_097;
    let day_of_era = days - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    let year = year + if month <= 2 { 1 } else { 0 };
    (year, month, day)
}
