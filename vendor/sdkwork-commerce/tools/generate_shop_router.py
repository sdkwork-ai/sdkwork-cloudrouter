#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "crates/sdkwork-commerce-api-server/src/shop_router.rs"

LIST_PUT = [
    ("category_bindings", "list_category_bindings", "upsert_category_bindings"),
    ("brand_authorizations", "list_brand_authorizations", "upsert_brand_authorizations"),
    ("qualifications", "list_qualifications", "upsert_qualifications"),
    ("customer_services", "list_customer_services", "upsert_customer_services"),
    ("return_addresses", "list_return_addresses", "upsert_return_addresses"),
    ("shipping_templates", "list_shipping_templates", "upsert_shipping_templates"),
]

PATCH_SINGLE = [
    ("fulfillment_profile", "find_fulfillment_profile", "upsert_fulfillment_profile"),
    ("settlement_profile", "find_settlement_profile", "upsert_settlement_profile"),
    ("business_hours", "find_business_hours", "upsert_business_hours"),
]

LIST_ONLY = [
    ("applications", "list_applications"),
    ("verifications", "list_verifications"),
    ("status_events", "list_status_events"),
    ("channels", "list_channels"),
    ("service_areas", "list_service_areas"),
    ("policies", "list_policies"),
    ("risk_signals", "list_risk_signals"),
]

