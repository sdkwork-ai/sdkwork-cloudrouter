use sdkwork_commerce_contract_service::{
    CommerceRuntimeContext, CommerceRuntimeContextInput, CommerceServiceError,
    CommerceSurfaceProfile, DeploymentMode, Environment,
};
use sdkwork_iam_context_service::IamAppContext;
use sdkwork_rpc_core::{
    RPC_ACCESS_TOKEN_METADATA, RPC_AUTHORIZATION_METADATA, RPC_IDEMPOTENCY_KEY_METADATA,
    RPC_REQUEST_HASH_METADATA, RPC_REQUEST_ID_METADATA, RPC_TRACEPARENT_METADATA,
};
use tonic::metadata::MetadataMap;

use crate::all_commerce_rpc_service_manifests;
use crate::runtime::CommerceRpcRequestMetadata;

pub const COMMERCE_RPC_METADATA_KEYS: &[&str] = &[
    RPC_AUTHORIZATION_METADATA,
    RPC_ACCESS_TOKEN_METADATA,
    RPC_REQUEST_ID_METADATA,
    RPC_TRACEPARENT_METADATA,
    RPC_IDEMPOTENCY_KEY_METADATA,
    RPC_REQUEST_HASH_METADATA,
];

pub fn commerce_rpc_metadata_keys() -> &'static [&'static str] {
    COMMERCE_RPC_METADATA_KEYS
}

pub trait CommerceRpcContextResolver: Send + Sync {
    fn resolve_runtime_context(
        &self,
        operation_id: &str,
        metadata: &CommerceRpcRequestMetadata,
    ) -> Result<CommerceRuntimeContext, CommerceServiceError>;
}

#[derive(Clone, Debug)]
pub struct FixedCommerceRpcContextResolver {
    context: CommerceRuntimeContext,
}

impl FixedCommerceRpcContextResolver {
    pub fn new(context: CommerceRuntimeContext) -> Self {
        Self { context }
    }
}

impl CommerceRpcContextResolver for FixedCommerceRpcContextResolver {
    fn resolve_runtime_context(
        &self,
        _operation_id: &str,
        _metadata: &CommerceRpcRequestMetadata,
    ) -> Result<CommerceRuntimeContext, CommerceServiceError> {
        Ok(self.context.clone())
    }
}

pub fn resolve_rpc_surface(operation_id: &str) -> Option<&'static str> {
    all_commerce_rpc_service_manifests()
        .into_iter()
        .flat_map(|manifest| {
            manifest
                .methods
                .into_iter()
                .filter(|method| method.operation_id == operation_id)
                .map(move |_| manifest.surface)
        })
        .next()
}

pub fn commerce_surface_profile_for_operation(
    operation_id: &str,
) -> Result<CommerceSurfaceProfile, CommerceServiceError> {
    match resolve_rpc_surface(operation_id) {
        Some("app") => Ok(CommerceSurfaceProfile::App),
        Some("backend") => Ok(CommerceSurfaceProfile::Admin),
        Some(surface) => Err(CommerceServiceError::validation(format!(
            "unsupported rpc surface profile: {surface}"
        ))),
        None => Err(CommerceServiceError::validation(format!(
            "rpc operation is not registered: {operation_id}"
        ))),
    }
}

pub fn commerce_runtime_context_from_iam(
    iam: &IamAppContext,
    surface_profile: CommerceSurfaceProfile,
) -> CommerceRuntimeContext {
    CommerceRuntimeContext::new(CommerceRuntimeContextInput {
        tenant_id: iam.tenant_id.clone(),
        organization_id: iam.organization_id.clone(),
        user_id: iam.user_id.clone(),
        session_id: iam.session_id.clone(),
        app_id: iam.app_id.clone(),
        deployment_mode: map_deployment_mode(&iam.deployment_mode),
        environment: map_environment(&iam.environment),
        surface_profile,
    })
}

pub fn resolve_rpc_auth_policy(operation_id: &str) -> Option<&'static str> {
    all_commerce_rpc_service_manifests()
        .into_iter()
        .flat_map(|manifest| manifest.methods)
        .find(|method| method.operation_id == operation_id)
        .map(|method| method.auth_policy)
}

pub fn requires_rpc_idempotency(operation_id: &str) -> bool {
    all_commerce_rpc_service_manifests()
        .into_iter()
        .flat_map(|manifest| manifest.methods)
        .find(|method| method.operation_id == operation_id)
        .is_some_and(|method| method.requires_idempotency)
}

pub fn validate_incoming_metadata(metadata: &MetadataMap) -> Result<(), CommerceServiceError> {
    if let Some(request_id) = metadata_value(metadata, RPC_REQUEST_ID_METADATA) {
        if request_id.trim().is_empty() {
            return Err(CommerceServiceError::validation(
                "x-request-id metadata must not be empty",
            ));
        }
    }

    Ok(())
}

pub fn validate_commerce_rpc_auth(
    metadata: &CommerceRpcRequestMetadata,
    auth_policy: &str,
) -> Result<(), CommerceServiceError> {
    match auth_policy {
        "dual_token" => {
            require_non_empty_metadata(
                metadata.authorization.as_deref(),
                "authorization metadata is required for dual_token rpc auth",
            )?;
            require_non_empty_metadata(
                metadata.access_token.as_deref(),
                "access-token metadata is required for dual_token rpc auth",
            )?;
        }
        "backend_admin" => require_non_empty_metadata(
            metadata.authorization.as_deref(),
            "authorization metadata is required for backend_admin rpc auth",
        )?,
        _ => {}
    }

    Ok(())
}

