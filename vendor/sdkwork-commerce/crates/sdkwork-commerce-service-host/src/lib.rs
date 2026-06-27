pub mod account_runtime;
pub mod order_runtime;
pub mod payment_runtime;
pub mod rpc_client_bootstrap;
pub mod rpc_context;
pub mod rpc_discovery;
pub mod rpc_framework_bootstrap;
pub mod rpc_host;
pub mod rpc_host_bootstrap;
pub mod rpc_runtime;
pub mod rpc_server;
pub mod runtime_registry;
pub mod sqlx_runtime;

#[cfg(test)]
mod test_env;

pub mod rpc {
    pub use sdkwork_commerce_rpc::*;
}

pub use account_runtime::{CommerceAccountRuntimeHandler, CommerceAccountRuntimeStore};
pub use order_runtime::{CommerceOrderRuntimeHandler, CommerceOrderRuntimeStore};
pub use payment_runtime::{CommercePaymentRuntimeHandler, CommercePaymentRuntimeStore};
pub use rpc_client_bootstrap::{
    build_commerce_rpc_name_resolver_from_env, commerce_rpc_resolver_profile_from_env,
    CommerceRpcNameResolverBootstrap, COMMERCE_RPC_RESOLVER_PROFILE_ENV,
    COMMERCE_RPC_RESOLVER_SUBJECT_ID_ENV, COMMERCE_RPC_STATIC_ENDPOINT_ENV,
};
pub use rpc_context::CommerceIamRpcContextResolver;
pub use rpc_discovery::{
    register_commerce_discovery_instance, COMMERCE_DISCOVERY_ENDPOINT_ENV,
    COMMERCE_DISCOVERY_SERVICE_NAME_DEFAULT, COMMERCE_DISCOVERY_SERVICE_NAME_ENV,
};
pub use rpc_framework_bootstrap::{
    initialize_commerce_rpc_framework_from_env, CommerceRpcFrameworkBootstrap,
};
pub use rpc_host::{
    build_commerce_service_host_rpc_host, CommerceServiceHostRpcHost,
    CommerceServiceHostRpcHostInput,
};
pub use rpc_host_bootstrap::{
    build_commerce_rpc_host_from_env, build_commerce_rpc_host_from_pool,
    commerce_rpc_server_config_from_env, ensure_commerce_schema,
    resolve_commerce_sqlx_runtime_pool_from_env, resolve_iam_postgres_pool_from_env,
    run_commerce_rpc_host_from_env, COMMERCE_RPC_BIND_ADDR_ENV, COMMERCE_RPC_ENABLE_REFLECTION_ENV,
    COMMERCE_RPC_ENFORCE_AUTH_METADATA_ENV,
};
pub use rpc_runtime::CommerceServiceHostRpcRuntime;
pub use rpc_server::{serve_commerce_service_host_rpc, CommerceServiceHostRpcServerConfig};
pub use runtime_registry::{
    build_commerce_rpc_runtime_service_registry, build_commerce_runtime_service_registry,
    commerce_rpc_required_service_names, validate_commerce_rpc_runtime_stores,
    CommerceServiceHostRuntimeStores,
};
pub use sqlx_runtime::{
    build_commerce_sqlx_runtime_infrastructure, build_commerce_sqlx_runtime_stores,
    CommerceSqlxRuntimePool, SqlxCommerceAccountRuntimeStore, SqlxCommerceOrderRuntimeStore,
    SqlxCommercePaymentRuntimeStore, SqlxCommerceRuntimeIdempotencyStore,
    SqlxCommerceRuntimeTransactionManager,
};

