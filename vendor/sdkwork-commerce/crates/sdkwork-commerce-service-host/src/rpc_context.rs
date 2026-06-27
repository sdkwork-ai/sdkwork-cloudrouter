use std::future::Future;
use std::sync::Arc;

use sdkwork_commerce_contract_service::CommerceServiceError;
use sdkwork_commerce_rpc::{
    commerce_runtime_context_from_iam, commerce_surface_profile_for_operation,
    resolve_rpc_auth_policy, CommerceRpcContextResolver, CommerceRpcRequestMetadata,
};
use sdkwork_iam_context_service::IamAppContext;
use sdkwork_iam_web_adapter::{
    iam_app_context_from_web_principal, resolve_iam_app_context_from_dual_tokens,
    resolve_iam_app_context_from_oauth_bearer,
};
use sdkwork_web_core::{
    DefaultWebRequestContextResolver, WebFrameworkError, WebRequestContextResolver,
};
use sqlx::PgPool;

pub struct CommerceIamRpcContextResolver {
    iam_pool: Option<Arc<PgPool>>,
    jwt_fallback: DefaultWebRequestContextResolver,
}

impl CommerceIamRpcContextResolver {
    pub fn new(iam_pool: Option<Arc<PgPool>>) -> Self {
        Self {
            iam_pool,
            jwt_fallback: DefaultWebRequestContextResolver::default(),
        }
    }

    fn resolve_dual_token(
        &self,
        metadata: &CommerceRpcRequestMetadata,
    ) -> Result<IamAppContext, CommerceServiceError> {
        let auth_token = metadata.authorization.as_deref().ok_or_else(|| {
            CommerceServiceError::unauthenticated(
                "authorization metadata is required for dual_token rpc auth",
            )
        })?;
        let access_token = metadata.access_token.as_deref().ok_or_else(|| {
            CommerceServiceError::unauthenticated(
                "access-token metadata is required for dual_token rpc auth",
            )
        })?;

        block_on_rpc_async(async {
            if let Some(pool) = &self.iam_pool {
                if let Some(context) =
                    resolve_iam_app_context_from_dual_tokens(pool, auth_token, access_token).await
                {
                    return Ok(context);
                }
                return Err(CommerceServiceError::unauthenticated(
                    "invalid or expired IAM session",
                ));
            }

            let principal = self
                .jwt_fallback
                .resolve_dual_token(auth_token, access_token)
                .await
                .map_err(|error: WebFrameworkError| {
                    CommerceServiceError::unauthenticated(error.message.clone())
                })?;
            Ok(iam_app_context_from_web_principal(&principal))
        })
    }

    fn resolve_backend_admin(
        &self,
        metadata: &CommerceRpcRequestMetadata,
    ) -> Result<IamAppContext, CommerceServiceError> {
        let authorization = metadata.authorization.as_deref().ok_or_else(|| {
            CommerceServiceError::unauthenticated(
                "authorization metadata is required for backend_admin rpc auth",
            )
        })?;

        block_on_rpc_async(async {
            if let Some(pool) = &self.iam_pool {
                if let Some(context) =
                    resolve_iam_app_context_from_oauth_bearer(pool, authorization).await
                {
                    return Ok(context);
                }
                return Err(CommerceServiceError::unauthenticated(
                    "invalid or expired IAM backend authorization",
                ));
            }

            if let Some(access_token) = metadata.access_token.as_deref() {
                let principal = self
                    .jwt_fallback
                    .resolve_dual_token(authorization, access_token)
                    .await
                    .map_err(|error: WebFrameworkError| {
                        CommerceServiceError::unauthenticated(error.message.clone())
                    })?;
                return Ok(iam_app_context_from_web_principal(&principal));
            }

            Err(CommerceServiceError::unauthenticated(
                "backend_admin rpc auth requires IAM database wiring or dual-token jwt fallback metadata",
            ))
        })
    }
}

impl CommerceRpcContextResolver for CommerceIamRpcContextResolver {
    fn resolve_runtime_context(
        &self,
        operation_id: &str,
        metadata: &CommerceRpcRequestMetadata,
    ) -> Result<sdkwork_commerce_contract_service::CommerceRuntimeContext, CommerceServiceError>
    {
        let auth_policy = resolve_rpc_auth_policy(operation_id).ok_or_else(|| {
            CommerceServiceError::validation(format!(
                "rpc operation is not registered: {operation_id}"
            ))
        })?;
        let surface_profile = commerce_surface_profile_for_operation(operation_id)?;
        let iam = match auth_policy {
            "dual_token" => self.resolve_dual_token(metadata)?,
            "backend_admin" => self.resolve_backend_admin(metadata)?,
            other => {
                return Err(CommerceServiceError::validation(format!(
                    "unsupported rpc auth policy: {other}"
                )))
            }
        };

        Ok(commerce_runtime_context_from_iam(&iam, surface_profile))
    }
}

fn block_on_rpc_async<F, T>(future: F) -> Result<T, CommerceServiceError>
where
    F: Future<Output = Result<T, CommerceServiceError>>,
{
    if let Ok(handle) = tokio::runtime::Handle::try_current() {
        return tokio::task::block_in_place(|| handle.block_on(future));
    }

    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|error| {
            CommerceServiceError::storage(format!("rpc context tokio runtime failed: {error}"))
        })?
        .block_on(future)
}
