use std::sync::Arc;

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use std::collections::BTreeMap;

use axum::routing::{get, patch};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::api::request_id::generate_server_request_id;
use crate::api::response::{
    bad_request, json_created_response, json_success_list_response, no_content_response,
    offset_page_info, parse_offset_list_query, problem_from_wire_code, success_envelope,
    ParsedOffsetListQuery,
    domain_conflict_response as conflict_response,
};
use crate::api::text_normalization::parse_json_body;
use crate::api::command_error::{
    command_error_from_request_id as request_id_error, command_error_response,
    system_error_response, ApiCommandError,
};
use crate::application::EntityUuidGenerator;
use crate::ports::{
    AdminMarketingListPage, AdminMarketingStore, AdminMarketingSubject, AdminRechargePackageStatus,
    CreateAdminRechargePackageCommand, DeleteAdminRechargePackageCommand,
    ListAdminExchangeRulesQuery, ListAdminPaymentAttemptsQuery, ListAdminRechargePackagesQuery,
    ListAdminRechargeRecordsQuery, ListAdminReferralStatsQuery, LoadAdminRechargeRecordQuery,
    RechargeSettingsUpdateCommand, UpdateAdminExchangeRuleCommand,
    UpdateAdminRechargePackageCommand,
};
use sdkwork_utils_rust::datetime::current_timestamp_string;

const MAX_ORDER_NO_LEN: usize = 128;
const MAX_ASSET_TYPE_LEN: usize = 32;
const POINTS_ASSET_TYPE: &str = "POINTS";
const CASH_ASSET_TYPE: &str = "CASH";

