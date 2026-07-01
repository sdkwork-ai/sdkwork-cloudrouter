use std::sync::Arc;
use crate::api::admin_sql_subject::RequiredAdminSqlScopedSubject;

use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, patch, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::request_id::{generate_server_request_id, RequestIdError};
use crate::api::response::{problem_from_wire_code, success_envelope};
use crate::domain::{DecimalValue, DomainError};
use crate::ports::{
    AdminServiceProviderCollection, AdminServiceProviderDashboardItem,
    AdminServiceProviderDownstreamMutationItem, AdminServiceProviderPriceSimulationCommand,
    AdminServiceProviderPriceSimulationItem, AdminServiceProviderPricingRuleMutationItem,
    AdminServiceProviderStore, AdminServiceProviderSubject,
    CreateAdminServiceProviderDownstreamCommand, CreateAdminServiceProviderPricingRuleCommand,
    ListAdminServiceProviderRecordsQuery, UpdateAdminServiceProviderPricingRuleCommand,
};

const DEFAULT_PAGE_NO: i64 = 1;
const DEFAULT_PAGE_SIZE: i64 = 100;
const MAX_PAGE_SIZE: i64 = 200;
const MAX_STATUS_LEN: usize = 32;
const MAX_ID_LEN: usize = 128;
const MAX_PROVIDER_NO_LEN: usize = 64;
const MAX_DISPLAY_NAME_LEN: usize = 128;
const MAX_PROVIDER_TYPE_LEN: usize = 64;
const MAX_CURRENCY_LEN: usize = 10;
const MAX_SETTLEMENT_MODE_LEN: usize = 32;
const MAX_PRICE_PLAN_CODE_LEN: usize = 64;
const MAX_CATALOG_KEY_LEN: usize = 256;
const MAX_MODEL_LEN: usize = 128;
const MAX_METER_LEN: usize = 64;
const MAX_TOKEN_KIND_LEN: usize = 64;
const MAX_QUANTITY_LEN: usize = 64;
const MAX_DECIMAL_LEN: usize = 64;
const MAX_REQUEST_ID_LEN: usize = 128;
const IDEMPOTENCY_KEY_HEADER: &str = "Idempotency-Key";

#[derive(Clone)]
struct AdminServiceProviderState {
    store: Arc<dyn AdminServiceProviderStore + Send + Sync>,
}

