use std::collections::BTreeSet;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, patch, post};
use axum::{Json, Router};
use chrono::{DateTime, NaiveDate, NaiveTime, SecondsFormat};
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
    AdminPricingBasePriceSide, AdminPricingFormulaMode, AdminPricingListPage,
    AdminPricingRoundingMode, AdminPricingStatus, AdminPricingStore, AdminRateCardSubjectType,
    CreateAdminPriceBookCommand, CreateAdminPriceBookRateCommand, CreateAdminPricingPlanCommand,
    CreateAdminPricingRuleCommand, CreateAdminRateCardCommand, DeleteAdminDefaultRegionCommand,
    DeleteAdminPricingRuleCommand, DeleteAdminPriceBookRateCommand, DeleteAdminRateCardCommand,
    ListAdminDefaultRegionsQuery, ListAdminPricingPlansQuery, ListAdminPricingRulesQuery,
    ListAdminPriceBooksQuery, ListAdminRateCardsQuery, LoadAdminPriceBookQuery,
    LoadAdminPricingPlanQuery, PriceBookLifecycleCommand, ResolveAdminPriceSettingQuery,
    SaveAdminDefaultRegionCommand, SaveAdminPriceSettingCommand, UpdateAdminDefaultRegionCommand,
    UpdateAdminPricingPlanCommand, UpdateAdminPriceBookCommand, UpdateAdminPriceBookRateCommand,
    UpdateAdminPricingRuleCommand, UpdateAdminRateCardCommand,
};

const MAX_CODE_LEN: usize = 96;
const MAX_NAME_LEN: usize = 256;
const MAX_TEXT_LEN: usize = 160;
const MAX_DATETIME_LEN: usize = 64;
const MAX_SEARCH_LEN: usize = 128;
// DecimalValue carries twelve fractional digits. Pricing must preserve the
// full fixed-scale token rates instead of truncating tiny unit prices at six.
const MAX_DECIMAL_FRACTION_DIGITS: usize = 12;
const DEFAULT_RULE_MULTIPLIER: &str = "1";
const DEFAULT_RULE_MARKUP: &str = "0";

