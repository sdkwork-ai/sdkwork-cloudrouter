use std::sync::Arc;

use sdkwork_utils_rust::is_blank;

use super::{
    Invocation, InvocationAccount, InvocationError, InvocationErrorKind, InvocationFuture,
    InvocationInterceptor, InvocationRouteCandidate, InvocationSurface,
};
use crate::domain::provider_native_model_id;
use crate::ports::PricingCatalog;

#[derive(Clone)]
pub struct AccountResolutionInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    catalog: Arc<C>,
}

impl<C> AccountResolutionInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    pub fn new(catalog: Arc<C>) -> Self {
        Self { catalog }
    }
}

impl<C> InvocationInterceptor for AccountResolutionInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    fn name(&self) -> &str {
        "account_resolution"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            let _ = &self.catalog;
            let Some(plan) = invocation.routing.route_plan.as_ref() else {
                return Ok(());
            };
            let candidate = plan
                .current_candidate()
                .ok_or_else(|| account_error("route plan has no selected candidate"))?;
            validate_callable_candidate(candidate)?;

            invocation.account = Some(InvocationAccount {
                provider_code: candidate.provider_code.clone(),
                channel_id: candidate.channel_id,
                region_code: candidate.region_code.clone(),
                credential_id: candidate.credential_id,
                credential_rotation: candidate.credential_rotation.clone(),
                base_url: candidate.base_url.clone(),
                secret_ref: candidate.secret_ref.clone(),
                auth_profile: candidate.auth_profile.clone(),
                timeout_ms: candidate.timeout_ms,
                retry_policy: candidate.retry_policy.clone(),
                provider_model: candidate.provider_model.clone(),
            });
            if invocation.resource.surface == InvocationSurface::ProviderNative {
                if let Some(model) = invocation
                    .resource
                    .requested_model
                    .as_deref()
                    .filter(|value| !is_blank(Some(value)))
                {
                    invocation.resource.requested_model_catalog_key = Some(
                        canonical_provider_catalog_key(&candidate.provider_code, model),
                    );
                } else if let Some(catalog_key) = candidate.catalog_key.as_ref() {
                    invocation.resource.requested_model_catalog_key = Some(catalog_key.clone());
                }
            } else if let Some(catalog_key) = candidate.catalog_key.as_ref() {
                invocation.resource.requested_model_catalog_key = Some(catalog_key.clone());
            }
            if let Some(provider_model) = candidate.provider_model.as_ref() {
                invocation.resource.provider_native_model =
                    Some(provider_native_model_id(provider_model));
            }
            Ok(())
        })
    }
}

fn canonical_provider_catalog_key(provider_code: &str, model: &str) -> String {
    let provider_code = provider_code.trim();
    let model = model.trim();
    let model_provider = model
        .split('/')
        .map(str::trim)
        .find(|part| !is_blank(Some(part)));
    if model_provider == Some(provider_code) {
        model.to_owned()
    } else {
        format!("{provider_code}/{model}")
    }
}

fn validate_callable_candidate(
    candidate: &InvocationRouteCandidate,
) -> Result<(), InvocationError> {
    if is_blank(Some(candidate.provider_code.as_str())) {
        return Err(account_error(
            "resolved route candidate is missing provider code",
        ));
    }
    if candidate.channel_id <= 0 {
        return Err(account_error(
            "resolved route candidate is missing channel id",
        ));
    }
    if is_blank(candidate.base_url.as_deref()) {
        return Err(account_error(format!(
            "resolved route candidate {}:{} is missing base URL",
            candidate.provider_code, candidate.channel_id
        )));
    }
    if is_blank(candidate.secret_ref.as_deref())
        && candidate.auth_profile.default_headers.is_empty()
    {
        return Err(account_error(format!(
            "resolved route candidate {}:{} is missing secret ref",
            candidate.provider_code, candidate.channel_id
        )));
    }
    Ok(())
}

fn account_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Routing, message)
}