#[derive(Debug, Deserialize)]
struct AdminServiceProviderListRequestQuery {
    page: Option<i64>,
    page_size: Option<i64>,
    status: Option<String>,
    provider_id: Option<String>,
    seller_provider_id: Option<String>,
    buyer_provider_id: Option<String>,
    edge_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServiceProviderPriceSimulationRequest {
    buyer_provider_id: String,
    catalog_key: Option<String>,
    model: Option<String>,
    billing_meter_code: String,
    token_kind: Option<String>,
    quantity: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServiceProviderDownstreamCreateRequest {
    seller_provider_id: String,
    provider_no: String,
    display_name: String,
    provider_type: Option<String>,
    default_currency: Option<String>,
    settlement_mode: Option<String>,
    price_plan_code: Option<String>,
    default_multiplier: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServiceProviderPricingRuleCreateRequest {
    seller_provider_id: String,
    buyer_provider_id: String,
    edge_id: Option<String>,
    price_plan_id: Option<String>,
    catalog_key: Option<String>,
    model: Option<String>,
    billing_meter_code: String,
    token_kind: Option<String>,
    unit_price: String,
    unit_size: String,
    minimum_charge: String,
    currency: Option<String>,
    priority: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServiceProviderPricingRuleUpdateRequest {
    unit_price: Option<String>,
    unit_size: Option<String>,
    minimum_charge: Option<String>,
    priority: Option<i32>,
    status: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceProviderDashboardResponse {
    item: AdminServiceProviderDashboardItem,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceProviderCollectionResponse {
    items: Vec<serde_json::Map<String, serde_json::Value>>,
    total: i64,
    page: i64,
    page_size: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceProviderPriceSimulationResponse {
    item: AdminServiceProviderPriceSimulationItem,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceProviderDownstreamMutationResponse {
    item: AdminServiceProviderDownstreamMutationItem,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceProviderPricingRuleMutationResponse {
    item: AdminServiceProviderPricingRuleMutationItem,
}

pub fn admin_service_provider_router_with_store(
    store: Arc<dyn AdminServiceProviderStore + Send + Sync>,
) -> Router {
    Router::new()
        .route(
            "/backend/v3/api/service_providers/dashboard",
            get(fetch_dashboard),
        )
        .route(
            "/backend/v3/api/service_providers/providers",
            get(list_providers),
        )
        .route(
            "/backend/v3/api/service_providers/relations",
            get(list_relations),
        )
        .route(
            "/backend/v3/api/service_providers/downstreams",
            get(list_downstreams).post(create_downstream),
        )
        .route(
            "/backend/v3/api/service_providers/members",
            get(list_members),
        )
        .route(
            "/backend/v3/api/service_providers/bindings",
            get(list_bindings),
        )
        .route(
            "/backend/v3/api/service_providers/contracts",
            get(list_contracts),
        )
        .route(
            "/backend/v3/api/service_providers/pricing/rules",
            get(list_pricing_rules).post(create_pricing_rule),
        )
        .route(
            "/backend/v3/api/service_providers/pricing/rules/{rule_id}",
            patch(update_pricing_rule),
        )
        .route(
            "/backend/v3/api/service_providers/pricing/simulations",
            post(simulate_price),
        )
        .route("/backend/v3/api/service_providers/usage", get(list_usage))
        .route(
            "/backend/v3/api/service_providers/wallet/accounts",
            get(list_wallet_accounts),
        )
        .route(
            "/backend/v3/api/service_providers/statements",
            get(list_statements),
        )
        .route(
            "/backend/v3/api/service_providers/reconciliation_runs",
            get(list_reconciliation_runs),
        )
        .route(
            "/backend/v3/api/service_providers/adjustments",
            get(list_adjustments),
        )
        .route(
            "/backend/v3/api/service_providers/risk/events",
            get(list_risk_events),
        )
        .route(
            "/backend/v3/api/service_providers/audit/events",
            get(list_audit_events),
        )
        .with_state(AdminServiceProviderState { store })
}

async fn fetch_dashboard(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    let query = match validated_list_query(scoped, query) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match state.store.retrieve_dashboard(query).await {
        Ok(item) => Json(success_envelope(ServiceProviderDashboardResponse {
            item,
        }))
        .into_response(),
        Err(error) => {
            service_provider_system_response("service provider dashboard is unavailable", error)
        }
    }
}

async fn list_providers(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_providers(query)).await
}

async fn list_relations(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_relations(query)).await
}

async fn list_downstreams(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_downstreams(query)).await
}

async fn create_downstream(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<ServiceProviderDownstreamCreateRequest>,
) -> Response {
    let command = match validated_downstream_create_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.create_downstream(command).await {
        Ok(item) => Json(success_envelope(
            ServiceProviderDownstreamMutationResponse { item },
        ))
        .into_response(),
        Err(error) => service_provider_error_response(
            "service provider downstream create is unavailable",
            error,
        ),
    }
}

async fn list_members(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_members(query)).await
}

async fn list_bindings(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_bindings(query)).await
}

async fn list_contracts(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_contracts(query)).await
}

async fn list_pricing_rules(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_pricing_rules(query)
    })
    .await
}

async fn create_pricing_rule(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<ServiceProviderPricingRuleCreateRequest>,
) -> Response {
    let command = match validated_pricing_rule_create_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.create_pricing_rule(command).await {
        Ok(item) => Json(success_envelope(
            ServiceProviderPricingRuleMutationResponse { item },
        ))
        .into_response(),
        Err(error) => service_provider_error_response(
            "service provider price rule create is unavailable",
            error,
        ),
    }
}

async fn update_pricing_rule(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Path(rule_id): Path<String>,
    Json(request): Json<ServiceProviderPricingRuleUpdateRequest>,
) -> Response {
    let command = match validated_pricing_rule_update_command(scoped, &headers, rule_id, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.update_pricing_rule(command).await {
        Ok(item) => Json(success_envelope(
            ServiceProviderPricingRuleMutationResponse { item },
        ))
        .into_response(),
        Err(error) => service_provider_error_response(
            "service provider price rule update is unavailable",
            error,
        ),
    }
}

async fn simulate_price(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: HeaderMap,
    Json(request): Json<ServiceProviderPriceSimulationRequest>,
) -> Response {
    let command = match validated_price_simulation_command(scoped, &headers, request) {
        Ok(command) => command,
        Err(response) => return response,
    };
    match state.store.simulate_price(command).await {
        Ok(item) => Json(success_envelope(
            ServiceProviderPriceSimulationResponse { item },
        ))
        .into_response(),
        Err(error) => service_provider_system_response(
            "service provider price simulation is unavailable",
            error,
        ),
    }
}

async fn list_usage(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_usage(query)).await
}

async fn list_wallet_accounts(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_wallet_accounts(query)
    })
    .await
}