use sdkwork_commerce_contract_service::{
    CapabilityFlag, CommerceIdempotencyRecord, CommerceOperationContract, CommerceOperationRequest,
    CommerceRequestHash, CommerceRuntimeContext, CommerceServiceContract, CommerceServiceError,
    DeploymentMode, Environment, IdempotencyDecision, OperationExecutionPolicy,
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceOperationServiceBinding {
    pub operation_id: &'static str,
    pub service_name: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRuntimeConfig {
    pub app_id: String,
    pub database_url: String,
    pub deployment_mode: DeploymentMode,
    pub environment: Environment,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRuntimeCapabilityManifest {
    pub name: &'static str,
    pub runtime_version: &'static str,
    pub service_names: Vec<&'static str>,
    pub capability_flags: Vec<&'static str>,
    pub service_contracts: Vec<CommerceServiceContract>,
    pub operation_contracts: Vec<CommerceOperationContract>,
    pub operation_service_bindings: Vec<CommerceOperationServiceBinding>,
    pub operation_input_type: &'static str,
    pub operation_output_type: &'static str,
    pub idempotency_store_port: &'static str,
    pub transaction_manager_port: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRuntimeExecutionPlan {
    pub context: CommerceRuntimeContext,
    pub operation_id: &'static str,
    pub service_name: &'static str,
    pub execution_policy: OperationExecutionPolicy,
    pub capability_name: &'static str,
    pub requires_transaction: bool,
    pub idempotency_scope: Option<&'static str>,
    idempotency_key: Option<String>,
    request_hash: Option<CommerceRequestHash>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRuntimeServiceRequest {
    pub execution_plan: CommerceRuntimeExecutionPlan,
    pub body_json: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRuntimeServiceResponse {
    pub operation_id: &'static str,
    pub service_name: &'static str,
    pub body_json: String,
    pub idempotency_scope: Option<&'static str>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRuntimeOperationInput {
    pub context: CommerceRuntimeContext,
    pub operation_id: String,
    pub body_json: String,
    pub capabilities: Vec<CapabilityFlag>,
    pub idempotency_key: Option<String>,
    pub request_hash: Option<CommerceRequestHash>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRuntimeOperationOutput {
    pub operation_id: &'static str,
    pub service_name: &'static str,
    pub body_json: String,
    pub outcome: CommerceRuntimeExecutionOutcome,
    pub idempotency_scope: Option<&'static str>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRuntimeOperationEnvelope {
    pub ok: bool,
    pub operation_id: String,
    pub service_name: Option<String>,
    pub body_json: Option<String>,
    pub outcome: Option<CommerceRuntimeExecutionOutcome>,
    pub outcome_kind: Option<&'static str>,
    pub idempotency_scope: Option<String>,
    pub error: Option<CommerceRuntimeOperationErrorEnvelope>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CommerceRuntimeOperationErrorEnvelope {
    pub code: &'static str,
    pub message: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CommerceRuntimeExecutionOutcome {
    Executed(String),
    Replayed(String),
}

pub trait CommerceRuntimeServiceHandler: Send + Sync {
    fn service_name(&self) -> &'static str;

    fn handle(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError>;
}

pub trait CommerceRuntimeIdempotencyStore: Send {
    fn find(
        &self,
        tenant_id: &str,
        scope: &str,
        idempotency_key: &str,
    ) -> Result<Option<CommerceIdempotencyRecord>, CommerceServiceError>;

    fn lock(
        &mut self,
        record: CommerceIdempotencyRecord,
    ) -> Result<CommerceIdempotencyRecord, CommerceServiceError>;

    fn complete(
        &mut self,
        tenant_id: &str,
        scope: &str,
        idempotency_key: &str,
        response_json: &str,
    ) -> Result<(), CommerceServiceError>;

    fn fail(
        &mut self,
        tenant_id: &str,
        scope: &str,
        idempotency_key: &str,
    ) -> Result<(), CommerceServiceError>;
}

pub trait CommerceRuntimeTransactionManager: Send {
    fn begin(&mut self, operation_id: &str) -> Result<(), CommerceServiceError>;

    fn commit(&mut self, operation_id: &str) -> Result<(), CommerceServiceError>;

    fn rollback(&mut self, operation_id: &str) -> Result<(), CommerceServiceError>;
}

#[derive(Default)]
pub struct CommerceRuntimeServiceRegistry {
    handlers: Vec<Box<dyn CommerceRuntimeServiceHandler>>,
}

pub fn execute_with_idempotency(
    registry: &CommerceRuntimeServiceRegistry,
    store: &mut dyn CommerceRuntimeIdempotencyStore,
    request: &CommerceRuntimeServiceRequest,
) -> Result<CommerceRuntimeExecutionOutcome, CommerceServiceError> {
    let Some(scope) = request.execution_plan.idempotency_scope else {
        let response = registry.dispatch(request)?;
        return Ok(CommerceRuntimeExecutionOutcome::Executed(
            response.body_json,
        ));
    };
    let idempotency_key = request.idempotency_key()?;
    let request_hash = request.request_hash()?;
    let tenant_id = request.context().tenant_id.as_str();

    if let Some(record) = store.find(tenant_id, scope, idempotency_key)? {
        match record.decide(request_hash) {
            IdempotencyDecision::Replay => {
                return Ok(CommerceRuntimeExecutionOutcome::Replayed(
                    record.response_json.unwrap_or_default(),
                ));
            }
            IdempotencyDecision::Conflict => {
                return Err(CommerceServiceError::conflict(
                    "idempotency key was reused with a different request hash",
                ));
            }
            IdempotencyDecision::InProgress => {
                return Err(CommerceServiceError::conflict(
                    "idempotency key is already in progress",
                ));
            }
            IdempotencyDecision::Execute => {}
        }
    } else {
        store.lock(CommerceIdempotencyRecord::locked(
            tenant_id,
            scope,
            idempotency_key,
            request_hash.clone(),
        ))?;
    }

    let response = registry.dispatch(request)?;
    store.complete(tenant_id, scope, idempotency_key, &response.body_json)?;

    Ok(CommerceRuntimeExecutionOutcome::Executed(
        response.body_json,
    ))
}

pub fn execute_with_transaction(
    registry: &CommerceRuntimeServiceRegistry,
    store: &mut dyn CommerceRuntimeIdempotencyStore,
    transactions: &mut dyn CommerceRuntimeTransactionManager,
    request: &CommerceRuntimeServiceRequest,
) -> Result<CommerceRuntimeExecutionOutcome, CommerceServiceError> {
    if !request.execution_plan.requires_transaction {
        let response = registry.dispatch(request)?;
        return Ok(CommerceRuntimeExecutionOutcome::Executed(
            response.body_json,
        ));
    }

    let Some(scope) = request.execution_plan.idempotency_scope else {
        return execute_transactional_dispatch(registry, transactions, request);
    };
    let idempotency_key = request.idempotency_key()?;
    let request_hash = request.request_hash()?;
    let tenant_id = request.context().tenant_id.as_str();

    if let Some(record) = store.find(tenant_id, scope, idempotency_key)? {
        match record.decide(request_hash) {
            IdempotencyDecision::Replay => {
                return Ok(CommerceRuntimeExecutionOutcome::Replayed(
                    record.response_json.unwrap_or_default(),
                ));
            }
            IdempotencyDecision::Conflict => {
                return Err(CommerceServiceError::conflict(
                    "idempotency key was reused with a different request hash",
                ));
            }
            IdempotencyDecision::InProgress => {
                return Err(CommerceServiceError::conflict(
                    "idempotency key is already in progress",
                ));
            }
            IdempotencyDecision::Execute => {}
        }
    }

    transactions.begin(request.execution_plan.operation_id)?;
    if store.find(tenant_id, scope, idempotency_key)?.is_none() {
        store.lock(CommerceIdempotencyRecord::locked(
            tenant_id,
            scope,
            idempotency_key,
            request_hash.clone(),
        ))?;
    }

    match registry.dispatch(request) {
        Ok(response) => {
            store.complete(tenant_id, scope, idempotency_key, &response.body_json)?;
            transactions.commit(request.execution_plan.operation_id)?;
            Ok(CommerceRuntimeExecutionOutcome::Executed(
                response.body_json,
            ))
        }
        Err(error) => {
            let _ = store.fail(tenant_id, scope, idempotency_key);
            let _ = transactions.rollback(request.execution_plan.operation_id);
            Err(error)
        }
    }
}

pub fn execute_runtime_operation(
    registry: &CommerceRuntimeServiceRegistry,
    store: &mut dyn CommerceRuntimeIdempotencyStore,
    transactions: &mut dyn CommerceRuntimeTransactionManager,
    input: CommerceRuntimeOperationInput,
) -> Result<CommerceRuntimeOperationOutput, CommerceServiceError> {
    let execution_plan = prepare_operation_execution(
        input.context,
        &input.operation_id,
        input.idempotency_key.as_deref(),
        input.request_hash,
        &input.capabilities,
    )?;
    let request = CommerceRuntimeServiceRequest::new(execution_plan, input.body_json);
    let operation_id = request.execution_plan.operation_id;
    let service_name = request.execution_plan.service_name;
    let idempotency_scope = request.execution_plan.idempotency_scope;
    let outcome = execute_with_transaction(registry, store, transactions, &request)?;
    let body_json = outcome.body_json().to_string();

    Ok(CommerceRuntimeOperationOutput {
        operation_id,
        service_name,
        body_json,
        outcome,
        idempotency_scope,
    })
}

pub fn execute_runtime_operation_enveloped(
    registry: &CommerceRuntimeServiceRegistry,
    store: &mut dyn CommerceRuntimeIdempotencyStore,
    transactions: &mut dyn CommerceRuntimeTransactionManager,
    input: CommerceRuntimeOperationInput,
) -> CommerceRuntimeOperationEnvelope {
    let requested_operation_id = input.operation_id.clone();
    let operation_metadata = resolve_operation_contract(&requested_operation_id).ok();
    let service_name = operation_metadata
        .as_ref()
        .map(|contract| contract.service_name.to_string());
    let idempotency_scope = operation_metadata.as_ref().and_then(|contract| {
        contract
            .requires_idempotency()
            .then(|| contract.operation_id.to_string())
    });

    match execute_runtime_operation(registry, store, transactions, input) {
        Ok(output) => CommerceRuntimeOperationEnvelope::success(output),
        Err(error) => CommerceRuntimeOperationEnvelope::failure(
            requested_operation_id,
            service_name,
            idempotency_scope,
            error,
        ),
    }
}

fn execute_transactional_dispatch(
    registry: &CommerceRuntimeServiceRegistry,
    transactions: &mut dyn CommerceRuntimeTransactionManager,
    request: &CommerceRuntimeServiceRequest,
) -> Result<CommerceRuntimeExecutionOutcome, CommerceServiceError> {
    transactions.begin(request.execution_plan.operation_id)?;
    match registry.dispatch(request) {
        Ok(response) => {
            transactions.commit(request.execution_plan.operation_id)?;
            Ok(CommerceRuntimeExecutionOutcome::Executed(
                response.body_json,
            ))
        }
        Err(error) => {
            let _ = transactions.rollback(request.execution_plan.operation_id);
            Err(error)
        }
    }
}

impl CommerceRuntimeConfig {
    pub fn new(
        app_id: &str,
        deployment_mode: DeploymentMode,
        environment: Environment,
        database_url: &str,
    ) -> Result<Self, CommerceServiceError> {
        if app_id.trim().is_empty() {
            return Err(CommerceServiceError::validation("app_id is required"));
        }
        if database_url.trim().is_empty() {
            return Err(CommerceServiceError::validation("database_url is required"));
        }
        if deployment_mode == DeploymentMode::Saas {
            return Err(CommerceServiceError::unsupported_capability(
                "Rust commerce runtime executes local/private deployments only",
            ));
        }

        Ok(Self {
            app_id: app_id.to_string(),
            database_url: database_url.to_string(),
            deployment_mode,
            environment,
        })
    }
}

impl CommerceRuntimeOperationInput {
    pub fn new(
        context: CommerceRuntimeContext,
        operation_id: impl Into<String>,
        body_json: impl Into<String>,
        capabilities: Vec<CapabilityFlag>,
        idempotency_key: Option<&str>,
        request_hash: Option<CommerceRequestHash>,
    ) -> Self {
        Self {
            context,
            operation_id: operation_id.into(),
            body_json: body_json.into(),
            capabilities,
            idempotency_key: idempotency_key.map(str::to_string),
            request_hash,
        }
    }
}

impl CommerceRuntimeExecutionOutcome {
    pub fn body_json(&self) -> &str {
        match self {
            Self::Executed(body_json) | Self::Replayed(body_json) => body_json,
        }
    }

    pub fn kind(&self) -> &'static str {
        match self {
            Self::Executed(_) => "executed",
            Self::Replayed(_) => "replayed",
        }
    }
}

impl CommerceRuntimeOperationEnvelope {
    fn success(output: CommerceRuntimeOperationOutput) -> Self {
        let outcome_kind = output.outcome.kind();

        Self {
            ok: true,
            operation_id: output.operation_id.to_string(),
            service_name: Some(output.service_name.to_string()),
            body_json: Some(output.body_json),
            outcome: Some(output.outcome),
            outcome_kind: Some(outcome_kind),
            idempotency_scope: output.idempotency_scope.map(str::to_string),
            error: None,
        }
    }

    fn failure(
        operation_id: String,
        service_name: Option<String>,
        idempotency_scope: Option<String>,
        error: CommerceServiceError,
    ) -> Self {
        Self {
            ok: false,
            operation_id,
            service_name,
            body_json: None,
            outcome: None,
            outcome_kind: None,
            idempotency_scope,
            error: Some(CommerceRuntimeOperationErrorEnvelope {
                code: error.code(),
                message: error.message().to_string(),
            }),
        }
    }
}

impl CommerceRuntimeServiceRequest {
    pub fn new(execution_plan: CommerceRuntimeExecutionPlan, body_json: impl Into<String>) -> Self {
        Self {
            execution_plan,
            body_json: body_json.into(),
        }
    }

    pub fn context(&self) -> &CommerceRuntimeContext {
        &self.execution_plan.context
    }

    pub fn idempotency_key(&self) -> Result<&str, CommerceServiceError> {
        self.execution_plan
            .idempotency_key
            .as_deref()
            .ok_or_else(|| {
                CommerceServiceError::validation("idempotency_key is required for write operation")
            })
    }

    pub fn request_hash(&self) -> Result<&CommerceRequestHash, CommerceServiceError> {
        self.execution_plan.request_hash.as_ref().ok_or_else(|| {
            CommerceServiceError::validation("request_hash is required for write operation")
        })
    }
}

impl CommerceRuntimeServiceRegistry {
    pub fn new() -> Self {
        Self {
            handlers: Vec::new(),
        }
    }

    pub fn register(mut self, handler: Box<dyn CommerceRuntimeServiceHandler>) -> Self {
        self.handlers.push(handler);
        self
    }

    pub fn registered_service_names(&self) -> Vec<&'static str> {
        self.handlers
            .iter()
            .map(|handler| handler.service_name())
            .collect()
    }

    pub fn dispatch(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<CommerceRuntimeServiceResponse, CommerceServiceError> {
        let handler = self
            .handlers
            .iter()
            .find(|handler| handler.service_name() == request.execution_plan.service_name)
            .ok_or_else(|| {
                CommerceServiceError::unsupported_capability(
                    "commerce runtime service is not registered",
                )
            })?;
        let body_json = handler.handle(request)?;

        Ok(CommerceRuntimeServiceResponse {
            operation_id: request.execution_plan.operation_id,
            service_name: request.execution_plan.service_name,
            body_json,
            idempotency_scope: request.execution_plan.idempotency_scope,
        })
    }
}

pub fn first_slice_service_names() -> Vec<&'static str> {
    vec![
        "core",
        "shop",
        "account",
        "catalog",
        "inventory",
        "promotion",
        "order",
        "payment",
        "membership",
        "invoice",
    ]
}

pub fn commerce_runtime_capability_manifest() -> CommerceRuntimeCapabilityManifest {
    CommerceRuntimeCapabilityManifest {
        name: "sdkwork-commerce-runtime",
        runtime_version: "commerce.runtime.v1",
        service_names: first_slice_service_names(),
        capability_flags: first_slice_capability_manifest(),
        service_contracts: first_slice_service_contracts(),
        operation_contracts: operation_contracts(),
        operation_service_bindings: operation_service_bindings(),
        operation_input_type: "CommerceRuntimeOperationInput",
        operation_output_type: "CommerceRuntimeOperationEnvelope",
        idempotency_store_port: "CommerceRuntimeIdempotencyStore",
        transaction_manager_port: "CommerceRuntimeTransactionManager",
    }
}

pub fn first_slice_capability_manifest() -> Vec<&'static str> {
    vec![
        "commerce.shop.profile",
        "commerce.shop.selfService",
        "commerce.shop.readiness",
        "commerce.shop.onboarding",
        "commerce.shop.verification",
        "commerce.shop.channel",
        "commerce.shop.fulfillment",
        "commerce.shop.catalog",
        "commerce.shop.inventory",
        "commerce.shop.order",
        "commerce.shop.settlement",
        "commerce.shop.businessHours",
        "commerce.shop.serviceArea",
        "commerce.shop.policy",
        "commerce.shop.deposit",
        "commerce.shop.risk",
        "commerce.shop.categoryBinding",
        "commerce.shop.brandAuthorization",
        "commerce.shop.qualification",
        "commerce.shop.customerService",
        "commerce.shop.returnAddress",
        "commerce.shop.shippingTemplate",
        "commerce.core.context",
        "commerce.account.summary",
        "commerce.account.wallet",
        "commerce.account.ledger",
        "commerce.billing.history",
        "commerce.catalog.category",
        "commerce.catalog.categoryAttribute",
        "commerce.catalog.attribute",
        "commerce.catalog.product",
        "commerce.catalog.priceList",
        "commerce.catalog.sku",
        "commerce.catalog.spu",
        "commerce.catalog.cart",
        "commerce.catalog.address",
        "commerce.inventory.stock",
        "commerce.inventory.reservation",
        "commerce.inventory.movement",
        "commerce.promotion.offer",
        "commerce.promotion.couponStock",
        "commerce.promotion.code",
        "commerce.promotion.userCoupon",
        "commerce.promotion.discountApplication",
        "commerce.promotion.discountAllocation",
        "commerce.promotion.points",
        "commerce.promotion.budget",
        "commerce.promotion.event",
        "commerce.promotion.externalBinding",
        "commerce.order.checkout",
        "commerce.order.lifecycle",
        "commerce.order.detail",
        "commerce.order.fulfillment",
        "commerce.order.afterSales",
        "commerce.order.report",
        "commerce.order.audit",
        "commerce.payment.method",
        "commerce.payment.provider",
        "commerce.payment.channel",
        "commerce.payment.routeRule",
        "commerce.payment.intent",
        "commerce.payment.attempt",
        "commerce.payment.refund",
        "commerce.payment.webhook",
        "commerce.payment.reconciliation",
        "commerce.payment.recharge",
        "commerce.payment.report",
        "commerce.payment.dispute",
        "commerce.payment.runtime",
        "commerce.membership.current",
        "commerce.membership.plan",
        "commerce.membership.packageGroup",
        "commerce.membership.package",
        "commerce.membership.purchase",
        "commerce.membership.points",
        "commerce.membership.privilege",
        "commerce.membership.member",
        "commerce.membership.entitlement",
        "commerce.invoice.application",
        "commerce.invoice.document",
        "commerce.invoice.title",
    ]
}

pub fn first_slice_service_contracts() -> Vec<CommerceServiceContract> {
    vec![
        sdkwork_commerce_shop_service::shop_service_contract(),
        sdkwork_commerce_account_service::account_service_contract(),
        sdkwork_commerce_catalog_service::catalog_service_contract(),
        sdkwork_commerce_inventory_service::inventory_service_contract(),
        sdkwork_commerce_promotion_service::promotion_service_contract(),
        sdkwork_commerce_order_service::order_service_contract(),
        sdkwork_commerce_payment_service::payment_service_contract(),
        sdkwork_commerce_membership_service::membership_service_contract(),
        sdkwork_commerce_invoice_service::invoice_service_contract(),
    ]
}

pub fn operation_service_bindings() -> Vec<CommerceOperationServiceBinding> {
    operation_contracts()
        .into_iter()
        .map(|contract| bind(contract.operation_id, contract.service_name))
        .collect()
}

pub fn operation_contracts() -> Vec<CommerceOperationContract> {
    vec![
        read("shops.list", "commerce.shop", "commerce.shop.profile"),
        read(
            "shops.management.list",
            "commerce.shop",
            "commerce.shop.profile",
        ),
        read(
            "shops.management.retrieve",
            "commerce.shop",
            "commerce.shop.profile",
        ),
        read("shops.retrieve", "commerce.shop", "commerce.shop.profile"),
        read(
            "shops.current.retrieve",
            "commerce.shop",
            "commerce.shop.selfService",
        ),
        read(
            "shops.current.dashboard.retrieve",
            "commerce.shop",
            "commerce.shop.selfService",
        ),
        read(
            "shops.current.readiness.retrieve",
            "commerce.shop",
            "commerce.shop.readiness",
        ),
        read(
            "shops.current.applications.list",
            "commerce.shop",
            "commerce.shop.onboarding",
        ),
        write(
            "shops.current.applications.create",
            "commerce.shop",
            "commerce.shop.onboarding",
        ),
        read(
            "shops.current.categoryBindings.list",
            "commerce.shop",
            "commerce.shop.categoryBinding",
        ),
        write(
            "shops.current.categoryBindings.upsert",
            "commerce.shop",
            "commerce.shop.categoryBinding",
        ),
        read(
            "shops.current.brandAuthorizations.list",
            "commerce.shop",
            "commerce.shop.brandAuthorization",
        ),
        write(
            "shops.current.brandAuthorizations.upsert",
            "commerce.shop",
            "commerce.shop.brandAuthorization",
        ),
        read(
            "shops.current.qualifications.list",
            "commerce.shop",
            "commerce.shop.qualification",
        ),
        write(
            "shops.current.qualifications.upsert",
            "commerce.shop",
            "commerce.shop.qualification",
        ),
        read(
            "shops.current.customerServices.list",
            "commerce.shop",
            "commerce.shop.customerService",
        ),
        write(
            "shops.current.customerServices.upsert",
            "commerce.shop",
            "commerce.shop.customerService",
        ),
        read(
            "shops.current.returnAddresses.list",
            "commerce.shop",
            "commerce.shop.returnAddress",
        ),
        write(
            "shops.current.returnAddresses.upsert",
            "commerce.shop",
            "commerce.shop.returnAddress",
        ),
        read(
            "shops.current.shippingTemplates.list",
            "commerce.shop",
            "commerce.shop.shippingTemplate",
        ),
        write(
            "shops.current.shippingTemplates.upsert",
            "commerce.shop",
            "commerce.shop.shippingTemplate",
        ),
        read(
            "shops.current.verifications.list",
            "commerce.shop",
            "commerce.shop.verification",
        ),
        read(
            "shops.current.statusEvents.list",
            "commerce.shop",
            "commerce.shop.profile",
        ),
        read(
            "shops.current.channels.list",
            "commerce.shop",
            "commerce.shop.channel",
        ),
        write(
            "shops.current.channels.update",
            "commerce.shop",
            "commerce.shop.channel",
        ),
        read(
            "shops.current.fulfillmentProfile.retrieve",
            "commerce.shop",
            "commerce.shop.fulfillment",
        ),
        write(
            "shops.current.fulfillmentProfile.update",
            "commerce.shop",
            "commerce.shop.fulfillment",
        ),
        read(
            "shops.current.settlementProfile.retrieve",
            "commerce.shop",
            "commerce.shop.settlement",
        ),
        write(
            "shops.current.settlementProfile.update",
            "commerce.shop",
            "commerce.shop.settlement",
        ),
        read(
            "shops.current.businessHours.retrieve",
            "commerce.shop",
            "commerce.shop.businessHours",
        ),
        write(
            "shops.current.businessHours.update",
            "commerce.shop",
            "commerce.shop.businessHours",
        ),
        read(
            "shops.current.serviceAreas.list",
            "commerce.shop",
            "commerce.shop.serviceArea",
        ),
        write(
            "shops.current.serviceAreas.create",
            "commerce.shop",
            "commerce.shop.serviceArea",
        ),
        write(
            "shops.current.serviceAreas.update",
            "commerce.shop",
            "commerce.shop.serviceArea",
        ),
        read(
            "shops.current.policies.list",
            "commerce.shop",
            "commerce.shop.policy",
        ),
        write(
            "shops.current.policies.update",
            "commerce.shop",
            "commerce.shop.policy",
        ),
        read(
            "shops.current.depositAccount.retrieve",
            "commerce.shop",
            "commerce.shop.deposit",
        ),
        read(
            "shops.current.riskSignals.list",
            "commerce.shop",
            "commerce.shop.risk",
        ),
        read(
            "shops.current.products.list",
            "commerce.shop",
            "commerce.shop.catalog",
        ),
        write(
            "shops.current.products.create",
            "commerce.shop",
            "commerce.shop.catalog",
        ),
        write(
            "shops.current.products.update",
            "commerce.shop",
            "commerce.shop.catalog",
        ),
        write(
            "shops.current.products.publish",
            "commerce.shop",
            "commerce.shop.catalog",
        ),
        write(
            "shops.current.products.unpublish",
            "commerce.shop",
            "commerce.shop.catalog",
        ),
        read(
            "shops.current.inventory.stocks.list",
            "commerce.shop",
            "commerce.shop.inventory",
        ),
        write(
            "shops.current.inventory.stocks.adjustments.create",
            "commerce.shop",
            "commerce.shop.inventory",
        ),
        read(
            "shops.current.orders.list",
            "commerce.shop",
            "commerce.shop.order",
        ),
        read(
            "shops.current.orders.retrieve",
            "commerce.shop",
            "commerce.shop.order",
        ),
        write(
            "shops.current.orders.fulfillments.create",
            "commerce.shop",
            "commerce.shop.order",
        ),
        read(
            "shops.current.settlements.list",
            "commerce.shop",
            "commerce.shop.settlement",
        ),
        write("shops.create", "commerce.shop", "commerce.shop.profile"),
        write("shops.update", "commerce.shop", "commerce.shop.profile"),
        write(
            "shops.submitReview",
            "commerce.shop",
            "commerce.shop.profile",
        ),
        write("shops.approve", "commerce.shop", "commerce.shop.profile"),
        write("shops.reject", "commerce.shop", "commerce.shop.profile"),
        write("shops.suspend", "commerce.shop", "commerce.shop.profile"),
        write("shops.resume", "commerce.shop", "commerce.shop.profile"),
        write("shops.close", "commerce.shop", "commerce.shop.profile"),
        read(
            "shops.categoryBindings.list",
            "commerce.shop",
            "commerce.shop.categoryBinding",
        ),
        write(
            "shops.categoryBindings.upsert",
            "commerce.shop",
            "commerce.shop.categoryBinding",
        ),
        read(
            "shops.brandAuthorizations.list",
            "commerce.shop",
            "commerce.shop.brandAuthorization",
        ),
        write(
            "shops.brandAuthorizations.upsert",
            "commerce.shop",
            "commerce.shop.brandAuthorization",
        ),
        read(
            "shops.qualifications.list",
            "commerce.shop",
            "commerce.shop.qualification",
        ),
        write(
            "shops.qualifications.upsert",
            "commerce.shop",
            "commerce.shop.qualification",
        ),
        read(
            "shops.customerServices.list",
            "commerce.shop",
            "commerce.shop.customerService",
        ),
        write(
            "shops.customerServices.upsert",
            "commerce.shop",
            "commerce.shop.customerService",
        ),
        read(
            "shops.returnAddresses.list",
            "commerce.shop",
            "commerce.shop.returnAddress",
        ),
        write(
            "shops.returnAddresses.upsert",
            "commerce.shop",
            "commerce.shop.returnAddress",
        ),
        read(
            "shops.shippingTemplates.list",
            "commerce.shop",
            "commerce.shop.shippingTemplate",
        ),
        write(
            "shops.shippingTemplates.upsert",
            "commerce.shop",
            "commerce.shop.shippingTemplate",
        ),
        read(
            "shops.verifications.list",
            "commerce.shop",
            "commerce.shop.verification",
        ),
        write(
            "shops.verifications.update",
            "commerce.shop",
            "commerce.shop.verification",
        ),
        read(
            "shops.statusEvents.list",
            "commerce.shop",
            "commerce.shop.profile",
        ),
        read(
            "shops.channels.list",
            "commerce.shop",
            "commerce.shop.channel",
        ),
        write(
            "shops.channels.create",
            "commerce.shop",
            "commerce.shop.channel",
        ),
        write(
            "shops.channels.update",
            "commerce.shop",
            "commerce.shop.channel",
        ),
        read(
            "shops.fulfillmentProfile.retrieve",
            "commerce.shop",
            "commerce.shop.fulfillment",
        ),
        write(
            "shops.fulfillmentProfile.update",
            "commerce.shop",
            "commerce.shop.fulfillment",
        ),
        read(
            "shops.settlementProfile.retrieve",
            "commerce.shop",
            "commerce.shop.settlement",
        ),
        write(
            "shops.settlementProfile.update",
            "commerce.shop",
            "commerce.shop.settlement",
        ),
        write(
            "shops.settlementProfile.approve",
            "commerce.shop",
            "commerce.shop.settlement",
        ),
        write(
            "shops.settlementProfile.reject",
            "commerce.shop",
            "commerce.shop.settlement",
        ),
        read(
            "shops.businessHours.retrieve",
            "commerce.shop",
            "commerce.shop.businessHours",
        ),
        write(
            "shops.businessHours.update",
            "commerce.shop",
            "commerce.shop.businessHours",
        ),
        read(
            "shops.serviceAreas.list",
            "commerce.shop",
            "commerce.shop.serviceArea",
        ),
        write(
            "shops.serviceAreas.create",
            "commerce.shop",
            "commerce.shop.serviceArea",
        ),
        write(
            "shops.serviceAreas.update",
            "commerce.shop",
            "commerce.shop.serviceArea",
        ),
        read(
            "shops.policies.list",
            "commerce.shop",
            "commerce.shop.policy",
        ),
        write(
            "shops.policies.create",
            "commerce.shop",
            "commerce.shop.policy",
        ),
        write(
            "shops.policies.update",
            "commerce.shop",
            "commerce.shop.policy",
        ),
        read(
            "shops.depositAccount.retrieve",
            "commerce.shop",
            "commerce.shop.deposit",
        ),
        write(
            "shops.depositAccount.update",
            "commerce.shop",
            "commerce.shop.deposit",
        ),
        write(
            "shops.depositAccount.review",
            "commerce.shop",
            "commerce.shop.deposit",
        ),
        read(
            "shops.riskSignals.list",
            "commerce.shop",
            "commerce.shop.risk",
        ),
        write(
            "shops.riskSignals.create",
            "commerce.shop",
            "commerce.shop.risk",
        ),
        write(
            "shops.riskSignals.resolve",
            "commerce.shop",
            "commerce.shop.risk",
        ),
        read(
            "shops.readiness.retrieve",
            "commerce.shop",
            "commerce.shop.readiness",
        ),
        write(
            "catalog.attributes.create",
            "commerce.catalog",
            "commerce.catalog.attribute",
        ),
        write(
            "catalog.categories.create",
            "commerce.catalog",
            "commerce.catalog.category",
        ),
        write(
            "catalog.priceLists.create",
            "commerce.catalog",
            "commerce.catalog.priceList",
        ),
        write(
            "catalog.products.create",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        write(
            "catalog.skus.create",
            "commerce.catalog",
            "commerce.catalog.sku",
        ),
        write(
            "catalog.categories.delete",
            "commerce.catalog",
            "commerce.catalog.category",
        ),
        read(
            "catalog.categories.list",
            "commerce.catalog",
            "commerce.catalog.category",
        ),
        read(
            "catalog.categories.management.list",
            "commerce.catalog",
            "commerce.catalog.category",
        ),
        read(
            "catalog.categories.retrieve",
            "commerce.catalog",
            "commerce.catalog.category",
        ),
        read(
            "catalog.products.list",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        read(
            "catalog.products.management.list",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        read(
            "catalog.spus.list",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        read(
            "catalog.attributes.list",
            "commerce.catalog",
            "commerce.catalog.attribute",
        ),
        read(
            "catalog.attributes.management.list",
            "commerce.catalog",
            "commerce.catalog.attribute",
        ),
        read(
            "catalog.priceLists.list",
            "commerce.catalog",
            "commerce.catalog.priceList",
        ),
        read(
            "catalog.skus.list",
            "commerce.catalog",
            "commerce.catalog.sku",
        ),
        read(
            "inventory.movements.list",
            "commerce.inventory",
            "commerce.inventory.movement",
        ),
        read(
            "inventory.reservations.list",
            "commerce.inventory",
            "commerce.inventory.reservation",
        ),
        read(
            "inventory.stocks.list",
            "commerce.inventory",
            "commerce.inventory.stock",
        ),
        read(
            "catalog.products.retrieve",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        read(
            "catalog.spus.retrieve",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        read(
            "catalog.skus.retrieve",
            "commerce.catalog",
            "commerce.catalog.sku",
        ),
        read(
            "catalog.skus.prices.retrieve",
            "commerce.catalog",
            "commerce.catalog.priceList",
        ),
        write(
            "catalog.categories.update",
            "commerce.catalog",
            "commerce.catalog.category",
        ),
        write(
            "catalog.products.update",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        write(
            "catalog.spus.create",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        write(
            "catalog.spus.update",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        write(
            "catalog.spus.publish",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        write(
            "catalog.spus.archive",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        write(
            "catalog.skus.update",
            "commerce.catalog",
            "commerce.catalog.sku",
        ),
        write(
            "inventory.stocks.update",
            "commerce.inventory",
            "commerce.inventory.stock",
        ),
        read(
            "accounts.current.summary.retrieve",
            "commerce.account",
            "commerce.account.summary",
        ),
        read(
            "cart.current.retrieve",
            "commerce.catalog",
            "commerce.catalog.cart",
        ),
        write(
            "cart.items.create",
            "commerce.catalog",
            "commerce.catalog.cart",
        ),
        write(
            "cart.items.update",
            "commerce.catalog",
            "commerce.catalog.cart",
        ),
        write(
            "cart.items.delete",
            "commerce.catalog",
            "commerce.catalog.cart",
        ),
        read(
            "addresses.list",
            "commerce.catalog",
            "commerce.catalog.address",
        ),
        write(
            "addresses.create",
            "commerce.catalog",
            "commerce.catalog.address",
        ),
        write(
            "addresses.update",
            "commerce.catalog",
            "commerce.catalog.address",
        ),
        write(
            "addresses.delete",
            "commerce.catalog",
            "commerce.catalog.address",
        ),
        write(
            "addresses.defaultSelection.create",
            "commerce.catalog",
            "commerce.catalog.address",
        ),
        write(
            "checkout.sessions.create",
            "commerce.order",
            "commerce.order.checkout",
        ),
        read(
            "checkout.sessions.retrieve",
            "commerce.order",
            "commerce.order.checkout",
        ),
        write(
            "checkout.sessions.quotes.create",
            "commerce.order",
            "commerce.order.checkout",
        ),
        write(
            "checkout.sessions.orders.create",
            "commerce.order",
            "commerce.order.lifecycle",
        ),
        read("orders.list", "commerce.order", "commerce.order.detail"),
        read(
            "orders.management.list",
            "commerce.order",
            "commerce.order.detail",
        ),
        read("orders.retrieve", "commerce.order", "commerce.order.detail"),
        read(
            "orders.management.retrieve",
            "commerce.order",
            "commerce.order.detail",
        ),
        write(
            "orders.create",
            "commerce.order",
            "commerce.order.lifecycle",
        ),
        write("orders.pay", "commerce.order", "commerce.order.lifecycle"),
        write(
            "orders.cancel",
            "commerce.order",
            "commerce.order.lifecycle",
        ),
        write(
            "orders.management.cancel",
            "commerce.order",
            "commerce.order.lifecycle",
        ),
        write(
            "orders.management.close",
            "commerce.order",
            "commerce.order.lifecycle",
        ),
        read(
            "orders.events.list",
            "commerce.order",
            "commerce.order.detail",
        ),
        read(
            "orders.events.management.list",
            "commerce.order",
            "commerce.order.detail",
        ),
        read(
            "orders.statistics.retrieve",
            "commerce.order",
            "commerce.order.report",
        ),
        read(
            "orders.status.retrieve",
            "commerce.order",
            "commerce.order.detail",
        ),
        read(
            "orders.paymentSuccess.retrieve",
            "commerce.order",
            "commerce.order.lifecycle",
        ),
        write(
            "orders.cancellations.create",
            "commerce.order",
            "commerce.order.lifecycle",
        ),
        read(
            "afterSales.requests.list",
            "commerce.order",
            "commerce.order.afterSales",
        ),
        write(
            "afterSales.requests.create",
            "commerce.order",
            "commerce.order.afterSales",
        ),
        read(
            "afterSales.requests.retrieve",
            "commerce.order",
            "commerce.order.afterSales",
        ),
        write(
            "afterSales.requests.update",
            "commerce.order",
            "commerce.order.afterSales",
        ),
        read(
            "afterSales.management.list",
            "commerce.order",
            "commerce.order.afterSales",
        ),
        read(
            "afterSales.management.retrieve",
            "commerce.order",
            "commerce.order.afterSales",
        ),
        write(
            "afterSales.reviews.create",
            "commerce.order",
            "commerce.order.afterSales",
        ),
        read(
            "afterSales.returnShipments.list",
            "commerce.order",
            "commerce.order.afterSales",
        ),
        write(
            "afterSales.returnShipments.create",
            "commerce.order",
            "commerce.order.afterSales",
        ),
        read(
            "afterSales.events.list",
            "commerce.order",
            "commerce.order.afterSales",
        ),
        read(
            "payments.methods.list",
            "commerce.payment",
            "commerce.payment.method",
        ),
        read(
            "payments.methods.management.list",
            "commerce.payment",
            "commerce.payment.method",
        ),
        write(
            "payments.create",
            "commerce.payment",
            "commerce.payment.intent",
        ),
        write(
            "payments.close",
            "commerce.payment",
            "commerce.payment.intent",
        ),
        read(
            "payments.records.list",
            "commerce.payment",
            "commerce.payment.attempt",
        ),
        read(
            "payments.records.retrieve",
            "commerce.payment",
            "commerce.payment.attempt",
        ),
        read(
            "payments.statistics.retrieve",
            "commerce.payment",
            "commerce.payment.report",
        ),
        read(
            "payments.checkout.retrieve",
            "commerce.payment",
            "commerce.payment.intent",
        ),
        read(
            "payments.status.retrieve",
            "commerce.payment",
            "commerce.payment.intent",
        ),
        read(
            "payments.status.retrieveByOutTradeNo",
            "commerce.payment",
            "commerce.payment.intent",
        ),
        read(
            "payments.orderPayments.list",
            "commerce.payment",
            "commerce.payment.intent",
        ),
        write(
            "payments.reconcile",
            "commerce.payment",
            "commerce.payment.reconciliation",
        ),
        write(
            "payments.intents.create",
            "commerce.payment",
            "commerce.payment.intent",
        ),
        read(
            "payments.intents.retrieve",
            "commerce.payment",
            "commerce.payment.intent",
        ),
        read(
            "payments.intents.management.retrieve",
            "commerce.payment",
            "commerce.payment.intent",
        ),
        write(
            "payments.intents.cancel",
            "commerce.payment",
            "commerce.payment.intent",
        ),
        write(
            "payments.intents.attempts.create",
            "commerce.payment",
            "commerce.payment.attempt",
        ),
        read(
            "payments.attempts.retrieve",
            "commerce.payment",
            "commerce.payment.attempt",
        ),
        write(
            "refunds.create",
            "commerce.payment",
            "commerce.payment.refund",
        ),
        read(
            "refunds.list",
            "commerce.payment",
            "commerce.payment.refund",
        ),
        read(
            "refunds.management.list",
            "commerce.payment",
            "commerce.payment.refund",
        ),
        read(
            "refunds.retrieve",
            "commerce.payment",
            "commerce.payment.refund",
        ),
        read(
            "refunds.management.retrieve",
            "commerce.payment",
            "commerce.payment.refund",
        ),
        read(
            "fulfillments.list",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        read(
            "fulfillments.management.list",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        read(
            "fulfillments.retrieve",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        read(
            "fulfillments.management.retrieve",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        read(
            "shipments.retrieve",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        read(
            "shipments.management.retrieve",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        read(
            "memberships.current.retrieve",
            "commerce.membership",
            "commerce.membership.current",
        ),
        read(
            "memberships.current.status.retrieve",
            "commerce.membership",
            "commerce.membership.current",
        ),
        read(
            "memberships.plans.list",
            "commerce.membership",
            "commerce.membership.plan",
        ),
        read(
            "memberships.benefits.list",
            "commerce.membership",
            "commerce.membership.current",
        ),
        read(
            "memberships.packageGroups.list",
            "commerce.membership",
            "commerce.membership.packageGroup",
        ),
        read(
            "memberships.packageGroups.management.list",
            "commerce.membership",
            "commerce.membership.packageGroup",
        ),
        read(
            "memberships.packageGroups.retrieve",
            "commerce.membership",
            "commerce.membership.packageGroup",
        ),
        read(
            "memberships.packageGroups.packages.list",
            "commerce.membership",
            "commerce.membership.packageGroup",
        ),
        read(
            "memberships.packages.list",
            "commerce.membership",
            "commerce.membership.package",
        ),
        read(
            "memberships.packages.management.list",
            "commerce.membership",
            "commerce.membership.package",
        ),
        read(
            "memberships.packages.retrieve",
            "commerce.membership",
            "commerce.membership.package",
        ),
        write(
            "memberships.purchases.create",
            "commerce.membership",
            "commerce.membership.purchase",
        ),
        write(
            "memberships.purchases.renew",
            "commerce.membership",
            "commerce.membership.purchase",
        ),
        write(
            "memberships.purchases.upgrade",
            "commerce.membership",
            "commerce.membership.purchase",
        ),
        read(
            "memberships.points.balance.retrieve",
            "commerce.membership",
            "commerce.membership.points",
        ),
        read(
            "memberships.points.history.list",
            "commerce.membership",
            "commerce.membership.points",
        ),
        write(
            "memberships.points.dailyRewards.create",
            "commerce.membership",
            "commerce.membership.points",
        ),
        read(
            "memberships.points.dailyRewards.status.retrieve",
            "commerce.membership",
            "commerce.membership.points",
        ),
        read(
            "memberships.privileges.usage.retrieve",
            "commerce.membership",
            "commerce.membership.privilege",
        ),
        write(
            "memberships.privileges.speedUps.create",
            "commerce.membership",
            "commerce.membership.privilege",
        ),
        read(
            "recharges.settings.retrieve",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        read(
            "recharges.packages.list",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        read(
            "recharges.packages.management.list",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        write(
            "recharges.orders.create",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        read(
            "recharges.orders.retrieve",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        read(
            "recharges.orders.management.retrieve",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        write(
            "recharges.orders.cancel",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        read(
            "wallet.overview.retrieve",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "wallet.accounts.list",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "wallet.accounts.retrieve",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "wallet.accounts.overview.retrieve",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "wallet.accounts.points.retrieve",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "wallet.accounts.tokens.retrieve",
            "commerce.account",
            "commerce.account.wallet",
        ),
        write(
            "wallet.holds.create",
            "commerce.account",
            "commerce.account.wallet",
        ),
        write(
            "wallet.holds.releases.create",
            "commerce.account",
            "commerce.account.wallet",
        ),
        write(
            "wallet.holds.settlements.create",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "wallet.ledgerEntries.list",
            "commerce.account",
            "commerce.account.ledger",
        ),
        read(
            "wallet.ledgerEntries.management.list",
            "commerce.account",
            "commerce.account.ledger",
        ),
        read(
            "wallet.ledgerEntries.retrieve",
            "commerce.account",
            "commerce.account.ledger",
        ),
        read(
            "wallet.ledgerEntries.points.list",
            "commerce.account",
            "commerce.account.ledger",
        ),
        read(
            "billing.history.list",
            "commerce.account",
            "commerce.billing.history",
        ),
        read(
            "wallet.tokens.retrieve",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "wallet.transactions.list",
            "commerce.account",
            "commerce.account.ledger",
        ),
        read(
            "wallet.transactions.retrieve",
            "commerce.account",
            "commerce.account.ledger",
        ),
        read(
            "wallet.exchangeRate.retrieve",
            "commerce.promotion",
            "commerce.promotion.points",
        ),
        read(
            "wallet.points.exchangeRules.list",
            "commerce.promotion",
            "commerce.promotion.points",
        ),
        write(
            "wallet.pointExchanges.create",
            "commerce.promotion",
            "commerce.promotion.points",
        ),
        read(
            "wallet.pointExchanges.retrieve",
            "commerce.promotion",
            "commerce.promotion.points",
        ),
        write(
            "wallet.pointTransfers.create",
            "commerce.promotion",
            "commerce.promotion.points",
        ),
        read(
            "wallet.requests.retrieve",
            "commerce.account",
            "commerce.account.wallet",
        ),
        write(
            "wallet.topupTransfers.create",
            "commerce.account",
            "commerce.account.wallet",
        ),
        write(
            "wallet.withdrawalTransfers.create",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "promotions.userCoupons.list",
            "commerce.promotion",
            "commerce.promotion.userCoupon",
        ),
        read(
            "promotions.userCoupons.retrieve",
            "commerce.promotion",
            "commerce.promotion.userCoupon",
        ),
        read(
            "promotions.offers.list",
            "commerce.promotion",
            "commerce.promotion.offer",
        ),
        read(
            "promotions.offers.retrieve",
            "commerce.promotion",
            "commerce.promotion.offer",
        ),
        read(
            "promotions.userCoupons.wallet.list",
            "commerce.promotion",
            "commerce.promotion.userCoupon",
        ),
        read(
            "promotions.userCoupons.wallet.retrieve",
            "commerce.promotion",
            "commerce.promotion.userCoupon",
        ),
        write(
            "promotions.userCoupons.claims.create",
            "commerce.promotion",
            "commerce.promotion.userCoupon",
        ),
        write(
            "promotions.codes.redemptions.create",
            "commerce.promotion",
            "commerce.promotion.code",
        ),
        write(
            "promotions.discountApplications.create",
            "commerce.promotion",
            "commerce.promotion.discountApplication",
        ),
        write(
            "promotions.discountApplications.settle",
            "commerce.promotion",
            "commerce.promotion.discountApplication",
        ),
        write(
            "promotions.discountApplications.release",
            "commerce.promotion",
            "commerce.promotion.discountApplication",
        ),
        write(
            "promotions.discountApplications.rollback",
            "commerce.promotion",
            "commerce.promotion.discountApplication",
        ),
        write(
            "promotions.discountApplications.reversals.create",
            "commerce.promotion",
            "commerce.promotion.discountApplication",
        ),
        read(
            "invoices.list",
            "commerce.invoice",
            "commerce.invoice.application",
        ),
        read(
            "invoices.retrieve",
            "commerce.invoice",
            "commerce.invoice.document",
        ),
        write(
            "invoices.create",
            "commerce.invoice",
            "commerce.invoice.application",
        ),
        write(
            "invoices.update",
            "commerce.invoice",
            "commerce.invoice.application",
        ),
        write(
            "invoices.submissions.create",
            "commerce.invoice",
            "commerce.invoice.application",
        ),
        write(
            "invoices.cancellations.create",
            "commerce.invoice",
            "commerce.invoice.application",
        ),
        read(
            "invoices.items.list",
            "commerce.invoice",
            "commerce.invoice.document",
        ),
        read(
            "invoices.mine.list",
            "commerce.invoice",
            "commerce.invoice.application",
        ),
        read(
            "invoices.statistics.retrieve",
            "commerce.invoice",
            "commerce.invoice.application",
        ),
        read(
            "payments.providers.list",
            "commerce.payment",
            "commerce.payment.provider",
        ),
        read(
            "payments.providerAccounts.list",
            "commerce.payment",
            "commerce.payment.provider",
        ),
        write(
            "payments.providerAccounts.create",
            "commerce.payment",
            "commerce.payment.provider",
        ),
        read(
            "payments.channels.list",
            "commerce.payment",
            "commerce.payment.channel",
        ),
        read(
            "payments.routeRules.list",
            "commerce.payment",
            "commerce.payment.routeRule",
        ),
        read(
            "payments.intents.list",
            "commerce.payment",
            "commerce.payment.intent",
        ),
        read(
            "payments.attempts.list",
            "commerce.payment",
            "commerce.payment.attempt",
        ),
        read(
            "payments.webhookEvents.list",
            "commerce.payment",
            "commerce.payment.webhook",
        ),
        read(
            "payments.reconciliationRuns.list",
            "commerce.payment",
            "commerce.payment.reconciliation",
        ),
        write(
            "payments.reconciliationRuns.create",
            "commerce.payment",
            "commerce.payment.reconciliation",
        ),
        read(
            "shipments.list",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        read(
            "shipments.packages.list",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        read(
            "shipments.packages.management.list",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        write(
            "shipments.packages.create",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        write(
            "shipments.packages.update",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        read(
            "shipments.trackingEvents.list",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        write(
            "memberships.plans.create",
            "commerce.membership",
            "commerce.membership.plan",
        ),
        write(
            "memberships.plans.update",
            "commerce.membership",
            "commerce.membership.plan",
        ),
        write(
            "memberships.plans.delete",
            "commerce.membership",
            "commerce.membership.plan",
        ),
        write(
            "memberships.packages.create",
            "commerce.membership",
            "commerce.membership.package",
        ),
        write(
            "memberships.packages.update",
            "commerce.membership",
            "commerce.membership.package",
        ),
        write(
            "memberships.packages.delete",
            "commerce.membership",
            "commerce.membership.package",
        ),
        write(
            "memberships.packageGroups.create",
            "commerce.membership",
            "commerce.membership.packageGroup",
        ),
        write(
            "memberships.packageGroups.update",
            "commerce.membership",
            "commerce.membership.packageGroup",
        ),
        write(
            "memberships.packageGroups.delete",
            "commerce.membership",
            "commerce.membership.packageGroup",
        ),
        read(
            "memberships.members.list",
            "commerce.membership",
            "commerce.membership.member",
        ),
        write(
            "memberships.members.status.update",
            "commerce.membership",
            "commerce.membership.member",
        ),
        read(
            "memberships.entitlements.list",
            "commerce.membership",
            "commerce.membership.entitlement",
        ),
        read(
            "recharges.orders.list",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        read(
            "recharges.orders.management.list",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        write(
            "wallet.adjustments.create",
            "commerce.account",
            "commerce.account.wallet",
        ),
        write(
            "wallet.adjustments.management.create",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "wallet.exchangeRules.list",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "wallet.exchangeRules.management.list",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "wallet.ledger.list",
            "commerce.account",
            "commerce.account.ledger",
        ),
        read(
            "wallet.accounts.management.list",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "promotions.offers.management.list",
            "commerce.promotion",
            "commerce.promotion.offer",
        ),
        write(
            "promotions.offers.create",
            "commerce.promotion",
            "commerce.promotion.offer",
        ),
        write(
            "promotions.offers.update",
            "commerce.promotion",
            "commerce.promotion.offer",
        ),
        read(
            "promotions.couponStocks.list",
            "commerce.promotion",
            "commerce.promotion.couponStock",
        ),
        write(
            "promotions.couponStocks.create",
            "commerce.promotion",
            "commerce.promotion.couponStock",
        ),
        read(
            "promotions.codes.list",
            "commerce.promotion",
            "commerce.promotion.code",
        ),
        write(
            "promotions.codes.create",
            "commerce.promotion",
            "commerce.promotion.code",
        ),
        read(
            "promotions.userCoupons.management.list",
            "commerce.promotion",
            "commerce.promotion.userCoupon",
        ),
        read(
            "promotions.discountApplications.list",
            "commerce.promotion",
            "commerce.promotion.discountApplication",
        ),
        read(
            "promotions.discountAllocations.list",
            "commerce.promotion",
            "commerce.promotion.discountAllocation",
        ),
        read(
            "invoices.titles.list",
            "commerce.invoice",
            "commerce.invoice.title",
        ),
        read(
            "invoices.management.list",
            "commerce.invoice",
            "commerce.invoice.application",
        ),
        read(
            "invoices.management.retrieve",
            "commerce.invoice",
            "commerce.invoice.document",
        ),
        write(
            "invoices.voids.create",
            "commerce.invoice",
            "commerce.invoice.document",
        ),
        read(
            "commerceReports.usageStatements.list",
            "commerce.account",
            "commerce.billing.history",
        ),
        read(
            "commerceReports.paymentReconciliation.retrieve",
            "commerce.payment",
            "commerce.payment.report",
        ),
        read(
            "commerceReports.orderRevenue.list",
            "commerce.order",
            "commerce.order.report",
        ),
        read(
            "commerceReports.refunds.list",
            "commerce.payment",
            "commerce.payment.report",
        ),
        read(
            "reports.commerceOverview.retrieve",
            "commerce.order",
            "commerce.order.report",
        ),
        read(
            "reports.sales.list",
            "commerce.order",
            "commerce.order.report",
        ),
        read(
            "reports.paymentReconciliation.list",
            "commerce.payment",
            "commerce.payment.report",
        ),
        read(
            "catalog.categoryAttributes.list",
            "commerce.catalog",
            "commerce.catalog.categoryAttribute",
        ),
        write(
            "catalog.categoryAttributes.create",
            "commerce.catalog",
            "commerce.catalog.categoryAttribute",
        ),
        write(
            "catalog.categoryAttributes.delete",
            "commerce.catalog",
            "commerce.catalog.categoryAttribute",
        ),
        write(
            "catalog.categoryAttributes.update",
            "commerce.catalog",
            "commerce.catalog.categoryAttribute",
        ),
        write(
            "catalog.categorySeeds.create",
            "commerce.catalog",
            "commerce.catalog.category",
        ),
        write(
            "catalog.priceLists.update",
            "commerce.catalog",
            "commerce.catalog.priceList",
        ),
        write(
            "catalog.products.delete",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        read(
            "catalog.products.management.retrieve",
            "commerce.catalog",
            "commerce.catalog.product",
        ),
        write(
            "catalog.skus.delete",
            "commerce.catalog",
            "commerce.catalog.sku",
        ),
        read(
            "catalog.spus.management.list",
            "commerce.catalog",
            "commerce.catalog.spu",
        ),
        read(
            "entitlements.accounts.list",
            "commerce.membership",
            "commerce.membership.entitlement",
        ),
        read(
            "entitlements.grants.list",
            "commerce.membership",
            "commerce.membership.entitlement",
        ),
        read(
            "entitlements.ledgerEntries.list",
            "commerce.membership",
            "commerce.membership.entitlement",
        ),
        write(
            "fulfillments.update",
            "commerce.order",
            "commerce.order.fulfillment",
        ),
        write(
            "invoices.issuances.create",
            "commerce.invoice",
            "commerce.invoice.document",
        ),
        write(
            "memberships.members.update",
            "commerce.membership",
            "commerce.membership.plan",
        ),
        read(
            "memberships.plans.management.list",
            "commerce.membership",
            "commerce.membership.plan",
        ),
        read(
            "orders.cancellations.list",
            "commerce.order",
            "commerce.order.lifecycle",
        ),
        write(
            "payments.channels.create",
            "commerce.payment",
            "commerce.payment.channel",
        ),
        write(
            "payments.channels.update",
            "commerce.payment",
            "commerce.payment.channel",
        ),
        read(
            "payments.disputes.list",
            "commerce.payment",
            "commerce.payment.dispute",
        ),
        write(
            "payments.methods.create",
            "commerce.payment",
            "commerce.payment.method",
        ),
        write(
            "payments.methods.update",
            "commerce.payment",
            "commerce.payment.method",
        ),
        write(
            "payments.providerAccounts.delete",
            "commerce.payment",
            "commerce.payment.provider",
        ),
        write(
            "payments.providerAccounts.update",
            "commerce.payment",
            "commerce.payment.provider",
        ),
        write(
            "payments.providerAccounts.status.update",
            "commerce.payment",
            "commerce.payment.provider",
        ),
        write(
            "payments.providers.update",
            "commerce.payment",
            "commerce.payment.provider",
        ),
        write(
            "payments.routeRules.create",
            "commerce.payment",
            "commerce.payment.routeRule",
        ),
        write(
            "payments.routeRules.update",
            "commerce.payment",
            "commerce.payment.routeRule",
        ),
        read(
            "payments.runtime.snapshot.retrieve",
            "commerce.payment",
            "commerce.payment.runtime",
        ),
        write(
            "payments.webhookEvents.replays.create",
            "commerce.payment",
            "commerce.payment.webhook",
        ),
        read(
            "promotions.budgetLedgerEntries.list",
            "commerce.promotion",
            "commerce.promotion.budget",
        ),
        read(
            "promotions.codes.redemptions.list",
            "commerce.promotion",
            "commerce.promotion.code",
        ),
        read(
            "promotions.couponLedgerEntries.list",
            "commerce.promotion",
            "commerce.promotion.couponStock",
        ),
        read(
            "promotions.events.list",
            "commerce.promotion",
            "commerce.promotion.event",
        ),
        read(
            "promotions.externalBindings.list",
            "commerce.promotion",
            "commerce.promotion.externalBinding",
        ),
        write(
            "recharges.packages.create",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        write(
            "recharges.packages.delete",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        write(
            "recharges.packages.update",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        read(
            "recharges.settings.management.retrieve",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        write(
            "recharges.settings.update",
            "commerce.payment",
            "commerce.payment.recharge",
        ),
        read(
            "refunds.attempts.list",
            "commerce.payment",
            "commerce.payment.refund",
        ),
        write(
            "wallet.exchangeRules.update",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read(
            "wallet.holds.list",
            "commerce.account",
            "commerce.account.wallet",
        ),
        read("audit.logs.list", "commerce.order", "commerce.order.audit"),
        read(
            "audit.commerceEvents.list",
            "commerce.order",
            "commerce.order.audit",
        ),
    ]
}

pub fn resolve_operation_contract(
    operation_id: &str,
) -> Result<CommerceOperationContract, CommerceServiceError> {
    operation_contracts()
        .into_iter()
        .find(|contract| contract.operation_id == operation_id)
        .ok_or_else(|| CommerceServiceError::not_found("commerce operation is not registered"))
}

pub fn prepare_operation_execution(
    context: CommerceRuntimeContext,
    operation_id: &str,
    idempotency_key: Option<&str>,
    request_hash: Option<CommerceRequestHash>,
    capabilities: &[CapabilityFlag],
) -> Result<CommerceRuntimeExecutionPlan, CommerceServiceError> {
    let contract = resolve_operation_contract(operation_id)?;
    let request =
        CommerceOperationRequest::new(context, contract.clone(), idempotency_key, request_hash);

    request.validate_for_execution()?;
    contract.ensure_capability_enabled(capabilities)?;

    Ok(CommerceRuntimeExecutionPlan {
        context: request.context().clone(),
        operation_id: contract.operation_id,
        service_name: contract.service_name,
        execution_policy: contract.execution_policy.clone(),
        capability_name: contract.capability_name,
        requires_transaction: contract.requires_transaction(),
        idempotency_scope: contract
            .requires_idempotency()
            .then_some(contract.operation_id),
        idempotency_key: request.idempotency_key().map(str::to_string),
        request_hash: request.request_hash().cloned(),
    })
}

const fn bind(
    operation_id: &'static str,
    service_name: &'static str,
) -> CommerceOperationServiceBinding {
    CommerceOperationServiceBinding {
        operation_id,
        service_name,
    }
}

fn read(
    operation_id: &'static str,
    service_name: &'static str,
    capability_name: &'static str,
) -> CommerceOperationContract {
    op(
        operation_id,
        service_name,
        OperationExecutionPolicy::ReadOnly,
        capability_name,
    )
}

fn write(
    operation_id: &'static str,
    service_name: &'static str,
    capability_name: &'static str,
) -> CommerceOperationContract {
    op(
        operation_id,
        service_name,
        OperationExecutionPolicy::TransactionalWrite,
        capability_name,
    )
}

fn op(
    operation_id: &'static str,
    service_name: &'static str,
    execution_policy: OperationExecutionPolicy,
    capability_name: &'static str,
) -> CommerceOperationContract {
    CommerceOperationContract::new(
        operation_id,
        service_name,
        execution_policy,
        capability_name,
    )
}
