use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use std::collections::BTreeMap;

use axum::routing::{get, patch};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{
    json_created_response, json_success_list_response, no_content_response, offset_page_info,
    parse_offset_list_query, problem_from_wire_code, success_envelope, ParsedOffsetListQuery,
};
use crate::application::EntityUuidGenerator;
use crate::domain::DomainError;
use crate::ports::{
    AdminMarketingListPage, AdminMarketingStore, AdminMarketingSubject, AdminRechargePackageStatus,
    CreateAdminRechargePackageCommand, CreatePromotionOfferCommand,
    DeleteAdminRechargePackageCommand, DeletePromotionOfferCommand,
    GeneratePromotionCouponStockCommand, ListAdminExchangeRulesQuery,
    ListAdminPaymentAttemptsQuery, ListAdminRechargePackagesQuery, ListAdminRechargeRecordsQuery,
    ListAdminReferralStatsQuery, ListPromotionCodeRedemptionsQuery, ListPromotionCodesQuery,
    ListPromotionCouponStocksQuery, ListPromotionOffersQuery, LoadAdminRechargeRecordQuery,
    PromotionCodeItem, PromotionCodeRedemptionItem, PromotionCouponStockItem, PromotionOfferItem,
    RechargeSettingsUpdateCommand, UpdateAdminExchangeRuleCommand,
    UpdateAdminRechargePackageCommand, UpdatePromotionCodeStatusCommand,
    UpdatePromotionOfferCommand,
};