async fn list_statements(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_statements(query)).await
}

async fn list_reconciliation_runs(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| {
        state.store.list_reconciliation_runs(query)
    })
    .await
}

async fn list_adjustments(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_adjustments(query)).await
}

async fn list_risk_events(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_risk_events(query)).await
}

async fn list_audit_events(
    State(state): State<AdminServiceProviderState>,
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    _headers: HeaderMap,
    Query(query): Query<AdminServiceProviderListRequestQuery>,
) -> Response {
    list_response(scoped, query, |query| state.store.list_audit_events(query)).await
}

async fn list_response<'a, F>(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    query: AdminServiceProviderListRequestQuery,
    load: F,
) -> Response
where
    F: FnOnce(
        ListAdminServiceProviderRecordsQuery,
    ) -> crate::ports::AdminServiceProviderCommandFuture<
        'a,
        AdminServiceProviderCollection,
    >,
{
    let query = match validated_list_query(scoped, query) {
        Ok(query) => query,
        Err(response) => return response,
    };
    match load(query).await {
        Ok(collection) => collection_response(collection),
        Err(error) => {
            service_provider_system_response("service provider collection is unavailable", error)
        }
    }
}

fn collection_response(collection: AdminServiceProviderCollection) -> Response {
    Json(success_envelope(ServiceProviderCollectionResponse {
        items: collection.items,
        total: collection.total,
        page: collection.page_no,
        page_size: collection.page_size,
    }))
    .into_response()
}

fn validated_list_query(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    query: AdminServiceProviderListRequestQuery,
) -> Result<ListAdminServiceProviderRecordsQuery, Response> {
    let subject = scoped.into();
    let page_no = query.page.unwrap_or(DEFAULT_PAGE_NO);
    if page_no < 1 {
        return Err(bad_request("page must be greater than or equal to 1"));
    }
    let page_size = query.page_size.unwrap_or(DEFAULT_PAGE_SIZE);
    if !(1..=MAX_PAGE_SIZE).contains(&page_size) {
        return Err(bad_request(format!(
            "page_size must be between 1 and {MAX_PAGE_SIZE}"
        )));
    }
    let status = normalize_optional_text(query.status, "status", MAX_STATUS_LEN)?
        .map(|value| value.to_ascii_lowercase());
    Ok(ListAdminServiceProviderRecordsQuery {
        subject,
        page_no,
        page_size,
        offset: (page_no - 1) * page_size,
        status,
        provider_id: normalize_optional_text(query.provider_id, "providerId", MAX_ID_LEN)?,
        seller_provider_id: normalize_optional_text(
            query.seller_provider_id,
            "sellerProviderId",
            MAX_ID_LEN,
        )?,
        buyer_provider_id: normalize_optional_text(
            query.buyer_provider_id,
            "buyerProviderId",
            MAX_ID_LEN,
        )?,
        edge_id: normalize_optional_text(query.edge_id, "edgeId", MAX_ID_LEN)?,
    })
}

fn validated_price_simulation_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: ServiceProviderPriceSimulationRequest,
) -> Result<AdminServiceProviderPriceSimulationCommand, Response> {
    let subject = scoped.into();
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let request_id = Some(server_request_id()?);
    let quantity = normalize_required_text(request.quantity, "quantity", MAX_QUANTITY_LEN)?;
    let quantity_value = DecimalValue::parse(&quantity)
        .map_err(|_| bad_request("quantity must be a positive decimal"))?;
    if quantity_value <= DecimalValue::ZERO {
        return Err(bad_request("quantity must be a positive decimal"));
    }

    Ok(AdminServiceProviderPriceSimulationCommand {
        subject,
        buyer_provider_id: normalize_required_text(
            request.buyer_provider_id,
            "buyerProviderId",
            MAX_ID_LEN,
        )?,
        catalog_key: normalize_optional_text(
            request.catalog_key,
            "catalogKey",
            MAX_CATALOG_KEY_LEN,
        )?,
        model: normalize_optional_text(request.model, "model", MAX_MODEL_LEN)?,
        billing_meter_code: normalize_required_text(
            request.billing_meter_code,
            "billingMeterCode",
            MAX_METER_LEN,
        )?,
        token_kind: normalize_optional_text(request.token_kind, "tokenKind", MAX_TOKEN_KIND_LEN)?,
        quantity,
        idempotency_key,
        request_id,
    })
}