#[derive(Clone)]
struct AdminPricingState {
    store: Arc<dyn AdminPricingStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AdminPricingItemEnvelope<T> {
    item: T,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AdminPricingListQueryRequest {
    q: Option<String>,
    base_price_side: Option<String>,
    subject_type: Option<String>,
    pricing_plan_id: Option<String>,
    status: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PricingPlanMutationRequest {
    plan_code: Option<String>,
    plan_name: Option<String>,
    base_price_side: Option<String>,
    currency_code: Option<String>,
    rounding_mode: Option<String>,
    minimum_charge_amount: Option<Value>,
    effective_from: Option<String>,
    effective_to: Option<String>,
    status: Option<String>,
    charge_mode: Option<String>,
    settlement_mode: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RateCardMutationRequest {
    subject_type: Option<String>,
    subject_id: Option<String>,
    subject_code: Option<String>,
    pricing_plan_id: Option<String>,
    priority: Option<Value>,
    effective_from: Option<String>,
    effective_to: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PricingRuleMutationRequest {
    rule_code: Option<String>,
    pricing_plan_id: Option<String>,
    product_code: Option<String>,
    operation_code: Option<String>,
    meter_code: Option<String>,
    provider_code: Option<String>,
    region_code: Option<String>,
    catalog_key: Option<String>,
    formula_mode: Option<String>,
    multiplier: Option<Value>,
    markup_amount: Option<Value>,
    unit_price_override: Option<Value>,
    conditions: Option<Value>,
    schedule: Option<Value>,
    priority: Option<Value>,
    effective_from: Option<String>,
    effective_to: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PriceSettingMutationRequest {
    official_rate_code: Option<String>,
    pricing_plan_id: Option<String>,
    rule_id: Option<String>,
    formula_mode: Option<String>,
    multiplier: Option<Value>,
    markup_amount: Option<Value>,
    unit_price_override: Option<Value>,
    schedule: Option<Value>,
    priority: Option<Value>,
    effective_from: Option<String>,
    effective_to: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PriceSettingResolveQueryRequest {
    official_rate_code: Option<String>,
    region_code: Option<String>,
    pricing_plan_id: Option<String>,
    occurred_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PriceBookListQueryRequest {
    q: Option<String>,
    price_side: Option<String>,
    lifecycle_state: Option<String>,
    page: Option<i64>,
    page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PriceBookMutationRequest {
    namespace_code: Option<String>,
    price_book_code: Option<String>,
    price_book_version: Option<String>,
    price_side: Option<String>,
    vendor_code: Option<String>,
    region_code: Option<String>,
    currency_code: Option<String>,
    source_system: Option<String>,
    effective_from: Option<String>,
    effective_to: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PriceBookRateMutationRequest {
    rate_code: Option<String>,
    product_code: Option<String>,
    product_kind: Option<String>,
    product_display_name: Option<String>,
    operation_code: Option<String>,
    operation_kind: Option<String>,
    operation_display_name: Option<String>,
    meter_code: Option<String>,
    meter_display_name: Option<String>,
    quantity_kind: Option<String>,
    unit_code: Option<String>,
    provider_code: Option<String>,
    account_id: Option<String>,
    resource_type: Option<String>,
    resource_code: Option<String>,
    catalog_key: Option<String>,
    api_format: Option<String>,
    endpoint_code: Option<String>,
    billability: Option<String>,
    charge_timing: Option<String>,
    calculation_mode: Option<String>,
    quantity_aggregation: Option<String>,
    unit_size: Option<Value>,
    unit_price: Option<Value>,
    minimum_quantity: Option<Value>,
    quantity_step: Option<Value>,
    priority: Option<Value>,
    rate_variant: Option<String>,
    conditions: Option<Value>,
    tiers: Option<Value>,
    schedule: Option<Value>,
    effective_from: Option<String>,
    effective_to: Option<String>,
    source_url: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PriceBookRatePatchRequest {
    unit_size: Option<Value>,
    unit_price: Option<Value>,
    minimum_quantity: Option<Value>,
    quantity_step: Option<Value>,
    priority: Option<Value>,
    effective_from: Option<String>,
    effective_to: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DefaultRegionMutationRequest {
    catalog_key: Option<String>,
    vendor_code: Option<String>,
    provider_code: Option<String>,
    product_code: Option<String>,
    resource_code: Option<String>,
    default_region_code: Option<String>,
    currency_code: Option<String>,
    description: Option<String>,
    effective_from: Option<String>,
    effective_to: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedDefaultRegionMutation {
    catalog_key: String,
    vendor_code: String,
    provider_code: String,
    product_code: String,
    resource_code: String,
    default_region_code: String,
    currency_code: String,
    description: Option<String>,
    effective_from: Option<String>,
    effective_to: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedPricingPlanMutation {
    plan_code: Option<String>,
    plan_name: String,
    base_price_side: AdminPricingBasePriceSide,
    currency_code: String,
    rounding_mode: AdminPricingRoundingMode,
    minimum_charge_amount: String,
    effective_from: Option<String>,
    effective_to: Option<String>,
    status: AdminPricingStatus,
    charge_mode: Option<String>,
    settlement_mode: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedRateCardMutation {
    subject_type: AdminRateCardSubjectType,
    subject_id: Option<String>,
    subject_code: Option<String>,
    pricing_plan_id: String,
    priority: i64,
    effective_from: Option<String>,
    effective_to: Option<String>,
    status: AdminPricingStatus,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedPricingRuleMutation {
    rule_code: Option<String>,
    pricing_plan_id: String,
    product_code: Option<String>,
    operation_code: Option<String>,
    meter_code: Option<String>,
    provider_code: Option<String>,
    region_code: Option<String>,
    catalog_key: Option<String>,
    formula_mode: AdminPricingFormulaMode,
    multiplier: String,
    markup_amount: String,
    unit_price_override: Option<String>,
    conditions: Value,
    schedule: Option<Value>,
    priority: i64,
    effective_from: Option<String>,
    effective_to: Option<String>,
    status: AdminPricingStatus,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedPriceBookCreate {
    namespace_code: String,
    price_book_code: String,
    price_book_version: String,
    price_side: AdminPricingBasePriceSide,
    vendor_code: String,
    region_code: String,
    currency_code: String,
    source_system: String,
    effective_from: Option<String>,
    effective_to: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedPriceBookUpdate {
    currency_code: String,
    effective_from: Option<String>,
    effective_to: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedPriceBookRateCreate {
    rate_code: String,
    product_code: String,
    product_kind: String,
    product_display_name: String,
    operation_code: String,
    operation_kind: String,
    operation_display_name: String,
    meter_code: String,
    meter_display_name: String,
    quantity_kind: String,
    unit_code: String,
    provider_code: String,
    account_id: Option<i64>,
    resource_type: String,
    resource_code: String,
    catalog_key: Option<String>,
    api_format: Option<String>,
    endpoint_code: Option<String>,
    billability: String,
    charge_timing: String,
    calculation_mode: String,
    quantity_aggregation: String,
    unit_size: String,
    unit_price: String,
    minimum_quantity: String,
    quantity_step: Option<String>,
    priority: i64,
    rate_variant: String,
    conditions: Value,
    tiers: Value,
    schedule: Option<Value>,
    effective_from: Option<String>,
    effective_to: Option<String>,
    source_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct NormalizedPriceBookRatePatch {
    unit_size: String,
    unit_price: String,
    minimum_quantity: String,
    quantity_step: Option<String>,
    priority: i64,
    effective_from: Option<String>,
    effective_to: Option<String>,
}

enum AdminPricingCommandBuildError {
    BadRequest(String),
    System(DomainError),
}

impl From<String> for AdminPricingCommandBuildError {
    fn from(message: String) -> Self {
        Self::BadRequest(message)
    }
}

pub fn admin_pricing_router_with_store(
    store: Arc<dyn AdminPricingStore + Send + Sync>,
    entity_uuid_generator: Arc<dyn EntityUuidGenerator + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/pricing/plans",
            get(fetch_pricing_plans).post(create_pricing_plan),
        )
        .route(
            "/backend/v3/api/pricing/plans/{plan_id}",
            get(fetch_pricing_plan).patch(update_pricing_plan),
        )
        .route(
            "/backend/v3/api/pricing/rate_cards",
            get(fetch_rate_cards).post(create_rate_card),
        )
        .route(
            "/backend/v3/api/pricing/rate_cards/{rate_card_id}",
            patch(update_rate_card).delete(delete_rate_card),
        )
        .route(
            "/backend/v3/api/pricing/rules",
            get(fetch_pricing_rules).post(create_pricing_rule),
        )
        .route(
            "/backend/v3/api/pricing/rules/{rule_id}",
            patch(update_pricing_rule).delete(delete_pricing_rule),
        )
        .route(
            "/backend/v3/api/pricing/default_regions",
            get(fetch_default_regions).post(create_default_region),
        )
        .route(
            "/backend/v3/api/pricing/default_regions/{default_region_id}",
            patch(update_default_region).delete(delete_default_region),
        )
        .route(
            "/backend/v3/api/pricing/price_books",
            get(fetch_price_books).post(create_price_book),
        )
        .route(
            "/backend/v3/api/pricing/price_books/{price_book_id}",
            get(fetch_price_book).patch(update_price_book),
        )
        .route(
            "/backend/v3/api/pricing/price_books/{price_book_id}/activate",
            post(activate_price_book),
        )
        .route(
            "/backend/v3/api/pricing/price_books/{price_book_id}/deactivate",
            post(deactivate_price_book),
        )
        .route(
            "/backend/v3/api/pricing/price_books/{price_book_id}/rates",
            post(create_price_book_rate),
        )
        .route(
            "/backend/v3/api/pricing/price_books/{price_book_id}/rates/{rate_id}",
            patch(update_price_book_rate).delete(delete_price_book_rate),
        )
        .route(
            "/backend/v3/api/pricing/price_settings/upsert",
            post(upsert_price_setting),
        )
        .route(
            "/backend/v3/api/pricing/price_settings/resolve",
            get(resolve_price_setting),
        )
        .with_state(AdminPricingState {
            store,
            entity_uuid_generator,
        })
}

async fn fetch_pricing_plans(
    State(state): State<AdminPricingState>,
    Query(params): Query<AdminPricingListQueryRequest>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    let parsed = match parse_pricing_list_query(params.page, params.page_size) {
        Ok(parsed) => parsed,
        Err(error) => return error.into_response(),
    };
    let q = match normalize_pricing_search(params.q.as_deref()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let base_price_side =
        match normalize_optional_base_price_side(params.base_price_side.as_deref()) {
            Ok(value) => value,
            Err(message) => return bad_request(message),
        };
    let status = match normalize_optional_pricing_status(params.status.as_deref()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    match state
        .store
        .list_pricing_plans(ListAdminPricingPlansQuery {
            subject,
            q,
            base_price_side,
            status,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => pricing_list_response(page),
        Err(error) => pricing_system_response("pricing plan read model is unavailable", error),
    }
}

async fn create_pricing_plan(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<PricingPlanMutationRequest>(&body, "pricing plan") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_pricing_plan_mutation(request, true) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let plan_code = mutation.plan_code.unwrap_or_default();
    let command = CreateAdminPricingPlanCommand {
        subject,
        plan_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        plan_code,
        plan_name: mutation.plan_name,
        base_price_side: mutation.base_price_side,
        currency_code: mutation.currency_code,
        rounding_mode: mutation.rounding_mode,
        minimum_charge_amount: mutation.minimum_charge_amount,
        effective_from: mutation
            .effective_from
            .unwrap_or_else(current_timestamp_string),
        effective_to: mutation.effective_to,
        status: mutation.status,
        charge_mode: mutation
            .charge_mode
            .unwrap_or_else(|| "prepaid_adjustment".to_owned()),
        settlement_mode: mutation
            .settlement_mode
            .unwrap_or_else(|| "synchronous".to_owned()),
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.create_pricing_plan(command).await {
        Ok(item) => json_created_response(None, AdminPricingItemEnvelope { item }),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => pricing_system_response("pricing plan command store is unavailable", error),
    }
}

async fn fetch_pricing_plan(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(plan_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let plan_id = match normalize_pricing_path_id(&plan_id, "plan id") {
        Ok(plan_id) => plan_id,
        Err(message) => return bad_request(message),
    };
    match state
        .store
        .load_pricing_plan(LoadAdminPricingPlanQuery { subject, plan_id })
        .await
    {
        Ok(Some(item)) => Json(success_envelope(AdminPricingItemEnvelope { item })).into_response(),
        Ok(None) => not_found_response("pricing plan was not found"),
        Err(error) => pricing_system_response("pricing plan read model is unavailable", error),
    }
}

async fn update_pricing_plan(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(plan_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let plan_id = match normalize_pricing_path_id(&plan_id, "plan id") {
        Ok(plan_id) => plan_id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<PricingPlanMutationRequest>(&body, "pricing plan") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_pricing_plan_mutation(request, false) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let existing_modes = if mutation.charge_mode.is_none() || mutation.settlement_mode.is_none() {
        match state
            .store
            .load_pricing_plan(LoadAdminPricingPlanQuery {
                subject,
                plan_id: plan_id.clone(),
            })
            .await
        {
            Ok(Some(item)) => Some((item.charge_mode, item.settlement_mode)),
            Ok(None) => return not_found_response("pricing plan was not found"),
            Err(error) => {
                return pricing_system_response("pricing plan read model is unavailable", error)
            }
        }
    } else {
        None
    };
    let command = UpdateAdminPricingPlanCommand {
        subject,
        plan_id,
        plan_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        plan_name: mutation.plan_name,
        base_price_side: mutation.base_price_side,
        currency_code: mutation.currency_code,
        rounding_mode: mutation.rounding_mode,
        minimum_charge_amount: mutation.minimum_charge_amount,
        effective_from: mutation
            .effective_from
            .unwrap_or_else(current_timestamp_string),
        effective_to: mutation.effective_to,
        status: mutation.status,
        charge_mode: mutation.charge_mode.unwrap_or_else(|| {
            existing_modes
                .as_ref()
                .map(|modes| modes.0.clone())
                .unwrap_or_else(|| "prepaid_adjustment".to_owned())
        }),
        settlement_mode: mutation.settlement_mode.unwrap_or_else(|| {
            existing_modes
                .as_ref()
                .map(|modes| modes.1.clone())
                .unwrap_or_else(|| "synchronous".to_owned())
        }),
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.update_pricing_plan(command).await {
        Ok(Some(item)) => Json(success_envelope(AdminPricingItemEnvelope { item })).into_response(),
        Ok(None) => not_found_response("pricing plan was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) => pricing_system_response("pricing plan command store is unavailable", error),
    }
}

async fn fetch_rate_cards(
    State(state): State<AdminPricingState>,
    Query(params): Query<AdminPricingListQueryRequest>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    let parsed = match parse_pricing_list_query(params.page, params.page_size) {
        Ok(parsed) => parsed,
        Err(error) => return error.into_response(),
    };
    let subject_type =
        match normalize_optional_rate_card_subject_type(params.subject_type.as_deref()) {
            Ok(value) => value,
            Err(message) => return bad_request(message),
        };
    let pricing_plan_id = match normalize_optional_pricing_id(params.pricing_plan_id.as_deref()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let status = match normalize_optional_pricing_status(params.status.as_deref()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    match state
        .store
        .list_rate_cards(ListAdminRateCardsQuery {
            subject,
            subject_type,
            pricing_plan_id,
            status,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => pricing_list_response(page),
        Err(error) => pricing_system_response("rate card read model is unavailable", error),
    }
}

async fn create_rate_card(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<RateCardMutationRequest>(&body, "rate card") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_rate_card_mutation(request) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = CreateAdminRateCardCommand {
        subject,
        rate_card_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        subject_type: mutation.subject_type,
        subject_id: mutation.subject_id,
        subject_code: mutation.subject_code,
        pricing_plan_id: mutation.pricing_plan_id,
        priority: mutation.priority,
        effective_from: mutation
            .effective_from
            .unwrap_or_else(current_timestamp_string),
        effective_to: mutation.effective_to,
        status: mutation.status,
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.create_rate_card(command).await {
        Ok(item) => json_created_response(None, AdminPricingItemEnvelope { item }),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_not_found() => not_found_response("pricing plan was not found"),
        Err(error) => pricing_system_response("rate card command store is unavailable", error),
    }
}

async fn update_rate_card(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(rate_card_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let rate_card_id = match normalize_pricing_path_id(&rate_card_id, "rate card id") {
        Ok(rate_card_id) => rate_card_id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<RateCardMutationRequest>(&body, "rate card") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_rate_card_mutation(request) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = UpdateAdminRateCardCommand {
        subject,
        rate_card_id,
        rate_card_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        subject_type: mutation.subject_type,
        subject_id: mutation.subject_id,
        subject_code: mutation.subject_code,
        pricing_plan_id: mutation.pricing_plan_id,
        priority: mutation.priority,
        effective_from: mutation
            .effective_from
            .unwrap_or_else(current_timestamp_string),
        effective_to: mutation.effective_to,
        status: mutation.status,
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.update_rate_card(command).await {
        Ok(Some(item)) => Json(success_envelope(AdminPricingItemEnvelope { item })).into_response(),
        Ok(None) => not_found_response("rate card was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_not_found() => not_found_response("pricing plan was not found"),
        Err(error) => pricing_system_response("rate card command store is unavailable", error),
    }
}

async fn delete_rate_card(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(rate_card_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let rate_card_id = match normalize_pricing_path_id(&rate_card_id, "rate card id") {
        Ok(rate_card_id) => rate_card_id,
        Err(message) => return bad_request(message),
    };
    let command = DeleteAdminRateCardCommand {
        subject,
        rate_card_id,
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.delete_rate_card(command).await {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("rate card was not found"),
        Err(error) => pricing_system_response("rate card command store is unavailable", error),
    }
}

async fn fetch_pricing_rules(
    State(state): State<AdminPricingState>,
    Query(params): Query<AdminPricingListQueryRequest>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    let parsed = match parse_pricing_list_query(params.page, params.page_size) {
        Ok(parsed) => parsed,
        Err(error) => return error.into_response(),
    };
    let q = match normalize_pricing_search(params.q.as_deref()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let pricing_plan_id = match normalize_optional_pricing_id(params.pricing_plan_id.as_deref()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let status = match normalize_optional_pricing_status(params.status.as_deref()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    match state
        .store
        .list_pricing_rules(ListAdminPricingRulesQuery {
            subject,
            q,
            pricing_plan_id,
            status,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => pricing_list_response(page),
        Err(error) => pricing_system_response("pricing rule read model is unavailable", error),
    }
}

struct NormalizedPriceSettingMutation {
    official_rate_code: String,
    pricing_plan_id: String,
    rule_id: Option<String>,
    formula_mode: AdminPricingFormulaMode,
    multiplier: String,
    markup_amount: String,
    unit_price_override: Option<String>,
    schedule: Option<Value>,
    priority: i64,
    effective_from: Option<String>,
    effective_to: Option<String>,
    status: AdminPricingStatus,
}

fn normalize_price_setting_mutation(
    request: PriceSettingMutationRequest,
) -> Result<NormalizedPriceSettingMutation, AdminPricingCommandBuildError> {
    let official_rate_code =
        normalize_required_text(request.official_rate_code.as_deref(), "officialRateCode", MAX_CODE_LEN)?;
    let pricing_plan_id = normalize_required_pricing_id(
        request.pricing_plan_id.as_deref(),
        "pricingPlanId",
    )?;
    let rule_id = normalize_optional_text(request.rule_id.as_deref(), "ruleId", 32)?;
    let formula_mode = normalize_formula_mode(request.formula_mode.as_deref())?;
    let (multiplier, markup_amount, unit_price_override) = match formula_mode {
        AdminPricingFormulaMode::MultiplierMarkup => {
            let multiplier = match normalize_optional_decimal_value(
                request.multiplier.as_ref(),
                "multiplier",
            )? {
                Some(value) => value,
                None => DEFAULT_RULE_MULTIPLIER.to_owned(),
            };
            let markup_amount = match normalize_optional_decimal_value(
                request.markup_amount.as_ref(),
                "markupAmount",
            )? {
                Some(value) => value,
                None => DEFAULT_RULE_MARKUP.to_owned(),
            };
            (multiplier, markup_amount, None)
        }
        AdminPricingFormulaMode::UnitPriceOverride => {
            let unit_price_override = match normalize_optional_decimal_value(
                request.unit_price_override.as_ref(),
                "unitPriceOverride",
            )? {
                Some(value) => value,
                None => {
                    return Err(AdminPricingCommandBuildError::BadRequest(
                        "unitPriceOverride is required for unit_price_override mode".to_owned(),
                    ));
                }
            };
            (
                DEFAULT_RULE_MULTIPLIER.to_owned(),
                DEFAULT_RULE_MARKUP.to_owned(),
                Some(unit_price_override),
            )
        }
    };
    let effective_from =
        normalize_optional_datetime(request.effective_from.as_deref(), "effectiveFrom")?;
    let effective_to = normalize_optional_datetime(request.effective_to.as_deref(), "effectiveTo")?;
    validate_datetime_order(effective_from.as_deref(), effective_to.as_deref())?;
    Ok(NormalizedPriceSettingMutation {
        official_rate_code,
        pricing_plan_id,
        rule_id,
        formula_mode,
        multiplier,
        markup_amount,
        unit_price_override,
        schedule: normalize_pricing_schedule(request.schedule.as_ref())?,
        priority: normalize_optional_non_negative_integer(request.priority.as_ref(), "priority")?
            .unwrap_or(100),
        effective_from,
        effective_to,
        status: normalize_pricing_status(request.status.as_deref())?,
    })
}

/// Creates or updates the single standard sales rule backing one
/// (resource, region, meter) price setting. The scope dimensions are derived
/// server-side from the anchored official rate row, so a mistyped product or
/// meter code can no longer create a rule the runtime never selects.
async fn upsert_price_setting(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<PriceSettingMutationRequest>(&body, "price setting") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_price_setting_mutation(request) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = SaveAdminPriceSettingCommand {
        subject,
        rule_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        official_rate_code: mutation.official_rate_code,
        pricing_plan_id: mutation.pricing_plan_id,
        rule_id: mutation.rule_id,
        formula_mode: mutation.formula_mode,
        multiplier: mutation.multiplier,
        markup_amount: mutation.markup_amount,
        unit_price_override: mutation.unit_price_override,
        schedule: mutation.schedule,
        priority: mutation.priority,
        effective_from: mutation.effective_from,
        effective_to: mutation.effective_to,
        status: mutation.status,
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.save_price_setting(command).await {
        Ok(item) => Json(success_envelope(AdminPricingItemEnvelope { item })).into_response(),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_not_found() => {
            not_found_response("official rate or pricing rule was not found")
        }
        Err(error) => {
            pricing_system_response("price setting command store is unavailable", error)
        }
    }
}

/// Server-computed "what will a customer actually pay" preview for one
/// (resource, region, meter) tuple. Rule selection reuses the shared runtime
/// selector, so this preview can never disagree with billing.
async fn resolve_price_setting(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(params): Query<PriceSettingResolveQueryRequest>,
) -> Response {
    let subject = scoped.into();
    let official_rate_code = match normalize_required_text(
        params.official_rate_code.as_deref(),
        "officialRateCode",
        MAX_CODE_LEN,
    ) {
        Ok(value) => value,
        Err(error) => return command_build_error_response(error),
    };
    let region_code =
        match normalize_optional_text(params.region_code.as_deref(), "regionCode", 64) {
            Ok(value) => value,
            Err(error) => return command_build_error_response(error),
        };
    let pricing_plan_id =
        match normalize_optional_pricing_id(params.pricing_plan_id.as_deref()) {
            Ok(value) => value,
            Err(message) => return bad_request(message),
        };
    let occurred_at = match params.occurred_at.as_deref().map(str::trim) {
        None | Some("") => None,
        Some(value) => match DateTime::parse_from_rfc3339(value) {
            Ok(_) => Some(value.to_owned()),
            Err(_) => return bad_request("occurredAt must be an RFC 3339 timestamp".to_owned()),
        },
    };
    match state
        .store
        .resolve_price_setting(ResolveAdminPriceSettingQuery {
            subject,
            official_rate_code,
            region_code,
            pricing_plan_id,
            occurred_at,
        })
        .await
    {
        Ok(Some(resolution)) => {
            Json(success_envelope(AdminPricingItemEnvelope {
                item: resolution,
            }))
            .into_response()
        }
        Ok(None) => not_found_response("official rate was not found"),
        Err(error) if error.is_not_found() => {
            not_found_response("official rate or pricing plan was not found")
        }
        Err(error) => {
            pricing_system_response("price setting resolution is unavailable", error)
        }
    }
}

async fn create_pricing_rule(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<PricingRuleMutationRequest>(&body, "pricing rule") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_pricing_rule_mutation(request, true) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = CreateAdminPricingRuleCommand {
        subject,
        rule_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        pricing_plan_id: mutation.pricing_plan_id,
        rule_code: mutation.rule_code.unwrap_or_else(String::new),
        product_code: mutation.product_code,
        operation_code: mutation.operation_code,
        meter_code: mutation.meter_code,
        provider_code: mutation.provider_code,
        region_code: mutation.region_code,
        catalog_key: mutation.catalog_key,
        formula_mode: mutation.formula_mode,
        multiplier: mutation.multiplier,
        markup_amount: mutation.markup_amount,
        unit_price_override: mutation.unit_price_override,
        conditions: mutation.conditions,
        schedule: mutation.schedule,
        priority: mutation.priority,
        effective_from: mutation
            .effective_from
            .unwrap_or_else(current_timestamp_string),
        effective_to: mutation.effective_to,
        status: mutation.status,
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.create_pricing_rule(command).await {
        Ok(item) => json_created_response(None, AdminPricingItemEnvelope { item }),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_not_found() => not_found_response("pricing plan was not found"),
        Err(error) => pricing_system_response("pricing rule command store is unavailable", error),
    }
}

async fn update_pricing_rule(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(rule_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let rule_id = match normalize_pricing_path_id(&rule_id, "rule id") {
        Ok(rule_id) => rule_id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<PricingRuleMutationRequest>(&body, "pricing rule") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_pricing_rule_mutation(request, false) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = UpdateAdminPricingRuleCommand {
        subject,
        rule_id,
        rule_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        pricing_plan_id: mutation.pricing_plan_id,
        product_code: mutation.product_code,
        operation_code: mutation.operation_code,
        meter_code: mutation.meter_code,
        provider_code: mutation.provider_code,
        region_code: mutation.region_code,
        catalog_key: mutation.catalog_key,
        formula_mode: mutation.formula_mode,
        multiplier: mutation.multiplier,
        markup_amount: mutation.markup_amount,
        unit_price_override: mutation.unit_price_override,
        conditions: mutation.conditions,
        schedule: mutation.schedule,
        priority: mutation.priority,
        effective_from: mutation
            .effective_from
            .unwrap_or_else(current_timestamp_string),
        effective_to: mutation.effective_to,
        status: mutation.status,
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.update_pricing_rule(command).await {
        Ok(Some(item)) => Json(success_envelope(AdminPricingItemEnvelope { item })).into_response(),
        Ok(None) => not_found_response("pricing rule was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_not_found() => not_found_response("pricing plan was not found"),
        Err(error) => pricing_system_response("pricing rule command store is unavailable", error),
    }
}

async fn delete_pricing_rule(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(rule_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let rule_id = match normalize_pricing_path_id(&rule_id, "rule id") {
        Ok(rule_id) => rule_id,
        Err(message) => return bad_request(message),
    };
    let command = DeleteAdminPricingRuleCommand {
        subject,
        rule_id,
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.delete_pricing_rule(command).await {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("pricing rule was not found"),
        Err(error) => pricing_system_response("pricing rule command store is unavailable", error),
    }
}

async fn fetch_default_regions(
    State(state): State<AdminPricingState>,
    Query(params): Query<AdminPricingListQueryRequest>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    let parsed = match parse_pricing_list_query(params.page, params.page_size) {
        Ok(parsed) => parsed,
        Err(error) => return error.into_response(),
    };
    let q = match normalize_pricing_search(params.q.as_deref()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    match state
        .store
        .list_default_regions(ListAdminDefaultRegionsQuery {
            subject,
            q,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => pricing_list_response(page),
        Err(error) => {
            pricing_system_response("default region read model is unavailable", error)
        }
    }
}

async fn create_default_region(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<DefaultRegionMutationRequest>(&body, "default region") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_default_region_mutation(request) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = SaveAdminDefaultRegionCommand {
        subject,
        region_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        vendor_code: mutation.vendor_code,
        provider_code: mutation.provider_code,
        product_code: mutation.product_code,
        resource_code: mutation.resource_code,
        catalog_key: mutation.catalog_key,
        default_region_code: mutation.default_region_code,
        currency_code: mutation.currency_code,
        description: mutation.description,
        effective_from: mutation
            .effective_from
            .unwrap_or_else(current_timestamp_string),
        effective_to: mutation.effective_to,
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.save_default_region(command).await {
        Ok(item) => json_created_response(None, AdminPricingItemEnvelope { item }),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_bad_request() => bad_request(error.to_string()),
        Err(error) => {
            pricing_system_response("default region command store is unavailable", error)
        }
    }
}

/// Updates the default billing region of an existing per-model default region
/// row. The resource identity (`catalogKey`/`vendorCode`/`productCode` in the
/// body) is ignored: a catalog key maps to at most one default region within
/// the scope, so operators switch which region is default by editing the row.
async fn update_default_region(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(default_region_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let default_region_id =
        match normalize_pricing_path_id(&default_region_id, "default region id") {
            Ok(default_region_id) => default_region_id,
            Err(message) => return bad_request(message),
        };
    let request = match parse_json_body::<DefaultRegionMutationRequest>(&body, "default region") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_default_region_mutation(request) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = UpdateAdminDefaultRegionCommand {
        subject,
        default_region_id,
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        default_region_code: mutation.default_region_code,
        currency_code: mutation.currency_code,
        description: mutation.description,
        effective_from: mutation
            .effective_from
            .unwrap_or_else(current_timestamp_string),
        effective_to: mutation.effective_to,
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.update_default_region(command).await {
        Ok(Some(item)) => Json(success_envelope(AdminPricingItemEnvelope { item })).into_response(),
        Ok(None) => not_found_response("default region was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_bad_request() => bad_request(error.to_string()),
        Err(error) => {
            pricing_system_response("default region command store is unavailable", error)
        }
    }
}

async fn delete_default_region(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(default_region_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let default_region_id =
        match normalize_pricing_path_id(&default_region_id, "default region id") {
            Ok(default_region_id) => default_region_id,
            Err(message) => return bad_request(message),
        };
    let command = DeleteAdminDefaultRegionCommand {
        subject,
        default_region_id,
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.delete_default_region(command).await {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("default region was not found"),
        Err(error) => {
            pricing_system_response("default region command store is unavailable", error)
        }
    }
}

// ---------------------------------------------------------------------------
// Price books — admin management surface (pricing_price_book / pricing_rate).
//
// The lifecycle mirrors the official pricing sync semantics: created books
// start as `staged`, activation retires any other active book with the same
// identity key, and retirement soft-deletes the book's live rates.
// ---------------------------------------------------------------------------

async fn fetch_price_books(
    State(state): State<AdminPricingState>,
    Query(params): Query<PriceBookListQueryRequest>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
) -> Response {
    let subject = scoped.into();
    let parsed = match parse_pricing_list_query(params.page, params.page_size) {
        Ok(parsed) => parsed,
        Err(error) => return error.into_response(),
    };
    let q = match normalize_pricing_search(params.q.as_deref()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let price_side = match normalize_optional_base_price_side(params.price_side.as_deref()) {
        Ok(value) => value,
        Err(message) => return bad_request(message),
    };
    let lifecycle_state =
        match normalize_optional_price_book_lifecycle(params.lifecycle_state.as_deref()) {
            Ok(value) => value,
            Err(message) => return bad_request(message),
        };
    match state
        .store
        .list_price_books(ListAdminPriceBooksQuery {
            subject,
            q,
            price_side,
            lifecycle_state,
            page_no: parsed.page_no,
            page_size: parsed.page_size,
            offset: parsed.offset,
        })
        .await
    {
        Ok(page) => pricing_list_response(page),
        Err(error) => pricing_system_response("price book read model is unavailable", error),
    }
}

async fn fetch_price_book(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(price_book_id): Path<String>,
) -> Response {
    let subject = scoped.into();
    let price_book_id = match normalize_pricing_path_id(&price_book_id, "price book id") {
        Ok(price_book_id) => price_book_id,
        Err(message) => return bad_request(message),
    };
    match state
        .store
        .load_price_book(LoadAdminPriceBookQuery {
            subject,
            price_book_id,
        })
        .await
    {
        Ok(Some(detail)) => {
            Json(success_envelope(AdminPricingItemEnvelope { item: detail })).into_response()
        }
        Ok(None) => not_found_response("price book was not found"),
        Err(error) => pricing_system_response("price book read model is unavailable", error),
    }
}

async fn create_price_book(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let request = match parse_json_body::<PriceBookMutationRequest>(&body, "price book") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_price_book_create(request) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = CreateAdminPriceBookCommand {
        subject,
        price_book_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        namespace_code: mutation.namespace_code,
        price_book_code: mutation.price_book_code,
        price_book_version: mutation.price_book_version,
        price_side: mutation.price_side,
        vendor_code: mutation.vendor_code,
        region_code: mutation.region_code,
        currency_code: mutation.currency_code,
        source_system: mutation.source_system,
        effective_from: mutation.effective_from,
        effective_to: mutation.effective_to,
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.create_price_book(command).await {
        Ok(item) => json_created_response(None, AdminPricingItemEnvelope { item }),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_bad_request() => bad_request(error.to_string()),
        Err(error) => pricing_system_response("price book command store is unavailable", error),
    }
}

async fn update_price_book(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(price_book_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let price_book_id = match normalize_pricing_path_id(&price_book_id, "price book id") {
        Ok(price_book_id) => price_book_id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<PriceBookMutationRequest>(&body, "price book") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_price_book_update(request) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = UpdateAdminPriceBookCommand {
        subject,
        price_book_id,
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        currency_code: mutation.currency_code,
        effective_from: mutation.effective_from,
        effective_to: mutation.effective_to,
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.update_price_book(command).await {
        Ok(Some(item)) => Json(success_envelope(AdminPricingItemEnvelope { item })).into_response(),
        Ok(None) => not_found_response("price book was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_bad_request() => bad_request(error.to_string()),
        Err(error) => pricing_system_response("price book command store is unavailable", error),
    }
}

async fn activate_price_book(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(price_book_id): Path<String>,
) -> Response {
    transition_price_book_lifecycle(state, scoped, price_book_id, true).await
}

async fn deactivate_price_book(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(price_book_id): Path<String>,
) -> Response {
    transition_price_book_lifecycle(state, scoped, price_book_id, false).await
}

async fn transition_price_book_lifecycle(
    state: AdminPricingState,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    price_book_id: String,
    activate: bool,
) -> Response {
    let subject = scoped.into();
    let price_book_id = match normalize_pricing_path_id(&price_book_id, "price book id") {
        Ok(price_book_id) => price_book_id,
        Err(message) => return bad_request(message),
    };
    let command = PriceBookLifecycleCommand {
        subject,
        price_book_id,
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    let result = if activate {
        state.store.activate_price_book(command).await
    } else {
        state.store.retire_price_book(command).await
    };
    match result {
        Ok(Some(item)) => Json(success_envelope(AdminPricingItemEnvelope { item })).into_response(),
        Ok(None) => not_found_response("price book was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_bad_request() => bad_request(error.to_string()),
        Err(error) => pricing_system_response("price book command store is unavailable", error),
    }
}

async fn create_price_book_rate(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path(price_book_id): Path<String>,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let price_book_id = match normalize_pricing_path_id(&price_book_id, "price book id") {
        Ok(price_book_id) => price_book_id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<PriceBookRateMutationRequest>(&body, "price book rate") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_price_book_rate_create(request) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = CreateAdminPriceBookRateCommand {
        subject,
        price_book_id,
        rate_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        rate_code: mutation.rate_code,
        product_code: mutation.product_code,
        product_kind: mutation.product_kind,
        product_display_name: mutation.product_display_name,
        operation_code: mutation.operation_code,
        operation_kind: mutation.operation_kind,
        operation_display_name: mutation.operation_display_name,
        meter_code: mutation.meter_code,
        meter_display_name: mutation.meter_display_name,
        quantity_kind: mutation.quantity_kind,
        unit_code: mutation.unit_code,
        provider_code: mutation.provider_code,
        account_id: mutation.account_id,
        resource_type: mutation.resource_type,
        resource_code: mutation.resource_code,
        catalog_key: mutation.catalog_key,
        api_format: mutation.api_format,
        endpoint_code: mutation.endpoint_code,
        billability: mutation.billability,
        charge_timing: mutation.charge_timing,
        calculation_mode: mutation.calculation_mode,
        quantity_aggregation: mutation.quantity_aggregation,
        unit_size: mutation.unit_size,
        unit_price: mutation.unit_price,
        minimum_quantity: mutation.minimum_quantity,
        quantity_step: mutation.quantity_step,
        priority: mutation.priority,
        rate_variant: mutation.rate_variant,
        conditions: mutation.conditions,
        tiers: mutation.tiers,
        schedule: mutation.schedule,
        effective_from: mutation.effective_from.unwrap_or_else(current_timestamp_string),
        effective_to: mutation.effective_to,
        source_url: mutation.source_url,
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.create_price_book_rate(command).await {
        Ok(item) => json_created_response(None, AdminPricingItemEnvelope { item }),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_bad_request() => bad_request(error.to_string()),
        Err(error) => {
            pricing_system_response("price book rate command store is unavailable", error)
        }
    }
}

async fn update_price_book_rate(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path((price_book_id, rate_id)): Path<(String, String)>,
    body: Bytes,
) -> Response {
    let subject = scoped.into();
    let price_book_id = match normalize_pricing_path_id(&price_book_id, "price book id") {
        Ok(price_book_id) => price_book_id,
        Err(message) => return bad_request(message),
    };
    let rate_id = match normalize_pricing_path_id(&rate_id, "rate id") {
        Ok(rate_id) => rate_id,
        Err(message) => return bad_request(message),
    };
    let request = match parse_json_body::<PriceBookRatePatchRequest>(&body, "price book rate") {
        Ok(request) => request,
        Err(message) => return bad_request(message),
    };
    let mutation = match normalize_price_book_rate_patch(request) {
        Ok(mutation) => mutation,
        Err(error) => return command_build_error_response(error),
    };
    let command = UpdateAdminPriceBookRateCommand {
        subject,
        price_book_id,
        rate_id,
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        unit_size: mutation.unit_size,
        unit_price: mutation.unit_price,
        minimum_quantity: mutation.minimum_quantity,
        quantity_step: mutation.quantity_step,
        priority: mutation.priority,
        effective_from: mutation.effective_from.unwrap_or_else(current_timestamp_string),
        effective_to: mutation.effective_to,
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.update_price_book_rate(command).await {
        Ok(Some(item)) => Json(success_envelope(AdminPricingItemEnvelope { item })).into_response(),
        Ok(None) => not_found_response("price book rate was not found"),
        Err(error) if error.is_conflict() => conflict_response(error),
        Err(error) if error.is_bad_request() => bad_request(error.to_string()),
        Err(error) => {
            pricing_system_response("price book rate command store is unavailable", error)
        }
    }
}

async fn delete_price_book_rate(
    State(state): State<AdminPricingState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Path((price_book_id, rate_id)): Path<(String, String)>,
) -> Response {
    let subject = scoped.into();
    let price_book_id = match normalize_pricing_path_id(&price_book_id, "price book id") {
        Ok(price_book_id) => price_book_id,
        Err(message) => return bad_request(message),
    };
    let rate_id = match normalize_pricing_path_id(&rate_id, "rate id") {
        Ok(rate_id) => rate_id,
        Err(message) => return bad_request(message),
    };
    let command = DeleteAdminPriceBookRateCommand {
        subject,
        price_book_id,
        rate_id,
        audit_log_uuid: match generate_entity_uuid(&state) {
            Ok(uuid) => uuid,
            Err(error) => return command_build_error_response(error),
        },
        request_id: match generate_server_request_id() {
            Ok(request_id) => request_id,
            Err(error) => return command_build_error_response(request_id_error(error)),
        },
        requested_at: current_timestamp_string(),
    };
    match state.store.delete_price_book_rate(command).await {
        Ok(true) => no_content_response(None),
        Ok(false) => not_found_response("price book rate was not found"),
        Err(error) => {
            pricing_system_response("price book rate command store is unavailable", error)
        }
    }
}

fn normalize_price_book_create(
    request: PriceBookMutationRequest,
) -> Result<NormalizedPriceBookCreate, AdminPricingCommandBuildError> {
    let effective_from =
        normalize_optional_datetime(request.effective_from.as_deref(), "effectiveFrom")?;
    let effective_to = normalize_optional_datetime(request.effective_to.as_deref(), "effectiveTo")?;
    validate_datetime_order(effective_from.as_deref(), effective_to.as_deref())?;
    Ok(NormalizedPriceBookCreate {
        namespace_code: normalize_required_text(
            request.namespace_code.as_deref(),
            "namespaceCode",
            64,
        )?,
        price_book_code: normalize_required_code(
            request.price_book_code.as_deref(),
            "priceBookCode",
        )?,
        price_book_version: normalize_required_text(
            request.price_book_version.as_deref(),
            "priceBookVersion",
            64,
        )?,
        price_side: normalize_required_price_side(request.price_side.as_deref())?,
        vendor_code: normalize_required_text(request.vendor_code.as_deref(), "vendorCode", 64)?,
        region_code: normalize_required_text(request.region_code.as_deref(), "regionCode", 64)?,
        currency_code: normalize_currency_code(request.currency_code.as_deref())?,
        source_system: normalize_optional_text(
            request.source_system.as_deref(),
            "sourceSystem",
            64,
        )?
        .unwrap_or_else(|| "admin".to_owned()),
        effective_from,
        effective_to,
    })
}

fn normalize_price_book_update(
    request: PriceBookMutationRequest,
) -> Result<NormalizedPriceBookUpdate, AdminPricingCommandBuildError> {
    let effective_from =
        normalize_optional_datetime(request.effective_from.as_deref(), "effectiveFrom")?;
    let effective_to = normalize_optional_datetime(request.effective_to.as_deref(), "effectiveTo")?;
    validate_datetime_order(effective_from.as_deref(), effective_to.as_deref())?;
    Ok(NormalizedPriceBookUpdate {
        currency_code: normalize_currency_code(request.currency_code.as_deref())?,
        effective_from,
        effective_to,
    })
}

fn normalize_price_book_rate_create(
    request: PriceBookRateMutationRequest,
) -> Result<NormalizedPriceBookRateCreate, AdminPricingCommandBuildError> {
    let unit_price = normalize_decimal_value(request.unit_price.as_ref(), "unitPrice")?;
    let unit_size = normalize_optional_decimal_value(request.unit_size.as_ref(), "unitSize")?
        .unwrap_or_else(|| "1".to_owned());
    if canonicalize_decimal(&unit_size) == "0" {
        return Err(AdminPricingCommandBuildError::BadRequest(
            "unitSize must be greater than zero".to_owned(),
        ));
    }
    let minimum_quantity =
        normalize_optional_decimal_value(request.minimum_quantity.as_ref(), "minimumQuantity")?
            .unwrap_or_else(|| "0".to_owned());
    let quantity_step =
        normalize_optional_decimal_value(request.quantity_step.as_ref(), "quantityStep")?;
    let priority =
        normalize_optional_non_negative_integer(request.priority.as_ref(), "priority")?.unwrap_or(100);
    let billability = normalize_enum_choice(
        request.billability.as_deref(),
        "billability",
        &["chargeable", "free", "not_applicable", "unknown"],
    )?;
    let charge_timing = normalize_enum_choice(
        request.charge_timing.as_deref(),
        "chargeTiming",
        &["request_accepted", "successful_result", "usage_reported"],
    )?;
    let calculation_mode = normalize_enum_choice(
        request.calculation_mode.as_deref(),
        "calculationMode",
        &["per_unit", "flat", "graduated", "volume"],
    )
    .map_err(|error| match error {
        AdminPricingCommandBuildError::BadRequest(_) => AdminPricingCommandBuildError::BadRequest(
            "calculationMode must be per_unit, flat, graduated, or volume (formula is not supported through the admin API)".to_owned(),
        ),
        other => other,
    })?;
    let quantity_aggregation = normalize_enum_choice(
        request.quantity_aggregation.as_deref(),
        "quantityAggregation",
        &["sum", "maximum", "minimum", "last", "distinct_invocation"],
    )?;
    let rate_variant = normalize_enum_choice(
        request.rate_variant.as_deref(),
        "rateVariant",
        &["standard", "time_window"],
    )?;
    let conditions = normalize_pricing_conditions(request.conditions.as_ref())?;
    let tiers = match request.tiers.as_ref() {
        Some(Value::Array(items)) => Value::Array(items.clone()),
        Some(_) => {
            return Err(AdminPricingCommandBuildError::BadRequest(
                "tiers must be an array".to_owned(),
            ));
        }
        None => Value::Array(Vec::new()),
    };
    let schedule = normalize_pricing_schedule(request.schedule.as_ref())?;
    if calculation_mode == "flat" && canonicalize_decimal(&unit_size) != "1" {
        return Err(AdminPricingCommandBuildError::BadRequest(
            "unitSize must be 1 for flat calculation mode".to_owned(),
        ));
    }
    if matches!(calculation_mode.as_str(), "graduated" | "volume")
        && tiers.as_array().is_none_or(|items| items.is_empty())
    {
        return Err(AdminPricingCommandBuildError::BadRequest(
            "tiers must contain at least one entry for graduated or volume calculation mode"
                .to_owned(),
        ));
    }
    if billability == "chargeable" && canonicalize_decimal(&unit_price) == "0" {
        return Err(AdminPricingCommandBuildError::BadRequest(
            "unitPrice must be greater than zero for chargeable rates".to_owned(),
        ));
    }
    if matches!(billability.as_str(), "free" | "not_applicable")
        && canonicalize_decimal(&unit_price) != "0"
    {
        return Err(AdminPricingCommandBuildError::BadRequest(
            "unitPrice must be zero for free or not_applicable rates".to_owned(),
        ));
    }
    if rate_variant == "time_window" && schedule.is_none() {
        return Err(AdminPricingCommandBuildError::BadRequest(
            "schedule is required for time_window rate variants".to_owned(),
        ));
    }
    if rate_variant == "standard" && schedule.is_some() {
        return Err(AdminPricingCommandBuildError::BadRequest(
            "schedule is only allowed for time_window rate variants".to_owned(),
        ));
    }
    let effective_from =
        normalize_optional_datetime(request.effective_from.as_deref(), "effectiveFrom")?;
    let effective_to = normalize_optional_datetime(request.effective_to.as_deref(), "effectiveTo")?;
    validate_datetime_order(effective_from.as_deref(), effective_to.as_deref())?;
    let account_id = match normalize_optional_pricing_id(request.account_id.as_deref()) {
        Ok(value) => value.and_then(|value| value.parse::<i64>().ok()),
        Err(message) => {
            return Err(AdminPricingCommandBuildError::BadRequest(format!(
                "accountId {message}"
            )));
        }
    };
    let product_code =
        normalize_required_text(request.product_code.as_deref(), "productCode", MAX_TEXT_LEN)?;
    let meter_code = normalize_required_text(request.meter_code.as_deref(), "meterCode", 96)?;
    Ok(NormalizedPriceBookRateCreate {
        rate_code: normalize_required_code(request.rate_code.as_deref(), "rateCode")?,
        product_code: product_code.clone(),
        product_kind: normalize_optional_text(
            request.product_kind.as_deref(),
            "productKind",
            64,
        )?
        .unwrap_or_else(|| "model".to_owned()),
        product_display_name: normalize_optional_text(
            request.product_display_name.as_deref(),
            "productDisplayName",
            MAX_NAME_LEN,
        )?
        .unwrap_or_else(|| product_code.clone()),
        operation_code: normalize_optional_text(
            request.operation_code.as_deref(),
            "operationCode",
            96,
        )?
        .unwrap_or_default(),
        operation_kind: normalize_optional_text(
            request.operation_kind.as_deref(),
            "operationKind",
            64,
        )?
        .unwrap_or_default(),
        operation_display_name: normalize_optional_text(
            request.operation_display_name.as_deref(),
            "operationDisplayName",
            MAX_NAME_LEN,
        )?
        .unwrap_or_default(),
        meter_code: meter_code.clone(),
        meter_display_name: normalize_optional_text(
            request.meter_display_name.as_deref(),
            "meterDisplayName",
            MAX_NAME_LEN,
        )?
        .unwrap_or(meter_code),
        quantity_kind: normalize_optional_text(
            request.quantity_kind.as_deref(),
            "quantityKind",
            64,
        )?
        .unwrap_or_else(|| "token".to_owned()),
        unit_code: normalize_required_text(request.unit_code.as_deref(), "unitCode", 64)?,
        provider_code: normalize_required_text(
            request.provider_code.as_deref(),
            "providerCode",
            64,
        )?,
        account_id,
        resource_type: normalize_optional_text(
            request.resource_type.as_deref(),
            "resourceType",
            64,
        )?
        .unwrap_or_else(|| "model".to_owned()),
        resource_code: normalize_optional_text(
            request.resource_code.as_deref(),
            "resourceCode",
            MAX_TEXT_LEN,
        )?
        .unwrap_or_else(|| product_code.clone()),
        catalog_key: normalize_optional_text(
            request.catalog_key.as_deref(),
            "catalogKey",
            256,
        )?,
        api_format: normalize_optional_text(request.api_format.as_deref(), "apiFormat", 64)?,
        endpoint_code: normalize_optional_text(
            request.endpoint_code.as_deref(),
            "endpointCode",
            96,
        )?,
        billability,
        charge_timing,
        calculation_mode,
        quantity_aggregation,
        unit_size,
        unit_price,
        minimum_quantity,
        quantity_step,
        priority,
        rate_variant,
        conditions,
        tiers,
        schedule,
        effective_from,
        effective_to,
        source_url: normalize_optional_text(request.source_url.as_deref(), "sourceUrl", 512)?
            .unwrap_or_default(),
    })
}

fn normalize_price_book_rate_patch(
    request: PriceBookRatePatchRequest,
) -> Result<NormalizedPriceBookRatePatch, AdminPricingCommandBuildError> {
    let unit_size = normalize_decimal_value(request.unit_size.as_ref(), "unitSize")?;
    if canonicalize_decimal(&unit_size) == "0" {
        return Err(AdminPricingCommandBuildError::BadRequest(
            "unitSize must be greater than zero".to_owned(),
        ));
    }
    let unit_price = normalize_decimal_value(request.unit_price.as_ref(), "unitPrice")?;
    let minimum_quantity = normalize_decimal_value(
        request.minimum_quantity.as_ref(),
        "minimumQuantity",
    )?;
    let quantity_step =
        normalize_optional_decimal_value(request.quantity_step.as_ref(), "quantityStep")?;
    let priority =
        normalize_optional_non_negative_integer(request.priority.as_ref(), "priority")?.unwrap_or(100);
    let effective_from =
        normalize_optional_datetime(request.effective_from.as_deref(), "effectiveFrom")?;
    let effective_to = normalize_optional_datetime(request.effective_to.as_deref(), "effectiveTo")?;
    validate_datetime_order(effective_from.as_deref(), effective_to.as_deref())?;
    Ok(NormalizedPriceBookRatePatch {
        unit_size,
        unit_price,
        minimum_quantity,
        quantity_step,
        priority,
        effective_from,
        effective_to,
    })
}

fn normalize_optional_price_book_lifecycle(value: Option<&str>) -> Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    match value.trim().to_ascii_lowercase().as_str() {
        "draft" | "staged" | "active" | "retired" | "rejected" => {
            Ok(Some(value.trim().to_ascii_lowercase()))
        }
        _ => Err(
            "lifecycleState must be draft, staged, active, retired, or rejected".to_owned(),
        ),
    }
}

fn normalize_required_price_side(
    value: Option<&str>,
) -> Result<AdminPricingBasePriceSide, AdminPricingCommandBuildError> {
    match value {
        Some(_) => normalize_base_price_side(value),
        None => Err(AdminPricingCommandBuildError::BadRequest(
            "priceSide is required".to_owned(),
        )),
    }
}

fn normalize_enum_choice(
    value: Option<&str>,
    field_name: &str,
    allowed: &[&str],
) -> Result<String, AdminPricingCommandBuildError> {
    let normalized = normalize_required_text(value, field_name, 64)?;
    let lowered = normalized.to_ascii_lowercase();
    if allowed.contains(&lowered.as_str()) {
        Ok(lowered)
    } else {
        Err(AdminPricingCommandBuildError::BadRequest(format!(
            "{field_name} must be one of: {}",
            allowed.join(", ")
        )))
    }
}

fn normalize_default_region_mutation(
    request: DefaultRegionMutationRequest,
) -> Result<NormalizedDefaultRegionMutation, AdminPricingCommandBuildError> {
    let effective_from =
        normalize_optional_datetime(request.effective_from.as_deref(), "effectiveFrom")?;
    let effective_to = normalize_optional_datetime(request.effective_to.as_deref(), "effectiveTo")?;
    validate_datetime_order(effective_from.as_deref(), effective_to.as_deref())?;
    Ok(NormalizedDefaultRegionMutation {
        catalog_key: normalize_required_text(request.catalog_key.as_deref(), "catalogKey", 256)?,
        vendor_code: normalize_required_text(request.vendor_code.as_deref(), "vendorCode", 64)?,
        provider_code: normalize_optional_text(
            request.provider_code.as_deref(),
            "providerCode",
            64,
        )?
        .unwrap_or_default(),
        product_code: normalize_required_text(request.product_code.as_deref(), "productCode", 160)?,
        resource_code: normalize_optional_text(
            request.resource_code.as_deref(),
            "resourceCode",
            256,
        )?
        .unwrap_or_default(),
        default_region_code: normalize_required_text(
            request.default_region_code.as_deref(),
            "defaultRegionCode",
            64,
        )?,
        currency_code: normalize_currency_code(request.currency_code.as_deref())?,
        description: request
            .description
            .as_deref()
            .map(|value| normalize_optional_text(Some(value), "description", MAX_TEXT_LEN))
            .transpose()?
            .flatten(),
        effective_from,
        effective_to,
    })
}

fn parse_pricing_list_query(
    page: Option<i64>,
    page_size: Option<i64>,
) -> Result<ParsedOffsetListQuery, crate::api::response::ApiResponseError> {
    parse_offset_list_query(page, page_size).map_err(|message| bad_request(message).into())
}

fn pricing_list_response<T>(page: AdminPricingListPage<T>) -> Response
where
    T: Serialize,
{
    json_success_list_response(
        None,
        page.items,
        offset_page_info(page.page_no, page.page_size, page.total),
    )
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

fn normalize_pricing_plan_mutation(
    request: PricingPlanMutationRequest,
    create: bool,
) -> Result<NormalizedPricingPlanMutation, AdminPricingCommandBuildError> {
    let plan_code = if create {
        Some(normalize_required_code(
            request.plan_code.as_deref(),
            "planCode",
        )?)
    } else {
        None
    };
    let effective_from =
        normalize_optional_datetime(request.effective_from.as_deref(), "effectiveFrom")?;
    let effective_to = normalize_optional_datetime(request.effective_to.as_deref(), "effectiveTo")?;
    validate_datetime_order(effective_from.as_deref(), effective_to.as_deref())?;
    Ok(NormalizedPricingPlanMutation {
        plan_code,
        plan_name: normalize_required_text(request.plan_name.as_deref(), "planName", MAX_NAME_LEN)?,
        base_price_side: normalize_base_price_side(request.base_price_side.as_deref())?,
        currency_code: normalize_currency_code(request.currency_code.as_deref())?,
        rounding_mode: normalize_rounding_mode(request.rounding_mode.as_deref())?,
        minimum_charge_amount: normalize_decimal_value(
            request.minimum_charge_amount.as_ref(),
            "minimumChargeAmount",
        )?,
        effective_from,
        effective_to,
        status: normalize_pricing_status(request.status.as_deref())?,
        charge_mode: if create {
            Some(normalize_charge_mode(request.charge_mode.as_deref())?)
        } else {
            normalize_optional_charge_mode(request.charge_mode.as_deref())?
        },
        settlement_mode: if create {
            Some(normalize_settlement_mode(
                request.settlement_mode.as_deref(),
            )?)
        } else {
            normalize_optional_settlement_mode(request.settlement_mode.as_deref())?
        },
    })
}

fn normalize_charge_mode(value: Option<&str>) -> Result<String, AdminPricingCommandBuildError> {
    match value
        .unwrap_or("prepaid_adjustment")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "prepaid_adjustment" | "postpaid" => Ok(value
            .unwrap_or("prepaid_adjustment")
            .trim()
            .to_ascii_lowercase()),
        _ => Err(AdminPricingCommandBuildError::BadRequest(
            "chargeMode must be prepaid_adjustment or postpaid".to_owned(),
        )),
    }
}

fn normalize_optional_charge_mode(
    value: Option<&str>,
) -> Result<Option<String>, AdminPricingCommandBuildError> {
    value
        .map(|value| normalize_charge_mode(Some(value)))
        .transpose()
}

fn normalize_settlement_mode(value: Option<&str>) -> Result<String, AdminPricingCommandBuildError> {
    match value
        .unwrap_or("synchronous")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "synchronous" | "sync" => Ok("synchronous".to_owned()),
        "asynchronous" | "async" => Ok("asynchronous".to_owned()),
        _ => Err(AdminPricingCommandBuildError::BadRequest(
            "settlementMode must be synchronous or asynchronous".to_owned(),
        )),
    }
}

fn normalize_optional_settlement_mode(
    value: Option<&str>,
) -> Result<Option<String>, AdminPricingCommandBuildError> {
    value
        .map(|value| normalize_settlement_mode(Some(value)))
        .transpose()
}

fn normalize_rate_card_mutation(
    request: RateCardMutationRequest,
) -> Result<NormalizedRateCardMutation, AdminPricingCommandBuildError> {
    let subject_id = normalize_optional_pricing_id(request.subject_id.as_deref())?;
    let subject_code =
        normalize_optional_text(request.subject_code.as_deref(), "subjectCode", MAX_TEXT_LEN)?;
    match (subject_id.is_some(), subject_code.is_some()) {
        (false, false) => {
            return Err(AdminPricingCommandBuildError::BadRequest(
                "exactly one of subjectId or subjectCode is required".to_owned(),
            ));
        }
        (true, true) => {
            return Err(AdminPricingCommandBuildError::BadRequest(
                "subjectId and subjectCode are mutually exclusive".to_owned(),
            ));
        }
        _ => {}
    }
    let priority = normalize_optional_non_negative_integer(request.priority.as_ref(), "priority")?
        .unwrap_or(100);
    let effective_from =
        normalize_optional_datetime(request.effective_from.as_deref(), "effectiveFrom")?;
    let effective_to = normalize_optional_datetime(request.effective_to.as_deref(), "effectiveTo")?;
    validate_datetime_order(effective_from.as_deref(), effective_to.as_deref())?;
    Ok(NormalizedRateCardMutation {
        subject_type: normalize_rate_card_subject_type(request.subject_type.as_deref())?,
        subject_id,
        subject_code,
        pricing_plan_id: normalize_required_pricing_id(
            request.pricing_plan_id.as_deref(),
            "pricingPlanId",
        )?,
        priority,
        effective_from,
        effective_to,
        status: normalize_pricing_status(request.status.as_deref())?,
    })
}

fn normalize_pricing_rule_mutation(
    request: PricingRuleMutationRequest,
    create: bool,
) -> Result<NormalizedPricingRuleMutation, AdminPricingCommandBuildError> {
    let rule_code = if create {
        Some(normalize_required_code(
            request.rule_code.as_deref(),
            "ruleCode",
        )?)
    } else {
        None
    };
    let formula_mode = normalize_formula_mode(request.formula_mode.as_deref())?;
    let (multiplier, markup_amount, unit_price_override) = match formula_mode {
        AdminPricingFormulaMode::MultiplierMarkup => {
            let multiplier = match normalize_optional_decimal_value(
                request.multiplier.as_ref(),
                "multiplier",
            )? {
                Some(value) => value,
                None => DEFAULT_RULE_MULTIPLIER.to_owned(),
            };
            let markup_amount = match normalize_optional_decimal_value(
                request.markup_amount.as_ref(),
                "markupAmount",
            )? {
                Some(value) => value,
                None => DEFAULT_RULE_MARKUP.to_owned(),
            };
            (multiplier, markup_amount, None)
        }
        AdminPricingFormulaMode::UnitPriceOverride => {
            let unit_price_override = match normalize_optional_decimal_value(
                request.unit_price_override.as_ref(),
                "unitPriceOverride",
            )? {
                Some(value) => value,
                None => {
                    return Err(AdminPricingCommandBuildError::BadRequest(
                        "unitPriceOverride is required for unit_price_override mode".to_owned(),
                    ));
                }
            };
            (
                DEFAULT_RULE_MULTIPLIER.to_owned(),
                DEFAULT_RULE_MARKUP.to_owned(),
                Some(unit_price_override),
            )
        }
    };
    let effective_from =
        normalize_optional_datetime(request.effective_from.as_deref(), "effectiveFrom")?;
    let effective_to = normalize_optional_datetime(request.effective_to.as_deref(), "effectiveTo")?;
    validate_datetime_order(effective_from.as_deref(), effective_to.as_deref())?;
    Ok(NormalizedPricingRuleMutation {
        rule_code,
        pricing_plan_id: normalize_required_pricing_id(
            request.pricing_plan_id.as_deref(),
            "pricingPlanId",
        )?,
        product_code: normalize_optional_text(
            request.product_code.as_deref(),
            "productCode",
            MAX_TEXT_LEN,
        )?,
        operation_code: normalize_optional_text(
            request.operation_code.as_deref(),
            "operationCode",
            MAX_TEXT_LEN,
        )?,
        meter_code: normalize_optional_text(
            request.meter_code.as_deref(),
            "meterCode",
            MAX_CODE_LEN,
        )?,
        provider_code: normalize_optional_text(
            request.provider_code.as_deref(),
            "providerCode",
            64,
        )?,
        region_code: normalize_optional_text(request.region_code.as_deref(), "regionCode", 64)?,
        catalog_key: normalize_optional_text(request.catalog_key.as_deref(), "catalogKey", 256)?,
        formula_mode,
        multiplier,
        markup_amount,
        unit_price_override,
        conditions: normalize_pricing_conditions(request.conditions.as_ref())?,
        schedule: normalize_pricing_schedule(request.schedule.as_ref())?,
        priority: normalize_optional_non_negative_integer(request.priority.as_ref(), "priority")?
            .unwrap_or(100),
        effective_from,
        effective_to,
        status: normalize_pricing_status(request.status.as_deref())?,
    })
}

fn normalize_required_code(
    value: Option<&str>,
    field_name: &str,
) -> Result<String, AdminPricingCommandBuildError> {
    let normalized = normalize_required_text(value, field_name, MAX_CODE_LEN)?;
    if !normalized
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
    {
        return Err(AdminPricingCommandBuildError::BadRequest(format!(
            "{field_name} may only contain letters, numbers, -, and _"
        )));
    }
    Ok(normalized)
}

fn normalize_required_text(
    value: Option<&str>,
    field_name: &str,
    max_len: usize,
) -> Result<String, AdminPricingCommandBuildError> {
    let normalized = normalize_optional_text(value, field_name, max_len)?;
    match normalized {
        Some(value) => Ok(value),
        None => Err(AdminPricingCommandBuildError::BadRequest(format!(
            "{field_name} is required"
        ))),
    }
}

fn normalize_optional_text(
    value: Option<&str>,
    field_name: &str,
    max_len: usize,
) -> Result<Option<String>, AdminPricingCommandBuildError> {
    let Some(value) = value else {
        return Ok(None);
    };
    let contains_control_character = value.chars().any(char::is_control);
    let normalized = value.trim();
    if normalized.is_empty() {
        return if contains_control_character {
            Err(AdminPricingCommandBuildError::BadRequest(format!(
                "{field_name} must be visible text and at most {max_len} characters"
            )))
        } else {
            Ok(None)
        };
    }
    if contains_control_character || normalized.chars().count() > max_len {
        return Err(AdminPricingCommandBuildError::BadRequest(format!(
            "{field_name} must be visible text and at most {max_len} characters"
        )));
    }
    Ok(Some(normalized.to_owned()))
}

fn normalize_optional_datetime(
    value: Option<&str>,
    field_name: &str,
) -> Result<Option<String>, AdminPricingCommandBuildError> {
    let value = normalize_optional_text(value, field_name, MAX_DATETIME_LEN)?;
    let Some(value) = value else {
        return Ok(None);
    };
    let parsed = DateTime::parse_from_rfc3339(&value).map_err(|_| {
        AdminPricingCommandBuildError::BadRequest(format!(
            "{field_name} must be an RFC3339 date-time with an explicit timezone"
        ))
    })?;
    Ok(Some(parsed.to_rfc3339_opts(SecondsFormat::AutoSi, true)))
}

fn validate_datetime_order(
    effective_from: Option<&str>,
    effective_to: Option<&str>,
) -> Result<(), AdminPricingCommandBuildError> {
    let (Some(from), Some(to)) = (effective_from, effective_to) else {
        return Ok(());
    };
    let from = DateTime::parse_from_rfc3339(from).map_err(|_| {
        AdminPricingCommandBuildError::BadRequest(
            "effectiveFrom must be an RFC3339 date-time with an explicit timezone".to_owned(),
        )
    })?;
    let to = DateTime::parse_from_rfc3339(to).map_err(|_| {
        AdminPricingCommandBuildError::BadRequest(
            "effectiveTo must be an RFC3339 date-time with an explicit timezone".to_owned(),
        )
    })?;
    if to <= from {
        return Err(AdminPricingCommandBuildError::BadRequest(
            "effectiveTo must be later than effectiveFrom".to_owned(),
        ));
    }
    Ok(())
}

fn normalize_pricing_search(value: Option<&str>) -> Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    let contains_control_character = value.chars().any(char::is_control);
    let normalized = value.trim();
    if normalized.is_empty() {
        return if contains_control_character {
            Err(format!(
                "q must be visible text and at most {MAX_SEARCH_LEN} characters"
            ))
        } else {
            Ok(None)
        };
    }
    if contains_control_character || normalized.chars().count() > MAX_SEARCH_LEN {
        return Err(format!(
            "q must be visible text and at most {MAX_SEARCH_LEN} characters"
        ));
    }
    Ok(Some(normalized.to_owned()))
}

fn normalize_optional_pricing_status(
    value: Option<&str>,
) -> Result<Option<AdminPricingStatus>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    match value.trim().to_ascii_lowercase().as_str() {
        "active" => Ok(Some(AdminPricingStatus::Active)),
        "inactive" => Ok(Some(AdminPricingStatus::Inactive)),
        _ => Err("status must be active or inactive".to_owned()),
    }
}

fn normalize_pricing_status(
    value: Option<&str>,
) -> Result<AdminPricingStatus, AdminPricingCommandBuildError> {
    normalize_optional_pricing_status(value)
        .map(|status| status.unwrap_or(AdminPricingStatus::Active))
        .map_err(AdminPricingCommandBuildError::BadRequest)
}

fn normalize_optional_base_price_side(
    value: Option<&str>,
) -> Result<Option<AdminPricingBasePriceSide>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    match value.trim().to_ascii_lowercase().as_str() {
        "official_reference" => Ok(Some(AdminPricingBasePriceSide::OfficialReference)),
        "upstream_cost" => Ok(Some(AdminPricingBasePriceSide::UpstreamCost)),
        "customer_charge" => Ok(Some(AdminPricingBasePriceSide::CustomerCharge)),
        "internal_transfer" => Ok(Some(AdminPricingBasePriceSide::InternalTransfer)),
        _ => Err(
            "basePriceSide must be official_reference, upstream_cost, customer_charge, or internal_transfer"
                .to_owned(),
        ),
    }
}

fn normalize_base_price_side(
    value: Option<&str>,
) -> Result<AdminPricingBasePriceSide, AdminPricingCommandBuildError> {
    normalize_optional_base_price_side(value)
        .map(|side| side.unwrap_or(AdminPricingBasePriceSide::OfficialReference))
        .map_err(AdminPricingCommandBuildError::BadRequest)
}

fn normalize_optional_rounding_mode(
    value: Option<&str>,
) -> Result<Option<AdminPricingRoundingMode>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    match value.trim().to_ascii_lowercase().as_str() {
        "half_up" => Ok(Some(AdminPricingRoundingMode::HalfUp)),
        "half_even" => Ok(Some(AdminPricingRoundingMode::HalfEven)),
        "up" => Ok(Some(AdminPricingRoundingMode::Up)),
        "down" => Ok(Some(AdminPricingRoundingMode::Down)),
        _ => Err("roundingMode must be half_up, half_even, up, or down".to_owned()),
    }
}

fn normalize_rounding_mode(
    value: Option<&str>,
) -> Result<AdminPricingRoundingMode, AdminPricingCommandBuildError> {
    normalize_optional_rounding_mode(value)
        .map(|mode| mode.unwrap_or(AdminPricingRoundingMode::HalfUp))
        .map_err(AdminPricingCommandBuildError::BadRequest)
}

fn normalize_optional_rate_card_subject_type(
    value: Option<&str>,
) -> Result<Option<AdminRateCardSubjectType>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    match value.trim().to_ascii_lowercase().as_str() {
        "default" => Ok(Some(AdminRateCardSubjectType::Default)),
        "api_key" => Ok(Some(AdminRateCardSubjectType::ApiKey)),
        "account_group" => Ok(Some(AdminRateCardSubjectType::AccountGroup)),
        "account" => Ok(Some(AdminRateCardSubjectType::Account)),
        "user" => Ok(Some(AdminRateCardSubjectType::User)),
        "organization" => Ok(Some(AdminRateCardSubjectType::Organization)),
        _ => Err(
            "subjectType must be default, api_key, account_group, account, user, or organization"
                .to_owned(),
        ),
    }
}

fn normalize_rate_card_subject_type(
    value: Option<&str>,
) -> Result<AdminRateCardSubjectType, AdminPricingCommandBuildError> {
    normalize_optional_rate_card_subject_type(value)
        .map(|subject_type| subject_type.unwrap_or(AdminRateCardSubjectType::Default))
        .map_err(AdminPricingCommandBuildError::BadRequest)
}

fn normalize_formula_mode(
    value: Option<&str>,
) -> Result<AdminPricingFormulaMode, AdminPricingCommandBuildError> {
    match value {
        Some(value) if value.trim().eq_ignore_ascii_case("multiplier_markup") => {
            Ok(AdminPricingFormulaMode::MultiplierMarkup)
        }
        Some(value) if value.trim().eq_ignore_ascii_case("unit_price_override") => {
            Ok(AdminPricingFormulaMode::UnitPriceOverride)
        }
        _ => Err(AdminPricingCommandBuildError::BadRequest(
            "formulaMode must be multiplier_markup or unit_price_override".to_owned(),
        )),
    }
}

fn normalize_pricing_conditions(
    value: Option<&Value>,
) -> Result<Value, AdminPricingCommandBuildError> {
    let Some(value) = value else {
        return Ok(Value::Array(Vec::new()));
    };
    let items = value.as_array().ok_or_else(|| {
        AdminPricingCommandBuildError::BadRequest("conditions must be an array".to_owned())
    })?;
    let mut dimensions = BTreeSet::new();
    let mut normalized = Vec::with_capacity(items.len());
    for item in items {
        let object = item.as_object().ok_or_else(|| {
            AdminPricingCommandBuildError::BadRequest(
                "each pricing condition must be an object".to_owned(),
            )
        })?;
        let dimension = object
            .get("dimensionCode")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                AdminPricingCommandBuildError::BadRequest(
                    "condition dimensionCode is required".to_owned(),
                )
            })?;
        if !dimensions.insert(dimension) {
            return Err(AdminPricingCommandBuildError::BadRequest(
                "condition dimensionCode must be unique within a rule".to_owned(),
            ));
        }
        let operator = object
            .get("operatorCode")
            .or_else(|| object.get("operator"))
            .and_then(Value::as_str)
            .unwrap_or_default();
        if !matches!(
            operator,
            "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in" | "exists"
        ) {
            return Err(AdminPricingCommandBuildError::BadRequest(
                "condition operatorCode is invalid".to_owned(),
            ));
        }
        if !object.contains_key("value") {
            return Err(AdminPricingCommandBuildError::BadRequest(
                "condition value is required".to_owned(),
            ));
        }
        normalized.push(serde_json::json!({
            "dimensionCode": dimension,
            "operatorCode": operator,
            "value": object.get("value").cloned().unwrap_or(Value::Null),
        }));
    }
    Ok(Value::Array(normalized))
}

fn normalize_pricing_schedule(
    value: Option<&Value>,
) -> Result<Option<Value>, AdminPricingCommandBuildError> {
    let Some(value) = value else {
        return Ok(None);
    };
    let schedule = serde_json::from_value::<sdkwork_models::PriceSchedule>(value.clone()).map_err(
        |error| AdminPricingCommandBuildError::BadRequest(format!("schedule is invalid: {error}")),
    )?;
    schedule.time_zone.parse::<chrono_tz::Tz>().map_err(|_| {
        AdminPricingCommandBuildError::BadRequest(
            "schedule timeZone must be an IANA time-zone identifier".to_owned(),
        )
    })?;
    if schedule.weekly_windows.is_empty() {
        return Err(AdminPricingCommandBuildError::BadRequest(
            "schedule weeklyWindows must not be empty".to_owned(),
        ));
    }
    let mut codes = BTreeSet::new();
    for window in &schedule.weekly_windows {
        let days = window.days_of_week.iter().copied().collect::<BTreeSet<_>>();
        let start = NaiveTime::parse_from_str(&window.start_time, "%H:%M:%S").map_err(|_| {
            AdminPricingCommandBuildError::BadRequest(
                "schedule startTime must use HH:mm:ss".to_owned(),
            )
        })?;
        let end = NaiveTime::parse_from_str(&window.end_time, "%H:%M:%S").map_err(|_| {
            AdminPricingCommandBuildError::BadRequest(
                "schedule endTime must use HH:mm:ss".to_owned(),
            )
        })?;
        if window.window_code.trim().is_empty()
            || !codes.insert(window.window_code.as_str())
            || days.is_empty()
            || days.len() != window.days_of_week.len()
            || days.iter().any(|day| !(1..=7).contains(day))
            || !matches!(window.end_day_offset, 0 | 1)
            || (window.end_day_offset == 0 && end <= start)
            || (window.end_day_offset == 1 && end >= start)
        {
            return Err(AdminPricingCommandBuildError::BadRequest(
                "schedule weekly window is invalid".to_owned(),
            ));
        }
    }
    let include_dates = parse_schedule_dates(&schedule.include_dates)?;
    let exclude_dates = parse_schedule_dates(&schedule.exclude_dates)?;
    if include_dates.intersection(&exclude_dates).next().is_some() {
        return Err(AdminPricingCommandBuildError::BadRequest(
            "schedule date cannot be both included and excluded".to_owned(),
        ));
    }
    Ok(Some(value.clone()))
}

fn parse_schedule_dates(
    values: &[String],
) -> Result<BTreeSet<NaiveDate>, AdminPricingCommandBuildError> {
    let mut dates = BTreeSet::new();
    for value in values {
        let date = NaiveDate::parse_from_str(value, "%Y-%m-%d").map_err(|_| {
            AdminPricingCommandBuildError::BadRequest(
                "schedule dates must use YYYY-MM-DD".to_owned(),
            )
        })?;
        if !dates.insert(date) {
            return Err(AdminPricingCommandBuildError::BadRequest(
                "schedule dates must be unique".to_owned(),
            ));
        }
    }
    Ok(dates)
}

fn normalize_currency_code(value: Option<&str>) -> Result<String, AdminPricingCommandBuildError> {
    let normalized = normalize_required_text(value, "currencyCode", 10)?;
    let uppercase = normalized.to_ascii_uppercase();
    if !uppercase
        .chars()
        .all(|character| character.is_ascii_uppercase())
        || uppercase.chars().count() != 3
    {
        return Err(AdminPricingCommandBuildError::BadRequest(
            "currencyCode must be a 3-letter ISO currency code".to_owned(),
        ));
    }
    Ok(uppercase)
}

fn normalize_decimal_value(
    value: Option<&Value>,
    field_name: &str,
) -> Result<String, AdminPricingCommandBuildError> {
    normalize_optional_decimal_value(value, field_name)?.ok_or_else(|| {
        AdminPricingCommandBuildError::BadRequest(format!("{field_name} is required"))
    })
}

fn normalize_optional_decimal_value(
    value: Option<&Value>,
    field_name: &str,
) -> Result<Option<String>, AdminPricingCommandBuildError> {
    let raw = match value {
        Some(Value::String(value)) => value.trim().to_owned(),
        Some(Value::Number(value)) => value.to_string(),
        Some(_) => {
            return Err(AdminPricingCommandBuildError::BadRequest(format!(
                "{field_name} must be a number or string"
            )));
        }
        None => return Ok(None),
    };
    if raw.is_empty() {
        return Ok(None);
    }
    if !is_decimal_text(&raw) {
        return Err(AdminPricingCommandBuildError::BadRequest(format!(
            "{field_name} must be a non-negative decimal with at most 12 decimal places"
        )));
    }
    Ok(Some(canonicalize_decimal(&raw)))
}

fn is_decimal_text(value: &str) -> bool {
    let (whole, fraction) = match value.split_once('.') {
        Some((whole, fraction)) => (whole, fraction),
        None => (value, ""),
    };
    !whole.is_empty()
        && whole.bytes().all(|byte| byte.is_ascii_digit())
        && fraction.chars().count() <= MAX_DECIMAL_FRACTION_DIGITS
        && fraction.bytes().all(|byte| byte.is_ascii_digit())
}

fn canonicalize_decimal(value: &str) -> String {
    let (whole, fraction) = match value.split_once('.') {
        Some((whole, fraction)) => (whole, fraction),
        None => (value, ""),
    };
    let whole = whole.trim_start_matches('0');
    let whole = if whole.is_empty() { "0" } else { whole };
    if fraction.is_empty() {
        whole.to_owned()
    } else {
        let fraction = fraction.trim_end_matches('0');
        if fraction.is_empty() {
            whole.to_owned()
        } else {
            format!("{whole}.{fraction}")
        }
    }
}

fn normalize_optional_pricing_id(value: Option<&str>) -> Result<Option<String>, String> {
    let Some(value) = value else {
        return Ok(None);
    };
    let normalized = value.trim();
    if normalized.is_empty() {
        return Ok(None);
    }
    if normalized.chars().count() > 64 || normalized.parse::<i64>().is_err() {
        return Err("id must be an integer".to_owned());
    }
    Ok(Some(normalized.to_owned()))
}

fn normalize_required_pricing_id(
    value: Option<&str>,
    field_name: &str,
) -> Result<String, AdminPricingCommandBuildError> {
    match normalize_optional_pricing_id(value) {
        Ok(Some(value)) => Ok(value),
        Ok(None) => Err(AdminPricingCommandBuildError::BadRequest(format!(
            "{field_name} is required"
        ))),
        Err(message) => Err(AdminPricingCommandBuildError::BadRequest(format!(
            "{field_name} {message}"
        ))),
    }
}

fn normalize_pricing_path_id(value: &str, field_name: &str) -> Result<String, String> {
    normalize_optional_pricing_id(Some(value))?.ok_or_else(|| format!("{field_name} is required"))
}

fn normalize_optional_non_negative_integer(
    value: Option<&Value>,
    field_name: &str,
) -> Result<Option<i64>, AdminPricingCommandBuildError> {
    let parsed = match value {
        Some(Value::Number(value)) => value.as_i64(),
        Some(Value::String(value)) => value.trim().parse::<i64>().ok(),
        Some(_) => None,
        None => return Ok(None),
    }
    .ok_or_else(|| {
        AdminPricingCommandBuildError::BadRequest(format!(
            "{field_name} must be a non-negative integer"
        ))
    })?;
    if parsed < 0 {
        return Err(AdminPricingCommandBuildError::BadRequest(format!(
            "{field_name} must be a non-negative integer"
        )));
    }
    Ok(Some(parsed))
}

fn generate_entity_uuid(
    state: &AdminPricingState,
) -> Result<String, AdminPricingCommandBuildError> {
    state
        .entity_uuid_generator
        .generate_entity_uuid()
        .map_err(AdminPricingCommandBuildError::System)
}

fn request_id_error(error: RequestIdError) -> AdminPricingCommandBuildError {
    match error {
        RequestIdError::Invalid(message) => AdminPricingCommandBuildError::BadRequest(message),
        RequestIdError::System(message) => {
            AdminPricingCommandBuildError::System(DomainError::new(message))
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

fn command_build_error_response(error: AdminPricingCommandBuildError) -> Response {
    match error {
        AdminPricingCommandBuildError::BadRequest(message) => bad_request(message),
        AdminPricingCommandBuildError::System(error) => {
            pricing_system_response("pricing command is invalid", error)
        }
    }
}

fn pricing_system_response(context: &str, error: DomainError) -> Response {
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

#[cfg(test)]
mod tests {
    use super::{normalize_optional_datetime, validate_datetime_order};

    #[test]
    fn datetime_normalization_requires_explicit_timezone() {
        let normalized =
            normalize_optional_datetime(Some("2026-08-18T00:00:00+08:00"), "effectiveFrom")
                .unwrap_or_else(|_| None)
                .expect("valid RFC3339 timestamp");
        assert_eq!(normalized, "2026-08-18T00:00:00+08:00");
        assert!(normalize_optional_datetime(Some("2026-08-18 00:00:00"), "effectiveFrom").is_err());
    }

    #[test]
    fn datetime_order_is_rejected_before_persistence() {
        assert!(validate_datetime_order(
            Some("2026-08-19T00:00:00Z"),
            Some("2026-08-18T00:00:00Z"),
        )
        .is_err());
        assert!(validate_datetime_order(
            Some("2026-08-18T00:00:00Z"),
            Some("2026-08-19T00:00:00Z"),
        )
        .is_ok());
    }
}
