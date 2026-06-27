use axum::http::{header, HeaderMap, HeaderName, HeaderValue};
use sdkwork_claw_provider_adapter_contract::AdapterInvocationShape;
use serde_json::{json, Value};

use super::multipart_form::{request_content_type_is_multipart_form, rewrite_multipart_model};
use super::{
    DispatchMode, Invocation, InvocationAccount, InvocationBody, InvocationError,
    InvocationErrorKind, InvocationProviderRequest, ResolvedProviderSecret,
};
use crate::domain::{ProviderAuthProfile, ProviderAuthType};

#[derive(Debug, Clone, Default)]
pub(super) struct ProviderRequestBuilder;

impl ProviderRequestBuilder {
    pub(super) fn build(
        &self,
        invocation: &Invocation,
        account: &InvocationAccount,
        resolved_secret: Option<&ResolvedProviderSecret>,
    ) -> Result<InvocationProviderRequest, InvocationError> {
        if invocation.dispatch.mode == DispatchMode::InternalProviderAdapter {
            return build_adapter_provider_request(invocation, account, resolved_secret);
        }

        let mut headers = sanitized_inbound_headers(&invocation.request.headers);
        apply_default_headers(&mut headers, &account.auth_profile)?;
        let mut query = rewrite_query_model(
            sanitized_inbound_query(invocation.request.query.clone()),
            account.provider_model.as_deref(),
        );
        apply_auth(
            &mut headers,
            &mut query,
            &account.auth_profile,
            resolved_secret.map(|secret| secret.value.as_str()),
        )?;
        let body = rewrite_body_model(
            invocation.request.body.clone(),
            &invocation.request.headers,
            account.provider_model.as_deref(),
        )?;
        Ok(InvocationProviderRequest {
            method: invocation.request.method.clone(),
            url: provider_url(
                account.base_url.as_deref(),
                &invocation.request.path,
                query.as_deref(),
            ),
            path: invocation.request.path.clone(),
            query,
            headers,
            body,
        })
    }
}

fn build_adapter_provider_request(
    invocation: &Invocation,
    account: &InvocationAccount,
    resolved_secret: Option<&ResolvedProviderSecret>,
) -> Result<InvocationProviderRequest, InvocationError> {
    let target = invocation
        .dispatch
        .adapter_target
        .as_ref()
        .ok_or_else(|| provider_request_error("adapter dispatch requires adapter target"))?;
    let standard_path = target.standard_path.as_str();
    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    if let Some(token) = target
        .gateway_token
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        let value = HeaderValue::from_str(&format!("Bearer {token}")).map_err(|error| {
            provider_request_error(format!("invalid adapter gateway token: {error}"))
        })?;
        headers.insert(header::AUTHORIZATION, value);
    }
    let path = adapter_path(&target.path_template, &target.provider_code, standard_path);
    Ok(InvocationProviderRequest {
        method: axum::http::Method::POST,
        url: provider_url(Some(&target.base_url), &path, None),
        path,
        query: None,
        headers,
        body: build_adapter_body(invocation, account, resolved_secret, standard_path)?,
    })
}

fn sanitized_inbound_headers(headers: &HeaderMap) -> HeaderMap {
    headers
        .iter()
        .filter(|(name, _)| should_preserve_inbound_header(name))
        .map(|(name, value)| (name.clone(), value.clone()))
        .collect()
}

fn should_preserve_inbound_header(name: &HeaderName) -> bool {
    !matches!(
        name.as_str(),
        "authorization"
            | "proxy-authorization"
            | "x-api-key"
            | "x-goog-api-key"
            | "api-key"
            | "access-token"
    )
}

fn sanitized_inbound_query(query: Option<String>) -> Option<String> {
    let query = query?;
    let preserved = query
        .split('&')
        .filter(|part| {
            part.split_once('=')
                .map(|(name, _)| should_preserve_query_param(name))
                .unwrap_or_else(|| should_preserve_query_param(part))
        })
        .filter(|part| !part.trim().is_empty())
        .collect::<Vec<_>>();
    if preserved.is_empty() {
        None
    } else {
        Some(preserved.join("&"))
    }
}

