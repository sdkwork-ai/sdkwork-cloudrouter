use sdkwork_claw_provider_adapter_contract::{
    AdapterInvocationMetadata, AdapterInvocationRequest, AdapterInvocationShape,
    AdapterProviderContext, AdapterSecret, AdapterSubject,
};
use sdkwork_claw_provider_adapter_http::ProviderAdapterHttpError;
use serde_json::{json, Value};
use std::sync::Arc;

use crate::domain::{DomainError, DomainResult, ProviderAuthProfile, ProviderAuthType};
use crate::ports::ProviderSecretResolver;

pub(crate) type ProviderSecretResolverRef = Arc<dyn ProviderSecretResolver + Send + Sync>;

#[derive(Debug, Clone, Copy)]
pub(crate) struct OpenAiAdapterEndpoint {
    pub method: &'static str,
    pub standard_path: &'static str,
    pub capability: &'static str,
    pub endpoint_key: &'static str,
    pub invocation_id_prefix: &'static str,
}

pub(crate) struct OpenAiAdapterInvocationParts {
    pub api_key_id: i64,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub group_id: i64,
    pub group_code: String,
    pub pricing_plan_code: String,
    pub provider_code: String,
    pub provider_channel_id: i64,
    pub provider_region_code: String,
    pub provider_model: String,
    pub provider_base_url: Option<String>,
    pub provider_secret_ref: Option<String>,
    pub provider_auth_profile: ProviderAuthProfile,
    pub provider_timeout_ms: Option<u64>,
    pub request_body: Value,
}

pub(crate) fn build_openai_adapter_invocation(
    endpoint: OpenAiAdapterEndpoint,
    parts: OpenAiAdapterInvocationParts,
    secret_resolver: Option<&ProviderSecretResolverRef>,
) -> DomainResult<AdapterInvocationRequest> {
    build_openai_adapter_invocation_with_shape(
        endpoint,
        parts,
        secret_resolver,
        AdapterInvocationShape::SyncJson,
        false,
    )
}

pub(crate) fn build_openai_adapter_invocation_with_shape(
    endpoint: OpenAiAdapterEndpoint,
    parts: OpenAiAdapterInvocationParts,
    secret_resolver: Option<&ProviderSecretResolverRef>,
    shape: AdapterInvocationShape,
    stream: bool,
) -> DomainResult<AdapterInvocationRequest> {
    let auth_profile = provider_auth_profile_json(&parts.provider_auth_profile);
    let secret = adapter_secret(
        parts.provider_secret_ref,
        &parts.provider_auth_profile,
        secret_resolver,
    )?;

    Ok(AdapterInvocationRequest {
        invocation: AdapterInvocationMetadata {
            id: format!(
                "{}-{}-{}-{}",
                endpoint.invocation_id_prefix,
                parts.api_key_id,
                parts.provider_code,
                parts.provider_channel_id
            ),
            endpoint_key: endpoint.endpoint_key.to_owned(),
            method: endpoint.method.to_owned(),
            standard_path: endpoint.standard_path.to_owned(),
            shape,
            stream,
            request_id: None,
            trace_id: None,
        },
        subject: AdapterSubject {
            tenant_id: parts.tenant_id,
            organization_id: parts.organization_id,
            user_id: parts.user_id,
            api_key_id: parts.api_key_id,
            group_id: parts.group_id,
            group_code: parts.group_code,
            pricing_plan_code: parts.pricing_plan_code,
        },
        provider: AdapterProviderContext {
            provider_code: parts.provider_code,
            channel_id: parts.provider_channel_id,
            region_code: normalized_adapter_provider_region_code(&parts.provider_region_code),
            provider_model: parts.provider_model,
            base_url: parts.provider_base_url,
            auth_profile,
            timeout_ms: parts.provider_timeout_ms,
        },
        secret,
        body: parts.request_body,
    })
}

fn normalized_adapter_provider_region_code(region_code: &str) -> String {
    let region_code = region_code.trim();
    if region_code.is_empty() {
        "global".to_owned()
    } else {
        region_code.to_owned()
    }
}

pub(crate) fn adapter_http_error(error: ProviderAdapterHttpError) -> DomainError {
    let status = error
        .status_code
        .map(|status_code| format!(" HTTP {status_code}"))
        .unwrap_or_default();
    DomainError::new(format!(
        "provider adapter invocation failed{status}: {}",
        error.message
    ))
}

fn adapter_secret(
    secret_ref: Option<String>,
    profile: &ProviderAuthProfile,
    secret_resolver: Option<&ProviderSecretResolverRef>,
) -> DomainResult<AdapterSecret> {
    let Some(secret_ref) = secret_ref.filter(|secret_ref| !secret_ref.trim().is_empty()) else {
        return Ok(AdapterSecret::None);
    };
    let Some(secret_resolver) = secret_resolver else {
        return Err(DomainError::new(
            "provider secret resolver is required for provider adapter invocation",
        ));
    };
    let secret_value = secret_resolver.resolve_secret_value(&secret_ref)?;
    Ok(AdapterSecret::GatewayResolved(provider_secret_json(
        profile,
        secret_value,
    )?))
}

fn provider_auth_profile_json(profile: &ProviderAuthProfile) -> Value {
    let auth_type = provider_auth_type_code(profile.auth_type);
    json!({
        "type": auth_type,
        "name": profile.name,
        "defaultHeaders": provider_default_headers_json(profile),
    })
}

fn provider_secret_json(
    profile: &ProviderAuthProfile,
    secret_value: String,
) -> DomainResult<Value> {
    let auth_type = provider_auth_type_code(profile.auth_type);
    let auth_name = match profile.auth_type {
        ProviderAuthType::Bearer => None,
        ProviderAuthType::Header | ProviderAuthType::Query => Some(
            profile
                .name
                .clone()
                .ok_or_else(|| DomainError::new("provider account auth name is required"))?,
        ),
    };
    Ok(json!({
        "auth": {
            "type": auth_type,
            "name": auth_name,
            "value": secret_value,
        },
        "defaultHeaders": provider_default_headers_json(profile),
    }))
}

fn provider_auth_type_code(auth_type: ProviderAuthType) -> &'static str {
    match auth_type {
        ProviderAuthType::Bearer => "bearer",
        ProviderAuthType::Header => "header",
        ProviderAuthType::Query => "query",
    }
}

fn provider_default_headers_json(profile: &ProviderAuthProfile) -> Vec<Value> {
    profile
        .default_headers
        .iter()
        .map(|header| {
            json!({
                "name": header.name,
                "value": header.value,
            })
        })
        .collect::<Vec<_>>()
}