pub fn validate_commerce_rpc_idempotency(
    operation_id: &str,
    metadata: &CommerceRpcRequestMetadata,
) -> Result<(), CommerceServiceError> {
    if requires_rpc_idempotency(operation_id) && metadata.idempotency_key.is_none() {
        return Err(CommerceServiceError::validation(
            "idempotency_key is required for write operation",
        ));
    }

    Ok(())
}

fn require_non_empty_metadata(
    value: Option<&str>,
    message: &'static str,
) -> Result<(), CommerceServiceError> {
    match value.map(str::trim).filter(|value| !value.is_empty()) {
        Some(_) => Ok(()),
        None => Err(CommerceServiceError::unauthenticated(message)),
    }
}

fn metadata_value(metadata: &MetadataMap, key: &str) -> Option<String> {
    metadata
        .get(key)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string)
}

fn map_deployment_mode(mode: &sdkwork_iam_context_service::DeploymentMode) -> DeploymentMode {
    match mode {
        sdkwork_iam_context_service::DeploymentMode::Saas => DeploymentMode::Saas,
        sdkwork_iam_context_service::DeploymentMode::Local => DeploymentMode::Local,
        sdkwork_iam_context_service::DeploymentMode::Private => DeploymentMode::Private,
    }
}

fn map_environment(env: &sdkwork_iam_context_service::Environment) -> Environment {
    match env {
        sdkwork_iam_context_service::Environment::Dev => Environment::Development,
        sdkwork_iam_context_service::Environment::Test => Environment::Test,
        sdkwork_iam_context_service::Environment::Prod => Environment::Production,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runtime::CommerceRpcRequestMetadata;
    use sdkwork_iam_context_service::{
        AuthLevel, DeploymentMode as IamDeploymentMode, Environment as IamEnvironment,
    };

    #[test]
    fn resolves_dual_token_policy_for_wallet_overview() {
        assert_eq!(
            resolve_rpc_auth_policy("wallet.overview.retrieve"),
            Some("dual_token")
        );
    }

    #[test]
    fn resolves_app_surface_profile_for_wallet_overview() {
        assert_eq!(
            commerce_surface_profile_for_operation("wallet.overview.retrieve").unwrap(),
            CommerceSurfaceProfile::App
        );
    }

    #[test]
    fn resolves_backend_surface_profile_for_payment_admin_operation() {
        assert_eq!(
            commerce_surface_profile_for_operation("payments.intents.list").unwrap(),
            CommerceSurfaceProfile::Admin
        );
    }

    #[test]
    fn maps_iam_context_to_commerce_runtime_context() {
        let iam = IamAppContext::new(
            "100001",
            Some("300001"),
            "30",
            "session-1",
            "sdkwork-commerce",
            IamEnvironment::Prod,
            IamDeploymentMode::Private,
            AuthLevel::Password,
            vec![],
            vec![],
        );
        let context = commerce_runtime_context_from_iam(&iam, CommerceSurfaceProfile::App);

        assert_eq!(context.tenant_id, "100001");
        assert_eq!(context.organization_id.as_deref(), Some("300001"));
        assert_eq!(context.user_id, "30");
        assert_eq!(context.surface_profile, CommerceSurfaceProfile::App);
        assert_eq!(context.environment, Environment::Production);
    }

    #[test]
    fn validates_dual_token_metadata() {
        let metadata = CommerceRpcRequestMetadata {
            authorization: Some("Bearer auth".to_string()),
            access_token: Some("access".to_string()),
            ..CommerceRpcRequestMetadata::default()
        };

        validate_commerce_rpc_auth(&metadata, "dual_token").expect("dual token auth");
    }

    #[test]
    fn rejects_missing_access_token_for_dual_token() {
        let metadata = CommerceRpcRequestMetadata {
            authorization: Some("Bearer auth".to_string()),
            ..CommerceRpcRequestMetadata::default()
        };

        let error = validate_commerce_rpc_auth(&metadata, "dual_token").unwrap_err();
        assert_eq!(error.code(), "unauthenticated");
    }

    #[test]
    fn requires_idempotency_for_checkout_create() {
        let error = validate_commerce_rpc_idempotency(
            "checkout.sessions.create",
            &CommerceRpcRequestMetadata::default(),
        )
        .unwrap_err();

        assert_eq!(error.code(), "validation");
    }

    #[test]
    fn fixed_context_resolver_returns_configured_context() {
        let context = commerce_runtime_context_from_iam(
            &IamAppContext::new(
                "100001",
                None,
                "30",
                "session-1",
                "sdkwork-commerce",
                IamEnvironment::Prod,
                IamDeploymentMode::Private,
                AuthLevel::Password,
                vec![],
                vec![],
            ),
            CommerceSurfaceProfile::App,
        );
        let resolver = FixedCommerceRpcContextResolver::new(context.clone());
        let resolved = resolver
            .resolve_runtime_context(
                "wallet.overview.retrieve",
                &CommerceRpcRequestMetadata::default(),
            )
            .expect("context");

        assert_eq!(resolved, context);
    }
}
