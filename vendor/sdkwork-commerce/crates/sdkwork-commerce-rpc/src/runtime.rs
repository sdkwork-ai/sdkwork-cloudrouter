use sdkwork_commerce_contract_service::CommerceServiceError;
use sdkwork_rpc_core::{
    RPC_ACCESS_TOKEN_METADATA, RPC_AUTHORIZATION_METADATA, RPC_IDEMPOTENCY_KEY_METADATA,
    RPC_REQUEST_HASH_METADATA, RPC_REQUEST_ID_METADATA, RPC_TRACEPARENT_METADATA,
};
use tonic::metadata::MetadataMap;

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct CommerceRpcRequestMetadata {
    pub authorization: Option<String>,
    pub access_token: Option<String>,
    pub request_id: Option<String>,
    pub traceparent: Option<String>,
    pub idempotency_key: Option<String>,
    pub request_hash: Option<String>,
}

pub trait CommerceRpcOperationRuntime: Send + Sync + Clone + 'static {
    fn execute_operation_json(
        &self,
        operation_id: &str,
        body_json: &str,
        metadata: &CommerceRpcRequestMetadata,
    ) -> Result<String, CommerceServiceError>;
}

#[derive(Clone, Debug, Default)]
pub struct CommerceRpcNoopRuntime;

impl CommerceRpcOperationRuntime for CommerceRpcNoopRuntime {
    fn execute_operation_json(
        &self,
        _operation_id: &str,
        _body_json: &str,
        _metadata: &CommerceRpcRequestMetadata,
    ) -> Result<String, CommerceServiceError> {
        Ok("{}".to_string())
    }
}

#[derive(Clone, Debug)]
pub struct ValidatedCommerceRpcRuntime<R> {
    inner: R,
    enforce_auth: bool,
}

impl<R> ValidatedCommerceRpcRuntime<R> {
    pub fn new(inner: R) -> Self {
        Self {
            inner,
            enforce_auth: true,
        }
    }

    pub fn with_auth_enforcement(mut self, enforce_auth: bool) -> Self {
        self.enforce_auth = enforce_auth;
        self
    }
}

impl<R> CommerceRpcOperationRuntime for ValidatedCommerceRpcRuntime<R>
where
    R: CommerceRpcOperationRuntime,
{
    fn execute_operation_json(
        &self,
        operation_id: &str,
        body_json: &str,
        metadata: &CommerceRpcRequestMetadata,
    ) -> Result<String, CommerceServiceError> {
        if self.enforce_auth {
            if let Some(auth_policy) = crate::context_mapper::resolve_rpc_auth_policy(operation_id)
            {
                crate::context_mapper::validate_commerce_rpc_auth(metadata, auth_policy)?;
            }
            crate::context_mapper::validate_commerce_rpc_idempotency(operation_id, metadata)?;
        }
        self.inner
            .execute_operation_json(operation_id, body_json, metadata)
    }
}

pub fn extract_request_metadata(metadata: &MetadataMap) -> CommerceRpcRequestMetadata {
    CommerceRpcRequestMetadata {
        authorization: metadata_value(metadata, RPC_AUTHORIZATION_METADATA),
        access_token: metadata_value(metadata, RPC_ACCESS_TOKEN_METADATA),
        request_id: metadata_value(metadata, RPC_REQUEST_ID_METADATA),
        traceparent: metadata_value(metadata, RPC_TRACEPARENT_METADATA),
        idempotency_key: metadata_value(metadata, RPC_IDEMPOTENCY_KEY_METADATA),
        request_hash: metadata_value(metadata, RPC_REQUEST_HASH_METADATA),
    }
}

fn metadata_value(metadata: &MetadataMap, key: &str) -> Option<String> {
    metadata
        .get(key)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string)
}