const MAX_NAME_LEN: usize = 128;
const MAX_ORDER_NO_LEN: usize = 128;
const MAX_PREFIX_LEN: usize = 32;
const MAX_ASSET_TYPE_LEN: usize = 32;
const MAX_COUPON_STOCK_QUANTITY: i64 = 10_000;
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminMarketingUpdateResponse {
    updated: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
struct PromotionCouponStockGenerateResponse {
    item: PromotionCouponStockListItem,
    codes: Vec<PromotionCodeListItem>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
struct PromotionOfferListItem {
    id: String,
    offer_no: String,
    offer_code: String,
    name: String,
    offer_type: String,
    audience_scope: String,
    combinability: String,
    status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
struct PromotionCouponStockListItem {
    id: String,
    stock_no: String,
    name: String,
    offer_id: String,
    code_mode: String,
    issue_channel: String,
    currency_code: String,
    total_quantity: i64,
    available_quantity: i64,
    claimed_quantity: i64,
    redeemed_quantity: i64,
    activation_status: String,
    can_resend: bool,
    status: String,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
struct PromotionCodeListItem {
    id: String,
    code_no: String,
    stock_id: String,
    promotion_code_last4: String,
    code_type: String,
    currency_code: String,
    claimed_quantity: i64,
    activation_status: String,
    can_resend: bool,
    status: String,
    owner_user_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
struct PromotionCodeRedemptionListItem {
    id: String,
    redemption_no: String,
    submitted_code_suffix: String,
    stock_id: String,
    owner_user_id: String,
    currency_code: String,
    result_status: String,
    failure_code: Option<String>,
    redemption_channel: String,
    occurred_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
struct CreatePromotionOfferRequest {
    name: Option<String>,
    discount_type: Option<String>,
    value: Option<Value>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
struct GeneratePromotionCouponStockRequest {
    offer_id: Option<Value>,
    name: Option<String>,
    total_quantity: Option<i64>,
    code_prefix: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdatePromotionCodeStatusRequest {
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminMarketingListQueryRequest {
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
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
struct NormalizedDiscountValue {
    value: String,
    amount_cents: i64,
    discount_value: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedRechargePackageMutation {
    price_amount: String,
    currency_code: String,
    bonus_points: i64,
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

enum AdminMarketingCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

pub fn admin_marketing_router_with_store(
    store: Arc<dyn AdminMarketingStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/promotions/offers",
            get(fetch_promotion_offers).post(create_promotion_offer),
        )
        .route(
            "/backend/v3/api/promotions/offers/{offer_id}",
            patch(update_promotion_offer).delete(delete_promotion_offer),
        )
        .route(
            "/backend/v3/api/promotions/coupon_stocks",
            get(fetch_promotion_coupon_stocks).post(generate_promotion_coupon_stock),
        )
        .route(
            "/backend/v3/api/promotions/codes",
            get(fetch_promotion_codes),
        )
        .route(
            "/backend/v3/api/promotions/codes/{code_id}/status",
            patch(update_promotion_code_status),
        )
        .route(
            "/backend/v3/api/promotions/codes/redemptions",
            get(fetch_promotion_code_redemptions),
        )
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
            "/backend/v3/api/router/referrals/stats",
            get(fetch_referral_stats),
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

async fn fetch_promotion_offers(
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
        .list_promotion_offers(ListPromotionOffersQuery {
            subject,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => marketing_list_response_mapped(page, promotion_offer_item),
        Err(error) => marketing_system_response("promotion offer read model is unavailable", error),
    }
}

async fn fetch_promotion_coupon_stocks(
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
        .list_promotion_coupon_stocks(ListPromotionCouponStocksQuery {
            subject,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => marketing_list_response_mapped(page, promotion_coupon_stock_item),
        Err(error) => {
            marketing_system_response("promotion coupon stock read model is unavailable", error)
        }
    }
}

async fn fetch_promotion_codes(
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
        .list_promotion_codes(ListPromotionCodesQuery {
            subject,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => marketing_list_response_mapped(page, promotion_code_item),
        Err(error) => marketing_system_response("promotion code read model is unavailable", error),
    }
}

async fn fetch_promotion_code_redemptions(
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
        .list_promotion_code_redemptions(ListPromotionCodeRedemptionsQuery {
            subject,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => marketing_list_response_mapped(page, promotion_code_redemption_item),
        Err(error) => {
            marketing_system_response("promotion code redemption read model is unavailable", error)
        }
    }
}

async fn create_promotion_offer(
    State(state): State<AdminMarketingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<CreatePromotionOfferRequest>(&body, "promotion offer") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command =
        match build_create_promotion_offer_command(state.clone(), &headers, subject, request) {
            Ok(command) => command,
            Err(error) => return command_build_error_response(error),
        };

    match state.store.create_promotion_offer(command).await {
        Ok(item) => json_created_response(
            None,
            AdminMarketingItemEnvelope {
                item: promotion_offer_item(item),
            },
        ),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            marketing_system_response("promotion offer command store is unavailable", error)
        }
    }
}

async fn delete_promotion_offer(
    State(state): State<AdminMarketingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(offer_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let offer_id = match normalize_path_id(&offer_id, "promotion offer id") {
        Ok(offer_id) => offer_id,
        Err(message) => return bad_request(message),
    };
    let command =
        match build_delete_promotion_offer_command(state.clone(), &headers, subject, offer_id) {
            Ok(command) => command,
            Err(error) => return command_build_error_response(error),
        };

    match state.store.delete_promotion_offer(command).await {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("promotion offer was not found"),
        Err(error) if error.is_not_found() => not_found_response("promotion offer was not found"),
        Err(error) => {
            marketing_system_response("promotion offer command store is unavailable", error)
        }
    }
}

async fn update_promotion_offer(
    State(state): State<AdminMarketingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(offer_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let offer_id = match normalize_path_id(&offer_id, "promotion offer id") {
        Ok(offer_id) => offer_id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<CreatePromotionOfferRequest>(&body, "promotion offer") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_promotion_offer_command(
        state.clone(),
        &headers,
        subject,
        offer_id,
        request,
    ) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.update_promotion_offer(command).await {
        Ok(item) => Json(success_envelope(AdminMarketingItemEnvelope {
            item: promotion_offer_item(item),
        }))
        .into_response(),
        Err(error) if error.is_not_found() => not_found_response("promotion offer was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            marketing_system_response("promotion offer command store is unavailable", error)
        }
    }
}

async fn generate_promotion_coupon_stock(
    State(state): State<AdminMarketingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<GeneratePromotionCouponStockRequest>(
        &body,
        "promotion coupon stock",
    ) {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_generate_promotion_coupon_stock_command(
        state.clone(),
        &headers,
        subject,
        request,
    ) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.generate_promotion_coupon_stock(command).await {
        Ok((item, codes)) => Json(success_envelope(PromotionCouponStockGenerateResponse {
            item: promotion_coupon_stock_item(item),
            codes: codes.into_iter().map(promotion_code_item).collect(),
        }))
        .into_response(),
        Err(error) if error.is_not_found() => not_found_response("promotion offer was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            marketing_system_response("promotion coupon stock command store is unavailable", error)
        }
    }
}

async fn update_promotion_code_status(
    State(state): State<AdminMarketingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(code_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let code_id = match normalize_path_id(&code_id, "promotion code id") {
        Ok(code_id) => code_id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<UpdatePromotionCodeStatusRequest>(&body, "promotion code")
    {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let command = match build_update_promotion_code_status_command(
        state.clone(),
        &headers,
        subject,
        code_id,
        request,
    ) {
        Ok(command) => command,
        Err(error) => return command_build_error_response(error),
    };

    match state.store.update_promotion_code_status(command).await {
        Ok(true) => Json(success_envelope(AdminMarketingUpdateResponse {
            updated: true,
        }))
        .into_response(),
        Ok(false) => not_found_response("promotion code was not found"),
        Err(error) if error.is_not_found() => not_found_response("promotion code was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            marketing_system_response("promotion code command store is unavailable", error)
        }
    }
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
        Err(error) => marketing_system_response("recharge read model is unavailable", error),
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
        Err(error) => marketing_system_response("recharge read model is unavailable", error),
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
        Err(error) => return command_build_error_response(error),
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
            marketing_system_response("recharge package read model is unavailable", error)
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
            Err(error) => return command_build_error_response(error),
        };

    match state.store.create_recharge_package(command).await {
        Ok(item) => json_created_response(None, AdminMarketingItemEnvelope { item }),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            marketing_system_response("recharge package command store is unavailable", error)
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
        Err(error) => return command_build_error_response(error),
    };

    match state.store.update_recharge_package(command).await {
        Ok(item) => Json(success_envelope(AdminMarketingItemEnvelope { item })).into_response(),
        Err(error) if error.is_not_found() => not_found_response("recharge package was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            marketing_system_response("recharge package command store is unavailable", error)
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
            Err(error) => return command_build_error_response(error),
        };

    match state.store.delete_recharge_package(command).await {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("recharge package was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            marketing_system_response("recharge package command store is unavailable", error)
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
            marketing_system_response("recharge settings read model is unavailable", error)
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
        Err(error) => return command_build_error_response(error),
    };
    match state.store.update_recharge_settings(command).await {
        Ok(item) => Json(success_envelope(item)).into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            marketing_system_response("recharge settings command store is unavailable", error)
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
        Err(error) => marketing_system_response("referral read model is unavailable", error),
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
        Err(error) => return command_build_error_response(error),
    };
    let target_asset_type = match normalize_optional_asset_type(params.target_asset_type.as_deref())
    {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };
    let status = match normalize_optional_exchange_rule_status(params.status.as_deref()) {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
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
        Err(error) => marketing_system_response("exchange rule read model is unavailable", error),
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
            Err(error) => return command_build_error_response(error),
        };

    match state.store.update_exchange_rule(command).await {
        Ok(item) => Json(success_envelope(AdminMarketingItemEnvelope { item })).into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => {
            marketing_system_response("exchange rule command store is unavailable", error)
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
        Err(error) => marketing_system_response("payment attempt read model is unavailable", error),
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

fn marketing_list_response_mapped<T, U, F>(page: AdminMarketingListPage<T>, map: F) -> Response
where
    T: Serialize,
    U: Serialize,
    F: FnMut(T) -> U,
{
    json_success_list_response(
        None,
        page.items.into_iter().map(map).collect(),
        offset_page_info(page.page_no, page.page_size, page.total),
    )
}

fn promotion_offer_item(item: PromotionOfferItem) -> PromotionOfferListItem {
    PromotionOfferListItem {
        offer_no: format!("offer-{}", item.id),
        offer_code: item.id.clone(),
        offer_type: "coupon".to_owned(),
        audience_scope: "all".to_owned(),
        combinability: "exclusive".to_owned(),
        id: item.id,
        name: item.name,
        status: item.status,
    }
}

fn promotion_coupon_stock_item(item: PromotionCouponStockItem) -> PromotionCouponStockListItem {
    PromotionCouponStockListItem {
        stock_no: format!("stock-{}", item.id),
        offer_id: item.offer_id.clone(),
        code_mode: "preloaded".to_owned(),
        issue_channel: "admin".to_owned(),
        currency_code: "USD".to_owned(),
        total_quantity: item.total_quantity,
        available_quantity: item.total_quantity,
        claimed_quantity: 0,
        redeemed_quantity: 0,
        activation_status: "active".to_owned(),
        can_resend: true,
        status: "active".to_owned(),
        id: item.id,
        name: item.name,
        created_at: item.created_at,
    }
}

fn promotion_code_item(item: PromotionCodeItem) -> PromotionCodeListItem {
    PromotionCodeListItem {
        code_no: format!("code-{}", item.id),
        stock_id: item.stock_id,
        promotion_code_last4: safe_suffix(&item.promotion_code, 4),
        code_type: "single_use".to_owned(),
        currency_code: "USD".to_owned(),
        claimed_quantity: i64::from(item.used_by.is_some()),
        activation_status: promotion_code_activation_status(&item.status),
        can_resend: item.used_by.is_none(),
        status: item.status,
        owner_user_id: item.used_by,
        id: item.id,
    }
}

fn promotion_code_redemption_item(
    item: PromotionCodeRedemptionItem,
) -> PromotionCodeRedemptionListItem {
    PromotionCodeRedemptionListItem {
        redemption_no: format!("redemption-{}", item.id),
        submitted_code_suffix: safe_suffix(&item.submitted_code, 4),
        stock_id: String::new(),
        owner_user_id: item.owner_user_id,
        currency_code: "USD".to_owned(),
        result_status: "succeeded".to_owned(),
        failure_code: None,
        redemption_channel: "admin".to_owned(),
        occurred_at: item.occurred_at,
        id: item.id,
    }
}

fn promotion_code_activation_status(status: &str) -> String {
    match status {
        "voided" | "disabled" => "disabled",
        "used" | "redeemed" => "redeemed",
        _ => "active",
    }
    .to_owned()
}

fn safe_suffix(value: &str, max_chars: usize) -> String {
    let mut chars = value.chars().rev().take(max_chars).collect::<Vec<_>>();
    chars.reverse();
    chars.into_iter().collect()
}

fn parse_json_body<T>(body: &[u8], entity_name: &str) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
{
    if body.iter().all(u8::is_ascii_whitespace) {
        return Err(format!("{entity_name} request body is required"));
    }
    serde_json::from_slice(body)
        .map_err(|error| format!("invalid {entity_name} request body: {error}"))
}

fn build_create_promotion_offer_command(
    state: AdminMarketingState,
    _headers: &HeaderMap,
    subject: AdminMarketingSubject,
    request: CreatePromotionOfferRequest,
) -> Result<CreatePromotionOfferCommand, AdminMarketingCommandBuildError> {
    let name = normalize_required_text(
        request.name.as_deref(),
        "promotion offer name",
        MAX_NAME_LEN,
    )?;
    let discount_type = normalize_discount_type(request.discount_type.as_deref())?;
    let value = normalize_discount_value(request.value.as_ref(), &discount_type)?;
    let status = normalize_offer_status(request.status.as_deref())?;
    Ok(CreatePromotionOfferCommand {
        subject,
        offer_uuid: generate_entity_uuid(&state)?,
        audit_log_uuid: generate_entity_uuid(&state)?,
        name,
        discount_type,
        value: value.value,
        amount_cents: value.amount_cents,
        discount_value: value.discount_value,
        status,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_delete_promotion_offer_command(
    state: AdminMarketingState,
    _headers: &HeaderMap,
    subject: AdminMarketingSubject,
    offer_id: String,
) -> Result<DeletePromotionOfferCommand, AdminMarketingCommandBuildError> {
    Ok(DeletePromotionOfferCommand {
        subject,
        offer_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_update_promotion_offer_command(
    state: AdminMarketingState,
    _headers: &HeaderMap,
    subject: AdminMarketingSubject,
    offer_id: String,
    request: CreatePromotionOfferRequest,
) -> Result<UpdatePromotionOfferCommand, AdminMarketingCommandBuildError> {
    let name = normalize_required_text(
        request.name.as_deref(),
        "promotion offer name",
        MAX_NAME_LEN,
    )?;
    let discount_type = normalize_discount_type(request.discount_type.as_deref())?;
    let value = normalize_discount_value(request.value.as_ref(), &discount_type)?;
    let status = normalize_offer_status(request.status.as_deref())?;
    Ok(UpdatePromotionOfferCommand {
        subject,
        offer_id,
        audit_log_uuid: generate_entity_uuid(&state)?,
        name,
        discount_type,
        value: value.value,
        amount_cents: value.amount_cents,
        discount_value: value.discount_value,
        status,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_generate_promotion_coupon_stock_command(
    state: AdminMarketingState,
    _headers: &HeaderMap,
    subject: AdminMarketingSubject,
    request: GeneratePromotionCouponStockRequest,
) -> Result<GeneratePromotionCouponStockCommand, AdminMarketingCommandBuildError> {
    let offer_id = normalize_id_value(request.offer_id.as_ref(), "offer_id")?;
    let name = normalize_required_text(request.name.as_deref(), "coupon stock name", MAX_NAME_LEN)?;
    let total_quantity = normalize_stock_quantity(request.total_quantity)?;
    let code_prefix = normalize_code_prefix(request.code_prefix.as_deref())?;
    Ok(GeneratePromotionCouponStockCommand {
        subject,
        stock_uuid: generate_entity_uuid(&state)?,
        audit_log_uuid: generate_entity_uuid(&state)?,
        offer_id,
        name,
        total_quantity,
        code_prefix,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_update_promotion_code_status_command(
    state: AdminMarketingState,
    _headers: &HeaderMap,
    subject: AdminMarketingSubject,
    code_id: String,
    request: UpdatePromotionCodeStatusRequest,
) -> Result<UpdatePromotionCodeStatusCommand, AdminMarketingCommandBuildError> {
    Ok(UpdatePromotionCodeStatusCommand {
        subject,
        code_id,
        status: normalize_promotion_code_status(request.status.as_deref())?,
        audit_log_uuid: generate_entity_uuid(&state)?,
        request_id: generate_server_request_id().map_err(request_id_error)?,
        requested_at: current_timestamp_string(),
    })
}

fn build_create_recharge_package_command(
    state: AdminMarketingState,
    _headers: &HeaderMap,
    subject: AdminMarketingSubject,
    request: RechargePackageMutationRequest,
) -> Result<CreateAdminRechargePackageCommand, AdminMarketingCommandBuildError> {
    let mutation = normalize_recharge_package_mutation(request)?;
    Ok(CreateAdminRechargePackageCommand {
        subject,
        package_uuid: generate_entity_uuid(&state)?,
        product_uuid: generate_entity_uuid(&state)?,
        sku_uuid: generate_entity_uuid(&state)?,
        audit_log_uuid: generate_entity_uuid(&state)?,
        price_amount: mutation.price_amount,
        currency_code: mutation.currency_code,
        bonus_points: mutation.bonus_points,
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
) -> Result<UpdateAdminRechargePackageCommand, AdminMarketingCommandBuildError> {
    let mutation = normalize_recharge_package_mutation(request)?;
    Ok(UpdateAdminRechargePackageCommand {
        subject,
        package_id,
        product_uuid: generate_entity_uuid(&state)?,
        sku_uuid: generate_entity_uuid(&state)?,
        audit_log_uuid: generate_entity_uuid(&state)?,
        price_amount: mutation.price_amount,
        currency_code: mutation.currency_code,
        bonus_points: mutation.bonus_points,
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
) -> Result<DeleteAdminRechargePackageCommand, AdminMarketingCommandBuildError> {
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
) -> Result<UpdateAdminExchangeRuleCommand, AdminMarketingCommandBuildError> {
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
) -> Result<RechargeSettingsUpdateCommand, AdminMarketingCommandBuildError> {
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

fn normalize_required_text(
    value: Option<&str>,
    field_name: &str,
    max_len: usize,
) -> Result<String, AdminMarketingCommandBuildError> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "{field_name} is required"
        )));
    }
    if value.chars().count() > max_len {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "{field_name} must be at most {max_len} characters"
        )));
    }
    Ok(value.to_owned())
}

fn normalize_discount_type(value: Option<&str>) -> Result<String, AdminMarketingCommandBuildError> {
    match value
        .unwrap_or("amount")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "amount" | "fixed" | "cash" => Ok("amount".to_owned()),
        "discount" | "percent" | "percentage" => Ok("discount".to_owned()),
        _ => Err(AdminMarketingCommandBuildError::BadRequest(
            "discount_type must be amount or discount".to_owned(),
        )),
    }
}

fn normalize_offer_status(value: Option<&str>) -> Result<String, AdminMarketingCommandBuildError> {
    match value
        .unwrap_or("active")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "active" | "enabled" | "normal" => Ok("active".to_owned()),
        "inactive" | "disabled" => Ok("inactive".to_owned()),
        _ => Err(AdminMarketingCommandBuildError::BadRequest(
            "offer status must be active or inactive".to_owned(),
        )),
    }
}

fn normalize_discount_value(
    value: Option<&Value>,
    discount_type: &str,
) -> Result<NormalizedDiscountValue, AdminMarketingCommandBuildError> {
    let raw = match value {
        Some(Value::String(value)) => value.trim().to_owned(),
        Some(Value::Number(value)) => value.to_string(),
        Some(_) => {
            return Err(AdminMarketingCommandBuildError::BadRequest(
                "discount value must be a number or string".to_owned(),
            ));
        }
        None => {
            return Err(AdminMarketingCommandBuildError::BadRequest(
                "discount value is required".to_owned(),
            ));
        }
    };
    if discount_type == "discount" {
        let normalized = raw.trim().trim_end_matches('%').replace(',', "");
        let numeric = normalized.parse::<f64>().map_err(|_| {
            AdminMarketingCommandBuildError::BadRequest("discount value must be numeric".to_owned())
        })?;
        if !numeric.is_finite() || numeric <= 0.0 || numeric > 100.0 {
            return Err(AdminMarketingCommandBuildError::BadRequest(
                "discount value must be greater than 0 and at most 100".to_owned(),
            ));
        }
        return Ok(NormalizedDiscountValue {
            value: format!("{numeric:.2}%"),
            amount_cents: 0,
            discount_value: Some(format!("{numeric:.4}")),
        });
    }

    let amount_cents = decimal_money_to_cents(&raw)?;
    Ok(NormalizedDiscountValue {
        value: cents_to_money_string(amount_cents),
        amount_cents,
        discount_value: None,
    })
}

fn normalize_recharge_package_mutation(
    request: RechargePackageMutationRequest,
) -> Result<NormalizedRechargePackageMutation, AdminMarketingCommandBuildError> {
    Ok(NormalizedRechargePackageMutation {
        price_amount: normalize_recharge_package_price_amount(request.price_amount.as_ref())?,
        currency_code: normalize_currency_code(
            request.currency_code.as_deref(),
            "recharge package currencyCode",
        )?,
        bonus_points: normalize_recharge_package_bonus_points(request.bonus_points.as_ref())?,
        status: normalize_recharge_package_status(request.status.as_deref())?,
    })
}

fn normalize_recharge_package_price_amount(
    value: Option<&Value>,
) -> Result<String, AdminMarketingCommandBuildError> {
    let raw = match value {
        Some(Value::String(value)) => value.trim().to_owned(),
        Some(Value::Number(value)) => value.to_string(),
        Some(_) => {
            return Err(AdminMarketingCommandBuildError::BadRequest(
                "recharge package priceAmount must be a number or string".to_owned(),
            ));
        }
        None => {
            return Err(AdminMarketingCommandBuildError::BadRequest(
                "recharge package priceAmount is required".to_owned(),
            ));
        }
    };
    let cents = decimal_money_to_cents_with_field(&raw, "recharge package priceAmount")?;
    Ok(cents_to_plain_money_string(cents))
}

fn normalize_recharge_package_bonus_points(
    value: Option<&Value>,
) -> Result<i64, AdminMarketingCommandBuildError> {
    let bonus = match value {
        Some(Value::Number(value)) => value.as_i64(),
        Some(Value::String(value)) => value.trim().parse::<i64>().ok(),
        Some(_) => None,
        None => {
            return Err(AdminMarketingCommandBuildError::BadRequest(
                "recharge package bonusPoints is required".to_owned(),
            ));
        }
    }
    .ok_or_else(|| {
        AdminMarketingCommandBuildError::BadRequest(
            "recharge package bonusPoints must be a non-negative integer".to_owned(),
        )
    })?;
    if bonus < 0 {
        return Err(AdminMarketingCommandBuildError::BadRequest(
            "recharge package bonusPoints must be a non-negative integer".to_owned(),
        ));
    }
    Ok(bonus)
}

fn normalize_recharge_settings_mutation(
    request: RechargeSettingsUpdateRequest,
) -> Result<NormalizedRechargeSettingsMutation, AdminMarketingCommandBuildError> {
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
) -> Result<String, AdminMarketingCommandBuildError> {
    let raw = match value {
        Some(Value::String(value)) => value.trim().to_owned(),
        Some(Value::Number(value)) => value.to_string(),
        Some(_) => {
            return Err(AdminMarketingCommandBuildError::BadRequest(format!(
                "{field_name} must be a number or string"
            )));
        }
        None => {
            return Err(AdminMarketingCommandBuildError::BadRequest(format!(
                "{field_name} is required"
            )));
        }
    };
    normalize_decimal_string(&raw, field_name)
}

fn normalize_decimal_string(
    value: &str,
    field_name: &str,
) -> Result<String, AdminMarketingCommandBuildError> {
    let value = value.trim().replace(',', "");
    if value.is_empty() || value.starts_with('-') || value.starts_with('+') {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
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
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "{field_name} must be a valid decimal"
        )));
    }
    let whole = whole.trim_start_matches('0');
    let whole = if whole.is_empty() { "0" } else { whole };
    let fraction = fraction.trim_end_matches('0');
    if fraction.is_empty() {
        Ok(whole.to_owned())
    } else {
        Ok(format!("{whole}.{fraction}"))
    }
}

fn normalize_currency_code(
    value: Option<&str>,
    field_name: &str,
) -> Result<String, AdminMarketingCommandBuildError> {
    let value = value.unwrap_or("").trim().to_ascii_uppercase();
    if value.len() != 3 || !value.chars().all(|ch| ch.is_ascii_uppercase()) {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "{field_name} must match ^[A-Z]{{3}}$"
        )));
    }
    Ok(value)
}

fn normalize_currency_rates(
    value: Option<BTreeMap<String, Value>>,
    field_name: &str,
    base_currency_code: &str,
) -> Result<BTreeMap<String, String>, AdminMarketingCommandBuildError> {
    let Some(value) = value else {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "{field_name} is required"
        )));
    };
    if value.is_empty() {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
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
) -> Result<AdminRechargePackageStatus, AdminMarketingCommandBuildError> {
    let Some(status) = normalize_optional_recharge_package_status(value)? else {
        return Ok(AdminRechargePackageStatus::Active);
    };
    Ok(status)
}

fn normalize_optional_recharge_package_status(
    value: Option<&str>,
) -> Result<Option<AdminRechargePackageStatus>, AdminMarketingCommandBuildError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    match value.to_ascii_lowercase().as_str() {
        "active" | "enabled" | "normal" => Ok(AdminRechargePackageStatus::Active),
        "inactive" | "disabled" => Ok(AdminRechargePackageStatus::Inactive),
        _ => Err(AdminMarketingCommandBuildError::BadRequest(
            "recharge package status must be active or inactive".to_owned(),
        )),
    }
    .map(Some)
}

fn decimal_money_to_cents(value: &str) -> Result<i64, AdminMarketingCommandBuildError> {
    decimal_money_to_cents_with_field(value, "discount value")
}

fn decimal_money_to_cents_with_field(
    value: &str,
    field_name: &str,
) -> Result<i64, AdminMarketingCommandBuildError> {
    let value = value.trim().trim_start_matches('$').replace(',', "");
    if value.is_empty() || value.starts_with('-') {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "{field_name} must be greater than zero"
        )));
    }
    let parts: Vec<&str> = value.split('.').collect();
    if parts.len() > 2 || parts[0].is_empty() || !parts[0].chars().all(|ch| ch.is_ascii_digit()) {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "{field_name} must be a valid money amount"
        )));
    }
    let dollars = parts[0].parse::<i64>().map_err(|_| {
        AdminMarketingCommandBuildError::BadRequest(format!("{field_name} is too large"))
    })?;
    let cents = if parts.len() == 2 {
        if parts[1].len() > 2 || !parts[1].chars().all(|ch| ch.is_ascii_digit()) {
            return Err(AdminMarketingCommandBuildError::BadRequest(format!(
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
            AdminMarketingCommandBuildError::BadRequest(format!("{field_name} is too large"))
        })?;
    if total <= 0 {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "{field_name} must be greater than zero"
        )));
    }
    Ok(total)
}

fn cents_to_money_string(cents: i64) -> String {
    format!("${}.{:02}", cents / 100, cents.rem_euclid(100))
}

fn cents_to_plain_money_string(cents: i64) -> String {
    format!("{}.{:02}", cents / 100, cents.rem_euclid(100))
}

fn normalize_id_value(
    value: Option<&Value>,
    field_name: &str,
) -> Result<String, AdminMarketingCommandBuildError> {
    let id = match value {
        Some(Value::String(value)) => value.trim().to_owned(),
        Some(Value::Number(value)) => value.to_string(),
        _ => String::new(),
    };
    normalize_required_text(Some(&id), field_name, 128)
}

fn normalize_stock_quantity(value: Option<i64>) -> Result<i64, AdminMarketingCommandBuildError> {
    let total_quantity = value.unwrap_or(0);
    if !(1..=MAX_COUPON_STOCK_QUANTITY).contains(&total_quantity) {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "total_quantity must be between 1 and {MAX_COUPON_STOCK_QUANTITY}"
        )));
    }
    Ok(total_quantity)
}

fn normalize_code_prefix(value: Option<&str>) -> Result<String, AdminMarketingCommandBuildError> {
    let prefix = value.unwrap_or("").trim().to_ascii_uppercase();
    if prefix.is_empty() {
        return Err(AdminMarketingCommandBuildError::BadRequest(
            "code_prefix is required".to_owned(),
        ));
    }
    if prefix.len() > MAX_PREFIX_LEN {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "code_prefix must be at most {MAX_PREFIX_LEN} characters"
        )));
    }
    if !prefix
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err(AdminMarketingCommandBuildError::BadRequest(
            "code_prefix may only contain letters, numbers, -, and _".to_owned(),
        ));
    }
    Ok(prefix)
}

fn normalize_promotion_code_status(
    value: Option<&str>,
) -> Result<String, AdminMarketingCommandBuildError> {
    match value.unwrap_or("").trim().to_ascii_lowercase().as_str() {
        "available" | "claimed" | "used" | "voided" => {
            Ok(value.unwrap().trim().to_ascii_lowercase())
        }
        _ => Err(AdminMarketingCommandBuildError::BadRequest(
            "status must be available, claimed, used, or voided".to_owned(),
        )),
    }
}

fn normalize_exchange_rule_mutation(
    request: ExchangeRuleMutationRequest,
) -> Result<NormalizedExchangeRuleMutation, AdminMarketingCommandBuildError> {
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
) -> Result<String, AdminMarketingCommandBuildError> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "{field_name} is required"
        )));
    }
    normalize_asset_type(value, field_name)
}

fn normalize_optional_asset_type(
    value: Option<&str>,
) -> Result<Option<String>, AdminMarketingCommandBuildError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    normalize_asset_type(value, "asset type").map(Some)
}

fn normalize_asset_type(
    value: &str,
    field_name: &str,
) -> Result<String, AdminMarketingCommandBuildError> {
    let normalized = value.trim().to_ascii_uppercase();
    if normalized.chars().count() > MAX_ASSET_TYPE_LEN {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "{field_name} must be at most {MAX_ASSET_TYPE_LEN} characters"
        )));
    }
    if !normalized
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err(AdminMarketingCommandBuildError::BadRequest(format!(
            "{field_name} may only contain letters, numbers, -, and _"
        )));
    }
    Ok(normalized)
}

fn ensure_supported_exchange_pair(
    source_asset_type: &str,
    target_asset_type: &str,
) -> Result<(), AdminMarketingCommandBuildError> {
    if source_asset_type == POINTS_ASSET_TYPE && target_asset_type == CASH_ASSET_TYPE {
        return Ok(());
    }
    Err(AdminMarketingCommandBuildError::BadRequest(
        "exchange rule currently supports POINTS to CASH only".to_owned(),
    ))
}

fn normalize_exchange_rule_status(
    value: Option<&str>,
) -> Result<String, AdminMarketingCommandBuildError> {
    let status = value.unwrap_or("active").trim().to_ascii_lowercase();
    if status == "active" || status == "enabled" || status == "normal" {
        return Ok("active".to_owned());
    }
    if status == "inactive" || status == "disabled" {
        return Err(AdminMarketingCommandBuildError::BadRequest(
            "exchange rule status only supports active".to_owned(),
        ));
    }
    Err(AdminMarketingCommandBuildError::BadRequest(
        "exchange rule status must be active".to_owned(),
    ))
}

fn normalize_optional_exchange_rule_status(
    value: Option<&str>,
) -> Result<Option<String>, AdminMarketingCommandBuildError> {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(None);
    };
    normalize_exchange_rule_status(Some(value)).map(Some)
}