fn validated_downstream_create_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: ServiceProviderDownstreamCreateRequest,
) -> Result<CreateAdminServiceProviderDownstreamCommand, Response> {
    let subject = scoped.into();
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let request_id = Some(server_request_id()?);
    let default_multiplier = normalize_optional_text(
        request.default_multiplier,
        "defaultMultiplier",
        MAX_DECIMAL_LEN,
    )?;
    if let Some(value) = default_multiplier.as_deref() {
        validate_decimal(value, "defaultMultiplier", DecimalRule::NonNegative)?;
    }

    Ok(CreateAdminServiceProviderDownstreamCommand {
        subject,
        seller_provider_id: normalize_required_text(
            request.seller_provider_id,
            "sellerProviderId",
            MAX_ID_LEN,
        )?,
        provider_no: normalize_required_text(
            request.provider_no,
            "providerNo",
            MAX_PROVIDER_NO_LEN,
        )?,
        display_name: normalize_required_text(
            request.display_name,
            "displayName",
            MAX_DISPLAY_NAME_LEN,
        )?,
        provider_type: normalize_optional_text(
            request.provider_type,
            "providerType",
            MAX_PROVIDER_TYPE_LEN,
        )?,
        default_currency: normalize_optional_text(
            request.default_currency,
            "defaultCurrency",
            MAX_CURRENCY_LEN,
        )?,
        settlement_mode: normalize_optional_text(
            request.settlement_mode,
            "settlementMode",
            MAX_SETTLEMENT_MODE_LEN,
        )?,
        price_plan_code: normalize_optional_text(
            request.price_plan_code,
            "pricePlanCode",
            MAX_PRICE_PLAN_CODE_LEN,
        )?,
        default_multiplier,
        idempotency_key,
        request_id,
    })
}

fn validated_pricing_rule_create_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    request: ServiceProviderPricingRuleCreateRequest,
) -> Result<CreateAdminServiceProviderPricingRuleCommand, Response> {
    let subject = scoped.into();
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let request_id = Some(server_request_id()?);
    let unit_price = normalize_required_text(request.unit_price, "unitPrice", MAX_DECIMAL_LEN)?;
    let unit_size = normalize_required_text(request.unit_size, "unitSize", MAX_DECIMAL_LEN)?;
    let minimum_charge =
        normalize_required_text(request.minimum_charge, "minimumCharge", MAX_DECIMAL_LEN)?;
    validate_decimal(&unit_price, "unitPrice", DecimalRule::NonNegative)?;
    validate_decimal(&unit_size, "unitSize", DecimalRule::Positive)?;
    validate_decimal(&minimum_charge, "minimumCharge", DecimalRule::NonNegative)?;

    let edge_id = normalize_optional_text(request.edge_id, "edgeId", MAX_ID_LEN)?;
    let price_plan_id = normalize_optional_text(request.price_plan_id, "pricePlanId", MAX_ID_LEN)?;
    if edge_id.is_none() && price_plan_id.is_none() {
        return Err(bad_request("edgeId or pricePlanId is required"));
    }

    Ok(CreateAdminServiceProviderPricingRuleCommand {
        subject,
        seller_provider_id: normalize_required_text(
            request.seller_provider_id,
            "sellerProviderId",
            MAX_ID_LEN,
        )?,
        buyer_provider_id: normalize_required_text(
            request.buyer_provider_id,
            "buyerProviderId",
            MAX_ID_LEN,
        )?,
        edge_id,
        price_plan_id,
        catalog_key: normalize_optional_text(
            request.catalog_key,
            "catalogKey",
            MAX_CATALOG_KEY_LEN,
        )?,
        model: normalize_optional_text(request.model, "model", MAX_MODEL_LEN)?,
        billing_meter_code: normalize_required_text(
            request.billing_meter_code,
            "billingMeterCode",
            MAX_METER_LEN,
        )?,
        token_kind: normalize_optional_text(request.token_kind, "tokenKind", MAX_TOKEN_KIND_LEN)?,
        unit_price,
        unit_size,
        minimum_charge,
        currency: normalize_optional_text(request.currency, "currency", MAX_CURRENCY_LEN)?,
        priority: request.priority.unwrap_or_default(),
        idempotency_key,
        request_id,
    })
}

