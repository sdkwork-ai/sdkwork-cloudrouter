use std::sync::Arc;

use axum::{routing::get, Router};
use sdkwork_claw_config::DatabaseConfig;
use sdkwork_claw_contract::{ApiSurface, ContractManifest, ContractOperation};
use sdkwork_claw_core::DatabaseHealth;
use tower_http::trace::TraceLayer;

use crate::contract_routes::{
    cloud_services_openapi_document, contract_fallback, gateway_openapi_document, openapi_document,
    openapi_schema_tabs, paas_openapi_document, payment_aggregate_openapi_document,
    APP_OPENAPI_PATH, BACKEND_OPENAPI_PATH, CLOUD_SERVICES_OPENAPI_PATH, GATEWAY_OPENAPI_PATH,
    OPENAPI_SCHEMA_TABS_PATH, PAAS_OPENAPI_PATH, PAYMENT_AGGREGATE_OPENAPI_PATH,
};
use crate::health::{healthz, readyz};
use crate::metrics::{metrics, metrics_middleware};
use crate::readiness::ReadinessCheckFn;

pub type ContractOperationFilter = fn(&ContractOperation) -> bool;

#[derive(Clone)]
pub struct ServiceState {
    pub(crate) service_name: &'static str,
    pub(crate) contract_surface: Option<ApiSurface>,
    pub(crate) contract_manifest: Option<Arc<ContractManifest>>,
    pub(crate) contract_operation_filter: Option<ContractOperationFilter>,
    pub(crate) database: DatabaseHealth,
    pub(crate) readiness_check: Option<ReadinessCheckFn>,
}

pub fn service_router(service_name: &'static str) -> Router {
    service_router_with_database_config(service_name, None)
}

pub fn service_router_with_database_config(
    service_name: &'static str,
    database_config: Option<&DatabaseConfig>,
) -> Router {
    service_router_with_database_config_and_readiness_check(service_name, database_config, None)
}

pub fn service_router_with_database_config_and_readiness_check(
    service_name: &'static str,
    database_config: Option<&DatabaseConfig>,
    readiness_check: Option<ReadinessCheckFn>,
) -> Router {
    base_router().with_state(service_state(
        service_name,
        None,
        database_config,
        None,
        readiness_check,
    ))
}

pub fn service_router_with_contract_routes(
    service_name: &'static str,
    surface: ApiSurface,
) -> Router {
    service_router_with_contract_routes_and_database_config(service_name, surface, None)
}

pub fn service_router_with_contract_routes_and_database_config(
    service_name: &'static str,
    surface: ApiSurface,
    database_config: Option<&DatabaseConfig>,
) -> Router {
    service_router_with_optional_contract_operation_filter(
        service_name,
        surface,
        database_config,
        None,
        None,
    )
}

pub fn service_router_with_filtered_contract_routes_and_database_config(
    service_name: &'static str,
    surface: ApiSurface,
    database_config: Option<&DatabaseConfig>,
    operation_filter: ContractOperationFilter,
) -> Router {
    service_router_with_optional_contract_operation_filter(
        service_name,
        surface,
        database_config,
        Some(operation_filter),
        None,
    )
}

pub fn service_router_with_filtered_contract_routes_database_config_and_readiness_check(
    service_name: &'static str,
    surface: ApiSurface,
    database_config: Option<&DatabaseConfig>,
    operation_filter: ContractOperationFilter,
    readiness_check: Option<ReadinessCheckFn>,
) -> Router {
    service_router_with_optional_contract_operation_filter(
        service_name,
        surface,
        database_config,
        Some(operation_filter),
        readiness_check,
    )
}

fn service_router_with_optional_contract_operation_filter(
    service_name: &'static str,
    surface: ApiSurface,
    database_config: Option<&DatabaseConfig>,
    operation_filter: Option<ContractOperationFilter>,
    readiness_check: Option<ReadinessCheckFn>,
) -> Router {
    let manifest = ContractManifest::from_embedded()
        .expect("embedded ClawRouter API contract manifest must be valid JSON");
    base_router()
        .fallback(contract_fallback)
        .with_state(service_state(
            service_name,
            Some((surface, Arc::new(manifest))),
            database_config,
            operation_filter,
            readiness_check,
        ))
}

fn base_router() -> Router<ServiceState> {
    Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz", get(readyz))
        .route("/metrics", get(metrics))
        .route(GATEWAY_OPENAPI_PATH, get(gateway_openapi_document))
        .route(
            PAYMENT_AGGREGATE_OPENAPI_PATH,
            get(payment_aggregate_openapi_document),
        )
        .route(PAAS_OPENAPI_PATH, get(paas_openapi_document))
        .route(
            CLOUD_SERVICES_OPENAPI_PATH,
            get(cloud_services_openapi_document),
        )
        .route(OPENAPI_SCHEMA_TABS_PATH, get(openapi_schema_tabs))
        .route(APP_OPENAPI_PATH, get(openapi_document))
        .route(BACKEND_OPENAPI_PATH, get(openapi_document))
        .layer(axum::middleware::from_fn(metrics_middleware))
        .layer(TraceLayer::new_for_http())
}

fn service_state(
    service_name: &'static str,
    contract: Option<(ApiSurface, Arc<ContractManifest>)>,
    database_config: Option<&DatabaseConfig>,
    contract_operation_filter: Option<ContractOperationFilter>,
    readiness_check: Option<ReadinessCheckFn>,
) -> ServiceState {
    let (contract_surface, contract_manifest) = match contract {
        Some((surface, manifest)) => (Some(surface), Some(manifest)),
        None => (None, None),
    };

    ServiceState {
        service_name,
        contract_surface,
        contract_manifest,
        contract_operation_filter,
        database: DatabaseHealth::from_config(database_config),
        readiness_check,
    }
}
