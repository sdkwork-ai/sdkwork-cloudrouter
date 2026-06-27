use std::sync::Arc;

use serde_json::Value;

use super::{
    DispatchMode, Invocation, InvocationDispatchResponse, InvocationError, InvocationErrorKind,
    InvocationFuture, InvocationInterceptor, InvocationSurface, StickyMode, StickyRouteConstraint,
};
use crate::domain::AiRouteModelRequirement;
use crate::ports::{
    StickyObjectRouteBinding, StickyObjectRouteLookup, StickyObjectRouteUpsert, StickyRouteStore,
};

#[derive(Clone)]
pub struct StickyResolutionInterceptor {
    store: Arc<dyn StickyRouteStore>,
}

impl StickyResolutionInterceptor {
    pub fn new(store: Arc<dyn StickyRouteStore>) -> Self {
        Self { store }
    }
}

impl InvocationInterceptor for StickyResolutionInterceptor {
    fn name(&self) -> &str {
        "sticky_resolution"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            let Some(sticky) = invocation.routing.sticky.clone() else {
                return Ok(());
            };

            let (object_type, object_id) = match sticky.mode {
                StickyMode::CreateThenSticky | StickyMode::None => return Ok(()),
                StickyMode::LookupSticky => {
                    let object_id = sticky
                        .object_id
                        .clone()
                        .or_else(|| invocation.resource.resource_id.clone())
                        .ok_or_else(|| sticky_error("sticky lookup requires object id"))?;
                    (sticky.object_type.clone(), object_id)
                }
                StickyMode::ParentSticky => {
                    let object_id = sticky
                        .parent_object_id
                        .clone()
                        .or_else(|| invocation.resource.parent_resource_id.clone())
                        .ok_or_else(|| {
                            sticky_error("parent sticky lookup requires parent object id")
                        })?;
                    let object_type = sticky
                        .parent_object_type
                        .clone()
                        .unwrap_or_else(|| sticky.object_type.clone());
                    (object_type, object_id)
                }
            };

            let query = StickyObjectRouteLookup {
                tenant_id: invocation.subject.tenant_id,
                organization_id: invocation.subject.organization_id,
                object_type,
                object_id,
            };
            let binding = self
                .store
                .find_binding(query.clone())
                .await
                .map_err(|error| {
                    sticky_error(format!(
                        "failed to resolve sticky route binding for {} {}: {error}",
                        query.object_type, query.object_id
                    ))
                })?;

            match binding {
                Some(binding) => {
                    apply_sticky_binding(invocation, binding);
                    Ok(())
                }
                None if sticky.mode == StickyMode::ParentSticky => {
                    invocation.routing.sticky = None;
                    Ok(())
                }
                None => Err(sticky_error(format!(
                    "sticky route binding not found for {} {}",
                    query.object_type, query.object_id
                ))),
            }
        })
    }
}

#[derive(Clone)]
pub struct StickyCommitInterceptor {
    store: Arc<dyn StickyRouteStore>,
}

impl StickyCommitInterceptor {
    pub fn new(store: Arc<dyn StickyRouteStore>) -> Self {
        Self { store }
    }
}

impl InvocationInterceptor for StickyCommitInterceptor {
    fn name(&self) -> &str {
        "sticky_commit"
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            let Some(sticky) = invocation.routing.sticky.as_ref() else {
                return Ok(());
            };
            if !matches!(
                sticky.mode,
                StickyMode::CreateThenSticky | StickyMode::ParentSticky
            ) {
                return Ok(());
            }

            let Some(response) = invocation.dispatch.response.as_ref() else {
                return Ok(());
            };
            if !effective_response_is_success(invocation, response) {
                return Ok(());
            }
            let Some(response_body) = effective_response_body(invocation, response) else {
                return Ok(());
            };
            let Some(object_id) = sticky_response_object_id(&sticky.object_type, &response_body)
            else {
                return Ok(());
            };

            let account = invocation.account.as_ref().ok_or_else(|| {
                sticky_error("sticky commit requires resolved invocation account")
            })?;
            let sticky_scope = sticky_scope_code(sticky.mode.clone());
            let command = StickyObjectRouteUpsert {
                request_id: invocation.request.request_id.clone(),
                trace_id: invocation.telemetry.trace_id.clone(),
                tenant_id: invocation.subject.tenant_id,
                organization_id: invocation.subject.organization_id,
                api_key_id: invocation.subject.api_key_id,
                channel_group_id: invocation.subject.channel_group_id,
                object_type: sticky.object_type.clone(),
                object_id,
                parent_object_type: sticky.parent_object_type.clone(),
                parent_object_id: sticky.parent_object_id.clone(),
                provider_code: account.provider_code.clone(),
                channel_id: account.channel_id,
                vendor_code: Some(account.provider_code.clone()),
                api_code: invocation.resource.api_code.clone(),
                catalog_key: invocation
                    .resource
                    .requested_model_catalog_key
                    .clone()
                    .or_else(|| Some(invocation.resource.route_key.clone())),
                provider_model: account
                    .provider_model
                    .clone()
                    .or_else(|| sticky_provider_model_fallback(invocation)),
                region_code: Some(account.region_code.clone()),
                sticky_scope,
                meter_code: invocation
                    .billing
                    .meter
                    .as_ref()
                    .map(|meter| meter.code().to_owned()),
            };

            self.store.upsert_binding(command).await.map_err(|error| {
                sticky_error(format!("failed to commit sticky route binding: {error}"))
            })
        })
    }
}