fn should_preserve_query_param(name: &str) -> bool {
    !matches!(
        decoded_query_component(name)
            .trim()
            .to_ascii_lowercase()
            .as_str(),
        "api_key" | "apikey" | "key" | "access_token" | "token"
    )
}

fn apply_default_headers(
    headers: &mut HeaderMap,
    profile: &ProviderAuthProfile,
) -> Result<(), InvocationError> {
    for header in &profile.default_headers {
        let name = HeaderName::from_bytes(header.name.as_bytes()).map_err(|error| {
            provider_request_error(format!("invalid provider header name: {error}"))
        })?;
        let value = HeaderValue::from_str(&header.value).map_err(|error| {
            provider_request_error(format!("invalid provider header value: {error}"))
        })?;
        headers.insert(name, value);
    }
    Ok(())
}

fn apply_auth(
    headers: &mut HeaderMap,
    query: &mut Option<String>,
    profile: &ProviderAuthProfile,
    secret: Option<&str>,
) -> Result<(), InvocationError> {
    let Some(secret) = secret.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(());
    };
    match profile.auth_type {
        ProviderAuthType::Bearer => {
            let value = HeaderValue::from_str(&format!("Bearer {secret}")).map_err(|error| {
                provider_request_error(format!("invalid bearer auth value: {error}"))
            })?;
            headers.insert(axum::http::header::AUTHORIZATION, value);
        }
        ProviderAuthType::Header => {
            let name = profile
                .name
                .as_deref()
                .ok_or_else(|| provider_request_error("header auth requires auth name"))?;
            let name = HeaderName::from_bytes(name.as_bytes()).map_err(|error| {
                provider_request_error(format!("invalid auth header name: {error}"))
            })?;
            let value = HeaderValue::from_str(secret).map_err(|error| {
                provider_request_error(format!("invalid auth header value: {error}"))
            })?;
            headers.insert(name, value);
        }
        ProviderAuthType::Query => {
            let name = profile
                .name
                .as_deref()
                .ok_or_else(|| provider_request_error("query auth requires auth name"))?;
            append_query_pair(query, name, secret);
        }
    }
    Ok(())
}

fn rewrite_body_model(
    body: InvocationBody,
    headers: &HeaderMap,
    provider_model: Option<&str>,
) -> Result<InvocationBody, InvocationError> {
    let Some(provider_model) = provider_model
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return Ok(body);
    };
    if request_content_type_is_multipart_form(headers) {
        let InvocationBody::Bytes(bytes) = body else {
            return Ok(body);
        };
        return rewrite_multipart_model(headers, &bytes, provider_model).map(InvocationBody::Bytes);
    }
    Ok(rewrite_json_body_model(body, provider_model))
}

fn rewrite_json_body_model(body: InvocationBody, provider_model: &str) -> InvocationBody {
    match body {
        InvocationBody::Json(mut value) => {
            if let Some(object) = value.as_object_mut() {
                if object.contains_key("model") {
                    object.insert("model".to_owned(), Value::String(provider_model.to_owned()));
                }
            }
            InvocationBody::Json(value)
        }
        InvocationBody::Bytes(bytes) => match serde_json::from_slice::<Value>(&bytes) {
            Ok(mut value) if value.as_object().is_some_and(|o| o.contains_key("model")) => {
                if let Some(object) = value.as_object_mut() {
                    object.insert("model".to_owned(), Value::String(provider_model.to_owned()));
                }
                match serde_json::to_vec(&value) {
                    Ok(bytes) => InvocationBody::Bytes(bytes),
                    Err(_) => InvocationBody::Bytes(bytes),
                }
            }
            _ => InvocationBody::Bytes(bytes),
        },
        other => other,
    }
}