STORE_METHODS = [
    ("list_shops", "ShopListQuery", "ShopPage<ShopSummaryView>"),
    ("retrieve_shop", "ShopDetailQuery", "Option<ShopSummaryView>"),
    ("retrieve_current_shop", "ShopScopeQuery", "Option<ShopSummaryView>"),
    ("list_dashboard_snapshots", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("list_category_bindings", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("upsert_category_bindings", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("list_brand_authorizations", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("upsert_brand_authorizations", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("list_qualifications", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("upsert_qualifications", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("list_customer_services", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("upsert_customer_services", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("list_return_addresses", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("upsert_return_addresses", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("list_shipping_templates", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("upsert_shipping_templates", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("list_applications", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("upsert_applications", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("list_verifications", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("list_status_events", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("list_channels", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("upsert_channels", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("find_fulfillment_profile", "ShopScopeQuery", "Option<serde_json::Value>"),
    ("upsert_fulfillment_profile", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("find_settlement_profile", "ShopScopeQuery", "Option<serde_json::Value>"),
    ("upsert_settlement_profile", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("find_business_hours", "ShopScopeQuery", "Option<serde_json::Value>"),
    ("upsert_business_hours", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("find_readiness", "ShopScopeQuery", "Option<serde_json::Value>"),
    ("find_deposit_account", "ShopScopeQuery", "Option<serde_json::Value>"),
    ("list_service_areas", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("upsert_service_areas", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("list_policies", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("upsert_policies", "ShopScopeQuery, serde_json::Value", "serde_json::Value"),
    ("list_risk_signals", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("list_shop_orders", "ShopScopeQuery, u32, u32", "ShopPage<serde_json::Value>"),
    ("retrieve_shop_order", "ShopScopeQuery, String", "Option<serde_json::Value>"),
    ("create_shop_fulfillment", "ShopScopeQuery, String, serde_json::Value", "serde_json::Value"),
    ("list_settlements", "ShopScopeQuery", "ShopPage<serde_json::Value>"),
    ("list_inventory_stocks", "ShopScopeQuery", "Vec<serde_json::Value>"),
    ("create_inventory_adjustment", "ShopScopeQuery, String, serde_json::Value", "serde_json::Value"),
]


def trait_methods() -> str:
    lines = []
    for name, args, ret in STORE_METHODS:
        lines.append(
            f"    fn {name}<'a>(&'a self, query: {args.split(',')[0].strip() if ',' not in args else args}) -> CommerceShopFuture<'a, {ret}>;"
            if "," not in args
            else f"    fn {name}<'a>(&'a self, {', '.join(f'{part.strip()}' for part in args.split(','))}) -> CommerceShopFuture<'a, {ret}>;"
        )
    return "\n".join(lines)


def forward_impl(store: str) -> str:
    out = []
    for name, args, _ret in STORE_METHODS:
        arg_names = []
        for part in args.split(","):
            part = part.strip()
            if part == "ShopListQuery":
                arg_names.append("query")
            elif part == "ShopDetailQuery":
                arg_names.append("query")
            elif part == "ShopScopeQuery":
                arg_names.append("scope")
            elif part == "serde_json::Value":
                arg_names.append("payload")
            elif part == "u32":
                arg_names.append("page" if "page" not in arg_names else "page_size")
            elif part == "String":
                arg_names.append("order_id" if "order" in name else "stock_id")
        call_args = ", ".join(f"&{a}" if a in {"order_id", "stock_id"} else a for a in arg_names)
        out.append(
            f"    fn {name}<'a>(&'a self, {args}) -> CommerceShopFuture<'a, _ret> {{\n        Box::pin(async move {{ self.{name}({call_args}).await }})\n    }}"
        )
    return "\n\n".join(out)


def list_handler(path: str, method: str) -> str:
    fn = f"list_current_{path}"
    return f"""
async fn {fn}(
    State(state): State<AppShopState>,
    runtime_context: Option<Extension<IamAppContext>>,
) -> Response {{
    current_list_handler(state, runtime_context, |store, scope| store.{method}(scope)).await
}}
"""


def put_handler(path: str, method: str) -> str:
    fn = f"upsert_current_{path}"
    return f"""
async fn {fn}(
    State(state): State<AppShopState>,
    runtime_context: Option<Extension<IamAppContext>>,
    Json(body): Json<serde_json::Value>,
) -> Response {{
    current_write_handler(state, runtime_context, body, |store, scope, body| store.{method}(scope, body)).await
}}
"""


def get_single_handler(path: str, method: str) -> str:
    fn = f"get_current_{path}"
    return f"""
async fn {fn}(
    State(state): State<AppShopState>,
    runtime_context: Option<Extension<IamAppContext>>,
) -> Response {{
    current_single_handler(state, runtime_context, |store, scope| store.{method}(scope)).await
}}
"""


def patch_handler(path: str, method: str) -> str:
    fn = f"patch_current_{path}"
    return put_handler(path, method).replace(f"async fn upsert_current_{path}", f"async fn {fn}")


def main() -> None:
    handlers = []
    routes = []

    for path, list_m, put_m in LIST_PUT:
        handlers.append(list_handler(path, list_m))
        handlers.append(put_handler(path, put_m))
        routes.append(
            f'.route("/app/v3/api/shops/current/{path}", get(list_current_{path}).put(upsert_current_{path}))'
        )

    for path, get_m, patch_m in PATCH_SINGLE:
        handlers.append(get_single_handler(path, get_m))
        handlers.append(patch_handler(path, patch_m))
        routes.append(
            f'.route("/app/v3/api/shops/current/{path}", get(get_current_{path}).patch(patch_current_{path}))'
        )

    for path, list_m in LIST_ONLY:
        handlers.append(list_handler(path, list_m))
        routes.append(f'.route("/app/v3/api/shops/current/{path}", get(list_current_{path}))')

    route_lines = "\n            ".join(routes)
    handler_block = "".join(handlers)
    trait_block = trait_methods()
    forward_sqlite = forward_impl("SqliteCommerceShopStore")
    forward_postgres = forward_impl("PostgresCommerceShopStore")

    content = """use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use axum::extract::{{Extension, Path, Query, State}};
use axum::http::StatusCode;
use axum::response::{{IntoResponse, Response}};
use axum::routing::{{get, patch, post}};
use axum::{{Json, Router}};
use sdkwork_commerce_catalog_service::{{ArchiveSpuCommand, CreateProductSpuCommand, ProductSpuListQuery, PublishSpuCommand, UpdateProductSpuCommand}};
use sdkwork_commerce_contract_service::CommerceServiceError;
use sdkwork_commerce_shop_service::{{ShopDetailQuery, ShopListQuery, ShopPage, ShopScopeQuery, ShopSummaryView}};
use sdkwork_commerce_storage_repository_sqlx::{{PostgresCommerceCatalogStore, PostgresCommerceShopStore, SqliteCommerceCatalogStore, SqliteCommerceShopStore}};
use sdkwork_iam_context_service::IamAppContext;
use serde::{{Deserialize, Serialize}};
use sqlx::{{PgPool, SqlitePool}};

use crate::catalog_router::{{CommerceCatalogStore, CreateSpuBody, UpdateSpuBody, map_spu}};
use crate::subject::app_runtime_subject_from_extension;
use crate::with_request_identity;

pub type CommerceShopFuture<'a, T> = Pin<Box<dyn Future<Output = Result<T, CommerceServiceError>> + Send + 'a>>;

pub trait CommerceShopStore: Send + Sync {
__TRAIT_METHODS__
}

impl CommerceShopStore for SqliteCommerceShopStore {
__FORWARD_SQLITE__
}

impl CommerceShopStore for PostgresCommerceShopStore {
__FORWARD_POSTGRES__
}

#[derive(Clone)]
struct AppShopState {{
    shop: Arc<dyn CommerceShopStore>,
    catalog: Arc<dyn CommerceCatalogStore>,
}}

#[derive(Debug, Deserialize)]
struct ShopListParams {{ page: Option<u32>, page_size: Option<u32> }}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppShopApiResult<T: Serialize> {{ code: String, msg: String, #[serde(skip_serializing_if = "Option::is_none")] data: Option<T> }}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ShopSummaryResponse {{
    id: String,
    tenant_id: String,
    organization_id: String,
    shop_no: String,
    shop_name: String,
    shop_type: String,
    business_model: String,
    storefront_status: String,
    operation_status: String,
    review_status: String,
    data_scope: String,
    #[serde(skip_serializing_if = "Option::is_none")] logo_media_resource_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] cover_media_resource_id: Option<String>,
    default_currency_code: String,
    #[serde(skip_serializing_if = "Option::is_none")] default_locale: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] timezone: Option<String>,
    version: i64,
    created_at: String,
    updated_at: String,
}}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PageInfo {{ page: u32, page_size: u32, total: u64 }}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ListData<T: Serialize> {{ items: Vec<T>, page_info: PageInfo }}

impl<T: Serialize> AppShopApiResult<T> {{
    fn success(data: T) -> Self {{ Self {{ code: "0".into(), msg: "success".into(), data: Some(data) }} }}
    fn error(code: &str, msg: impl Into<String>) -> Self {{ Self {{ code: code.into(), msg: msg.into(), data: None }} }}
}}

pub fn app_shop_router_with_sqlite_pool(pool: SqlitePool) -> Router {{
    app_shop_router_with_stores(Arc::new(SqliteCommerceShopStore::new(pool.clone())), Arc::new(SqliteCommerceCatalogStore::new(pool)))
}}

pub fn app_shop_router_with_postgres_pool(pool: PgPool) -> Router {{
    app_shop_router_with_stores(Arc::new(PostgresCommerceShopStore::new(pool.clone())), Arc::new(PostgresCommerceCatalogStore::new(pool)))
}}

pub fn app_shop_router_with_stores(shop: Arc<dyn CommerceShopStore>, catalog: Arc<dyn CommerceCatalogStore>) -> Router {{
    with_request_identity(
        Router::new()
            .route("/app/v3/api/shops", get(list_shops))
            .route("/app/v3/api/shops/{{shopId}}", get(retrieve_shop))
            .route("/app/v3/api/shops/current", get(retrieve_current_shop))
            .route("/app/v3/api/shops/current/dashboard", get(retrieve_current_dashboard))
            .route("/app/v3/api/shops/current/readiness", get(get_current_readiness))
            __ROUTE_LINES__
            .route("/app/v3/api/shops/current/channels/{{channelId}}", patch(patch_current_channel))
            .route("/app/v3/api/shops/current/service_areas", post(create_current_service_area))
            .route("/app/v3/api/shops/current/service_areas/{{serviceAreaId}}", patch(patch_current_service_area))
            .route("/app/v3/api/shops/current/policies/{{policyId}}", patch(patch_current_policy))
            .route("/app/v3/api/shops/current/applications", post(create_current_application))
            .route("/app/v3/api/shops/current/deposit_account", get(get_current_deposit_account))
            .route("/app/v3/api/shops/current/products", get(list_current_products).post(create_current_product))
            .route("/app/v3/api/shops/current/products/{{productId}}", patch(update_current_product))
            .route("/app/v3/api/shops/current/products/{{productId}}/publish", post(publish_current_product))
            .route("/app/v3/api/shops/current/products/{{productId}}/unpublish", post(unpublish_current_product))
            .route("/app/v3/api/shops/current/inventory/stocks", get(list_current_inventory_stocks))
            .route("/app/v3/api/shops/current/inventory/stocks/{{stockId}}/adjustments", post(create_current_inventory_adjustment))
            .route("/app/v3/api/shops/current/orders", get(list_current_orders))
            .route("/app/v3/api/shops/current/orders/{{orderId}}", get(retrieve_current_order))
            .route("/app/v3/api/shops/current/orders/{{orderId}}/fulfillments", post(create_current_order_fulfillment))
            .route("/app/v3/api/shops/current/settlements", get(list_current_settlements))
            .with_state(AppShopState {{ shop, catalog }}),
    )
}}

async fn current_scope(runtime_context: Option<Extension<IamAppContext>>) -> Result<ShopScopeQuery, Response> {{
    let subject = app_runtime_subject_from_extension(runtime_context).map_err(unauthorized_response)?;
    ShopScopeQuery::new(&subject.tenant_id, subject.organization_id.as_deref()).map_err(validation_response)
}}

async fn current_list_handler<F, Fut>(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>, fetch: F) -> Response
where
    F: FnOnce(Arc<dyn CommerceShopStore>, ShopScopeQuery) -> Fut,
    Fut: Future<Output = Result<Vec<serde_json::Value>, CommerceServiceError>>,
{{
    let scope = match current_scope(runtime_context).await {{ Ok(scope) => scope, Err(resp) => return resp }};
    match fetch(state.shop, scope).await {{
        Ok(items) => {{
            let total = items.len() as u64;
            Json(AppShopApiResult::success(list_data(items, 1, 20, total))).into_response()
        }}
        Err(error) => shop_system_response("shop read model is unavailable", error),
    }}
}}

async fn current_single_handler<F, Fut>(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>, fetch: F) -> Response
where
    F: FnOnce(Arc<dyn CommerceShopStore>, ShopScopeQuery) -> Fut,
    Fut: Future<Output = Result<Option<serde_json::Value>, CommerceServiceError>>,
{{
    let scope = match current_scope(runtime_context).await {{ Ok(scope) => scope, Err(resp) => return resp }};
    match fetch(state.shop, scope).await {{
        Ok(Some(item)) => Json(AppShopApiResult::success(item)).into_response(),
        Ok(None) => not_found_response("shop resource was not found"),
        Err(error) => shop_system_response("shop read model is unavailable", error),
    }}
}}

async fn current_write_handler<F, Fut>(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>, body: serde_json::Value, write: F) -> Response
where
    F: FnOnce(Arc<dyn CommerceShopStore>, ShopScopeQuery, serde_json::Value) -> Fut,
    Fut: Future<Output = Result<serde_json::Value, CommerceServiceError>>,
{{
    let scope = match current_scope(runtime_context).await {{ Ok(scope) => scope, Err(resp) => return resp }};
    match write(state.shop, scope, body).await {{
        Ok(item) => Json(AppShopApiResult::success(item)).into_response(),
        Err(error) => shop_system_response("shop write model is unavailable", error),
    }}
}}

__HANDLER_BLOCK__

async fn list_shops(State(state): State<AppShopState>, runtime_context: Option<Extension<IamAppContext>>, Query(params): Query<ShopListParams>) -> Response {{
    let subject = match app_runtime_subject_from_extension(runtime_context) {{ Ok(v) => v, Err(m) => return unauthorized_response(m) }};
    let query = match ShopListQuery::new(&subject.tenant_id, subject.organization_id.as_deref(), params.page.unwrap_or(1), params.page_size.unwrap_or(20)) {{ Ok(v) => v, Err(e) => return validation_response(e.message()) }};
    match state.shop.list_shops(query).await {{
        Ok(page) => Json(AppShopApiResult::success(list_data(page.items.into_iter().map(map_shop_summary).collect(), page.page, page.page_size, page.total))).into_response(),
        Err(error) => shop_system_response("shop list is unavailable", error),
    }}
}}

async fn retrieve_shop(State(state): State<AppShopState>, runtime_context: Option<Extension<IamAppContext>>, Path(shop_id): Path<String>) -> Response {{
    let subject = match app_runtime_subject_from_extension(runtime_context) {{ Ok(v) => v, Err(m) => return unauthorized_response(m) }};
    let query = match ShopDetailQuery::new(&subject.tenant_id, subject.organization_id.as_deref(), &shop_id) {{ Ok(v) => v, Err(e) => return validation_response(e.message()) }};
    match state.shop.retrieve_shop(query).await {{
        Ok(Some(shop)) => Json(AppShopApiResult::success(map_shop_summary(shop))).into_response(),
        Ok(None) => not_found_response("shop was not found"),
        Err(error) => shop_system_response("shop read model is unavailable", error),
    }}
}}

async fn retrieve_current_shop(State(state): State<AppShopState>, runtime_context: Option<Extension<IamAppContext>>) -> Response {{
    let scope = match current_scope(runtime_context).await {{ Ok(v) => v, Err(r) => return r }};
    match state.shop.retrieve_current_shop(scope).await {{
        Ok(Some(shop)) => Json(AppShopApiResult::success(map_shop_summary(shop))).into_response(),
        Ok(None) => not_found_response("current shop was not found"),
        Err(error) => shop_system_response("shop read model is unavailable", error),
    }}
}}

async fn retrieve_current_dashboard(State(state): State<AppShopState>, runtime_context: Option<Extension<IamAppContext>>) -> Response {{
    let scope = match current_scope(runtime_context).await {{ Ok(v) => v, Err(r) => return r }};
    match state.shop.list_dashboard_snapshots(scope).await {{
        Ok(items) => Json(AppShopApiResult::success(serde_json::json!({{"snapshots": items}}))).into_response(),
        Err(error) => shop_system_response("shop dashboard is unavailable", error),
    }}
}}

async fn get_current_readiness(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>) -> Response {{
    current_single_handler(state, runtime_context, |store, scope| store.find_readiness(scope)).await
}}

async fn get_current_deposit_account(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>) -> Response {{
    current_single_handler(state, runtime_context, |store, scope| store.find_deposit_account(scope)).await
}}

async fn patch_current_channel(State(state): State<AppShopState>, runtime_context: Option<Extension<IamAppContext>>, Path(channel_id): Path<String>, Json(body): Json<serde_json::Value>) -> Response {{
    let mut payload = body; if let Some(map) = payload.as_object_mut() {{ map.insert("id".into(), channel_id.into()); }}
    upsert_current_channels(state, runtime_context, Json(payload)).await
}}

async fn create_current_service_area(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>, Json(body): Json<serde_json::Value>) -> Response {{
    upsert_current_service_areas(state, runtime_context, Json(body)).await
}}

async fn patch_current_service_area(State(state): State<AppShopState>, runtime_context: Option<Extension<IamAppContext>>, Path(service_area_id): Path<String>, Json(body): Json<serde_json::Value>) -> Response {{
    let mut payload = body; if let Some(map) = payload.as_object_mut() {{ map.insert("id".into(), service_area_id.into()); }}
    upsert_current_service_areas(state, runtime_context, Json(payload)).await
}}

async fn patch_current_policy(State(state): State<AppShopState>, runtime_context: Option<Extension<IamAppContext>>, Path(policy_id): Path<String>, Json(body): Json<serde_json::Value>) -> Response {{
    let mut payload = body; if let Some(map) = payload.as_object_mut() {{ map.insert("id".into(), policy_id.into()); }}
    upsert_current_policies(state, runtime_context, Json(payload)).await
}}

async fn create_current_application(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>, Json(body): Json<serde_json::Value>) -> Response {{
    upsert_current_applications(state, runtime_context, Json(body)).await
}}

async fn list_current_products(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>) -> Response {{
    let subject = match app_runtime_subject_from_extension(runtime_context) {{ Ok(v) => v, Err(m) => return unauthorized_response(m) }};
    let query = match ProductSpuListQuery::new(&subject.tenant_id, subject.organization_id.as_deref(), None, None, None, None, None) {{ Ok(v) => v, Err(e) => return validation_response(e.message()) }};
    match state.catalog.list_spus(query).await {{
        Ok(items) => Json(AppShopApiResult::success(list_data(items.into_iter().map(map_spu).collect(), 1, 20, 0))).into_response(),
        Err(error) => shop_system_response("shop products are unavailable", error),
    }}
}}

async fn create_current_product(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>, Json(body): Json<CreateSpuBody>) -> Response {{
    let subject = match app_runtime_subject_from_extension(runtime_context) {{ Ok(v) => v, Err(m) => return unauthorized_response(m) }};
    let organization_id = match subject.organization_id {{ Some(v) => v, None => return validation_response("organization_id is required") }};
    let command = CreateProductSpuCommand {{ tenant_id: subject.tenant_id, organization_id, spu_no: body.spu_no, title: body.title, subtitle: body.subtitle, description: body.description, product_type: body.product_type, category_id: body.category_id, visible_surfaces: body.visible_surfaces.unwrap_or_else(|| "all".into()) }};
    if let Err(error) = command.validate() {{ return validation_response(error.message()); }}
    match state.catalog.create_spu(command).await {{ Ok(spu) => Json(AppShopApiResult::success(map_spu(spu))).into_response(), Err(error) => shop_system_response("shop product create is unavailable", error) }}
}}

async fn update_current_product(State(state): State<AppShopState>, runtime_context: Option<Extension<IamAppContext>>, Path(product_id): Path<String>, Json(body): Json<UpdateSpuBody>) -> Response {{
    let subject = match app_runtime_subject_from_extension(runtime_context) {{ Ok(v) => v, Err(m) => return unauthorized_response(m) }};
    let command = UpdateProductSpuCommand {{ tenant_id: subject.tenant_id, spu_id: product_id, title: body.title, subtitle: body.subtitle, description: body.description, product_type: body.product_type, category_id: body.category_id, visible_surfaces: body.visible_surfaces, status: body.status }};
    match state.catalog.update_spu(command).await {{ Ok(spu) => Json(AppShopApiResult::success(map_spu(spu))).into_response(), Err(error) => shop_system_response("shop product update is unavailable", error) }}
}}

async fn publish_current_product(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>, Path(product_id): Path<String>) -> Response {{
    let subject = match app_runtime_subject_from_extension(runtime_context) {{ Ok(v) => v, Err(m) => return unauthorized_response(m) }};
    let command = match PublishSpuCommand::new(&subject.tenant_id, &product_id) {{ Ok(v) => v, Err(e) => return validation_response(e.message()) }};
    match state.catalog.publish_spu(command).await {{ Ok(spu) => Json(AppShopApiResult::success(map_spu(spu))).into_response(), Err(error) => shop_system_response("shop product publish is unavailable", error) }}
}}

async fn unpublish_current_product(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>, Path(product_id): Path<String>) -> Response {{
    let subject = match app_runtime_subject_from_extension(runtime_context) {{ Ok(v) => v, Err(m) => return unauthorized_response(m) }};
    let command = match ArchiveSpuCommand::new(&subject.tenant_id, &product_id) {{ Ok(v) => v, Err(e) => return validation_response(e.message()) }};
    match state.catalog.archive_spu(command).await {{ Ok(spu) => Json(AppShopApiResult::success(map_spu(spu))).into_response(), Err(error) => shop_system_response("shop product unpublish is unavailable", error) }}
}}

async fn list_current_inventory_stocks(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>) -> Response {{
    current_list_handler(state, runtime_context, |store, scope| store.list_inventory_stocks(scope)).await
}}

async fn create_current_inventory_adjustment(State(state): State<AppShopState>, runtime_context: Option<Extension<IamAppContext>>, Path(stock_id): Path<String>, Json(body): Json<serde_json::Value>) -> Response {{
    current_write_handler(state, runtime_context, body, move |store, scope, body| store.create_inventory_adjustment(scope, stock_id, body)).await
}}

async fn list_current_orders(State(state): State<AppShopState>, runtime_context: Option<Extension<IamAppContext>>, Query(params): Query<ShopListParams>) -> Response {{
    let scope = match current_scope(runtime_context).await {{ Ok(v) => v, Err(r) => return r }};
    match state.shop.list_shop_orders(scope, params.page.unwrap_or(1), params.page_size.unwrap_or(20)).await {{
        Ok(page) => Json(AppShopApiResult::success(list_data(page.items, page.page, page.page_size, page.total))).into_response(),
        Err(error) => shop_system_response("shop orders are unavailable", error),
    }}
}}

async fn retrieve_current_order(State(state): State<AppShopState>, runtime_context: Option<Extension<IamAppContext>>, Path(order_id): Path<String>) -> Response {{
    let scope = match current_scope(runtime_context).await {{ Ok(v) => v, Err(r) => return r }};
    match state.shop.retrieve_shop_order(scope, order_id).await {{
        Ok(Some(item)) => Json(AppShopApiResult::success(item)).into_response(),
        Ok(None) => not_found_response("shop order was not found"),
        Err(error) => shop_system_response("shop orders are unavailable", error),
    }}
}}

async fn create_current_order_fulfillment(State(state): State<AppShopState>, runtime_context: Option<Extension<IamAppContext>>, Path(order_id): Path<String>, Json(body): Json<serde_json::Value>) -> Response {{
    current_write_handler(state, runtime_context, body, move |store, scope, body| store.create_shop_fulfillment(scope, order_id, body)).await
}}

async fn list_current_settlements(state: AppShopState, runtime_context: Option<Extension<IamAppContext>>) -> Response {{
    let scope = match current_scope(runtime_context).await {{ Ok(v) => v, Err(r) => return r }};
    match state.shop.list_settlements(scope).await {{
        Ok(page) => Json(AppShopApiResult::success(list_data(page.items, page.page, page.page_size, page.total))).into_response(),
        Err(error) => shop_system_response("shop settlements are unavailable", error),
    }}
}}

fn map_shop_summary(value: ShopSummaryView) -> ShopSummaryResponse {{ ShopSummaryResponse {{ id: value.shop_id, tenant_id: value.tenant_id, organization_id: value.organization_id, shop_no: value.shop_no, shop_name: value.shop_name, shop_type: value.shop_type, business_model: value.business_model, storefront_status: value.storefront_status, operation_status: value.operation_status, review_status: value.review_status, data_scope: value.data_scope, logo_media_resource_id: value.logo_media_resource_id, cover_media_resource_id: value.cover_media_resource_id, default_currency_code: value.default_currency_code, default_locale: value.default_locale, timezone: value.timezone, version: value.version, created_at: value.created_at, updated_at: value.updated_at }} }}

fn list_data<T: Serialize>(items: Vec<T>, page: u32, page_size: u32, total: u64) -> ListData<T> {{ ListData {{ items, page_info: PageInfo {{ page, page_size, total }} }} }}

fn unauthorized_response(message: impl Into<String>) -> Response {{ (StatusCode::UNAUTHORIZED, Json(AppShopApiResult::<()>::error("4010", message))).into_response() }}
fn validation_response(message: impl Into<String>) -> Response {{ (StatusCode::BAD_REQUEST, Json(AppShopApiResult::<()>::error("4001", message))).into_response() }}
fn not_found_response(message: impl Into<String>) -> Response {{ (StatusCode::NOT_FOUND, Json(AppShopApiResult::<()>::error("4040", message))).into_response() }}

fn shop_system_response(context: &str, error: CommerceServiceError) -> Response {{
    match error.code() {{
        "validation" => validation_response(error.message()),
        "not_found" => not_found_response(error.message()),
        "conflict" => (StatusCode::CONFLICT, Json(AppShopApiResult::<()>::error("4090", error.message()))).into_response(),
        "unauthenticated" => unauthorized_response(error.message()),
        _ => (StatusCode::INTERNAL_SERVER_ERROR, Json(AppShopApiResult::<()>::error("5000", format!("{{context}}: {{}}", error.message())))).into_response(),
    }}
}}
"""
    content = (
        content.replace("__TRAIT_METHODS__", trait_block)
        .replace("__FORWARD_SQLITE__", forward_sqlite)
        .replace("__FORWARD_POSTGRES__", forward_postgres)
        .replace("__ROUTE_LINES__", route_lines)
        .replace("__HANDLER_BLOCK__", handler_block)
    )
    OUT.write_text(content, encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