fn validated_pricing_rule_update_command(
    scoped: crate::api::admin_sql_subject::SqlScopedAdminSubject,
    headers: &HeaderMap,
    rule_id: String,
    request: ServiceProviderPricingRuleUpdateRequest,
) -> Result<UpdateAdminServiceProviderPricingRuleCommand, Response> {
    let subject = scoped.into();
    let idempotency_key = required_header(headers, IDEMPOTENCY_KEY_HEADER)?;
    let request_id = Some(server_request_id()?);
    let rule_id = normalize_required_text(rule_id, "ruleId", MAX_ID_LEN)?;
    let unit_price = normalize_optional_text(request.unit_price, "unitPrice", MAX_DECIMAL_LEN)?;
    let unit_size = normalize_optional_text(request.unit_size, "unitSize", MAX_DECIMAL_LEN)?;
    let minimum_charge =
        normalize_optional_text(request.minimum_charge, "minimumCharge", MAX_DECIMAL_LEN)?;
    if let Some(value) = unit_price.as_deref() {
        validate_decimal(value, "unitPrice", DecimalRule::NonNegative)?;
    }
    if let Some(value) = unit_size.as_deref() {
        validate_decimal(value, "unitSize", DecimalRule::Positive)?;
    }
    if let Some(value) = minimum_charge.as_deref() {
        validate_decimal(value, "minimumCharge", DecimalRule::NonNegative)?;
    }
    let status = normalize_optional_text(request.status, "status", MAX_STATUS_LEN)?
        .map(|value| value.to_ascii_lowercase());
    if unit_price.is_none()
        && unit_size.is_none()
        && minimum_charge.is_none()
        && request.priority.is_none()
        && status.is_none()
    {
        return Err(bad_request(
            "price rule update must include at least one field",
        ));
    }

    Ok(UpdateAdminServiceProviderPricingRuleCommand {
        subject,
        rule_id,
        unit_price,
        unit_size,
        minimum_charge,
        priority: request.priority,
        status,
        idempotency_key,
        request_id,
    })
}

#[derive(Clone, Copy)]
enum DecimalRule {
    Positive,
    NonNegative,
}

fn validate_decimal(value: &str, field_name: &str, rule: DecimalRule) -> Result<(), Response> {
    let decimal = DecimalValue::parse(value).map_err(|_| {
        bad_request(format!(
            "{field_name} must be {} decimal",
            match rule {
                DecimalRule::Positive => "a positive",
                DecimalRule::NonNegative => "a non-negative",
            }
        ))
    })?;
    match rule {
        DecimalRule::Positive if decimal <= DecimalValue::ZERO => Err(bad_request(format!(
            "{field_name} must be a positive decimal"
        ))),
        DecimalRule::NonNegative if decimal < DecimalValue::ZERO => Err(bad_request(format!(
            "{field_name} must be a non-negative decimal"
        ))),
        _ => Ok(()),
    }
}

fn server_request_id() -> Result<String, Response> {
    generate_server_request_id().map_err(request_id_error_response)
}

fn request_id_error_response(error: RequestIdError) -> Response {
    match error {
        RequestIdError::Invalid(message) => bad_request(message),
        RequestIdError::System(message) => service_provider_system_response(
            "request id generation failed",
            DomainError::new(message),
        ),
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
    normalize_optional_text(Some(value.to_owned()), name, MAX_REQUEST_ID_LEN)
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

fn not_found_response(message: impl Into<String>) -> Response {
    problem_from_wire_code("4040", message.into()).into_response()
}

fn conflict_response(error: DomainError) -> Response {
    problem_from_wire_code("4090", error.to_string()).into_response()
}

fn service_provider_error_response(context: &str, error: DomainError) -> Response {
    if error.is_not_found() {
        return not_found_response(error.to_string());
    }
    if error.is_conflict() {
        return conflict_response(error);
    }
    service_provider_system_response(context, error)
}

fn service_provider_system_response(context: &str, error: DomainError) -> Response {
    problem_from_wire_code("5000", format!("{context}: {error}")).into_response()
}