fn sticky_provider_model_fallback(invocation: &Invocation) -> Option<String> {
    if invocation.resource.surface == InvocationSurface::OpenAiCompatible
        && invocation.resource.model_requirement == AiRouteModelRequirement::Ignored
    {
        return invocation
            .resource
            .requested_model_catalog_key
            .clone()
            .or_else(|| Some(invocation.resource.route_key.clone()));
    }
    invocation
        .resource
        .provider_native_model
        .clone()
        .or_else(|| invocation.resource.requested_model.clone())
}

fn apply_sticky_binding(invocation: &mut Invocation, binding: StickyObjectRouteBinding) {
    if let Some(catalog_key) = binding.catalog_key.as_ref() {
        invocation.resource.requested_model_catalog_key = Some(catalog_key.clone());
    }
    if let Some(provider_model) = binding.provider_model.as_ref() {
        invocation.resource.provider_native_model = Some(provider_model.clone());
    }
    invocation.routing.sticky_route = Some(StickyRouteConstraint {
        provider_code: binding.provider_code,
        channel_id: binding.channel_id,
        channel_group_id: binding.channel_group_id,
        vendor_code: binding.vendor_code,
        api_code: binding.api_code,
        catalog_key: binding.catalog_key,
        provider_model: binding.provider_model,
        region_code: binding.region_code,
        sticky_scope: binding.sticky_scope,
    });
}

fn effective_response_is_success(
    invocation: &Invocation,
    response: &InvocationDispatchResponse,
) -> bool {
    if invocation.dispatch.mode != DispatchMode::InternalProviderAdapter {
        return response.is_success();
    }
    response
        .body
        .as_ref()
        .and_then(adapter_response_status_code)
        .map(|status_code| (200..300).contains(&status_code))
        .unwrap_or_else(|| response.is_success())
}

fn effective_response_body(
    invocation: &Invocation,
    response: &InvocationDispatchResponse,
) -> Option<Value> {
    if let Some(body) = response.body.as_ref() {
        if invocation.dispatch.mode == DispatchMode::InternalProviderAdapter {
            return body.get("body").cloned().or_else(|| Some(body.clone()));
        }
        return Some(body.clone());
    }
    response
        .body_bytes
        .as_ref()
        .and_then(|bytes| serde_json::from_slice(bytes).ok())
}

fn adapter_response_status_code(body: &Value) -> Option<u16> {
    body.get("statusCode")
        .or_else(|| body.get("status_code"))
        .and_then(Value::as_u64)
        .and_then(|value| u16::try_from(value).ok())
}

fn sticky_response_object_id(object_type: &str, response_body: &Value) -> Option<String> {
    let id = response_body
        .get("id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())?;
    // When the response includes an "object" field, verify it matches the
    // expected object type. If it doesn't match, skip binding to prevent
    // associating an unrelated resource with the sticky route.
    if let Some(actual_object) = response_body
        .get("object")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        if !sticky_response_object_matches(object_type, actual_object) {
            return None;
        }
    }
    Some(id.to_owned())
}

fn sticky_response_object_matches(expected_object_type: &str, actual_object: &str) -> bool {
    let actual = actual_object.trim();
    actual == expected_object_type
        || actual.strip_prefix("provider-") == Some(expected_object_type)
        || actual.strip_suffix(".created") == Some(expected_object_type)
}

fn sticky_scope_code(mode: StickyMode) -> String {
    match mode {
        StickyMode::ParentSticky => "parent",
        StickyMode::CreateThenSticky | StickyMode::LookupSticky | StickyMode::None => "object",
    }
    .to_owned()
}

fn sticky_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Routing, message)
}
