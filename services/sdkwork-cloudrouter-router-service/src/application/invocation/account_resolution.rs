use std::sync::Arc;

use sdkwork_utils_rust::is_blank;

use super::{
    routing_filter_context, DispatchMode, FilterRejectionKind, Invocation, InvocationAccount,
    InvocationError, InvocationErrorKind, InvocationFuture, InvocationInterceptor,
    InvocationRouteCandidate, InvocationSurface, RoutingFilterChain,
};
use crate::domain::provider_native_model_id;
use crate::ports::UpstreamAccountRouteCatalog;

#[derive(Clone)]
pub struct AccountResolutionInterceptor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    catalog: Arc<C>,
}

impl<C> AccountResolutionInterceptor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    pub fn new(catalog: Arc<C>) -> Self {
        Self { catalog }
    }
}

impl<C> InvocationInterceptor for AccountResolutionInterceptor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    fn name(&self) -> &str {
        "account_resolution"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if invocation.dispatch.mode == DispatchMode::SyntheticLocalResponse {
                return Ok(());
            }
            let Some(plan) = invocation.routing.route_plan.as_mut() else {
                return Ok(());
            };
            // 路由过滤链：候选 → 最终账号（模型黑白名单/健康/可调用性统一门禁，
            // 模型路由与账号路由（含 provider-native）走同一套过滤）。
            let ctx = routing_filter_context(
                self.catalog.as_ref(),
                invocation.resource.requested_model.as_deref(),
                invocation.resource.requested_model_catalog_key.as_deref(),
            );
            let selected = RoutingFilterChain::new()
                .select_account(&ctx, plan.candidates.clone())
                .map_err(|rejection| match rejection.kind {
                    FilterRejectionKind::ModelForbidden => {
                        InvocationError::new(InvocationErrorKind::ModelForbidden, rejection.message)
                    }
                    FilterRejectionKind::RouteUnavailable => account_error(rejection.message),
                })?;
            // 最终账号 + 故障转移序列回写 plan：dispatch 的重试/故障转移继续使用
            // 剩余候选，避免账号解析与调度各自独立选择造成不一致。
            plan.candidates = std::iter::once(selected.account.clone())
                .chain(selected.failover_candidates)
                .collect();
            plan.selected_index = 0;
            let candidate = &selected.account;
            validate_callable_candidate(candidate)?;

            invocation.account = Some(InvocationAccount {
                supplier_code: candidate.supplier_code.clone(),
                account_id: candidate.account_id,
                region_code: candidate.region_code.clone(),
                credential_id: candidate.credential_id,
                credential_rotation: candidate.credential_rotation.clone(),
                base_url: candidate.base_url.clone(),
                secret_ref: candidate.secret_ref.clone(),
                auth_profile: candidate.auth_profile.clone(),
                timeout_ms: candidate.timeout_ms,
                retry_policy: candidate.retry_policy.clone(),
                provider_model: candidate.provider_model.clone(),
                account_group_id: candidate.account_group_id,
                account_group_code: candidate.account_group_code.clone(),
                pricing_plan_code: candidate.pricing_plan_code.clone(),
            });
            if invocation.resource.surface == InvocationSurface::ProviderNative {
                if let Some(model) = invocation
                    .resource
                    .requested_model
                    .as_deref()
                    .filter(|value| !is_blank(Some(value)))
                {
                    invocation.resource.requested_model_catalog_key = Some(
                        canonical_provider_catalog_key(&candidate.supplier_code, model),
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

fn canonical_provider_catalog_key(supplier_code: &str, model: &str) -> String {
    let supplier_code = supplier_code.trim();
    let model = model.trim();
    let model_provider = model
        .split('/')
        .map(str::trim)
        .find(|part| !is_blank(Some(part)));
    if model_provider == Some(supplier_code) {
        model.to_owned()
    } else {
        format!("{supplier_code}/{model}")
    }
}

fn validate_callable_candidate(
    candidate: &InvocationRouteCandidate,
) -> Result<(), InvocationError> {
    if is_blank(Some(candidate.supplier_code.as_str())) {
        return Err(account_error(
            "resolved route candidate is missing provider code",
        ));
    }
    if candidate.account_id <= 0 {
        return Err(account_error(
            "resolved route candidate is missing upstream account id",
        ));
    }
    if is_blank(candidate.base_url.as_deref()) {
        return Err(account_error(format!(
            "resolved route candidate {}:{} is missing base URL",
            candidate.supplier_code, candidate.account_id
        )));
    }
    if is_blank(candidate.secret_ref.as_deref())
        && candidate.auth_profile.default_headers.is_empty()
    {
        return Err(account_error(format!(
            "resolved route candidate {}:{} is missing secret ref",
            candidate.supplier_code, candidate.account_id
        )));
    }
    Ok(())
}

fn account_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Routing, message)
}
