use sdkwork_commerce_contract_service::{
    CapabilityFlag, CommerceRequestHash, CommerceRuntimeContext, CommerceServiceError,
};
use sdkwork_commerce_rpc::{
    CommerceRpcContextResolver, CommerceRpcOperationRuntime, CommerceRpcRequestMetadata,
    FixedCommerceRpcContextResolver,
};
use std::sync::{Arc, Mutex};

use crate::{
    execute_runtime_operation_enveloped, resolve_operation_contract,
    CommerceRuntimeIdempotencyStore, CommerceRuntimeOperationInput, CommerceRuntimeServiceRegistry,
    CommerceRuntimeTransactionManager,
};

pub struct CommerceServiceHostRpcRuntime {
    registry: Arc<CommerceRuntimeServiceRegistry>,
    context_resolver: Arc<dyn CommerceRpcContextResolver + Send + Sync>,
    idempotency_store: Arc<Mutex<Box<dyn CommerceRuntimeIdempotencyStore + Send>>>,
    transactions: Arc<Mutex<Box<dyn CommerceRuntimeTransactionManager + Send>>>,
}

impl CommerceServiceHostRpcRuntime {
    pub fn new(
        registry: CommerceRuntimeServiceRegistry,
        context: CommerceRuntimeContext,
        store: Box<dyn CommerceRuntimeIdempotencyStore + Send>,
        transactions: Box<dyn CommerceRuntimeTransactionManager + Send>,
    ) -> Self {
        Self::with_context_resolver(
            registry,
            Box::new(FixedCommerceRpcContextResolver::new(context)),
            store,
            transactions,
        )
    }

    pub fn with_context_resolver(
        registry: CommerceRuntimeServiceRegistry,
        context_resolver: Box<dyn CommerceRpcContextResolver + Send + Sync>,
        store: Box<dyn CommerceRuntimeIdempotencyStore + Send>,
        transactions: Box<dyn CommerceRuntimeTransactionManager + Send>,
    ) -> Self {
        Self {
            registry: Arc::new(registry),
            context_resolver: Arc::from(context_resolver),
            idempotency_store: Arc::new(Mutex::new(store)),
            transactions: Arc::new(Mutex::new(transactions)),
        }
    }
}

impl Clone for CommerceServiceHostRpcRuntime {
    fn clone(&self) -> Self {
        Self {
            registry: self.registry.clone(),
            context_resolver: Arc::clone(&self.context_resolver),
            idempotency_store: Arc::clone(&self.idempotency_store),
            transactions: Arc::clone(&self.transactions),
        }
    }
}

impl CommerceRpcOperationRuntime for CommerceServiceHostRpcRuntime {
    fn execute_operation_json(
        &self,
        operation_id: &str,
        body_json: &str,
        metadata: &CommerceRpcRequestMetadata,
    ) -> Result<String, CommerceServiceError> {
        let context = self
            .context_resolver
            .resolve_runtime_context(operation_id, metadata)?;
        let contract = resolve_operation_contract(operation_id)?;
        let capabilities = vec![CapabilityFlag::new(contract.capability_name, true)?];
        let request_hash = metadata
            .request_hash
            .as_deref()
            .map(CommerceRequestHash::new)
            .transpose()?;

        let input = CommerceRuntimeOperationInput::new(
            context,
            operation_id,
            body_json,
            capabilities,
            metadata.idempotency_key.as_deref(),
            request_hash,
        );

        let mut store = self
            .idempotency_store
            .lock()
            .map_err(|_| CommerceServiceError::storage("commerce rpc idempotency lock poisoned"))?;
        let mut transactions = self
            .transactions
            .lock()
            .map_err(|_| CommerceServiceError::storage("commerce rpc transaction lock poisoned"))?;

        let envelope = execute_runtime_operation_enveloped(
            self.registry.as_ref(),
            store.as_mut(),
            transactions.as_mut(),
            input,
        );

        if envelope.ok {
            envelope
                .body_json
                .ok_or_else(|| CommerceServiceError::storage("runtime response body is missing"))
        } else {
            Err(envelope
                .error
                .map(|error| match error.code {
                    "unauthenticated" => CommerceServiceError::unauthenticated(error.message),
                    "unauthorized" => CommerceServiceError::unauthorized(error.message),
                    "not-found" => CommerceServiceError::not_found(error.message),
                    "conflict" => CommerceServiceError::conflict(error.message),
                    "invalid-state" => CommerceServiceError::invalid_state(error.message),
                    "validation" => CommerceServiceError::validation(error.message),
                    "unsupported-capability" => {
                        CommerceServiceError::unsupported_capability(error.message)
                    }
                    "provider-unavailable" => {
                        CommerceServiceError::provider_unavailable(error.message)
                    }
                    "storage" => CommerceServiceError::storage(error.message),
                    _ => CommerceServiceError::unknown(error.message),
                })
                .unwrap_or_else(|| CommerceServiceError::unknown("runtime operation failed")))
        }
    }
}