fn normalize_exchange_rate_value(
    value: Option<&Value>,
) -> Result<String, AdminMarketingCommandBuildError> {
    let raw = match value {
        Some(Value::String(value)) => value.trim().to_owned(),
        Some(Value::Number(value)) => value.to_string(),
        Some(_) => {
            return Err(AdminMarketingCommandBuildError::BadRequest(
                "exchange rule rate must be a number or string".to_owned(),
            ));
        }
        None => {
            return Err(AdminMarketingCommandBuildError::BadRequest(
                "exchange rule rate is required".to_owned(),
            ));
        }
    };
    normalize_exchange_rate_text(&raw)
}

fn normalize_exchange_rate_text(value: &str) -> Result<String, AdminMarketingCommandBuildError> {
    let normalized = value.trim().replace(',', "");
    if normalized.is_empty() || normalized.starts_with('-') || normalized.starts_with('+') {
        return Err(AdminMarketingCommandBuildError::BadRequest(
            "exchange rule rate must be between 1 and 1000000".to_owned(),
        ));
    }
    let parts: Vec<&str> = normalized.split('.').collect();
    if parts.len() > 2 || parts[0].is_empty() || !parts[0].chars().all(|ch| ch.is_ascii_digit()) {
        return Err(AdminMarketingCommandBuildError::BadRequest(
            "exchange rule rate must be a valid decimal".to_owned(),
        ));
    }
    let whole = parts[0].parse::<i64>().map_err(|_| {
        AdminMarketingCommandBuildError::BadRequest("exchange rule rate is too large".to_owned())
    })?;
    if !(1..=1_000_000).contains(&whole) {
        return Err(AdminMarketingCommandBuildError::BadRequest(
            "exchange rule rate must be between 1 and 1000000".to_owned(),
        ));
    }
    let fraction = parts.get(1).copied().unwrap_or("");
    if fraction.len() > 6 || !fraction.chars().all(|ch| ch.is_ascii_digit()) {
        return Err(AdminMarketingCommandBuildError::BadRequest(
            "exchange rule rate must have at most 6 decimal places".to_owned(),
        ));
    }
    if whole == 1_000_000 && fraction.chars().any(|ch| ch != '0') {
        return Err(AdminMarketingCommandBuildError::BadRequest(
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
) -> Result<String, AdminMarketingCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(AdminMarketingCommandBuildError::System)
}

fn request_id_error(error: RequestIdError) -> AdminMarketingCommandBuildError {
    match error {
        RequestIdError::Invalid(message) => AdminMarketingCommandBuildError::BadRequest(message),
        RequestIdError::System(message) => {
            AdminMarketingCommandBuildError::System(DomainError::new(message))
        }
    }
}

fn bad_request(message: impl Into<String>) -> Response {
    problem_from_wire_code("4001", message.into()).into_response()
}

fn not_found_response(message: &'static str) -> Response {
    problem_from_wire_code("4040", message).into_response()
}

fn conflict_response(error: DomainError) -> Response {
    problem_from_wire_code("4090", error.to_string()).into_response()
}

fn command_build_error_response(error: AdminMarketingCommandBuildError) -> Response {
    match error {
        AdminMarketingCommandBuildError::BadRequest(message) => bad_request(message),
        AdminMarketingCommandBuildError::System(error) => {
            marketing_system_response("marketing command is invalid", error)
        }
    }
}

fn marketing_system_response(context: &str, error: DomainError) -> Response {
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