#[derive(Clone)]
struct AdminMarketingState {
    store: Arc<dyn AdminMarketingStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminMarketingItemEnvelope<T> {
    item: T,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct AdminMarketingListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RechargePackageListQueryRequest {
    status: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RechargePackageMutationRequest {
    price_amount: Option<Value>,
    currency_code: Option<String>,
    bonus_points: Option<Value>,
    discount: Option<Value>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RechargeSettingsUpdateRequest {
    base_currency_code: Option<String>,
    base_points_per_cny: Option<Value>,
    currency_to_cny_rates: Option<BTreeMap<String, Value>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ExchangeRuleListQueryRequest {
    source_asset_type: Option<String>,
    target_asset_type: Option<String>,
    status: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExchangeRuleMutationRequest {
    source_asset_type: Option<String>,
    target_asset_type: Option<String>,
    rate: Option<Value>,
    status: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedRechargePackageMutation {
    price_amount: String,
    currency_code: String,
    bonus_points: i64,
    discount: i64,
    status: AdminRechargePackageStatus,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedRechargeSettingsMutation {
    base_currency_code: String,
    base_points_per_cny: String,
    currency_to_cny_rates: BTreeMap<String, String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedExchangeRuleMutation {
    source_asset_type: String,
    target_asset_type: String,
    rate: String,
}

pub fn admin_marketing_router_with_store(
    store: Arc<dyn AdminMarketingStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/billing/recharges/records",
            get(fetch_recharge_records),
        )
        .route(
            "/backend/v3/api/billing/recharges/records/{order_no}",
            get(fetch_recharge_record),
        )
        .route(
            "/backend/v3/api/recharges/packages",
            get(fetch_recharge_packages).post(create_recharge_package),
        )
        .route(
            "/backend/v3/api/recharges/packages/{package_id}",
            patch(update_recharge_package).delete(delete_recharge_package),
        )
        .route(
            "/backend/v3/api/recharges/settings",
            get(fetch_recharge_settings).put(update_recharge_settings),
        )
        .route(
            "/backend/v3/api/billing/exchange_rules",
            get(fetch_exchange_rules).put(update_exchange_rule),
        )
        .route(
            "/backend/v3/api/billing/payments/attempts",
            get(fetch_payment_attempts),
        )
        .route(
            "/backend/v3/api/billing/referrals/stats",
            get(fetch_referral_stats),
        )
        .with_state(AdminMarketingState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_recharge_records(
    State(state): State<AdminMarketingState>,
    Query(params): Query<AdminMarketingListQueryRequest>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    let parsed = match parse_marketing_list_query(params) {
        Ok(parsed) => parsed,
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .list_recharge_records(ListAdminRechargeRecordsQuery {
            subject,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => marketing_list_response(page),
        Err(error) => system_error_response("recharge read model is unavailable", error),
    }
}

async fn fetch_recharge_record(
    State(state): State<AdminMarketingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(order_no): Path<String>,
) -> Response {
    let subject = scoped.into();
    let order_no = match normalize_order_no(order_no.as_str()) {
        Ok(order_no) => order_no,
        Err(message) => return bad_request(message),
    };
    match state
        .store
        .load_recharge_record(LoadAdminRechargeRecordQuery { subject, order_no })
        .await
    {
        Ok(Some(item)) => {
            Json(success_envelope(AdminMarketingItemEnvelope { item })).into_response()
        }
        Ok(None) => not_found_response("recharge record was not found"),
        Err(error) => system_error_response("recharge read model is unavailable", error),
    }
}

async fn fetch_recharge_packages(
    State(state): State<AdminMarketingState>,
    Query(params): Query<RechargePackageListQueryRequest>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    let parsed = match parse_marketing_list_query(AdminMarketingListQueryRequest {
        page: params.page,
        page_size: params.page_size,
    }) {
        Ok(parsed) => parsed,
        Err(error) => return error.into_response(),
    };
    let status = match normalize_optional_recharge_package_status(params.status.as_deref()) {
        Ok(status) => status,
        Err(error) => return command_error_response(error, "marketing command is invalid"),
    };
    match state
        .store
        .list_recharge_packages(ListAdminRechargePackagesQuery {
            subject,
            status,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => marketing_list_response(page),
        Err(error) => {
            system_error_response("recharge package read model is unavailable", error)
        }
    }
}

async fn create_recharge_package(
    State(state): State<AdminMarketingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<RechargePackageMutationRequest>(&body, "recharge package")
    {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command =
        match build_create_recharge_package_command(state.clone(), &headers, subject, request) {
            Ok(command) => command,
            Err(error) => return command_error_response(error, "marketing command is invalid"),
        };

    match state.store.create_recharge_package(command).await {
        Ok(item) => json_created_response(None, AdminMarketingItemEnvelope { item }),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            system_error_response("recharge package command store is unavailable", error)
        }
    }
}

async fn update_recharge_package(
    State(state): State<AdminMarketingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(package_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let package_id = match normalize_path_id(&package_id, "package id") {
        Ok(package_id) => package_id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<RechargePackageMutationRequest>(&body, "recharge package")
    {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_recharge_package_command(
        state.clone(),
        &headers,
        subject,
        package_id,
        request,
    ) {
        Ok(command) => command,
        Err(error) => return command_error_response(error, "marketing command is invalid"),
    };

    match state.store.update_recharge_package(command).await {
        Ok(item) => Json(success_envelope(AdminMarketingItemEnvelope { item })).into_response(),
        Err(error) if error.is_not_found() => not_found_response("recharge package was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            system_error_response("recharge package command store is unavailable", error)
        }
    }
}

async fn delete_recharge_package(
    State(state): State<AdminMarketingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(package_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let package_id = match normalize_path_id(&package_id, "package id") {
        Ok(package_id) => package_id,
        Err(message) => return bad_request(message),
    };
    let command =
        match build_delete_recharge_package_command(state.clone(), &headers, subject, package_id) {
            Ok(command) => command,
            Err(error) => return command_error_response(error, "marketing command is invalid"),
        };

    match state.store.delete_recharge_package(command).await {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("recharge package was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            system_error_response("recharge package command store is unavailable", error)
        }
    }
}

async fn fetch_recharge_settings(
    State(state): State<AdminMarketingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    match state.store.load_recharge_settings(subject).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) => {
            system_error_response("recharge settings read model is unavailable", error)
        }
    }
}

async fn update_recharge_settings(
    State(state): State<AdminMarketingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<RechargeSettingsUpdateRequest>(&body, "recharge settings")
    {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_recharge_settings_command(state.clone(), subject, request) {
        Ok(command) => command,
        Err(error) => return command_error_response(error, "marketing command is invalid"),
    };
    match state.store.update_recharge_settings(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            system_error_response("recharge settings command store is unavailable", error)
        }
    }
}

async fn fetch_referral_stats(
    State(state): State<AdminMarketingState>,
    Query(params): Query<AdminMarketingListQueryRequest>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    let parsed = match parse_marketing_list_query(params) {
        Ok(parsed) => parsed,
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .list_referral_stats(ListAdminReferralStatsQuery {
            subject,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => marketing_list_response(page),
        Err(error) => system_error_response("referral read model is unavailable", error),
    }
}

async fn fetch_exchange_rules(
    State(state): State<AdminMarketingState>,
    Query(params): Query<ExchangeRuleListQueryRequest>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    let source_asset_type = match normalize_optional_asset_type(params.source_asset_type.as_deref())
    {
        Ok(value) => value,
        Err(error) => return command_error_response(error, "marketing command is invalid"),
    };
    let target_asset_type = match normalize_optional_asset_type(params.target_asset_type.as_deref())
    {
        Ok(value) => value,
        Err(error) => return command_error_response(error, "marketing command is invalid"),
    };
    let status = match normalize_optional_exchange_rule_status(params.status.as_deref()) {
        Ok(value) => value,
        Err(error) => return command_error_response(error, "marketing command is invalid"),
    };
    let parsed = match parse_marketing_list_query(AdminMarketingListQueryRequest {
        page: params.page,
        page_size: params.page_size,
    }) {
        Ok(parsed) => parsed,
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .list_exchange_rules(ListAdminExchangeRulesQuery {
            subject,
            source_asset_type,
            target_asset_type,
            status,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => marketing_list_response(page),
        Err(error) => system_error_response("exchange rule read model is unavailable", error),
    }
}

async fn update_exchange_rule(
    State(state): State<AdminMarketingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<ExchangeRuleMutationRequest>(&body, "exchange rule") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command =
        match build_update_exchange_rule_command(state.clone(), &headers, subject, request) {
            Ok(command) => command,
            Err(error) => return command_error_response(error, "marketing command is invalid"),
        };

    match state.store.update_exchange_rule(command).await {
        Ok(item) => Json(success_envelope(AdminMarketingItemEnvelope { item })).into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            system_error_response("exchange rule command store is unavailable", error)
        }
    }
}

async fn fetch_payment_attempts(
    State(state): State<AdminMarketingState>,
    Query(params): Query<AdminMarketingListQueryRequest>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    let parsed = match parse_marketing_list_query(params) {
        Ok(parsed) => parsed,
        Err(error) => return error.into_response(),
    };
    match state
        .store
        .list_payment_attempts(ListAdminPaymentAttemptsQuery {
            subject,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => marketing_list_response(page),
        Err(error) => system_error_response("payment attempt read model is unavailable", error),
    }
}

fn parse_marketing_list_query(
    params: AdminMarketingListQueryRequest,
) -> Result<ParsedOffsetListQuery, crate::api::response::ApiResponseError> {
    parse_offset_list_query(params.page, params.page_size)
        .map_err(|message| bad_request(message).into())
}

fn marketing_list_response<T>(page: AdminMarketingListPage<T>) -> Response
where
    T: Serialize,
{
    json_success_list_response(
        None,
        page.items,
        offset_page_info(page.page_no, page.page_size, page.total),
    )
}

fn build_create_recharge_package_command(
    state: AdminMarketingState,
    _headers: &HeaderMap,
    subject: AdminMarketingSubject,
    request: RechargePackageMutationRequest,
) -> Result<CreateAdminRechargePackageCommand, ApiCommandError> {
    let mutation = normalize_recharge_package_mutation(request)?;
    Ok(CreateAdminRechargePackageCommand {
        subject,
        audit_log_uuid: generate_entity_uuid(&state)?,
        price_amount: mutation.price_amount,
        currency_code: mutation.currency_code,
        bonus_points: mutation.bonus_points,
        discount: mutation.discount,
        status: mutation.status,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_update_recharge_package_command(
    state: AdminMarketingState,
    _headers: &HeaderMap,
    subject: AdminMarketingSubject,
    package_id: String,
    request: RechargePackageMutationRequest,
) -> Result<UpdateAdminRechargePackageCommand, ApiCommandError> {
    let mutation = normalize_recharge_package_mutation(request)?;
    Ok(UpdateAdminRechargePackageCommand {
        subject,
        package_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        price_amount: mutation.price_amount,
        currency_code: mutation.currency_code,
        bonus_points: mutation.bonus_points,
        discount: mutation.discount,
        status: mutation.status,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_delete_recharge_package_command(
    state: AdminMarketingState,
    _headers: &HeaderMap,
    subject: AdminMarketingSubject,
    package_id: String,
) -> Result<DeleteAdminRechargePackageCommand, ApiCommandError> {
    Ok(DeleteAdminRechargePackageCommand {
        subject,
        package_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_update_exchange_rule_command(
    state: AdminMarketingState,
    _headers: &HeaderMap,
    subject: AdminMarketingSubject,
    request: ExchangeRuleMutationRequest,
) -> Result<UpdateAdminExchangeRuleCommand, ApiCommandError> {
    let mutation = normalize_exchange_rule_mutation(request)?;
    let remark = format!(
        "{} to {} exchange rate",
        mutation.source_asset_type, mutation.target_asset_type
    );
    Ok(UpdateAdminExchangeRuleCommand {
        subject,
        audit_log_uuid: generate_entity_uuid(&state)?,
        source_asset_type: mutation.source_asset_type,
        target_asset_type: mutation.target_asset_type,
        rate: mutation.rate,
        remark,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_update_recharge_settings_command(
    state: AdminMarketingState,
    subject: AdminMarketingSubject,
    request: RechargeSettingsUpdateRequest,
) -> Result<RechargeSettingsUpdateCommand, ApiCommandError> {
    let mutation = normalize_recharge_settings_mutation(request)?;
    Ok(RechargeSettingsUpdateCommand {
        subject,
        audit_log_uuid: generate_entity_uuid(&state)?,
        base_currency_code: mutation.base_currency_code,
        base_points_per_cny: mutation.base_points_per_cny,
        currency_to_cny_rates: mutation.currency_to_cny_rates,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn normalize_recharge_package_mutation(
    request: RechargePackageMutationRequest,
) -> Result<NormalizedRechargePackageMutation, ApiCommandError> {
    Ok(NormalizedRechargePackageMutation {
        price_amount: normalize_recharge_package_price_amount(request.price_amount.as_ref())?,
        currency_code: normalize_currency_code(
            request.currency_code.as_deref(),
            "recharge package currencyCode",
        )?,
        bonus_points: normalize_recharge_package_bonus_points(request.bonus_points.as_ref())?,
        discount: normalize_recharge_package_discount(request.discount.as_ref())?,
        status: normalize_recharge_package_status(request.status.as_deref())?,
    })
}

fn normalize_recharge_package_price_amount(
    value: Option<&Value>,
) -> Result<String, ApiCommandError> {
    let raw = match value {
        Some(Value::String(value)) => value.trim().to_owned(),
        Some(Value::Number(value)) => value.to_string(),
        Some(_) => {
            return Err(ApiCommandError::BadRequest(
                "recharge package priceAmount must be a number or string".to_owned(),
            ));
        }
        None => {
            return Err(ApiCommandError::BadRequest(
                "recharge package priceAmount is required".to_owned(),
            ));
        }
    };
    let cents = decimal_money_to_cents_with_field(&raw, "recharge package priceAmount")?;
    Ok(cents_to_plain_money_string(cents))
}

fn normalize_recharge_package_bonus_points(
    value: Option<&Value>,
) -> Result<i64, ApiCommandError> {
    let bonus = match value {
        Some(Value::Number(value)) => value.as_i64(),
        Some(Value::String(value)) => value.trim().parse::<i64>().ok(),
        Some(_) => None,
        None => {
            return Err(ApiCommandError::BadRequest(
                "recharge package bonusPoints is required".to_owned(),
            ));
        }
    }
    .ok_or_else(|| {
        ApiCommandError::BadRequest(
            "recharge package bonusPoints must be a non-negative integer".to_owned(),
        )
    })?;
    if bonus < 0 {
        return Err(ApiCommandError::BadRequest(
            "recharge package bonusPoints must be a non-negative integer".to_owned(),
        ));
    }
    Ok(bonus)
}

fn normalize_recharge_package_discount(
    value: Option<&Value>,
) -> Result<i64, ApiCommandError> {
    let discount = match value {
        Some(Value::Number(value)) => value.as_i64(),
        Some(Value::String(value)) => value.trim().parse::<i64>().ok(),
        Some(_) => None,
        None => {
            return Err(ApiCommandError::BadRequest(
                "recharge package discount is required".to_owned(),
            ));
        }
    }
    .ok_or_else(|| {
        ApiCommandError::BadRequest(
            "recharge package discount must be an integer between 1 and 100".to_owned(),
        )
    })?;
    if !(1..=100).contains(&discount) {
        return Err(ApiCommandError::BadRequest(
            "recharge package discount must be an integer between 1 and 100".to_owned(),
        ));
    }
    Ok(discount)
}

fn normalize_recharge_settings_mutation(
    request: RechargeSettingsUpdateRequest,
) -> Result<NormalizedRechargeSettingsMutation, ApiCommandError> {
    let base_currency_code = normalize_currency_code(
        request.base_currency_code.as_deref(),
        "recharge settings baseCurrencyCode",
    )?;
    let base_points_per_cny = normalize_decimal_value(
        request.base_points_per_cny.as_ref(),
        "recharge settings basePointsPerCny",
    )?;
    let currency_to_cny_rates = normalize_currency_rates(
        request.currency_to_cny_rates,
        "recharge settings currencyToCnyRates",
        &base_currency_code,
    )?;
    Ok(NormalizedRechargeSettingsMutation {
        base_currency_code,
        base_points_per_cny,
        currency_to_cny_rates,
    })
}

fn normalize_decimal_value(
    value: Option<&Value>,
    field_name: &str,
) -> Result<String, ApiCommandError> {
    let raw = match value {
        Some(Value::String(value)) => value.trim().to_owned(),
        Some(Value::Number(value)) => value.to_string(),
        Some(_) => {
            return Err(ApiCommandError::BadRequest(format!(
                "{field_name} must be a number or string"
            )));
        }
        None => {
            return Err(ApiCommandError::BadRequest(format!(
                "{field_name} is required"
            )));
        }
    };
    normalize_decimal_string(&raw, field_name)
}

fn normalize_decimal_string(
    value: &str,
    field_name: &str,
) -> Result<String, ApiCommandError> {
    let value = value.trim().replace(',', "");
    if value.is_empty() || value.starts_with('-') || value.starts_with('+') {
        return Err(ApiCommandError::BadRequest(format!(
            "{field_name} must be a positive decimal"
        )));
    }
    let mut parts = value.split('.');
    let whole = parts.next().unwrap_or_default();
    let fraction = parts.next().unwrap_or_default();
    if whole.is_empty()
        || !whole.chars().all(|ch| ch.is_ascii_digit())
        || parts.next().is_some()
        || fraction.len() > 6
        || !fraction.chars().all(|ch| ch.is_ascii_digit())
    {
        return Err(ApiCommandError::BadRequest(format!(
            "{field_name} must be a valid decimal"
        )));
    }
    let whole = whole.trim_start_matches('0');
    let whole = if whole.is_empty() { "0" } else { whole };
    let fraction = fraction.trim_end_matches('0');
    if whole == "0" && fraction.is_empty() {
        return Err(ApiCommandError::BadRequest(format!(
            "{field_name} must be greater than zero"
        )));
    }
    if fraction.is_empty() {
        Ok(whole.to_owned())
    } else {
        Ok(format!("{whole}.{fraction}"))
    }
}

fn normalize_currency_code(
    value: Option<&str>,
    field_name: &str,
) -> Result<String, ApiCommandError> {
    let value = value.unwrap_or("").trim().to_ascii_uppercase();
    if value.len() != 3 || !value.chars().all(|ch| ch.is_ascii_uppercase()) {
        return Err(ApiCommandError::BadRequest(format!(
            "{field_name} must match ^[A-Z]{{3}}$"
        )));
    }
    Ok(value)
}

fn normalize_currency_rates(
    value: Option<BTreeMap<String, Value>>,
    field_name: &str,
    base_currency_code: &str,
) -> Result<BTreeMap<String, String>, ApiCommandError> {
    let Some(value) = value else {
        return Err(ApiCommandError::BadRequest(format!(
            "{field_name} is required"
        )));
    };
    if value.is_empty() {
        return Err(ApiCommandError::BadRequest(format!(
            "{field_name} must not be empty"
        )));
    }
    let mut normalized = BTreeMap::new();
    for (currency_code, rate_value) in value {
        let currency_code = normalize_currency_code(Some(&currency_code), field_name)?;
        let rate = normalize_decimal_value(Some(&rate_value), field_name)?;
        normalized.insert(currency_code, rate);
    }
    normalized
        .entry(base_currency_code.to_owned())
        .or_insert_with(|| "1".to_owned());
    Ok(normalized)
}

fn normalize_recharge_package_status(
    value: Option<&str>,
) -> Result<AdminRechargePackageStatus, ApiCommandError> {
    let Some(status) = normalize_optional_recharge_package_status(value)? else {
        return Ok(AdminRechargePackageStatus::Active);
    };
    Ok(status)
}

fn normalize_optional_recharge_package_status(
    value: Option<&str>,
) -> Result<Option<AdminRechargePackageStatus>, ApiCommandError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    match value.to_ascii_lowercase().as_str() {
        "active" | "enabled" | "normal" => Ok(AdminRechargePackageStatus::Active),
        "inactive" | "disabled" => Ok(AdminRechargePackageStatus::Inactive),
        _ => Err(ApiCommandError::BadRequest(
            "recharge package status must be active or inactive".to_owned(),
        )),
    }
    .map(Some)
}

fn decimal_money_to_cents_with_field(
    value: &str,
    field_name: &str,
) -> Result<i64, ApiCommandError> {
    let value = value.trim().trim_start_matches('$').replace(',', "");
    if value.is_empty() || value.starts_with('-') {
        return Err(ApiCommandError::BadRequest(format!(
            "{field_name} must be greater than zero"
        )));
    }
    let parts: Vec<&str> = value.split('.').collect();
    if parts.len() > 2 || parts[0].is_empty() || !parts[0].chars().all(|ch| ch.is_ascii_digit()) {
        return Err(ApiCommandError::BadRequest(format!(
            "{field_name} must be a valid money amount"
        )));
    }
    let dollars = parts[0].parse::<i64>().map_err(|_| {
        ApiCommandError::BadRequest(format!("{field_name} is too large"))
    })?;
    let cents = if parts.len() == 2 {
        if parts[1].len() > 2 || !parts[1].chars().all(|ch| ch.is_ascii_digit()) {
            return Err(ApiCommandError::BadRequest(format!(
                "{field_name} must have at most 2 decimal places"
            )));
        }
        let mut cents = parts[1].to_owned();
        while cents.len() < 2 {
            cents.push('0');
        }
        cents.parse::<i64>().unwrap_or(0)
    } else {
        0
    };
    let total = dollars
        .checked_mul(100)
        .and_then(|value| value.checked_add(cents))
        .ok_or_else(|| {
            ApiCommandError::BadRequest(format!("{field_name} is too large"))
        })?;
    if total <= 0 {
        return Err(ApiCommandError::BadRequest(format!(
            "{field_name} must be greater than zero"
        )));
    }
    Ok(total)
}

fn cents_to_plain_money_string(cents: i64) -> String {
    format!("{}.{:02}", cents / 100, cents.rem_euclid(100))
}

fn normalize_exchange_rule_mutation(
    request: ExchangeRuleMutationRequest,
) -> Result<NormalizedExchangeRuleMutation, ApiCommandError> {
    let source_asset_type =
        normalize_required_asset_type(request.source_asset_type.as_deref(), "sourceAssetType")?;
    let target_asset_type =
        normalize_required_asset_type(request.target_asset_type.as_deref(), "targetAssetType")?;
    ensure_supported_exchange_pair(&source_asset_type, &target_asset_type)?;
    normalize_exchange_rule_status(request.status.as_deref())?;
    let rate = normalize_exchange_rate_value(request.rate.as_ref())?;
    Ok(NormalizedExchangeRuleMutation {
        source_asset_type,
        target_asset_type,
        rate,
    })
}

fn normalize_required_asset_type(
    value: Option<&str>,
    field_name: &str,
) -> Result<String, ApiCommandError> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() {
        return Err(ApiCommandError::BadRequest(format!(
            "{field_name} is required"
        )));
    }
    normalize_asset_type(value, field_name)
}

fn normalize_optional_asset_type(
    value: Option<&str>,
) -> Result<Option<String>, ApiCommandError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    normalize_asset_type(value, "asset type").map(Some)
}

fn normalize_asset_type(
    value: &str,
    field_name: &str,
) -> Result<String, ApiCommandError> {
    let normalized = value.trim().to_ascii_uppercase();
    if normalized.chars().count() > MAX_ASSET_TYPE_LEN {
        return Err(ApiCommandError::BadRequest(format!(
            "{field_name} must be at most {MAX_ASSET_TYPE_LEN} characters"
        )));
    }
    if !normalized
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err(ApiCommandError::BadRequest(format!(
            "{field_name} may only contain letters, numbers, -, and _"
        )));
    }
    Ok(normalized)
}

fn ensure_supported_exchange_pair(
    source_asset_type: &str,
    target_asset_type: &str,
) -> Result<(), ApiCommandError> {
    if source_asset_type == POINTS_ASSET_TYPE && target_asset_type == CASH_ASSET_TYPE {
        return Ok(());
    }
    Err(ApiCommandError::BadRequest(
        "exchange rule currently supports POINTS to CASH only".to_owned(),
    ))
}

fn normalize_exchange_rule_status(
    value: Option<&str>,
) -> Result<String, ApiCommandError> {
    let status = value.unwrap_or("active").trim().to_ascii_lowercase();
    if status == "active" || status == "enabled" || status == "normal" {
        return Ok("active".to_owned());
    }
    if status == "inactive" || status == "disabled" {
        return Err(ApiCommandError::BadRequest(
            "exchange rule status only supports active".to_owned(),
        ));
    }
    Err(ApiCommandError::BadRequest(
        "exchange rule status must be active".to_owned(),
    ))
}

fn normalize_optional_exchange_rule_status(
    value: Option<&str>,
) -> Result<Option<String>, ApiCommandError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    normalize_exchange_rule_status(Some(value)).map(Some)
}

fn normalize_exchange_rate_value(
    value: Option<&Value>,
) -> Result<String, ApiCommandError> {
    let raw = match value {
        Some(Value::String(value)) => value.trim().to_owned(),
        Some(Value::Number(value)) => value.to_string(),
        Some(_) => {
            return Err(ApiCommandError::BadRequest(
                "exchange rule rate must be a number or string".to_owned(),
            ));
        }
        None => {
            return Err(ApiCommandError::BadRequest(
                "exchange rule rate is required".to_owned(),
            ));
        }
    };
    normalize_exchange_rate_text(&raw)
}

fn normalize_exchange_rate_text(value: &str) -> Result<String, ApiCommandError> {
    let normalized = value.trim().replace(',', "");
    if normalized.is_empty() || normalized.starts_with('-') || normalized.starts_with('+') {
        return Err(ApiCommandError::BadRequest(
            "exchange rule rate must be between 1 and 1000000".to_owned(),
        ));
    }
    let parts: Vec<&str> = normalized.split('.').collect();
    if parts.len() > 2 || parts[0].is_empty() || !parts[0].chars().all(|ch| ch.is_ascii_digit()) {
        return Err(ApiCommandError::BadRequest(
            "exchange rule rate must be a valid decimal".to_owned(),
        ));
    }
    let whole = parts[0].parse::<i64>().map_err(|_| {
        ApiCommandError::BadRequest("exchange rule rate is too large".to_owned())
    })?;
    if !(1..=1_000_000).contains(&whole) {
        return Err(ApiCommandError::BadRequest(
            "exchange rule rate must be between 1 and 1000000".to_owned(),
        ));
    }
    let fraction = parts.get(1).copied().unwrap_or("");
    if fraction.len() > 6 || !fraction.chars().all(|ch| ch.is_ascii_digit()) {
        return Err(ApiCommandError::BadRequest(
            "exchange rule rate must have at most 6 decimal places".to_owned(),
        ));
    }
    if whole == 1_000_000 && fraction.chars().any(|ch| ch != '0') {
        return Err(ApiCommandError::BadRequest(
            "exchange rule rate must be between 1 and 1000000".to_owned(),
        ));
    }
    let fraction = fraction.trim_end_matches('0');
    if fraction.is_empty() {
        Ok(whole.to_string())
    } else {
        Ok(format!("{whole}.{fraction}"))
    }
}

fn normalize_path_id(value: &str, field_name: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(format!("{field_name} is required"));
    }
    if value.chars().count() > 128 {
        return Err(format!("{field_name} must be at most 128 characters"));
    }
    Ok(value.to_owned())
}

fn normalize_order_no(value: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Err("order no is required".to_owned());
    }
    if value.chars().count() > MAX_ORDER_NO_LEN {
        return Err(format!(
            "order no must be at most {MAX_ORDER_NO_LEN} characters"
        ));
    }
    if !value.bytes().all(|byte| (0x21..=0x7e).contains(&byte)) {
        return Err("order no must contain visible ASCII only".to_owned());
    }
    Ok(value.to_owned())
}

fn generate_entity_uuid(
    state: &AdminMarketingState,
) -> Result<String, ApiCommandError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(ApiCommandError::System)
}

fn not_found_response(message: &'static str) -> Response {
    problem_from_wire_code("4040", message).into_response()
}

