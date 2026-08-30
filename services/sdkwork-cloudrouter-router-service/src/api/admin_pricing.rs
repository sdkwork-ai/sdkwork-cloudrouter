use std::collections::BTreeSet;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::http::HeaderMap;
use axum::response::{IntoResponse, Response};
use axum::routing::{delete, get, patch};
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
    CreateAdminPricingPlanCommand, CreateAdminPricingRuleCommand, CreateAdminRateCardCommand,
    DeleteAdminDefaultRegionCommand, DeleteAdminPricingRuleCommand, DeleteAdminRateCardCommand,
    ListAdminDefaultRegionsQuery, ListAdminPricingPlansQuery, ListAdminPricingRulesQuery,
    ListAdminRateCardsQuery, LoadAdminPricingPlanQuery, SaveAdminDefaultRegionCommand,
    UpdateAdminPricingPlanCommand, UpdateAdminPricingRuleCommand, UpdateAdminRateCardCommand,
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
struct DefaultRegionMutationRequest {
    catalog_key: Option<String>,
    vendor_code: Option<String>,
    product_code: Option<String>,
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
    product_code: String,
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
            delete(delete_default_region),
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
        product_code: mutation.product_code,
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
        product_code: normalize_required_text(request.product_code.as_deref(), "productCode", 160)?,
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