fn rewrite_query_model(query: Option<String>, provider_model: Option<&str>) -> Option<String> {
    let Some(provider_model) = provider_model
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return query;
    };
    query.map(|query| {
        query
            .split('&')
            .map(|part| {
                part.split_once('=')
                    .map(|(name, value)| {
                        if decoded_query_component(name) == "model" && !value.trim().is_empty() {
                            format!("model={}", percent_encode_query_component(provider_model))
                        } else {
                            part.to_owned()
                        }
                    })
                    .unwrap_or_else(|| part.to_owned())
            })
            .collect::<Vec<_>>()
            .join("&")
    })
}

fn append_query_pair(query: &mut Option<String>, name: &str, value: &str) {
    let pair = format!(
        "{}={}",
        percent_encode_query_component(name),
        percent_encode_query_component(value)
    );
    match query {
        Some(existing) if !existing.trim().is_empty() => {
            existing.push('&');
            existing.push_str(&pair);
        }
        _ => *query = Some(pair),
    }
}

fn percent_encode_query_component(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        if is_unreserved_query_byte(byte) {
            encoded.push(char::from(byte));
        } else {
            encoded.push('%');
            encoded.push_str(&format!("{byte:02X}"));
        }
    }
    encoded
}

fn is_unreserved_query_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~')
}

fn decoded_query_component(value: &str) -> String {
    let mut output = Vec::with_capacity(value.len());
    let bytes = value.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'+' => {
                output.push(b' ');
                index += 1;
            }
            b'%' if index + 2 < bytes.len() => {
                if let Ok(hex) = std::str::from_utf8(&bytes[index + 1..index + 3]) {
                    if let Ok(byte) = u8::from_str_radix(hex, 16) {
                        output.push(byte);
                        index += 3;
                        continue;
                    }
                }
                output.push(bytes[index]);
                index += 1;
            }
            byte => {
                output.push(byte);
                index += 1;
            }
        }
    }
    String::from_utf8(output).unwrap_or_else(|_| value.to_owned())
}

fn build_adapter_body(
    invocation: &Invocation,
    account: &InvocationAccount,
    resolved_secret: Option<&ResolvedProviderSecret>,
    standard_path: &str,
) -> Result<InvocationBody, InvocationError> {
    let body = match invocation.request.body.clone() {
        InvocationBody::Json(value) => value,
        InvocationBody::Empty => Value::Null,
        InvocationBody::Bytes(bytes) => json!({
            "encoding": "bytes",
            "length": bytes.len()
        }),
    };
    let secret = resolved_secret
        .map(|secret| {
            json!({
                "type": "gateway_resolved",
                "value": {
                    "auth": {
                        "type": auth_type_code(account.auth_profile.auth_type),
                        "name": account.auth_profile.name.as_deref(),
                        "value": secret.value.as_str()
                    },
                    "defaultHeaders": provider_default_headers_json(account)
                }
            })
        })
        .unwrap_or_else(|| json!({"type": "none"}));
    Ok(InvocationBody::Json(json!({
        "invocation": {
            "id": invocation.id.0.as_str(),
            "requestId": invocation.request.request_id.as_str(),
            "traceId": invocation.request.trace_id.as_deref(),
            "endpointKey": adapter_endpoint_key(invocation),
            "method": invocation.request.method.as_str(),
            "standardPath": standard_path,
            "shape": adapter_shape_code(
                invocation
                    .dispatch
                    .adapter_target
                    .as_ref()
                    .map(|target| target.adapter_invocation_shape.clone())
                    .unwrap_or_else(|| {
                        adapter_invocation_shape_from_dispatch_shape(
                            &invocation.dispatch.invocation_shape,
                        )
                    }),
            ),
            "stream": adapter_invocation_shape_streams(
                invocation
                    .dispatch
                    .adapter_target
                    .as_ref()
                    .map(|target| target.adapter_invocation_shape.clone())
                    .unwrap_or_else(|| {
                        adapter_invocation_shape_from_dispatch_shape(
                            &invocation.dispatch.invocation_shape,
                        )
                    }),
            )
        },
        "subject": {
            "tenantId": invocation.subject.tenant_id,
            "organizationId": invocation.subject.organization_id,
            "userId": invocation.subject.user_id,
            "apiKeyId": invocation.subject.api_key_id,
            "groupId": invocation.subject.channel_group_id,
            "groupCode": invocation.subject.channel_group_code.as_deref(),
            "pricingPlanCode": invocation.subject.pricing_plan_code.as_deref()
        },
        "provider": {
            "providerCode": account.provider_code.as_str(),
            "channelId": account.channel_id,
            "regionCode": account.region_code.as_str(),
            "providerModel": account.provider_model.as_deref().unwrap_or_default(),
            "baseUrl": account.base_url.as_deref(),
            "authProfile": provider_auth_profile_json(account),
            "timeoutMs": account.timeout_ms
        },
        "secret": secret,
        "body": body
    })))
}

