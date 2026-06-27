use sdkwork_commerce_contract_service::{
    CommerceRuntimeContext, CommerceRuntimeContextInput, CommerceServiceError,
    CommerceSurfaceProfile, DeploymentMode, Environment,
};
use sdkwork_commerce_rpc::CommerceRpcOperationRuntime;
use sdkwork_commerce_service_host::{
    build_commerce_rpc_runtime_service_registry, CommerceAccountRuntimeStore,
    CommerceOrderRuntimeStore, CommercePaymentRuntimeStore, CommerceRuntimeServiceRequest,
    CommerceServiceHostRpcRuntime, CommerceServiceHostRuntimeStores,
};
use std::sync::Arc;

#[derive(Clone, Default)]
struct RecordingTransactionManager {
    events: Vec<String>,
}

impl sdkwork_commerce_service_host::CommerceRuntimeTransactionManager
    for RecordingTransactionManager
{
    fn begin(&mut self, operation_id: &str) -> Result<(), CommerceServiceError> {
        self.events.push(format!("begin:{operation_id}"));
        Ok(())
    }

    fn commit(&mut self, operation_id: &str) -> Result<(), CommerceServiceError> {
        self.events.push(format!("commit:{operation_id}"));
        Ok(())
    }

    fn rollback(&mut self, operation_id: &str) -> Result<(), CommerceServiceError> {
        self.events.push(format!("rollback:{operation_id}"));
        Ok(())
    }
}

#[derive(Clone, Default)]
struct InMemoryIdempotencyStore;

impl sdkwork_commerce_service_host::CommerceRuntimeIdempotencyStore for InMemoryIdempotencyStore {
    fn find(
        &self,
        _tenant_id: &str,
        _scope: &str,
        _idempotency_key: &str,
    ) -> Result<
        Option<sdkwork_commerce_contract_service::CommerceIdempotencyRecord>,
        CommerceServiceError,
    > {
        Ok(None)
    }

    fn lock(
        &mut self,
        record: sdkwork_commerce_contract_service::CommerceIdempotencyRecord,
    ) -> Result<sdkwork_commerce_contract_service::CommerceIdempotencyRecord, CommerceServiceError>
    {
        Ok(record)
    }

    fn complete(
        &mut self,
        _tenant_id: &str,
        _scope: &str,
        _idempotency_key: &str,
        _response_json: &str,
    ) -> Result<(), CommerceServiceError> {
        Ok(())
    }

    fn fail(
        &mut self,
        _tenant_id: &str,
        _scope: &str,
        _idempotency_key: &str,
    ) -> Result<(), CommerceServiceError> {
        Ok(())
    }
}

#[derive(Clone)]
struct StaticAccountStore {
    response_json: &'static str,
}

impl CommerceAccountRuntimeStore for StaticAccountStore {
    fn handle_account_operation(
        &self,
        request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        if request.execution_plan.operation_id == "wallet.overview.retrieve" {
            Ok(self.response_json.to_string())
        } else {
            Err(CommerceServiceError::unsupported_capability(
                "unexpected account operation in rpc runtime test",
            ))
        }
    }
}

#[derive(Clone)]
struct UnsupportedOrderStore;

impl CommerceOrderRuntimeStore for UnsupportedOrderStore {
    fn handle_order_operation(
        &self,
        _request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        Err(CommerceServiceError::unsupported_capability(
            "order runtime store is not exercised in wallet rpc runtime test",
        ))
    }
}

#[derive(Clone)]
struct UnsupportedPaymentStore;

impl CommercePaymentRuntimeStore for UnsupportedPaymentStore {
    fn handle_payment_operation(
        &self,
        _request: &CommerceRuntimeServiceRequest,
    ) -> Result<String, CommerceServiceError> {
        Err(CommerceServiceError::unsupported_capability(
            "payment runtime store is not exercised in wallet rpc runtime test",
        ))
    }
}

#[test]
fn commerce_service_host_rpc_runtime_executes_wallet_overview() {
    let stores = CommerceServiceHostRuntimeStores {
        account: Some(Arc::new(StaticAccountStore {
            response_json: r#"{
                "accounts": [
                    {
                        "id": "acct-1",
                        "assetType": "cash",
                        "currencyCode": "CNY",
                        "availableAmount": "1200"
                    }
                ]
            }"#,
        })),
        order: Some(Arc::new(UnsupportedOrderStore)),
        payment: Some(Arc::new(UnsupportedPaymentStore)),
    };
    let registry = build_commerce_rpc_runtime_service_registry(&stores).expect("registry");
    let runtime = CommerceServiceHostRpcRuntime::new(
        registry,
        runtime_context(),
        Box::new(InMemoryIdempotencyStore),
        Box::new(RecordingTransactionManager::default()),
    );

    let body = runtime
        .execute_operation_json(
            "wallet.overview.retrieve",
            "{}",
            &sdkwork_commerce_rpc::CommerceRpcRequestMetadata::default(),
        )
        .expect("wallet overview");

    let response = sdkwork_commerce_rpc::response_mapper::map_wallet_overview_response(&body)
        .expect("map overview");
    assert_eq!(response.accounts.len(), 1);
    assert_eq!(response.accounts[0].account_id, "acct-1");
}

fn runtime_context() -> CommerceRuntimeContext {
    CommerceRuntimeContext::new(CommerceRuntimeContextInput {
        tenant_id: "100001".to_string(),
        organization_id: Some("300001".to_string()),
        user_id: "30".to_string(),
        session_id: "session-1".to_string(),
        app_id: "sdkwork-commerce".to_string(),
        deployment_mode: DeploymentMode::Private,
        environment: Environment::Production,
        surface_profile: CommerceSurfaceProfile::App,
    })
}
