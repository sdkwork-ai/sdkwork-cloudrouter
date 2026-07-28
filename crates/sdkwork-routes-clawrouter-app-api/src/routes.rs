use std::sync::Arc;
use std::time::Duration;

use crate::{manifest, paths};
use axum::Router;
use sdkwork_claw_config::{
    ApiKeySecurityConfig, AppSessionConfig, DatabaseConfig, DatabaseEngine, DeploymentMode,
    PaymentWebhookConfig, RedisConfig, RequestLimitsConfig, RuntimeConfigProfile,
    RuntimeTomlConfig, StartupInstallMode, TrustedSubjectConfig,
};
use sdkwork_claw_http::AppSubjectBoundaryConfig;
use sdkwork_clawrouter_database_host::connect_claw_router_database;
use sdkwork_clawrouter_router_service::application::{
    bootstrap_payment_provider_registry, payment_runtime_environment, ApiKeySecretCodec,
    ApiKeySecretHasher, EntityUuidGenerator, InMemoryRuntimeStreamBus, ModelRankingRefreshWorker,
    ModelRankingRefreshWorkerConfig, ModelRankingsService, PaymentAggregateRuntimeStore,
    PaymentProviderRegistry, RuntimeStreamBus,
};
use sdkwork_clawrouter_router_service::infrastructure::crypto::{
    HmacSha256ApiKeySecretHasher, RingAeadApiKeySecretCodec,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::catalog::{
    RefreshableSqlPricingCatalog, SqlPricingCatalogSnapshotSummary,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::installer::{
    DatabaseInstallError, DatabaseInstaller,
};
use sdkwork_clawrouter_router_service::infrastructure::sql::pool::connect_standard_database_pool;
use sdkwork_clawrouter_router_service::infrastructure::sql::postgres::{
    PostgresAdminTransactionCenterStore, PostgresAppChatStore, PostgresAppNotificationStore,
    PostgresAppRoutingReadStore, PostgresAppRoutingStrategyStore, PostgresAppRuntimeStore,
    PostgresCatalogLoadError, PostgresDashboardOverviewReadStore,
    PostgresGatewayApiKeyCommandStore, PostgresModelRankingRefreshStore,
    PostgresModelRankingsReadStore, PostgresPaymentCallbackStore,
    PostgresPaymentIntentRuntimeStore, PostgresPricingCatalogLoader, PostgresSettingsStore,
    PostgresSettlementsDashboardReadStore, PostgresSiteSettingsStore, PostgresUsageLogsReadStore,
};
use sdkwork_clawrouter_router_service::infrastructure::{
    AppRuntimeGatewayHttpClient, OsApiKeySecretGenerator, RedisRuntimeStreamBus,
};
use sdkwork_clawrouter_router_service::ports::AdminTransactionCenterSubject;
use sdkwork_clawrouter_router_service::ports::ChatCompletionStreamRelay;
use sdkwork_clawrouter_router_service::ports::PricingCatalog;
use sdkwork_clawrouter_router_service::ports::{
    AppChatStore, AppNotificationStore, AppRoutingReadStore, AppRoutingStrategyStore,
    AppRuntimeStore, DashboardOverviewReadStore, GatewayApiKeyCommandStore,
    GatewayApiKeyManagementReadStore, ModelRankingRefreshOutcome, ModelRankingRefreshRunStatus,
    ModelRankingRefreshStore, ModelRankingsCacheInvalidation, ModelRankingsReadModelStore,
    PaymentCallbackStore, SettingsStore, SettlementsDashboardReadStore, SiteSettingsStore,
    UsageLogsReadStore,
};
use sdkwork_content_documents_sdk_reference::app_sdk_reference_router;
use sdkwork_database_sqlx::DatabasePool;
use sdkwork_routes_models_catalog_app_api::{
    app_model_catalog_router, app_model_rankings_router, app_model_rankings_router_with_read_store,
};
use sqlx::PgPool;
use tokio::time::sleep;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RouterApiRouteModule {
    pub package_name: &'static str,
    pub schema_tab_id: &'static str,
    pub default_schema_url: &'static str,
    pub route_prefix: &'static str,
}

pub const SERVICE_NAME: &str = "sdkwork-clawrouter-standalone-gateway";
const DEFAULT_APP_RUNTIME_CATALOG_REFRESH_INTERVAL_MILLIS: u64 = 60_000;
type ApiKeyCodec = Arc<dyn ApiKeySecretCodec + Send + Sync>;

struct AppApiKeyRuntimeDeps {
    read_store: Arc<dyn GatewayApiKeyManagementReadStore + Send + Sync>,
    command_store: Arc<dyn GatewayApiKeyCommandStore + Send + Sync>,
    api_key_hasher: Arc<dyn ApiKeySecretHasher + Send + Sync>,
}

fn app_api_key_runtime_deps_for_postgres(
    pool: PgPool,
    api_key_security_config: &ApiKeySecurityConfig,
    api_key_secret_codec: ApiKeyCodec,
) -> Result<AppApiKeyRuntimeDeps, ProductCatalogRouterError> {
    let api_key_hasher = HmacSha256ApiKeySecretHasher::new(api_key_security_config.pepper_secret())
        .map_err(|error| ProductCatalogRouterError::Config(error.to_string()))?;
    Ok(AppApiKeyRuntimeDeps {
        read_store: Arc::new(PostgresPricingCatalogLoader::with_api_key_secret_codec(
            pool.clone(),
            api_key_secret_codec.clone(),
        )),
        command_store: Arc::new(PostgresGatewayApiKeyCommandStore::new(
            pool,
            api_key_secret_codec,
        )),
        api_key_hasher: Arc::new(api_key_hasher),
    })
}

type AppNotificationRuntimeStore = Arc<dyn AppNotificationStore + Send + Sync>;
type AppChatRuntimeStore = Arc<dyn AppChatStore + Send + Sync>;
type AppRuntimeRuntimeStore = Arc<dyn AppRuntimeStore + Send + Sync>;
type AppRuntimeExecutionCatalog = Arc<RefreshableSqlPricingCatalog>;
type AppRuntimeChatStreamRelay = Arc<dyn ChatCompletionStreamRelay + Send + Sync>;
type AppRuntimeGatewayRuntimeClient =
    Arc<dyn sdkwork_clawrouter_router_service::ports::AppRuntimeGatewayClient + Send + Sync>;
type AppRuntimeStreamBus = Arc<dyn RuntimeStreamBus + Send + Sync>;
type AppRoutingStore = Arc<dyn AppRoutingReadStore + Send + Sync>;
type AppRoutingStrategyRuntimeStore = Arc<dyn AppRoutingStrategyStore + Send + Sync>;
type AppSiteSettingsRuntimeStore = Arc<dyn SiteSettingsStore + Send + Sync>;
type DashboardReadStore = Arc<dyn DashboardOverviewReadStore + Send + Sync>;
type EntityUuidGen = Arc<dyn EntityUuidGenerator + Send + Sync>;
type PaymentCallbackRuntimeStore = Arc<dyn PaymentCallbackStore + Send + Sync>;
type PaymentIntentAggregateRuntimeStore = Arc<dyn PaymentAggregateRuntimeStore>;
type SettlementsDashboardStore = Arc<dyn SettlementsDashboardReadStore + Send + Sync>;
type SettingsRuntimeStore = Arc<dyn SettingsStore + Send + Sync>;
type UsageLogsStore = Arc<dyn UsageLogsReadStore + Send + Sync>;
type ModelRankingRefreshRuntimeStore = Arc<dyn ModelRankingRefreshStore + Send + Sync>;
type ModelRankingsRuntimeStore = Arc<dyn ModelRankingsReadModelStore + Send + Sync>;

pub fn route_module() -> RouterApiRouteModule {
    RouterApiRouteModule {
        package_name: manifest::PACKAGE_NAME,
        schema_tab_id: paths::SCHEMA_TAB_ID,
        default_schema_url: paths::DEFAULT_SCHEMA_URL,
        route_prefix: paths::ROUTE_PREFIX,
    }
}

pub fn build_sdkwork_claw_router_app_api_router() -> Router {
    router()
}

pub async fn build_sdkwork_claw_router_app_api_router_from_env(
) -> Result<Router, ProductCatalogRouterError> {
    router_from_env().await
}

fn merge_app_sdk_reference_router(router: Router) -> Router {
    router.merge(app_sdk_reference_router())
}

pub fn router() -> Router {
    merge_app_sdk_reference_router(router_with_database_status(None, None, None))
        .merge(sdkwork_clawrouter_router_service::api::app_site_settings_router())
        .merge(sdkwork_clawrouter_router_service::api::app_payment_callback_router())
        .merge(sdkwork_clawrouter_router_service::api::app_dashboard_overview_router())
        .merge(app_model_rankings_router())
        .merge(sdkwork_clawrouter_router_service::api::app_settlements_dashboard_router())
        .merge(sdkwork_clawrouter_router_service::api::app_settings_router())
        .merge(sdkwork_clawrouter_router_service::api::app_usage_logs_router())
        .merge(sdkwork_clawrouter_router_service::api::app_notification_router())
        .merge(sdkwork_clawrouter_router_service::api::app_chat_router())
        .merge(sdkwork_clawrouter_router_service::api::app_runtime_router())
        .merge(sdkwork_clawrouter_router_service::api::app_routing_router())
        .merge(sdkwork_clawrouter_router_service::api::app_routing_strategy_router())
}

fn router_with_database_status(
    config: Option<&DatabaseConfig>,
    readiness_check: Option<sdkwork_claw_http::ReadinessCheckFn>,
    deployment_mode: Option<DeploymentMode>,
) -> Router {
    match deployment_mode {
        Some(deployment_mode) => {
            sdkwork_claw_http::service_router_with_filtered_contract_routes_database_config_readiness_check_and_deployment_mode(
                SERVICE_NAME,
                sdkwork_claw_http::ApiSurface::App,
                config,
                product_local_contract_operation,
                readiness_check,
                deployment_mode,
            )
        }
        None => sdkwork_claw_http::service_router_with_filtered_contract_routes_database_config_and_readiness_check(
            SERVICE_NAME,
            sdkwork_claw_http::ApiSurface::App,
            config,
            product_local_contract_operation,
            readiness_check,
        ),
    }
}

fn product_local_contract_operation(operation: &sdkwork_claw_http::ContractOperation) -> bool {
    !matches!(
        operation.sdk_domain.as_deref(),
        Some("commerce" | "promotion")
    ) && !is_commerce_dependency_contract_path(&operation.path)
        && !is_appbase_dependency_contract_path(&operation.path)
}

fn is_clawrouter_owned_iam_app_path(path: &str) -> bool {
    const CLAWROUTER_OWNED_IAM_APP_PREFIXES: &[&str] =
        &["/app/v3/api/iam/api_keys", "/app/v3/api/iam/users/settings"];

    CLAWROUTER_OWNED_IAM_APP_PREFIXES.iter().any(|prefix| {
        path == prefix.trim_end_matches('/') || path.starts_with(&format!("{prefix}/"))
    })
}

fn is_appbase_dependency_contract_path(path: &str) -> bool {
    if is_clawrouter_owned_iam_app_path(path) {
        return false;
    }

    const APPBASE_APP_PREFIXES: &[&str] = &[
        "/app/v3/api/auth/",
        "/app/v3/api/iam/",
        "/app/v3/api/oauth/",
        "/app/v3/api/system/iam/",
    ];

    APPBASE_APP_PREFIXES
        .iter()
        .any(|prefix| path == prefix.trim_end_matches('/') || path.starts_with(prefix))
}

fn is_commerce_dependency_contract_path(path: &str) -> bool {
    const COMMERCE_APP_PREFIXES: &[&str] = &[
        "/app/v3/api/accounts/",
        "/app/v3/api/billing/",
        "/app/v3/api/cart/",
        "/app/v3/api/catalog/",
        "/app/v3/api/checkout/",
        "/app/v3/api/fulfillments",
        "/app/v3/api/invoices",
        "/app/v3/api/memberships",
        "/app/v3/api/orders",
        "/app/v3/api/payments/",
        "/app/v3/api/promotions/",
        "/app/v3/api/recharges/",
        "/app/v3/api/refunds",
        "/app/v3/api/wallet/",
    ];

    COMMERCE_APP_PREFIXES
        .iter()
        .any(|prefix| path == prefix.trim_end_matches('/') || path.starts_with(prefix))
}

pub fn router_with_product_catalog<C>(catalog: Arc<C>) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    router_with_product_catalog_and_database_status(catalog, None)
}

fn router_with_product_catalog_and_database_status<C>(
    catalog: Arc<C>,
    config: Option<&DatabaseConfig>,
) -> Router
where
    C: PricingCatalog + Send + Sync + 'static,
{
    merge_app_sdk_reference_router(router_with_database_status(config, None, None))
        .merge(sdkwork_clawrouter_router_service::api::app_site_settings_router())
        .merge(sdkwork_clawrouter_router_service::api::app_payment_callback_router())
        .merge(sdkwork_clawrouter_router_service::api::app_dashboard_overview_router())
        .merge(app_model_rankings_router())
        .merge(sdkwork_clawrouter_router_service::api::app_settlements_dashboard_router())
        .merge(sdkwork_clawrouter_router_service::api::app_settings_router())
        .merge(sdkwork_clawrouter_router_service::api::app_usage_logs_router())
        .merge(sdkwork_clawrouter_router_service::api::app_notification_router())
        .merge(sdkwork_clawrouter_router_service::api::app_chat_router())
        .merge(sdkwork_clawrouter_router_service::api::app_runtime_router())
        .merge(sdkwork_clawrouter_router_service::api::app_routing_router())
        .merge(sdkwork_clawrouter_router_service::api::app_routing_strategy_router())
        .merge(app_model_catalog_router(Arc::clone(&catalog)))
}

async fn finalize_product_router_with_federated_capabilities(
    router: Router,
    subject_boundary_config: AppSubjectBoundaryConfig,
    database_config: Option<&DatabaseConfig>,
) -> Result<Router, ProductCatalogRouterError> {
    let router = crate::invoice_runtime::merge_federated_invoice_app_router(
        router,
        subject_boundary_config.clone(),
    )
    .await
    .map_err(ProductCatalogRouterError::Config)?;
    if let Some(database_config) = database_config {
        crate::commerce_runtime::merge_federated_commerce_app_routers(
            router,
            database_config,
            subject_boundary_config,
        )
        .await
        .map_err(ProductCatalogRouterError::Config)
    } else {
        Ok(router)
    }
}

fn router_with_runtime_stores_and_database_status(
    app_site_settings_store: Option<AppSiteSettingsRuntimeStore>,
    entity_uuid_generator: EntityUuidGen,
    trusted_subject_config: TrustedSubjectConfig,
    app_session_config: AppSessionConfig,
    payment_webhook_config: Option<PaymentWebhookConfig>,
    payment_callback_store: Option<PaymentCallbackRuntimeStore>,
    payment_intent_runtime_store: Option<PaymentIntentAggregateRuntimeStore>,
    payment_provider_registry: PaymentProviderRegistry,
    dashboard_read_store: Option<DashboardReadStore>,
    settlements_dashboard_read_store: Option<SettlementsDashboardStore>,
    settings_store: Option<SettingsRuntimeStore>,
    usage_logs_read_store: Option<UsageLogsStore>,
    app_notification_store: Option<AppNotificationRuntimeStore>,
    app_chat_store: Option<AppChatRuntimeStore>,
    app_runtime_store: Option<AppRuntimeRuntimeStore>,
    app_runtime_execution_catalog: Option<AppRuntimeExecutionCatalog>,
    app_runtime_chat_stream_relay: Option<AppRuntimeChatStreamRelay>,
    app_runtime_gateway_client: Option<AppRuntimeGatewayRuntimeClient>,
    app_runtime_stream_bus: Option<AppRuntimeStreamBus>,
    app_routing_read_store: Option<AppRoutingStore>,
    app_routing_strategy_store: Option<AppRoutingStrategyRuntimeStore>,
    model_catalog_router: Option<Router>,
    config: Option<&DatabaseConfig>,
    request_limits_config: RequestLimitsConfig,
    readiness_check: Option<sdkwork_claw_http::ReadinessCheckFn>,
    api_key_runtime: Option<AppApiKeyRuntimeDeps>,
    deployment_mode: DeploymentMode,
) -> Router {
    let subject_boundary_config =
        AppSubjectBoundaryConfig::new(trusted_subject_config.clone(), app_session_config.clone());
    let mut router = router_with_database_status(config, readiness_check, Some(deployment_mode));
    router = match app_site_settings_store {
        Some(store) => router.merge(
            sdkwork_clawrouter_router_service::api::app_site_settings_router_with_store(store),
        ),
        None => router.merge(sdkwork_clawrouter_router_service::api::app_site_settings_router()),
    };
    if let Some(model_catalog_router) = model_catalog_router {
        router = router.merge(model_catalog_router);
    }
    // payment callback router must not use app_request_subject_boundary: providers cannot send app user session headers.
    router = match payment_callback_store {
        Some(store) => match payment_webhook_config {
            Some(payment_webhook_config) => router.merge(
                sdkwork_clawrouter_router_service::api::app_payment_callback_router_with_store_and_body_limit(
                    store,
                    Arc::new(OsApiKeySecretGenerator),
                    payment_webhook_config,
                    request_limits_config.payment_callback_body_max_bytes(),
                ),
            ),
            None => router.merge(sdkwork_clawrouter_router_service::api::app_payment_callback_router()),
        },
        None => router.merge(sdkwork_clawrouter_router_service::api::app_payment_callback_router()),
    };
    router = match payment_intent_runtime_store {
        Some(store) => sdkwork_claw_http::merge_web_framework_scoped_app_router(
            router,
            sdkwork_clawrouter_router_service::api::payment_aggregate_router_with_runtime_store_and_registry(
                store,
                Arc::clone(&entity_uuid_generator),
                payment_provider_registry.clone(),
            ),
            subject_boundary_config.clone(),
        ),
        None => router,
    };
    router = match dashboard_read_store {
        Some(read_store) => sdkwork_claw_http::merge_web_framework_scoped_app_read_router(
            router,
            sdkwork_clawrouter_router_service::api::app_dashboard_overview_router_with_read_store(
                read_store,
            ),
            subject_boundary_config.clone(),
        ),
        None => {
            router.merge(sdkwork_clawrouter_router_service::api::app_dashboard_overview_router())
        }
    };
    router = match usage_logs_read_store {
        Some(read_store) => sdkwork_claw_http::merge_web_framework_scoped_app_read_router(
            router,
            sdkwork_clawrouter_router_service::api::app_usage_logs_router_with_read_store(
                read_store,
            ),
            subject_boundary_config.clone(),
        ),
        None => router.merge(sdkwork_clawrouter_router_service::api::app_usage_logs_router()),
    };
    router = match app_notification_store {
        Some(store) => sdkwork_claw_http::merge_web_framework_scoped_app_router(
            router,
            sdkwork_clawrouter_router_service::api::app_notification_router_with_store(store),
            subject_boundary_config.clone(),
        ),
        None => router.merge(sdkwork_clawrouter_router_service::api::app_notification_router()),
    };
    router = match app_chat_store {
        Some(store) => sdkwork_claw_http::merge_web_framework_scoped_app_router(
            router,
            sdkwork_clawrouter_router_service::api::app_chat_router_with_store(
                store,
                Arc::clone(&entity_uuid_generator),
            ),
            subject_boundary_config.clone(),
        ),
        None => router.merge(sdkwork_clawrouter_router_service::api::app_chat_router()),
    };
    router = match app_runtime_store {
        Some(store) => {
            let stream_bus = match app_runtime_stream_bus {
                Some(bus) => bus,
                None if allow_implicit_in_memory_runtime_stream_bus(deployment_mode) => {
                    Arc::new(InMemoryRuntimeStreamBus::default())
                }
                None => {
                    panic!(
                        "app runtime stream bus is required when app runtime store is wired for non-desktop deployments"
                    );
                }
            };
            let runtime_router = if let (Some(catalog), Some(gateway_client)) = (
                app_runtime_execution_catalog.clone(),
                app_runtime_gateway_client.clone(),
            ) {
                sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_gateway_client_and_runtime_stream_bus(
                    store,
                    Arc::clone(&entity_uuid_generator),
                    catalog,
                    gateway_client,
                    Arc::clone(&stream_bus),
                )
            } else if let (Some(catalog), Some(chat_stream_relay)) = (
                app_runtime_execution_catalog.clone(),
                app_runtime_chat_stream_relay.clone(),
            ) {
                sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_chat_stream_relay_and_runtime_stream_bus(
                    store,
                    Arc::clone(&entity_uuid_generator),
                    catalog,
                    chat_stream_relay,
                    Arc::clone(&stream_bus),
                )
            } else {
                sdkwork_clawrouter_router_service::api::app_runtime_router_with_store_and_runtime_stream_bus(
                    store,
                    Arc::clone(&entity_uuid_generator),
                    Arc::clone(&stream_bus),
                )
            };
            sdkwork_claw_http::merge_web_framework_scoped_app_router(
                router,
                runtime_router,
                subject_boundary_config.clone(),
            )
        }
        None => router.merge(sdkwork_clawrouter_router_service::api::app_runtime_router()),
    };
    router = match app_routing_read_store {
        Some(read_store) => sdkwork_claw_http::merge_web_framework_scoped_app_router(
            router,
            sdkwork_clawrouter_router_service::api::app_routing_router_with_read_store(read_store),
            subject_boundary_config.clone(),
        ),
        None => router.merge(sdkwork_clawrouter_router_service::api::app_routing_router()),
    };
    router = match app_routing_strategy_store {
        Some(store) => sdkwork_claw_http::merge_web_framework_scoped_app_router(
            router,
            sdkwork_clawrouter_router_service::api::app_routing_strategy_router_with_store(
                store,
                Arc::new(OsApiKeySecretGenerator),
            ),
            subject_boundary_config.clone(),
        ),
        None => router.merge(sdkwork_clawrouter_router_service::api::app_routing_strategy_router()),
    };
    if let Some(api_key_runtime) = api_key_runtime {
        router = sdkwork_claw_http::merge_web_framework_scoped_app_router(
            router,
            sdkwork_clawrouter_router_service::api::app_api_key_router_with_read_store_and_command_store(
                api_key_runtime.read_store,
                api_key_runtime.command_store,
                api_key_runtime.api_key_hasher,
                Arc::new(OsApiKeySecretGenerator),
            ),
            subject_boundary_config.clone(),
        );
    }
    router = match settings_store {
        Some(store) => sdkwork_claw_http::merge_web_framework_scoped_app_router(
            router,
            sdkwork_clawrouter_router_service::api::app_settings_router_with_store(
                store,
                Arc::new(OsApiKeySecretGenerator),
            ),
            subject_boundary_config.clone(),
        ),
        None => router.merge(sdkwork_clawrouter_router_service::api::app_settings_router()),
    };
    router = match settlements_dashboard_read_store {
        Some(read_store) => sdkwork_claw_http::merge_web_framework_scoped_app_read_router(
            router,
            sdkwork_clawrouter_router_service::api::app_settlements_dashboard_router_with_read_store(read_store),
            subject_boundary_config,
        ),
        None => router.merge(sdkwork_clawrouter_router_service::api::app_settlements_dashboard_router()),
    };
    merge_app_sdk_reference_router(router)
}

pub async fn router_with_postgres_product_catalog(
    pool: PgPool,
    database_config: DatabaseConfig,
    api_key_security_config: ApiKeySecurityConfig,
    trusted_subject_config: TrustedSubjectConfig,
    app_session_config: AppSessionConfig,
    payment_webhook_config: PaymentWebhookConfig,
) -> Result<Router, ProductCatalogRouterError> {
    let deployment_mode = DeploymentMode::from_env().map_err(ProductCatalogRouterError::Config)?;
    let api_key_secret_codec = api_key_secret_codec_from_config(&api_key_security_config)?;
    let read_store = Arc::new(PostgresPricingCatalogLoader::with_api_key_secret_codec(
        pool.clone(),
        api_key_secret_codec.clone(),
    ));
    let model_catalog_snapshot = read_store.load_snapshot().await?;
    let model_rankings_store =
        model_rankings_service(Arc::new(PostgresModelRankingsReadStore::new(pool.clone())));
    let model_catalog_router = app_model_catalog_router(Arc::new(model_catalog_snapshot)).merge(
        app_model_rankings_router_with_subject_boundary(
            model_rankings_store,
            &trusted_subject_config,
            &app_session_config,
        ),
    );
    let payment_callback_store = Arc::new(PostgresPaymentCallbackStore::new(pool.clone()));
    let payment_intent_runtime_store =
        Arc::new(PostgresPaymentIntentRuntimeStore::new(pool.clone()));
    let payment_provider_registry = bootstrap_postgres_payment_provider_registry(&pool).await;
    let dashboard_read_store = Arc::new(PostgresDashboardOverviewReadStore::new(pool.clone()));
    let settlements_dashboard_read_store =
        Arc::new(PostgresSettlementsDashboardReadStore::new(pool.clone()));
    let settings_store = Arc::new(PostgresSettingsStore::new(pool.clone()));
    let usage_logs_read_store = Arc::new(PostgresUsageLogsReadStore::new(pool.clone()));
    let app_notification_store = Arc::new(PostgresAppNotificationStore::new(pool.clone()));
    let app_chat_store = Arc::new(PostgresAppChatStore::new(pool.clone()));
    let app_runtime_store = Arc::new(PostgresAppRuntimeStore::new(pool.clone()));
    let app_routing_read_store = Arc::new(PostgresAppRoutingReadStore::with_api_key_secret_codec(
        pool.clone(),
        api_key_secret_codec.clone(),
    ));
    let app_routing_strategy_store = Arc::new(PostgresAppRoutingStrategyStore::new(pool.clone()));
    let entity_uuid_generator: EntityUuidGen = Arc::new(OsApiKeySecretGenerator);
    let app_site_settings_store = Arc::new(PostgresSiteSettingsStore::new(pool.clone()));
    let api_key_runtime = Some(app_api_key_runtime_deps_for_postgres(
        pool.clone(),
        &api_key_security_config,
        api_key_secret_codec.clone(),
    )?);
    let subject_boundary_config =
        AppSubjectBoundaryConfig::new(trusted_subject_config.clone(), app_session_config.clone());
    finalize_product_router_with_federated_capabilities(
        router_with_runtime_stores_and_database_status(
            Some(app_site_settings_store),
            entity_uuid_generator,
            trusted_subject_config,
            app_session_config,
            Some(payment_webhook_config),
            Some(payment_callback_store),
            Some(payment_intent_runtime_store),
            payment_provider_registry,
            Some(dashboard_read_store),
            Some(settlements_dashboard_read_store),
            Some(settings_store),
            Some(usage_logs_read_store),
            Some(app_notification_store),
            Some(app_chat_store),
            Some(app_runtime_store),
            None,
            None,
            None,
            None,
            Some(app_routing_read_store),
            Some(app_routing_strategy_store),
            Some(model_catalog_router),
            Some(&database_config),
            RequestLimitsConfig::default(),
            None,
            api_key_runtime,
            deployment_mode,
        ),
        subject_boundary_config,
        Some(&database_config),
    )
    .await
}

pub async fn router_with_postgres_shared_runtime(
    config: DatabaseConfig,
    pool: PgPool,
    catalog: Arc<RefreshableSqlPricingCatalog>,
    api_key_security_config: ApiKeySecurityConfig,
    trusted_subject_config: TrustedSubjectConfig,
    app_session_config: AppSessionConfig,
    payment_webhook_config: PaymentWebhookConfig,
    deployment_mode: DeploymentMode,
    request_limits_config: RequestLimitsConfig,
    app_runtime_gateway_client: Arc<
        dyn sdkwork_clawrouter_router_service::ports::AppRuntimeGatewayClient + Send + Sync,
    >,
    app_runtime_stream_bus: Arc<dyn RuntimeStreamBus + Send + Sync>,
    model_ranking_refresh_worker_config: ModelRankingRefreshWorkerConfig,
) -> Result<Router, ProductCatalogRouterError> {
    let api_key_secret_codec = api_key_secret_codec_from_config(&api_key_security_config)?;
    let model_rankings_store =
        model_rankings_service(Arc::new(PostgresModelRankingsReadStore::new(pool.clone())));
    maybe_spawn_postgres_model_ranking_refresh_worker(
        &pool,
        model_ranking_refresh_worker_config,
        Some(Arc::clone(&model_rankings_store)),
    )
    .await?;
    let model_catalog_router = app_model_catalog_router(Arc::clone(&catalog)).merge(
        app_model_rankings_router_with_subject_boundary(
            model_rankings_store,
            &trusted_subject_config,
            &app_session_config,
        ),
    );
    let payment_callback_store = Arc::new(PostgresPaymentCallbackStore::new(pool.clone()));
    let payment_intent_runtime_store =
        Arc::new(PostgresPaymentIntentRuntimeStore::new(pool.clone()));
    let payment_provider_registry = bootstrap_postgres_payment_provider_registry(&pool).await;
    let dashboard_read_store = Arc::new(PostgresDashboardOverviewReadStore::new(pool.clone()));
    let settlements_dashboard_read_store =
        Arc::new(PostgresSettlementsDashboardReadStore::new(pool.clone()));
    let settings_store = Arc::new(PostgresSettingsStore::new(pool.clone()));
    let usage_logs_read_store = Arc::new(PostgresUsageLogsReadStore::new(pool.clone()));
    let app_notification_store = Arc::new(PostgresAppNotificationStore::new(pool.clone()));
    let app_chat_store = Arc::new(PostgresAppChatStore::new(pool.clone()));
    let app_runtime_store = Arc::new(PostgresAppRuntimeStore::new(pool.clone()));
    let app_routing_read_store = Arc::new(PostgresAppRoutingReadStore::with_api_key_secret_codec(
        pool.clone(),
        api_key_secret_codec.clone(),
    ));
    let app_routing_strategy_store = Arc::new(PostgresAppRoutingStrategyStore::new(pool.clone()));
    let entity_uuid_generator: EntityUuidGen = Arc::new(OsApiKeySecretGenerator);
    let api_key_runtime = Some(app_api_key_runtime_deps_for_postgres(
        pool.clone(),
        &api_key_security_config,
        api_key_secret_codec.clone(),
    )?);
    let subject_boundary_config =
        AppSubjectBoundaryConfig::new(trusted_subject_config.clone(), app_session_config.clone());
    finalize_product_router_with_federated_capabilities(
        router_with_runtime_stores_and_database_status(
            Some(Arc::new(PostgresSiteSettingsStore::new(pool.clone()))),
            entity_uuid_generator,
            trusted_subject_config,
            app_session_config,
            Some(payment_webhook_config),
            Some(payment_callback_store),
            Some(payment_intent_runtime_store),
            payment_provider_registry,
            Some(dashboard_read_store),
            Some(settlements_dashboard_read_store),
            Some(settings_store),
            Some(usage_logs_read_store),
            Some(app_notification_store),
            Some(app_chat_store),
            Some(app_runtime_store),
            Some(catalog),
            None,
            Some(app_runtime_gateway_client),
            Some(app_runtime_stream_bus),
            Some(app_routing_read_store),
            Some(app_routing_strategy_store),
            Some(model_catalog_router),
            Some(&config),
            request_limits_config,
            None,
            api_key_runtime,
            deployment_mode,
        ),
        subject_boundary_config,
        Some(&config),
    )
    .await
}

pub async fn router_with_database_config(
    config: DatabaseConfig,
) -> Result<Router, ProductCatalogRouterError> {
    let api_key_security_config = require_api_key_security_config(
        ApiKeySecurityConfig::from_env().map_err(ProductCatalogRouterError::Config)?,
    )?;
    let trusted_subject_config = require_trusted_subject_config(
        TrustedSubjectConfig::from_env().map_err(ProductCatalogRouterError::Config)?,
    )?;
    let app_session_config = require_app_session_config(
        AppSessionConfig::from_env().map_err(ProductCatalogRouterError::Config)?,
    )?;
    let payment_webhook_config = require_payment_webhook_config(
        PaymentWebhookConfig::from_env().map_err(ProductCatalogRouterError::Config)?,
    )?;
    router_with_database_config_api_key_trusted_subject_app_session(
        config,
        api_key_security_config,
        trusted_subject_config,
        app_session_config,
        payment_webhook_config,
        DeploymentMode::from_env().map_err(ProductCatalogRouterError::Config)?,
    )
    .await
}

pub async fn router_with_database_config_api_key_trusted_subject_and_app_session_config(
    config: DatabaseConfig,
    api_key_security_config: ApiKeySecurityConfig,
    trusted_subject_config: TrustedSubjectConfig,
    app_session_config: AppSessionConfig,
    payment_webhook_config: PaymentWebhookConfig,
) -> Result<Router, ProductCatalogRouterError> {
    router_with_database_config_api_key_trusted_subject_app_session(
        config,
        api_key_security_config,
        trusted_subject_config,
        app_session_config,
        payment_webhook_config,
        DeploymentMode::from_env().map_err(ProductCatalogRouterError::Config)?,
    )
    .await
}

pub async fn router_with_database_config_api_key_trusted_subject_app_session_deployment_mode_config(
    config: DatabaseConfig,
    api_key_security_config: ApiKeySecurityConfig,
    trusted_subject_config: TrustedSubjectConfig,
    app_session_config: AppSessionConfig,
    payment_webhook_config: PaymentWebhookConfig,
    deployment_mode: DeploymentMode,
) -> Result<Router, ProductCatalogRouterError> {
    router_with_database_config_api_key_trusted_subject_app_session(
        config,
        api_key_security_config,
        trusted_subject_config,
        app_session_config,
        payment_webhook_config,
        deployment_mode,
    )
    .await
}

async fn router_with_database_config_api_key_trusted_subject_app_session(
    config: DatabaseConfig,
    api_key_security_config: ApiKeySecurityConfig,
    trusted_subject_config: TrustedSubjectConfig,
    app_session_config: AppSessionConfig,
    payment_webhook_config: PaymentWebhookConfig,
    deployment_mode: DeploymentMode,
) -> Result<Router, ProductCatalogRouterError> {
    router_with_database_config_api_key_trusted_subject_app_session_and_startup_install_mode(
        config,
        api_key_security_config,
        trusted_subject_config,
        app_session_config,
        payment_webhook_config,
        deployment_mode,
        StartupInstallMode::Ensure,
        None,
    )
    .await
}

async fn router_with_database_config_api_key_trusted_subject_app_session_and_startup_install_mode(
    config: DatabaseConfig,
    api_key_security_config: ApiKeySecurityConfig,
    trusted_subject_config: TrustedSubjectConfig,
    app_session_config: AppSessionConfig,
    payment_webhook_config: PaymentWebhookConfig,
    deployment_mode: DeploymentMode,
    startup_install_mode: StartupInstallMode,
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<Router, ProductCatalogRouterError> {
    sdkwork_claw_http::materialize_federated_database_env_from_claw_config(&config);
    let subject_boundary_config =
        AppSubjectBoundaryConfig::new(trusted_subject_config.clone(), app_session_config.clone());
    let request_limits_config = RequestLimitsConfig::from_env_or_runtime_toml(runtime_toml)
        .map_err(ProductCatalogRouterError::Config)?;
    let app_runtime_gateway_client = build_app_runtime_gateway_client(runtime_toml)
        .map_err(ProductCatalogRouterError::Config)?;
    let app_runtime_stream_bus =
        build_app_runtime_stream_bus(runtime_toml, deployment_mode).await?;
    let api_key_secret_codec = api_key_secret_codec_from_config(&api_key_security_config)?;
    let app_runtime_catalog_refresh_interval =
        app_runtime_catalog_refresh_interval_from_env_or_toml(runtime_toml)
            .map_err(ProductCatalogRouterError::Config)?;
    if !matches!(config.engine, DatabaseEngine::Postgres) {
        return Err(ProductCatalogRouterError::Config(
            "Claw Router server runtime requires PostgreSQL; SQLite is client-local only"
                .to_owned(),
        ));
    }
    let database_pool = connect_standard_database_pool(&config)
        .await
        .map_err(|error| {
            ProductCatalogRouterError::Postgres(PostgresCatalogLoadError::Database(
                sqlx::Error::Configuration(error.to_string().into()),
            ))
        })?;
    prepare_claw_router_database_lifecycle(database_pool.clone()).await?;
    let pool = database_pool.as_postgres().cloned().ok_or_else(|| {
        ProductCatalogRouterError::Config("expected PostgreSQL database pool".to_owned())
    })?;
    if startup_install_mode.should_ensure() {
        DatabaseInstaller::for_postgres(pool.clone())
            .with_env_options()?
            .ensure_bootstrap_data()
            .await?;
    }
    let read_store = Arc::new(PostgresPricingCatalogLoader::with_api_key_secret_codec(
        pool.clone(),
        api_key_secret_codec.clone(),
    ));
    let model_catalog_snapshot = read_store.load_snapshot().await?;
    log_app_runtime_catalog_snapshot_summary(
        "postgres",
        "startup",
        model_catalog_snapshot.summary(),
    );
    let app_runtime_execution_catalog =
        Arc::new(RefreshableSqlPricingCatalog::new(model_catalog_snapshot));
    spawn_postgres_app_runtime_catalog_refresh_worker(
        &pool,
        Arc::clone(&app_runtime_execution_catalog),
        api_key_secret_codec.clone(),
        app_runtime_catalog_refresh_interval,
    );
    let model_rankings_store =
        model_rankings_service(Arc::new(PostgresModelRankingsReadStore::new(pool.clone())));
    maybe_spawn_postgres_model_ranking_refresh_worker(
        &pool,
        model_ranking_refresh_worker_config_from_env_or_toml(runtime_toml)
            .map_err(ProductCatalogRouterError::Config)?,
        Some(Arc::clone(&model_rankings_store)),
    )
    .await?;
    let model_catalog_router = app_model_catalog_router(Arc::clone(&app_runtime_execution_catalog))
        .merge(app_model_rankings_router_with_subject_boundary(
            model_rankings_store,
            &trusted_subject_config,
            &app_session_config,
        ));
    let payment_callback_store = Arc::new(PostgresPaymentCallbackStore::new(pool.clone()));
    let payment_intent_runtime_store =
        Arc::new(PostgresPaymentIntentRuntimeStore::new(pool.clone()));
    let payment_provider_registry = bootstrap_postgres_payment_provider_registry(&pool).await;
    let dashboard_read_store = Arc::new(PostgresDashboardOverviewReadStore::new(pool.clone()));
    let settlements_dashboard_read_store =
        Arc::new(PostgresSettlementsDashboardReadStore::new(pool.clone()));
    let settings_store = Arc::new(PostgresSettingsStore::new(pool.clone()));
    let usage_logs_read_store = Arc::new(PostgresUsageLogsReadStore::new(pool.clone()));
    let app_notification_store = Arc::new(PostgresAppNotificationStore::new(pool.clone()));
    let app_chat_store = Arc::new(PostgresAppChatStore::new(pool.clone()));
    let app_runtime_store = Arc::new(PostgresAppRuntimeStore::new(pool.clone()));
    let app_routing_read_store = Arc::new(PostgresAppRoutingReadStore::with_api_key_secret_codec(
        pool.clone(),
        api_key_secret_codec.clone(),
    ));
    let app_routing_strategy_store = Arc::new(PostgresAppRoutingStrategyStore::new(pool.clone()));
    let entity_uuid_generator: EntityUuidGen = Arc::new(OsApiKeySecretGenerator);
    let api_key_runtime = Some(app_api_key_runtime_deps_for_postgres(
        pool.clone(),
        &api_key_security_config,
        api_key_secret_codec.clone(),
    )?);
    let usage_settlement_worker_config =
        sdkwork_clawrouter_router_service::application::resolve_usage_settlement_worker_config(
            runtime_toml,
        );
    let readiness_check =
                sdkwork_clawrouter_router_service::infrastructure::sql::pool::postgres_runtime_readiness_check(
                    pool.clone(),
                    runtime_toml,
                    usage_settlement_worker_config,
                );
    finalize_product_router_with_federated_capabilities(
        router_with_runtime_stores_and_database_status(
            Some(Arc::new(PostgresSiteSettingsStore::new(pool.clone()))),
            entity_uuid_generator,
            trusted_subject_config,
            app_session_config,
            Some(payment_webhook_config),
            Some(payment_callback_store),
            Some(payment_intent_runtime_store),
            payment_provider_registry,
            Some(dashboard_read_store),
            Some(settlements_dashboard_read_store),
            Some(settings_store),
            Some(usage_logs_read_store),
            Some(app_notification_store),
            Some(app_chat_store),
            Some(app_runtime_store),
            Some(app_runtime_execution_catalog),
            None,
            Some(Arc::clone(&app_runtime_gateway_client)),
            Some(Arc::clone(&app_runtime_stream_bus)),
            Some(app_routing_read_store),
            Some(app_routing_strategy_store),
            Some(model_catalog_router),
            Some(&config),
            request_limits_config,
            readiness_check,
            api_key_runtime,
            deployment_mode,
        ),
        subject_boundary_config,
        Some(&config),
    )
    .await
}

pub async fn router_with_optional_database_config(
    config: Option<DatabaseConfig>,
) -> Result<Router, ProductCatalogRouterError> {
    match config {
        Some(config) => router_with_database_config(config).await,
        None => Ok(router()),
    }
}

pub async fn router_from_env() -> Result<Router, ProductCatalogRouterError> {
    let runtime_toml =
        RuntimeTomlConfig::from_env_config_file().map_err(ProductCatalogRouterError::Config)?;
    let deployment_mode = validate_runtime_snowflake_node_id_configuration(runtime_toml.as_ref())?;
    let config = require_database_config(
        DatabaseConfig::from_env_or_runtime_toml_or_initialize(runtime_toml.as_ref())
            .map_err(ProductCatalogRouterError::Config)?,
        runtime_toml.as_ref(),
    )?;
    let startup_install_mode = StartupInstallMode::from_env_or_runtime_toml(runtime_toml.as_ref())
        .map_err(ProductCatalogRouterError::Config)?;
    sdkwork_claw_config::ensure_production_startup_install_policy(
        runtime_toml.as_ref(),
        startup_install_mode,
    )
    .map_err(ProductCatalogRouterError::Config)?;
    let api_key_security_config =
        ApiKeySecurityConfig::from_env_or_runtime_toml(runtime_toml.as_ref())
            .map_err(ProductCatalogRouterError::Config)?;
    let trusted_subject_config =
        TrustedSubjectConfig::from_env_or_runtime_toml(runtime_toml.as_ref())
            .map_err(ProductCatalogRouterError::Config)?;
    let app_session_config = AppSessionConfig::from_env_or_runtime_toml(runtime_toml.as_ref())
        .map_err(ProductCatalogRouterError::Config)?;
    let payment_webhook_config =
        PaymentWebhookConfig::from_env_or_runtime_toml(runtime_toml.as_ref())
            .map_err(ProductCatalogRouterError::Config)?;
    ensure_server_safe_deployment_mode(deployment_mode, runtime_toml.as_ref())?;
    sdkwork_claw_config::ensure_server_production_redis_config(
        deployment_mode,
        runtime_toml.as_ref(),
    )
    .map_err(ProductCatalogRouterError::Config)?;
    let router =
        router_with_database_config_api_key_trusted_subject_app_session_and_startup_install_mode(
            config.clone(),
            require_api_key_security_config(api_key_security_config)?,
            require_trusted_subject_config(trusted_subject_config)?,
            require_app_session_config(app_session_config)?,
            require_payment_webhook_config(payment_webhook_config)?,
            deployment_mode,
            startup_install_mode,
            runtime_toml.as_ref(),
        )
        .await?;
    Ok(
        crate::web_bootstrap::maybe_wrap_router_with_web_framework_and_database_config(
            router, &config,
        )
        .await,
    )
}

fn validate_runtime_snowflake_node_id_configuration(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<DeploymentMode, ProductCatalogRouterError> {
    sdkwork_clawrouter_router_service::infrastructure::sql::validate_claw_runtime_id_configuration(
        runtime_toml,
    )
    .map_err(|error| ProductCatalogRouterError::Config(error.to_string()))
}

fn ensure_server_safe_deployment_mode(
    deployment_mode: DeploymentMode,
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<(), ProductCatalogRouterError> {
    if deployment_mode != DeploymentMode::Desktop {
        return Ok(());
    }
    let environment = runtime_toml
        .and_then(|config| config.install.environment.as_deref())
        .unwrap_or("development")
        .trim()
        .to_ascii_lowercase();
    if environment == "production" || environment == "prod" {
        return Err(ProductCatalogRouterError::Config(
            "desktop deployment mode cannot be used with a production environment profile"
                .to_owned(),
        ));
    }
    Ok(())
}

fn api_key_secret_codec_from_config(
    config: &ApiKeySecurityConfig,
) -> Result<ApiKeyCodec, ProductCatalogRouterError> {
    Ok(Arc::new(
        RingAeadApiKeySecretCodec::new(config.pepper_secret())
            .map_err(|error| ProductCatalogRouterError::Config(error.to_string()))?,
    ))
}

fn build_app_runtime_gateway_client(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<AppRuntimeGatewayRuntimeClient, String> {
    let base_url = app_runtime_gateway_base_url(runtime_toml);
    AppRuntimeGatewayHttpClient::new(base_url)
        .map(|client| Arc::new(client) as AppRuntimeGatewayRuntimeClient)
        .map_err(|error| error.to_string())
}

pub fn shared_runtime_gateway_client_from_runtime_toml(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<
    Arc<dyn sdkwork_clawrouter_router_service::ports::AppRuntimeGatewayClient + Send + Sync>,
    String,
> {
    build_app_runtime_gateway_client(runtime_toml)
}

async fn build_app_runtime_stream_bus(
    runtime_toml: Option<&RuntimeTomlConfig>,
    deployment_mode: DeploymentMode,
) -> Result<AppRuntimeStreamBus, ProductCatalogRouterError> {
    let explicit_config = RedisConfig::from_env_or_runtime_toml(runtime_toml)
        .map_err(ProductCatalogRouterError::Config)?;
    let (redis_url, key_prefix, command_timeout, explicit) = match explicit_config {
        Some(config) => (
            config.url().to_owned(),
            config.key_prefix().map(str::to_owned),
            Duration::from_millis(config.command_timeout_millis()),
            true,
        ),
        None => (
            "redis://127.0.0.1:6379/0".to_owned(),
            Some("clawrouter".to_owned()),
            Duration::from_millis(RedisConfig::DEFAULT_COMMAND_TIMEOUT_MILLIS),
            false,
        ),
    };

    match RedisRuntimeStreamBus::connect(redis_url.as_str(), key_prefix.as_deref(), command_timeout)
        .await
    {
        Ok(bus) => {
            tracing::info!(
                explicit,
                key_prefix = key_prefix.as_deref().unwrap_or("clawrouter"),
                "app runtime chat streams will use Redis Streams"
            );
            Ok(Arc::new(bus))
        }
        Err(error) if explicit => Err(ProductCatalogRouterError::Config(format!(
            "configured Redis runtime stream bus is unavailable: {error}"
        ))),
        Err(error) if allow_in_memory_runtime_stream_bus_fallback(deployment_mode) => {
            tracing::warn!(
                error = %error,
                "default local Redis runtime stream bus is unavailable; falling back to in-process stream bus"
            );
            Ok(Arc::new(InMemoryRuntimeStreamBus::default()))
        }
        Err(error) => Err(ProductCatalogRouterError::Config(format!(
            "Redis runtime stream bus is required for {} deployments; configure Redis or make the default local Redis endpoint available: {error}",
            deployment_mode.as_str()
        ))),
    }
}

pub async fn shared_runtime_stream_bus_from_runtime_toml(
    runtime_toml: Option<&RuntimeTomlConfig>,
    deployment_mode: DeploymentMode,
) -> Result<Arc<dyn RuntimeStreamBus + Send + Sync>, ProductCatalogRouterError> {
    build_app_runtime_stream_bus(runtime_toml, deployment_mode).await
}

fn allow_implicit_in_memory_runtime_stream_bus(deployment_mode: DeploymentMode) -> bool {
    deployment_mode == DeploymentMode::Desktop
}

fn allow_in_memory_runtime_stream_bus_fallback(deployment_mode: DeploymentMode) -> bool {
    matches!(
        deployment_mode,
        DeploymentMode::Desktop | DeploymentMode::Server
    )
}

fn app_runtime_gateway_base_url(runtime_toml: Option<&RuntimeTomlConfig>) -> String {
    const APP_RUNTIME_GATEWAY_BASE_URL: &str = "SDKWORK_CLAW_APP_RUNTIME_GATEWAY_BASE_URL";
    const EDGE_GATEWAY_BASE_URL: &str = "SDKWORK_CLAW_EDGE_GATEWAY_BASE_URL";
    const DEFAULT_GATEWAY_BASE_URL: &str = "http://127.0.0.1:18080";

    sdkwork_claw_config::runtime::config_value(APP_RUNTIME_GATEWAY_BASE_URL, None)
        .or_else(|| {
            sdkwork_claw_config::runtime::config_value(
                EDGE_GATEWAY_BASE_URL,
                runtime_toml.and_then(|config| config.edge.gateway_base_url.as_deref()),
            )
        })
        .unwrap_or_else(|| DEFAULT_GATEWAY_BASE_URL.to_owned())
}

fn app_runtime_catalog_refresh_interval_from_env_or_toml(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<Duration, String> {
    const CATALOG_REFRESH_INTERVAL: &str = "SDKWORK_CLAW_PROVIDER_CATALOG_REFRESH_INTERVAL_MILLIS";
    let catalog_refresh_interval_millis = parse_positive_u64_config(
        CATALOG_REFRESH_INTERVAL,
        runtime_toml.and_then(|config| {
            config
                .provider_relay
                .runtime
                .catalog_refresh_interval_millis
        }),
        DEFAULT_APP_RUNTIME_CATALOG_REFRESH_INTERVAL_MILLIS,
    )?;
    Ok(Duration::from_millis(catalog_refresh_interval_millis))
}

pub fn shared_runtime_catalog_refresh_interval_from_toml(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<Duration, String> {
    app_runtime_catalog_refresh_interval_from_env_or_toml(runtime_toml)
}

fn spawn_postgres_app_runtime_catalog_refresh_worker(
    pool: &PgPool,
    catalog: Arc<RefreshableSqlPricingCatalog>,
    api_key_secret_codec: ApiKeyCodec,
    interval: Duration,
) -> tokio::task::JoinHandle<()> {
    let pool = pool.clone();
    tokio::spawn(async move {
        loop {
            sleep(interval).await;
            match PostgresPricingCatalogLoader::with_api_key_secret_codec(
                pool.clone(),
                api_key_secret_codec.clone(),
            )
            .load_snapshot()
            .await
            {
                Ok(snapshot) => {
                    let summary = snapshot.summary();
                    catalog.replace_snapshot(snapshot);
                    log_app_runtime_catalog_snapshot_summary("postgres", "refresh", summary);
                }
                Err(error) => {
                    tracing::warn!(
                        error = %error,
                        "Postgres app runtime catalog refresh failed; keeping previous snapshot"
                    );
                }
            }
        }
    })
}

fn log_app_runtime_catalog_snapshot_summary(
    engine: &'static str,
    phase: &'static str,
    summary: SqlPricingCatalogSnapshotSummary,
) {
    if phase == "refresh" {
        tracing::debug!(
            service = SERVICE_NAME,
            catalog_engine = engine,
            catalog_phase = phase,
            vendors = summary.vendors,
            models = summary.models,
            model_upstream_routes = summary.model_upstream_routes,
            callable_model_upstream_routes = summary.callable_model_upstream_routes,
            upstream_account_routes = summary.upstream_account_routes,
            callable_upstream_account_routes = summary.callable_upstream_account_routes,
            provider_upstream_account_group_bindings =
                summary.provider_upstream_account_group_bindings,
            routing_policies = summary.routing_policies,
            routing_rules = summary.routing_rules,
            pricing_plans = summary.pricing_plans,
            upstream_account_groups = summary.upstream_account_groups,
            api_keys = summary.api_keys,
            prices = summary.prices,
            managed_provider_secrets = summary.managed_provider_secrets,
            "app runtime catalog snapshot loaded"
        );
    } else {
        tracing::info!(
            service = SERVICE_NAME,
            catalog_engine = engine,
            catalog_phase = phase,
            vendors = summary.vendors,
            models = summary.models,
            model_upstream_routes = summary.model_upstream_routes,
            callable_model_upstream_routes = summary.callable_model_upstream_routes,
            upstream_account_routes = summary.upstream_account_routes,
            callable_upstream_account_routes = summary.callable_upstream_account_routes,
            provider_upstream_account_group_bindings =
                summary.provider_upstream_account_group_bindings,
            routing_policies = summary.routing_policies,
            routing_rules = summary.routing_rules,
            pricing_plans = summary.pricing_plans,
            upstream_account_groups = summary.upstream_account_groups,
            api_keys = summary.api_keys,
            prices = summary.prices,
            managed_provider_secrets = summary.managed_provider_secrets,
            "app runtime catalog snapshot loaded"
        );
    }
}

fn model_rankings_service(read_store: ModelRankingsRuntimeStore) -> ModelRankingsRuntimeStore {
    Arc::new(ModelRankingsService::new(read_store))
}

fn app_model_rankings_router_with_subject_boundary(
    read_store: ModelRankingsRuntimeStore,
    trusted_subject_config: &TrustedSubjectConfig,
    app_session_config: &AppSessionConfig,
) -> Router {
    sdkwork_claw_http::apply_optional_app_subject_boundary_if_legacy(
        app_model_rankings_router_with_read_store(read_store),
        AppSubjectBoundaryConfig::new(trusted_subject_config.clone(), app_session_config.clone()),
    )
}

async fn maybe_spawn_postgres_model_ranking_refresh_worker(
    pool: &PgPool,
    config: ModelRankingRefreshWorkerConfig,
    cache_invalidator: Option<ModelRankingsRuntimeStore>,
) -> Result<(), ProductCatalogRouterError> {
    let config = config.normalized();
    if !config.enabled {
        return Ok(());
    }
    if !postgres_model_ranking_schema_ready(pool)
        .await
        .map_err(|error| {
            ProductCatalogRouterError::Postgres(PostgresCatalogLoadError::Database(error))
        })?
    {
        tracing::warn!(
            "model ranking refresh worker is enabled but Postgres ranking schema is incomplete"
        );
        return Ok(());
    }
    spawn_model_ranking_refresh_worker(
        Arc::new(PostgresModelRankingRefreshStore::new(pool.clone())),
        config,
        cache_invalidator,
    );
    Ok(())
}

fn spawn_model_ranking_refresh_worker(
    store: ModelRankingRefreshRuntimeStore,
    config: ModelRankingRefreshWorkerConfig,
    cache_invalidator: Option<ModelRankingsRuntimeStore>,
) -> tokio::task::JoinHandle<()> {
    let worker = ModelRankingRefreshWorker::new(store, config);
    let interval = Duration::from_millis(worker.config().interval_millis);
    tokio::spawn(async move {
        if worker.config().run_on_startup {
            run_model_ranking_refresh_worker_iteration(&worker, cache_invalidator.as_ref()).await;
        }
        loop {
            tokio::time::sleep(interval).await;
            run_model_ranking_refresh_worker_iteration(&worker, cache_invalidator.as_ref()).await;
        }
    })
}

async fn run_model_ranking_refresh_worker_iteration(
    worker: &ModelRankingRefreshWorker,
    cache_invalidator: Option<&ModelRankingsRuntimeStore>,
) -> Option<ModelRankingRefreshOutcome> {
    match worker.run_once().await {
        Ok(outcome) if should_invalidate_model_ranking_cache(&outcome) => {
            if let Some(cache_invalidator) = cache_invalidator {
                cache_invalidator.invalidate_model_rankings_cache(ModelRankingsCacheInvalidation {
                    tenant_id: worker.config().tenant_id,
                    organization_id: worker.config().organization_id,
                    rank_scope: Some(outcome.rank_scope.clone()),
                });
            }
            Some(outcome)
        }
        Ok(outcome) => Some(outcome),
        Err(error) => {
            tracing::warn!(error = %error, "model ranking refresh worker run failed");
            None
        }
    }
}

fn should_invalidate_model_ranking_cache(outcome: &ModelRankingRefreshOutcome) -> bool {
    matches!(
        outcome.run_status,
        ModelRankingRefreshRunStatus::Succeeded | ModelRankingRefreshRunStatus::Empty
    )
}

async fn postgres_model_ranking_schema_ready(pool: &PgPool) -> Result<bool, sqlx::Error> {
    let table_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name IN ('ai_model', 'ai_usage', 'ai_model_rank_snapshot', 'ops_job_execution')
        "#,
    )
    .fetch_one(pool)
    .await?;
    let model_column_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'ai_model'
          AND column_name IN ('catalog_key', 'vendor_code', 'capability', 'rank_score')
        "#,
    )
    .fetch_one(pool)
    .await?;
    let usage_column_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'ai_usage'
          AND column_name IN ('catalog_key', 'request_count', 'total_tokens', 'customer_charge_amount', 'occurred_at')
        "#,
    )
    .fetch_one(pool)
    .await?;
    let snapshot_column_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'ai_model_rank_snapshot'
          AND column_name IN ('metadata', 'snapshot_date', 'snapshot_period', 'rank_scope', 'catalog_key', 'rank_no')
        "#,
    )
    .fetch_one(pool)
    .await?;
    let job_column_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(1)
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'ops_job_execution'
          AND column_name IN ('job_name', 'started_at', 'ended_at', 'duration_ms', 'execution_status', 'payload')
        "#,
    )
    .fetch_one(pool)
    .await?;
    Ok(table_count == 4
        && model_column_count == 4
        && usage_column_count == 5
        && snapshot_column_count == 6
        && job_column_count == 6)
}

fn platform_transaction_center_subject() -> AdminTransactionCenterSubject {
    let tenant_id = std::env::var("SDKWORK_CLAW_PLATFORM_TENANT_ID")
        .ok()
        .and_then(|value| value.trim().parse::<i64>().ok())
        .filter(|tenant_id| *tenant_id > 0)
        .unwrap_or(100_001);
    AdminTransactionCenterSubject {
        tenant_id,
        organization_id: 0,
        operator_id: 0,
        operator_type: 1,
    }
}

async fn bootstrap_postgres_payment_provider_registry(pool: &PgPool) -> PaymentProviderRegistry {
    let store = PostgresAdminTransactionCenterStore::new(pool.clone());
    bootstrap_payment_provider_registry(
        &store,
        None,
        platform_transaction_center_subject(),
        payment_runtime_environment(),
    )
    .await
}

#[cfg(test)]
fn model_ranking_refresh_worker_config_from_env() -> Result<ModelRankingRefreshWorkerConfig, String>
{
    model_ranking_refresh_worker_config_from_env_or_toml(None)
}

fn model_ranking_refresh_worker_config_from_env_or_toml(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<ModelRankingRefreshWorkerConfig, String> {
    const ENABLED: &str = "SDKWORK_CLAW_MODEL_RANKING_REFRESH_WORKER_ENABLED";
    const TENANT_ID: &str = "SDKWORK_CLAW_MODEL_RANKING_TENANT_ID";
    const ORGANIZATION_ID: &str = "SDKWORK_CLAW_MODEL_RANKING_ORGANIZATION_ID";
    const RANK_SCOPE: &str = "SDKWORK_CLAW_MODEL_RANKING_RANK_SCOPE";
    const SNAPSHOT_PERIOD: &str = "SDKWORK_CLAW_MODEL_RANKING_SNAPSHOT_PERIOD";
    const LIMIT: &str = "SDKWORK_CLAW_MODEL_RANKING_LIMIT";
    const LOOKBACK_DAYS: &str = "SDKWORK_CLAW_MODEL_RANKING_LOOKBACK_DAYS";
    const INTERVAL_MILLIS: &str = "SDKWORK_CLAW_MODEL_RANKING_INTERVAL_MILLIS";
    const CACHE_MAX_AGE_SECONDS: &str = "SDKWORK_CLAW_MODEL_RANKING_CACHE_MAX_AGE_SECONDS";
    const RUN_TIMEOUT_MILLIS: &str = "SDKWORK_CLAW_MODEL_RANKING_RUN_TIMEOUT_MILLIS";
    const MAX_RETRY_ATTEMPTS: &str = "SDKWORK_CLAW_MODEL_RANKING_MAX_RETRY_ATTEMPTS";
    const RETRY_BACKOFF_MILLIS: &str = "SDKWORK_CLAW_MODEL_RANKING_RETRY_BACKOFF_MILLIS";
    const RUN_ON_STARTUP: &str = "SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP";
    const ALERT_AFTER_CONSECUTIVE_FAILURES: &str =
        "SDKWORK_CLAW_MODEL_RANKING_ALERT_AFTER_CONSECUTIVE_FAILURES";

    let defaults = ModelRankingRefreshWorkerConfig::default();
    Ok(ModelRankingRefreshWorkerConfig {
        enabled: parse_optional_bool_config(
            ENABLED,
            runtime_toml.and_then(|config| config.model_ranking.enabled),
        )?
        .unwrap_or(defaults.enabled),
        tenant_id: parse_non_negative_i64_config(
            TENANT_ID,
            runtime_toml.and_then(|config| config.model_ranking.tenant_id),
            defaults.tenant_id,
        )?,
        organization_id: parse_non_negative_i64_config(
            ORGANIZATION_ID,
            runtime_toml.and_then(|config| config.model_ranking.organization_id),
            defaults.organization_id,
        )?,
        rank_scope: parse_non_empty_string_config(
            RANK_SCOPE,
            runtime_toml.and_then(|config| config.model_ranking.rank_scope.as_deref()),
            defaults.rank_scope,
        )?,
        snapshot_period: parse_non_empty_string_config(
            SNAPSHOT_PERIOD,
            runtime_toml.and_then(|config| config.model_ranking.snapshot_period.as_deref()),
            defaults.snapshot_period,
        )?,
        limit: parse_positive_i64_config(
            LIMIT,
            runtime_toml.and_then(|config| config.model_ranking.limit),
            defaults.limit,
        )?,
        lookback_days: parse_positive_i64_config(
            LOOKBACK_DAYS,
            runtime_toml.and_then(|config| config.model_ranking.lookback_days),
            defaults.lookback_days,
        )?,
        interval_millis: parse_positive_u64_config(
            INTERVAL_MILLIS,
            runtime_toml.and_then(|config| config.model_ranking.interval_millis),
            defaults.interval_millis,
        )?,
        cache_max_age_seconds: parse_positive_i64_config(
            CACHE_MAX_AGE_SECONDS,
            runtime_toml.and_then(|config| config.model_ranking.cache_max_age_seconds),
            defaults.cache_max_age_seconds,
        )?,
        run_timeout_millis: parse_positive_u64_config(
            RUN_TIMEOUT_MILLIS,
            runtime_toml.and_then(|config| config.model_ranking.run_timeout_millis),
            defaults.run_timeout_millis,
        )?,
        max_retry_attempts: parse_non_negative_u32_config(
            MAX_RETRY_ATTEMPTS,
            runtime_toml.and_then(|config| config.model_ranking.max_retry_attempts),
            defaults.max_retry_attempts,
        )?,
        retry_backoff_millis: parse_positive_u64_config(
            RETRY_BACKOFF_MILLIS,
            runtime_toml.and_then(|config| config.model_ranking.retry_backoff_millis),
            defaults.retry_backoff_millis,
        )?,
        run_on_startup: parse_optional_bool_config(
            RUN_ON_STARTUP,
            runtime_toml.and_then(|config| config.model_ranking.run_on_startup),
        )?
        .unwrap_or(defaults.run_on_startup),
        alert_after_consecutive_failures: parse_positive_i64_config(
            ALERT_AFTER_CONSECUTIVE_FAILURES,
            runtime_toml.and_then(|config| config.model_ranking.alert_after_consecutive_failures),
            defaults.alert_after_consecutive_failures,
        )?,
        trigger_type: defaults.trigger_type,
    })
}

pub fn shared_model_ranking_refresh_worker_config_from_toml(
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<ModelRankingRefreshWorkerConfig, String> {
    model_ranking_refresh_worker_config_from_env_or_toml(runtime_toml)
}

fn parse_optional_bool_config(
    name: &str,
    config_value: Option<bool>,
) -> Result<Option<bool>, String> {
    sdkwork_claw_config::runtime::config_bool(name, config_value)
}

fn parse_non_negative_i64_config(
    name: &str,
    config_value: Option<i64>,
    default: i64,
) -> Result<i64, String> {
    let parsed = sdkwork_claw_config::runtime::config_i64(name, config_value)?.unwrap_or(default);
    if parsed < 0 {
        return Err(format!("{name} must be a non-negative integer"));
    }
    Ok(parsed)
}

fn parse_positive_i64_config(
    name: &str,
    config_value: Option<i64>,
    default: i64,
) -> Result<i64, String> {
    let parsed = sdkwork_claw_config::runtime::config_i64(name, config_value)?.unwrap_or(default);
    if parsed <= 0 {
        return Err(format!("{name} must be a positive integer"));
    }
    Ok(parsed)
}

fn parse_positive_u64_config(
    name: &str,
    config_value: Option<u64>,
    default: u64,
) -> Result<u64, String> {
    let parsed = sdkwork_claw_config::runtime::config_u64(name, config_value)?.unwrap_or(default);
    if parsed == 0 {
        return Err(format!("{name} must be a positive integer"));
    }
    Ok(parsed)
}

fn parse_non_negative_u32_config(
    name: &str,
    config_value: Option<u32>,
    default: u32,
) -> Result<u32, String> {
    Ok(sdkwork_claw_config::runtime::config_u32(name, config_value)?.unwrap_or(default))
}

fn parse_non_empty_string_config(
    name: &str,
    config_value: Option<&str>,
    default: String,
) -> Result<String, String> {
    let Some(value) = sdkwork_claw_config::runtime::config_value(name, config_value) else {
        return Ok(default);
    };
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{name} must not be empty"));
    }
    Ok(trimmed.to_owned())
}

fn require_api_key_security_config(
    config: Option<ApiKeySecurityConfig>,
) -> Result<ApiKeySecurityConfig, ProductCatalogRouterError> {
    config.ok_or_else(|| {
        ProductCatalogRouterError::Config(format!(
            "{} is required when SDKWORK_CLAW_DATABASE_URL is configured",
            ApiKeySecurityConfig::ENV_API_KEY_PEPPER
        ))
    })
}

fn require_trusted_subject_config(
    config: Option<TrustedSubjectConfig>,
) -> Result<TrustedSubjectConfig, ProductCatalogRouterError> {
    config.ok_or_else(|| {
        ProductCatalogRouterError::Config(format!(
            "{} is required when SDKWORK_CLAW_DATABASE_URL is configured",
            TrustedSubjectConfig::ENV_TRUSTED_SUBJECT_SECRET
        ))
    })
}

fn require_app_session_config(
    config: Option<AppSessionConfig>,
) -> Result<AppSessionConfig, ProductCatalogRouterError> {
    config.ok_or_else(|| {
        ProductCatalogRouterError::Config(format!(
            "{} is required when SDKWORK_CLAW_DATABASE_URL is configured",
            AppSessionConfig::ENV_APP_SESSION_SECRET
        ))
    })
}

fn require_payment_webhook_config(
    config: Option<PaymentWebhookConfig>,
) -> Result<PaymentWebhookConfig, ProductCatalogRouterError> {
    config.ok_or_else(|| {
        ProductCatalogRouterError::Config(format!(
            "{} is required when SDKWORK_CLAW_DATABASE_URL is configured",
            PaymentWebhookConfig::ENV_PAYMENT_WEBHOOK_SECRET
        ))
    })
}

fn require_database_config(
    config: Option<DatabaseConfig>,
    runtime_toml: Option<&RuntimeTomlConfig>,
) -> Result<DatabaseConfig, ProductCatalogRouterError> {
    config.ok_or_else(|| {
        let profile = RuntimeConfigProfile::from_env_or_runtime_toml(runtime_toml)
            .unwrap_or(RuntimeConfigProfile::Server);
        let help_text = DatabaseConfig::startup_help_text(profile);
        ProductCatalogRouterError::Config(
            format!(
                "SDKWORK_CLAW_DATABASE_URL is required for sdkwork-clawrouter-standalone-gateway startup so install checks can run.\n{help_text}"
            ),
        )
    })
}

async fn prepare_claw_router_database_lifecycle(
    pool: DatabasePool,
) -> Result<(), ProductCatalogRouterError> {
    connect_claw_router_database(pool).map_err(|error| {
        ProductCatalogRouterError::Installer(DatabaseInstallError::InvalidState(error))
    })?;
    Ok(())
}

#[derive(Debug)]
pub enum ProductCatalogRouterError {
    Config(String),
    Installer(DatabaseInstallError),
    Postgres(PostgresCatalogLoadError),
}

impl std::fmt::Display for ProductCatalogRouterError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Config(error) => write!(formatter, "{error}"),
            Self::Installer(error) => write!(formatter, "{error}"),
            Self::Postgres(error) => write!(formatter, "{error}"),
        }
    }
}

impl std::error::Error for ProductCatalogRouterError {}

impl From<DatabaseInstallError> for ProductCatalogRouterError {
    fn from(value: DatabaseInstallError) -> Self {
        Self::Installer(value)
    }
}

impl From<PostgresCatalogLoadError> for ProductCatalogRouterError {
    fn from(value: PostgresCatalogLoadError) -> Self {
        Self::Postgres(value)
    }
}

pub async fn serve(bind_addr: &str) -> anyhow::Result<()> {
    let runtime_toml = sdkwork_claw_config::RuntimeTomlConfig::from_env_config_file()
        .map_err(anyhow::Error::msg)?;
    serve_with_runtime_config(bind_addr, runtime_toml.as_ref()).await
}

pub async fn serve_with_runtime_config(
    bind_addr: &str,
    runtime_toml: Option<&sdkwork_claw_config::RuntimeTomlConfig>,
) -> anyhow::Result<()> {
    sdkwork_claw_observability::init_tracing_with_runtime_config(
        runtime_toml.map(|config| &config.observability),
    )
    .map_err(anyhow::Error::msg)?;
    let listener = tokio::net::TcpListener::bind(bind_addr).await?;
    axum::serve(listener, router_from_env().await?)
        .with_graceful_shutdown(sdkwork_claw_http::wait_for_shutdown_signal())
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        allow_implicit_in_memory_runtime_stream_bus, allow_in_memory_runtime_stream_bus_fallback,
        app_runtime_catalog_refresh_interval_from_env_or_toml,
        model_ranking_refresh_worker_config_from_env, router_from_env,
        should_invalidate_model_ranking_cache,
    };
    use sdkwork_claw_config::DeploymentMode;
    use sdkwork_clawrouter_router_service::ports::{
        ModelRankingRefreshOutcome, ModelRankingRefreshRunStatus,
    };
    use std::sync::{Mutex, OnceLock};
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    #[test]
    fn app_runtime_stream_bus_in_memory_fallback_is_disallowed_for_cluster_deployments() {
        assert!(allow_in_memory_runtime_stream_bus_fallback(
            DeploymentMode::Desktop
        ));
        assert!(allow_in_memory_runtime_stream_bus_fallback(
            DeploymentMode::Server
        ));
        assert!(!allow_in_memory_runtime_stream_bus_fallback(
            DeploymentMode::Docker
        ));
        assert!(!allow_in_memory_runtime_stream_bus_fallback(
            DeploymentMode::Kubernetes
        ));
    }

    #[test]
    fn implicit_app_runtime_stream_bus_fallback_uses_explicit_mode_not_environment() {
        assert!(allow_implicit_in_memory_runtime_stream_bus(
            DeploymentMode::Desktop
        ));
        assert!(!allow_implicit_in_memory_runtime_stream_bus(
            DeploymentMode::Server
        ));
        assert!(!allow_implicit_in_memory_runtime_stream_bus(
            DeploymentMode::Docker
        ));
        assert!(!allow_implicit_in_memory_runtime_stream_bus(
            DeploymentMode::Kubernetes
        ));
    }

    #[test]
    fn app_runtime_catalog_refresh_defaults_to_low_pressure_interval() {
        let _guard = env_guard().lock().unwrap();
        let saved_refresh_interval =
            std::env::var("SDKWORK_CLAW_PROVIDER_CATALOG_REFRESH_INTERVAL_MILLIS").ok();
        std::env::remove_var("SDKWORK_CLAW_PROVIDER_CATALOG_REFRESH_INTERVAL_MILLIS");

        let interval = app_runtime_catalog_refresh_interval_from_env_or_toml(None).unwrap();

        restore_env_var(
            "SDKWORK_CLAW_PROVIDER_CATALOG_REFRESH_INTERVAL_MILLIS",
            saved_refresh_interval,
        );
        assert_eq!(Duration::from_secs(60), interval);
    }

    #[test]
    fn model_ranking_refresh_worker_config_from_env_parses_runtime_policy() {
        let _guard = env_guard().lock().unwrap();
        let names = [
            "SDKWORK_CLAW_MODEL_RANKING_REFRESH_WORKER_ENABLED",
            "SDKWORK_CLAW_MODEL_RANKING_TENANT_ID",
            "SDKWORK_CLAW_MODEL_RANKING_ORGANIZATION_ID",
            "SDKWORK_CLAW_MODEL_RANKING_RANK_SCOPE",
            "SDKWORK_CLAW_MODEL_RANKING_SNAPSHOT_PERIOD",
            "SDKWORK_CLAW_MODEL_RANKING_LIMIT",
            "SDKWORK_CLAW_MODEL_RANKING_LOOKBACK_DAYS",
            "SDKWORK_CLAW_MODEL_RANKING_INTERVAL_MILLIS",
            "SDKWORK_CLAW_MODEL_RANKING_CACHE_MAX_AGE_SECONDS",
            "SDKWORK_CLAW_MODEL_RANKING_RUN_TIMEOUT_MILLIS",
            "SDKWORK_CLAW_MODEL_RANKING_MAX_RETRY_ATTEMPTS",
            "SDKWORK_CLAW_MODEL_RANKING_RETRY_BACKOFF_MILLIS",
            "SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP",
            "SDKWORK_CLAW_MODEL_RANKING_ALERT_AFTER_CONSECUTIVE_FAILURES",
        ];
        for name in names {
            std::env::remove_var(name);
        }
        std::env::set_var("SDKWORK_CLAW_MODEL_RANKING_RUN_TIMEOUT_MILLIS", "120000");
        std::env::set_var("SDKWORK_CLAW_MODEL_RANKING_MAX_RETRY_ATTEMPTS", "4");
        std::env::set_var("SDKWORK_CLAW_MODEL_RANKING_RETRY_BACKOFF_MILLIS", "250");
        std::env::set_var("SDKWORK_CLAW_MODEL_RANKING_RUN_ON_STARTUP", "false");
        std::env::set_var(
            "SDKWORK_CLAW_MODEL_RANKING_ALERT_AFTER_CONSECUTIVE_FAILURES",
            "7",
        );

        let config = model_ranking_refresh_worker_config_from_env()
            .unwrap()
            .normalized();

        assert_eq!(120_000, config.run_timeout_millis);
        assert_eq!(4, config.max_retry_attempts);
        assert_eq!(250, config.retry_backoff_millis);
        assert!(!config.run_on_startup);
        assert_eq!(7, config.alert_after_consecutive_failures);
        for name in names {
            std::env::remove_var(name);
        }
    }

    #[tokio::test(flavor = "current_thread")]
    async fn router_from_env_rejects_zero_config_server_placeholder_postgres() {
        let _guard = env_guard().lock().unwrap();
        let saved_database_url = std::env::var("SDKWORK_CLAW_DATABASE_URL").ok();
        let saved_deployment_mode = std::env::var("SDKWORK_CLAW_DEPLOYMENT_MODE").ok();
        let saved_config_file = std::env::var("SDKWORK_CLAW_CONFIG_FILE").ok();
        let saved_snowflake_node_id = std::env::var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID").ok();
        let saved_api_key_pepper = std::env::var("SDKWORK_CLAW_API_KEY_PEPPER").ok();
        let saved_trusted_subject_secret =
            std::env::var("SDKWORK_CLAW_TRUSTED_SUBJECT_SECRET").ok();
        let saved_app_session_secret = std::env::var("SDKWORK_CLAW_APP_SESSION_SECRET").ok();
        let saved_payment_webhook_secret =
            std::env::var("SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET").ok();
        let config_path = unique_runtime_config_path();
        std::env::remove_var("SDKWORK_CLAW_DATABASE_URL");
        std::env::set_var("SDKWORK_CLAW_DEPLOYMENT_MODE", "server");
        std::env::set_var("SDKWORK_CLAW_CONFIG_FILE", &config_path);
        std::env::set_var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID", "1");
        std::env::set_var(
            "SDKWORK_CLAW_API_KEY_PEPPER",
            "0123456789abcdef0123456789abcdef",
        );
        std::env::set_var(
            "SDKWORK_CLAW_TRUSTED_SUBJECT_SECRET",
            "trusted-subject-secret-0123456789",
        );
        std::env::set_var(
            "SDKWORK_CLAW_APP_SESSION_SECRET",
            "app-session-secret-0123456789abcd",
        );
        std::env::set_var(
            "SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET",
            "payment-webhook-secret-0123456789abcdef",
        );

        let router_result = router_from_env().await;

        restore_env_var("SDKWORK_CLAW_DATABASE_URL", saved_database_url);
        restore_env_var("SDKWORK_CLAW_DEPLOYMENT_MODE", saved_deployment_mode);
        restore_env_var("SDKWORK_CLAW_CONFIG_FILE", saved_config_file);
        restore_env_var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID", saved_snowflake_node_id);
        restore_env_var("SDKWORK_CLAW_API_KEY_PEPPER", saved_api_key_pepper);
        restore_env_var(
            "SDKWORK_CLAW_TRUSTED_SUBJECT_SECRET",
            saved_trusted_subject_secret,
        );
        restore_env_var("SDKWORK_CLAW_APP_SESSION_SECRET", saved_app_session_secret);
        restore_env_var(
            "SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET",
            saved_payment_webhook_secret,
        );

        let error = router_result
            .expect_err("app-api server startup must reject placeholder PostgreSQL config")
            .to_string();
        assert!(error.contains("PostgreSQL configuration is incomplete"));
        assert!(error.contains("Server/service deployments use external PostgreSQL by default"));
        assert!(config_path.exists());
        let generated_config = std::fs::read_to_string(config_path).unwrap();
        assert!(generated_config.contains("engine = \"postgresql\""));
        assert!(generated_config.contains("deployment_mode = \"server\""));
    }

    #[tokio::test(flavor = "current_thread")]
    async fn router_from_env_rejects_missing_or_invalid_server_snowflake_node_id_before_database_bootstrap(
    ) {
        let _guard = env_guard().lock().unwrap();
        let saved_database_url = std::env::var("SDKWORK_CLAW_DATABASE_URL").ok();
        let saved_deployment_mode = std::env::var("SDKWORK_CLAW_DEPLOYMENT_MODE").ok();
        let saved_config_file = std::env::var("SDKWORK_CLAW_CONFIG_FILE").ok();
        let saved_snowflake_node_id = std::env::var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID").ok();

        std::env::remove_var("SDKWORK_CLAW_DATABASE_URL");
        std::env::set_var("SDKWORK_CLAW_DEPLOYMENT_MODE", "server");
        for node_id in [None, Some("not-a-node-id")] {
            let mut config_path = unique_runtime_config_path();
            config_path.set_file_name(match node_id {
                Some(_) => "invalid-snowflake-node-id.toml",
                None => "missing-snowflake-node-id.toml",
            });
            std::env::set_var("SDKWORK_CLAW_CONFIG_FILE", &config_path);
            match node_id {
                Some(node_id) => std::env::set_var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID", node_id),
                None => std::env::remove_var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID"),
            }

            let error = router_from_env()
                .await
                .expect_err(
                    "server startup must reject invalid Snowflake node IDs before bootstrap",
                )
                .to_string();

            assert!(
                error.contains("SDKWORK_CLAW_SNOWFLAKE_NODE_ID"),
                "unexpected startup error for node id {node_id:?}: {error}"
            );
            assert!(
                !config_path.exists(),
                "invalid runtime ID configuration must fail before creating {}",
                config_path.display()
            );
        }

        restore_env_var("SDKWORK_CLAW_DATABASE_URL", saved_database_url);
        restore_env_var("SDKWORK_CLAW_DEPLOYMENT_MODE", saved_deployment_mode);
        restore_env_var("SDKWORK_CLAW_CONFIG_FILE", saved_config_file);
        restore_env_var("SDKWORK_CLAW_SNOWFLAKE_NODE_ID", saved_snowflake_node_id);
    }

    #[test]
    fn model_ranking_refresh_cache_invalidation_only_runs_after_materialized_refresh() {
        assert!(should_invalidate_model_ranking_cache(
            &ModelRankingRefreshOutcome {
                run_status: ModelRankingRefreshRunStatus::Succeeded,
                ..ModelRankingRefreshOutcome::default()
            }
        ));
        assert!(should_invalidate_model_ranking_cache(
            &ModelRankingRefreshOutcome {
                run_status: ModelRankingRefreshRunStatus::Empty,
                ..ModelRankingRefreshOutcome::default()
            }
        ));
        assert!(!should_invalidate_model_ranking_cache(
            &ModelRankingRefreshOutcome {
                run_status: ModelRankingRefreshRunStatus::Skipped,
                ..ModelRankingRefreshOutcome::default()
            }
        ));
        assert!(!should_invalidate_model_ranking_cache(
            &ModelRankingRefreshOutcome {
                run_status: ModelRankingRefreshRunStatus::Failed,
                ..ModelRankingRefreshOutcome::default()
            }
        ));
    }

    fn env_guard() -> &'static Mutex<()> {
        static ENV_GUARD: OnceLock<Mutex<()>> = OnceLock::new();
        ENV_GUARD.get_or_init(|| Mutex::new(()))
    }

    fn unique_runtime_config_path() -> std::path::PathBuf {
        let millis = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();
        let mut path = std::env::temp_dir();
        path.push(format!(
            "sdkwork-clawrouter-standalone-gateway-runtime-{millis}"
        ));
        path.push("sdkwork-clawrouter.toml");
        path
    }

    fn restore_env_var(name: &str, value: Option<String>) {
        if let Some(value) = value {
            std::env::set_var(name, value);
        } else {
            std::env::remove_var(name);
        }
    }
}