fn provider_auth_profile_json(account: &InvocationAccount) -> Value {
    json!({
        "type": auth_type_code(account.auth_profile.auth_type),
        "name": account.auth_profile.name.as_deref(),
        "defaultHeaders": provider_default_headers_json(account)
    })
}

fn provider_default_headers_json(account: &InvocationAccount) -> Vec<Value> {
    account
        .auth_profile
        .default_headers
        .iter()
        .map(|header| {
            json!({
                "name": header.name.as_str(),
                "value": header.value.as_str()
            })
        })
        .collect::<Vec<_>>()
}

fn adapter_endpoint_key(invocation: &Invocation) -> Option<&str> {
    invocation
        .dispatch
        .adapter_target
        .as_ref()
        .map(|target| target.endpoint_key.as_str())
        .or(invocation.resource.endpoint_key.as_deref())
}

fn adapter_path(path_template: &str, provider_code: &str, standard_path: &str) -> String {
    let path = path_template
        .replace("{provider_code}", provider_code)
        .replace("{standard_path}", standard_path);
    if path.starts_with('/') {
        path
    } else {
        format!("/{path}")
    }
}

fn provider_url(base_url: Option<&str>, path: &str, query: Option<&str>) -> Option<String> {
    let base_url = base_url?.trim().trim_end_matches('/');
    if base_url.is_empty() {
        return None;
    }
    let mut url = format!("{base_url}/{}", path.trim_start_matches('/'));
    if let Some(query) = query.map(str::trim).filter(|value| !value.is_empty()) {
        url.push('?');
        url.push_str(query);
    }
    Some(url)
}

fn adapter_shape_code(shape: AdapterInvocationShape) -> &'static str {
    match shape {
        AdapterInvocationShape::SyncJson => "sync_json",
        AdapterInvocationShape::SseStream => "sse_stream",
        AdapterInvocationShape::ByteStream | AdapterInvocationShape::FileUpload => "byte_stream",
        AdapterInvocationShape::HealthProbe => "sync_json",
        AdapterInvocationShape::AsyncTaskStart => "async_task_start",
        AdapterInvocationShape::AsyncTaskQuery => "async_task_query",
        AdapterInvocationShape::AsyncTaskCancel => "async_task_cancel",
        AdapterInvocationShape::WebhookCallback => "webhook_callback",
    }
}

fn adapter_invocation_shape_from_dispatch_shape(
    shape: &super::InvocationShape,
) -> AdapterInvocationShape {
    match shape {
        super::InvocationShape::Json => AdapterInvocationShape::SyncJson,
        super::InvocationShape::SseStream => AdapterInvocationShape::SseStream,
        super::InvocationShape::ByteStream => AdapterInvocationShape::ByteStream,
        super::InvocationShape::Empty => AdapterInvocationShape::HealthProbe,
    }
}

fn adapter_invocation_shape_streams(shape: AdapterInvocationShape) -> bool {
    matches!(
        shape,
        AdapterInvocationShape::SseStream
            | AdapterInvocationShape::ByteStream
            | AdapterInvocationShape::FileUpload
    )
}

fn auth_type_code(auth_type: ProviderAuthType) -> &'static str {
    match auth_type {
        ProviderAuthType::Bearer => "bearer",
        ProviderAuthType::Header => "header",
        ProviderAuthType::Query => "query",
    }
}

fn provider_request_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Dispatch, message)
}
