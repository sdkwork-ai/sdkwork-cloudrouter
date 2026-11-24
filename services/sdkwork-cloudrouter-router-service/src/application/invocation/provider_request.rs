use axum::http::{header, HeaderMap, HeaderName, HeaderValue};
use sdkwork_cloudrouter_http::{sanitize_sensitive_query, upsert_query_parameter};
use sdkwork_cloudrouter_provider_adapter_contract::AdapterInvocationShape;
use serde_json::{json, Value};

use super::model_fields::{rewrite_json_model_fields, rewrite_query_model_fields};
use super::multipart_form::{request_content_type_is_multipart_form, rewrite_multipart_model};
use super::{
    DispatchMode, Invocation, InvocationAccount, InvocationBody, InvocationError,
    InvocationErrorKind, InvocationProviderRequest, InvocationSurface, ResolvedProviderSecret,
};
use crate::domain::{
    decode_model_path_segment, encode_model_path_segment, ProviderAuthProfile, ProviderAuthType,
};

#[derive(Debug, Clone, Default)]
pub(super) struct ProviderRequestBuilder;

impl ProviderRequestBuilder {
    pub(super) fn build(
        &self,
        invocation: &Invocation,
        account: &InvocationAccount,
        supplier_type: Option<&str>,
        resolved_secret: Option<&ResolvedProviderSecret>,
    ) -> Result<InvocationProviderRequest, InvocationError> {
        // Reject path segments that could traverse the upstream base URL
        // (e.g. `/v1/chat/completions/../../x`). Axum keeps the raw path, so a
        // dot-dot segment would otherwise be forwarded verbatim and could be
        // normalized by the upstream gateway into a different endpoint.
        if path_has_parent_segment(&invocation.request.path) {
            return Err(provider_request_error(format!(
                "request path must not contain parent directory segments: {}",
                invocation.request.path
            )));
        }
        if invocation.dispatch.mode == DispatchMode::InternalProviderAdapter {
            return build_adapter_provider_request(invocation, account, resolved_secret);
        }

        let mut headers = sanitized_inbound_headers(&invocation.request.headers);
        apply_default_headers(&mut headers, &account.auth_profile)?;
        // One chokepoint for every provider-facing surface (chat, responses,
        // embeddings, image, video, audio, music, and the vendor-native
        // passthrough routes): the model written into the query, body, and path
        // is the catalog-native id, never a request dialect spelling
        // (`vendor:model`, `vendor|model`, full width, or `vendor/region/model`).
        // A relay supplier is the exception: it addresses models by the
        // fully-qualified catalog key, so its route keeps the vendor head. The
        // decision is shared with the OpenAI-compatible relay runtime
        // (`domain::resolve_provider_model_id`); this layer never
        // re-derives it.
        //
        // On provider-native surfaces `requested_model_catalog_key` is a
        // synthetic `supplier/model` key, not a catalog key. Using it to
        // upgrade a relay's bare model would ask the relay for
        // `openrouter/gpt-4o`; model routes have already resolved the relay's
        // qualified id by the time they reach this builder, so the catalog key
        // is only consulted for official-vendor stripping.
        let relay_supplier =
            supplier_type.is_some_and(|kind| kind.trim().eq_ignore_ascii_case("relay"));
        let provider_model = normalized_provider_model(
            account.provider_model.as_deref(),
            supplier_type,
            (!relay_supplier)
                .then(|| invocation.resource.requested_model_catalog_key.as_deref())
                .flatten(),
            invocation.resource.requested_model.as_deref(),
        );
        let provider_model = provider_model.as_deref();
        let mut query = rewrite_query_model_fields(
            sanitize_sensitive_query(invocation.request.query.as_deref()),
            provider_model.unwrap_or_default(),
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
            provider_model,
        )?;
        let body = ensure_stream_usage_requested(
            &invocation.resource.surface,
            &invocation.resource.api_code,
            body,
        );
        let path = rewrite_path_model(&invocation.request.path, provider_model);
        let url = provider_url(account.base_url.as_deref(), &path, query.as_deref());
        if let Some(url) = url.as_deref() {
            if upstream_targets_this_gateway(&invocation.request.headers, url) {
                return Err(InvocationError::new(
                    InvocationErrorKind::Routing,
                    format!(
                        "upstream base URL for account {} points at the gateway serving this \
                         request; refusing a routing loop that would re-enter this instance",
                        account.account_id
                    ),
                ));
            }
        }
        Ok(InvocationProviderRequest {
            method: invocation.request.method.clone(),
            url,
            path,
            query,
            headers,
            body,
        })
    }
}

/// Whether a provider target resolves to the very host that is serving the
/// current request.
///
/// A relay supplier may legitimately be another SDKWork deployment, but a route
/// whose host equals the inbound `Host` or `x-forwarded-host` re-enters this
/// same gateway: the provider call would loop back into the invocation
/// pipeline, amplifying load and double-counting usage. The seeded relay
/// suppliers (`birdcoder-global`, `sdkwork-global`, …) point at these very
/// public hosts, so enabling one without this guard turns a misconfiguration
/// into unbounded recursion.
///
/// Comparison is host-only: scheme, port, path, casing, and a trailing dot are
/// ignored, and a multi-value `x-forwarded-host` list is checked per entry.
fn upstream_targets_this_gateway(inbound: &HeaderMap, provider_url: &str) -> bool {
    let Ok(parsed) = url::Url::parse(provider_url) else {
        return false;
    };
    let Some(upstream_host) = parsed.host_str() else {
        return false;
    };
    let upstream_host = normalize_host(upstream_host);
    if upstream_host.is_empty() {
        return false;
    }
    [header::HOST.as_str(), "x-forwarded-host"]
        .into_iter()
        .filter_map(|name| inbound.get(name).and_then(|value| value.to_str().ok()))
        .flat_map(|value| value.split(','))
        .any(|candidate| normalize_host(candidate) == upstream_host)
}

fn normalize_host(value: &str) -> String {
    let value = value.trim().trim_end_matches('.');
    // Tolerate an accidental scheme on a configured host (`https://api.example`).
    let value = value
        .split_once("://")
        .map(|(_, rest)| rest)
        .unwrap_or(value);
    let value = value.split(['/', '?', '#']).next().unwrap_or(value);
    // Strip the port; IPv6 literals keep their brackets.
    if value.starts_with('[') {
        let end = value.find(']').map(|index| index + 1).unwrap_or(value.len());
        return value[..end].to_ascii_lowercase();
    }
    value
        .rsplit_once(':')
        .filter(|(_, port)| port.chars().all(|character| character.is_ascii_digit()))
        .map(|(host, _)| host)
        .unwrap_or(value)
        .to_ascii_lowercase()
}

/// The provider-facing model id for a route.
///
/// Delegates to the single shared resolver: an official vendor receives the
/// catalog-native spelling (`provider_native_model_id`), while a relay keeps
/// the fully-qualified `vendor/model` head it addresses models by. See
/// [`crate::domain::resolve_provider_model_id`].
fn normalized_provider_model(
    provider_model: Option<&str>,
    supplier_type: Option<&str>,
    catalog_key: Option<&str>,
    requested_model: Option<&str>,
) -> Option<String> {
    crate::domain::resolve_provider_model_id(
        supplier_type,
        catalog_key,
        requested_model,
        provider_model,
    )
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
    let standard_path = rewrite_path_model(standard_path, account.provider_model.as_deref());
    let path = adapter_path(&target.path_template, &target.supplier_code, &standard_path);
    Ok(InvocationProviderRequest {
        method: axum::http::Method::POST,
        url: provider_url(Some(&target.base_url), &path, None),
        path,
        query: None,
        headers,
        body: build_adapter_body(invocation, account, resolved_secret, &standard_path)?,
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
            rewrite_json_model_fields(&mut value, provider_model);
            InvocationBody::Json(value)
        }
        InvocationBody::Bytes(bytes) => match serde_json::from_slice::<Value>(&bytes) {
            Ok(mut value) => {
                if rewrite_json_model_fields(&mut value, provider_model) {
                    match serde_json::to_vec(&value) {
                        Ok(rewritten) => InvocationBody::Bytes(rewritten),
                        Err(_) => InvocationBody::Bytes(bytes),
                    }
                } else {
                    InvocationBody::Bytes(bytes)
                }
            }
            Err(_) => InvocationBody::Bytes(bytes),
        },
        other => other,
    }
}

fn rewrite_path_model(path: &str, provider_model: Option<&str>) -> String {
    let Some(provider_model) = provider_model
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return path.to_owned();
    };
    rewrite_models_action_path(path, provider_model).unwrap_or_else(|| path.to_owned())
}

/// Rewrites `{prefix}models/{model}:{action}` so Gemini-style native calls use
/// the account-mapped provider model. The Google media surfaces publish their
/// images/videos under `/google/v1beta/models/{model}:generateImages` (and
/// `:generateVideos`), so that prefix must be recognized too — otherwise the
/// caller's model id reaches the vendor verbatim on the main image/video path.
fn rewrite_models_action_path(path: &str, provider_model: &str) -> Option<String> {
    let (prefix, rest) = ["/v1beta/models/", "/v1/models/", "/google/v1beta/models/"]
        .into_iter()
        .find_map(|prefix| path.strip_prefix(prefix).map(|rest| (prefix, rest)))?;
    // The action suffix follows the last `:` so a dialect model id in the path
    // (`models/google:veo-3.0:generateVideos`) is still replaced wholesale.
    let (model, action) = rest.rsplit_once(':')?;
    let model = decode_model_path_segment(model);
    if model.trim().is_empty() || action.trim().is_empty() || model.trim() == provider_model {
        return None;
    }
    // A relay model is fully-qualified (`vendor/model`), but the path segment
    // must stay one segment: encode the separator instead of letting it become
    // a second path component.
    Some(format!(
        "{prefix}{}:{action}",
        encode_model_path_segment(provider_model)
    ))
}

fn append_query_pair(query: &mut Option<String>, name: &str, value: &str) {
    *query = Some(upsert_query_parameter(query.as_deref(), name, value));
}

fn build_adapter_body(
    invocation: &Invocation,
    account: &InvocationAccount,
    resolved_secret: Option<&ResolvedProviderSecret>,
    standard_path: &str,
) -> Result<InvocationBody, InvocationError> {
    let mut body = match invocation.request.body.clone() {
        InvocationBody::Json(value) => value,
        InvocationBody::Empty => Value::Null,
        InvocationBody::Bytes(bytes) => json!({
            "encoding": "bytes",
            "length": bytes.len()
        }),
    };
    // The adapter receives the resolved provider model in
    // `provider.providerModel`; keep the forwarded body's model fields in sync
    // so an adapter that forwards the body cannot reintroduce the client's
    // `vendor/model` spelling.
    if let Some(provider_model) = account
        .provider_model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        rewrite_json_model_fields(&mut body, provider_model);
    }
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
            "groupId": invocation.subject.account_group_id,
            "groupCode": invocation.subject.account_group_code.as_deref(),
            "pricingPlanCode": invocation.subject.pricing_plan_code.as_deref()
        },
        "provider": {
            "providerCode": account.supplier_code.as_str(),
            "channelId": account.account_id,
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

fn adapter_path(path_template: &str, supplier_code: &str, standard_path: &str) -> String {
    let path = path_template
        .replace("{supplier_code}", supplier_code)
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
    let path = join_provider_path(base_url, path);
    let mut url = format!("{base_url}{path}");
    if let Some(query) = query.map(str::trim).filter(|value| !value.is_empty()) {
        url.push('?');
        url.push_str(query);
    }
    Some(url)
}

/// Joins an account base URL with the inbound API path without duplicating a
/// trailing `/v1` prefix. Dedicated OpenAI relays already strip `/v1` when the
/// base URL ends with `/v1`; the invocation pipeline must do the same so
/// `https://api.example/v1` + `/v1/chat/completions` becomes
/// `https://api.example/v1/chat/completions`.
fn join_provider_path(base_url: &str, path: &str) -> String {
    let path = if path.starts_with('/') {
        path.to_owned()
    } else {
        format!("/{path}")
    };
    sdkwork_cloudrouter_http::upstream_path_without_version_duplication(
        url_path(base_url),
        path.as_str(),
    )
    .to_owned()
}

fn url_path(base_url: &str) -> &str {
    let without_scheme = base_url
        .split_once("://")
        .map(|(_, rest)| rest)
        .unwrap_or(base_url);
    match without_scheme.find('/') {
        Some(index) => &without_scheme[index..],
        None => "",
    }
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

/// Rejects a request path that resolves to a parent-directory segment.
///
/// The comparison runs on the **percent-decoded** path, not the raw one: the
/// upstream edge decodes the octets and normalises the result before routing,
/// so `/%2e%2e/x` reaches the same endpoint as `/../x` while only the raw form
/// is visible here. Decoding first also makes an encoded separator
/// (`..%2f..`) count as the two parent segments the upstream will see.
///
/// `decode_model_path_segment` is the shared percent-decoder already used for
/// encoded model ids in this builder; a path segment and an opaque id are both
/// `%`-encoded URL path text, so the decoding rule is the same one.
fn path_has_parent_segment(path: &str) -> bool {
    decode_model_path_segment(path)
        .trim_matches('/')
        .split('/')
        .any(|segment| segment == "..")
}

/// 为流式 Chat Completions 强制打开 `stream_options.include_usage`。
///
/// OpenAI 在未显式要求时**不回流式 usage**；流结束后网关只看到文本，EOF 兜底
/// 只能按文本估算输出、输入恒为 0 ⇒ 输入 token 免单（客户端可控的计费绕过）。
/// 这里覆盖客户端显式的 `false`，同时保留其他 `stream_options` 键。
///
/// 只对 OpenAI 兼容面的 `openai.chat_completions` 生效：Anthropic / Gemini 的
/// 流式用量在各自协议里默认就有，塞入 `stream_options` 会被上游拒绝。上游随后
/// 多发的 usage-only chunk 是 OpenAI 规范行为（`choices: []`），SDK 会忽略。
fn ensure_stream_usage_requested(
    surface: &InvocationSurface,
    api_code: &str,
    body: InvocationBody,
) -> InvocationBody {
    if *surface != InvocationSurface::OpenAiCompatible || api_code != "openai.chat_completions" {
        return body;
    }
    match body {
        InvocationBody::Json(mut value) => {
            if value.get("stream").and_then(Value::as_bool) != Some(true) {
                return InvocationBody::Json(value);
            }
            force_include_usage(&mut value);
            InvocationBody::Json(value)
        }
        InvocationBody::Bytes(bytes) => {
            let Ok(mut value) = serde_json::from_slice::<Value>(&bytes) else {
                return InvocationBody::Bytes(bytes);
            };
            if value.get("stream").and_then(Value::as_bool) != Some(true) {
                return InvocationBody::Bytes(bytes);
            }
            force_include_usage(&mut value);
            match serde_json::to_vec(&value) {
                Ok(encoded) => InvocationBody::Bytes(encoded),
                Err(_) => InvocationBody::Bytes(bytes),
            }
        }
        other => other,
    }
}

fn force_include_usage(value: &mut Value) {
    let Some(object) = value.as_object_mut() else {
        return;
    };
    let stream_options = object
        .entry("stream_options".to_owned())
        .or_insert_with(|| Value::Object(serde_json::Map::new()));
    if !stream_options.is_object() {
        *stream_options = Value::Object(serde_json::Map::new());
    }
    if let Some(options) = stream_options.as_object_mut() {
        options.insert("include_usage".to_owned(), Value::Bool(true));
    }
}

#[cfg(test)]
mod tests {
    use super::ensure_stream_usage_requested;
    use crate::application::invocation::InvocationBody;
    use crate::application::InvocationSurface;
    use serde_json::json;

    fn streaming_chat(value: serde_json::Value) -> InvocationBody {
        ensure_stream_usage_requested(
            &InvocationSurface::OpenAiCompatible,
            "openai.chat_completions",
            InvocationBody::Json(value),
        )
    }

    fn body_json(body: InvocationBody) -> serde_json::Value {
        match body {
            InvocationBody::Json(value) => value,
            other => panic!("expected JSON body, got {other:?}"),
        }
    }

    #[test]
    fn streaming_chat_forces_include_usage_and_keeps_other_options() {
        let body = body_json(streaming_chat(json!({
            "model": "gpt-5",
            "stream": true,
            "stream_options": {"other": 1}
        })));
        assert_eq!(true, body["stream_options"]["include_usage"]);
        assert_eq!(1, body["stream_options"]["other"]);
    }

    #[test]
    fn a_client_supplied_false_is_overridden() {
        let body = body_json(streaming_chat(json!({
            "model": "gpt-5",
            "stream": true,
            "stream_options": {"include_usage": false}
        })));
        assert_eq!(
            true, body["stream_options"]["include_usage"],
            "client-controlled false must not disable billing usage"
        );
    }

    #[test]
    fn non_streaming_chat_is_untouched() {
        let body = body_json(streaming_chat(json!({
            "model": "gpt-5",
            "messages": []
        })));
        assert!(body.get("stream_options").is_none());
    }

    /// 上游请求路径的父段守卫必须按**解码后**的段判断：上游边缘会先解码、再
    /// 归一化路径，`%2e%2e` 与 `..` 落在同一个端点上；只比对原始文本等于把
    /// 编码形式放行到上游（请求还带着网关注入的供应商凭据）。
    #[test]
    fn parent_segment_guard_sees_percent_encoded_traversal() {
        for blocked in [
            "/v1/chat/completions/../admin",
            "/v1/chat/completions/%2e%2e/admin",
            "/v1/chat/completions/%2E%2E/admin",
            "/v1/chat/completions/.%2e/admin",
            "/v1/chat/completions/%2e./admin",
            "/v1/chat/completions/..%2f..%2fadmin",
            "/volcengine/api/v3/%2e%2e/secrets",
            "..",
            "/..",
            "/%2e%2e",
        ] {
            assert!(
                super::path_has_parent_segment(blocked),
                "must reject traversal: {blocked}"
            );
        }
        // 「看起来像」但不是父段引用的路径不能被守卫误伤：编码过的模型 id、
        // 名字里带两个点的对象，以及以点开头的合法段都要继续放行。
        for allowed in [
            "/v1/chat/completions",
            "/v1/models/openai%2Fgpt-4o-mini/groups",
            "/v1/files/file-%2e%2e-report",
            "/v1/chat/completions/a..b",
            "/v1beta/models/gemini-2.5-pro:generateContent",
            "/v1/chat/completions/...",
        ] {
            assert!(
                !super::path_has_parent_segment(allowed),
                "must allow: {allowed}"
            );
        }
    }

    #[test]
    fn provider_model_normalization_covers_every_separator_spelling() {
        for dialect in [
            "deepseek|deepseek-flash",
            "deepseek:deepseek-flash",
            "deepseek：deepseek-flash",
            "deepseek|cn|deepseek-flash",
            "deepseek/deepseek-flash",
            "deepseek-flash",
        ] {
            assert_eq!(
                Some("deepseek-flash".to_owned()),
                super::normalized_provider_model(
                    Some(dialect),
                    None,
                    Some("deepseek/deepseek-flash"),
                    Some("deepseek-flash"),
                ),
                "provider model: {dialect}"
            );
        }
        assert_eq!(
            None,
            super::normalized_provider_model(None, None, None, None)
        );
    }

    /// A relay is a different vendor reselling the catalog: it addresses models
    /// by the fully-qualified `vendor/model` key, so the vendor head must
    /// survive while dialect separators are canonicalized. A route that only
    /// carries the vendor-native id is upgraded to the qualified catalog key.
    #[test]
    fn relay_suppliers_keep_the_qualified_catalog_key() {
        for dialect in [
            "deepseek/deepseek-flash",
            "deepseek:deepseek-flash",
            "deepseek|deepseek-flash",
        ] {
            assert_eq!(
                Some("deepseek/deepseek-flash".to_owned()),
                super::normalized_provider_model(
                    Some(dialect),
                    Some("relay"),
                    Some("deepseek/deepseek-flash"),
                    Some("deepseek/deepseek-flash"),
                ),
                "relay provider model: {dialect}"
            );
        }
        // A native id is upgraded to the fully-qualified catalog key: a relay
        // cannot resolve the bare vendor-native id.
        assert_eq!(
            Some("deepseek/deepseek-flash".to_owned()),
            super::normalized_provider_model(
                Some("deepseek-flash"),
                Some("relay"),
                Some("deepseek/deepseek-flash"),
                Some("deepseek-flash"),
            )
        );
        // Case-insensitive supplier type from the snapshot.
        assert_eq!(
            Some("deepseek/deepseek-flash".to_owned()),
            super::normalized_provider_model(
                Some("deepseek/deepseek-flash"),
                Some("RELAY"),
                Some("deepseek/deepseek-flash"),
                Some("deepseek/deepseek-flash"),
            )
        );
    }

    #[test]
    fn media_action_paths_are_rewritten_to_the_native_model() {
        // Image/video generation dials `models/{model}:generateImages` /
        // `:generateVideos`; a dialect model in the caller's path is replaced by
        // the route's native model, never forwarded verbatim.
        assert_eq!(
            "/google/v1beta/models/gemini-2.5-flash-image:generateImages",
            super::rewrite_path_model(
                "/google/v1beta/models/google|gemini-2.5-flash-image:generateImages",
                Some("gemini-2.5-flash-image"),
            )
        );
        assert_eq!(
            "/google/v1beta/models/veo-3.0:generateVideos",
            super::rewrite_path_model(
                "/google/v1beta/models/google:veo-3.0:generateVideos",
                Some("veo-3.0"),
            )
        );
    }

    #[test]
    fn media_action_paths_encode_qualified_relay_models() {
        // A relay model is fully-qualified, but it must stay one path segment.
        assert_eq!(
            "/v1beta/models/anthropic%2Fclaude-opus-4-5:generateContent",
            super::rewrite_path_model(
                "/v1beta/models/claude-opus-4-5:generateContent",
                Some("anthropic/claude-opus-4-5"),
            )
        );
        // An inbound percent-encoded id is decoded for comparison and replaced
        // with the resolved native id.
        assert_eq!(
            "/v1beta/models/gemini-2.5-flash-image:generateImages",
            super::rewrite_path_model(
                "/v1beta/models/google%2Fgemini-2.5-flash-image:generateImages",
                Some("gemini-2.5-flash-image"),
            )
        );
    }

    #[test]
    fn json_body_model_rewrites_every_vendor_native_field() {
        let body = body_json(super::rewrite_json_body_model(
            InvocationBody::Json(json!({
                "model": "openai/gpt-image-2",
                "model_name": "openai/gpt-image-2",
                "model_id": "openai/gpt-image-2",
                "prompt": "keep",
            })),
            "gpt-image-2",
        ));
        assert_eq!("gpt-image-2", body["model"]);
        assert_eq!("gpt-image-2", body["model_name"]);
        assert_eq!("gpt-image-2", body["model_id"]);
        assert_eq!("keep", body["prompt"]);
    }

    #[test]
    fn provider_native_streaming_is_untouched() {
        let body = ensure_stream_usage_requested(
            &InvocationSurface::ProviderNative,
            "anthropic.messages",
            InvocationBody::Json(json!({"stream": true, "messages": []})),
        );
        let body = body_json(body);
        assert!(
            body.get("stream_options").is_none(),
            "vendor-native protocols carry their own usage shape"
        );
    }

    /// A relay supplier that points at the public host serving the request would
    /// re-enter this gateway. The guard compares hosts only, so scheme, port,
    /// casing, path, and a forwarded-host list must not defeat it.
    #[test]
    fn upstream_targeting_the_serving_gateway_is_detected() {
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            axum::http::header::HOST,
            axum::http::HeaderValue::from_static("api.birdcoder.com"),
        );
        assert!(super::upstream_targets_this_gateway(
            &headers,
            "https://api.birdcoder.com/v1/chat/completions"
        ));
        assert!(super::upstream_targets_this_gateway(
            &headers,
            "https://API.BirdCoder.com.:8443/v1/chat/completions"
        ));

        headers.insert(
            "x-forwarded-host",
            axum::http::HeaderValue::from_static("edge.example.com, api.birdcoder.com"),
        );
        assert!(super::upstream_targets_this_gateway(
            &headers,
            "https://api.birdcoder.com/v1"
        ));
    }

    #[test]
    fn unrelated_upstream_hosts_are_not_rejected() {
        let mut headers = axum::http::HeaderMap::new();
        headers.insert(
            axum::http::header::HOST,
            axum::http::HeaderValue::from_static("api.birdcoder.com"),
        );
        assert!(!super::upstream_targets_this_gateway(
            &headers,
            "https://api.deepseek.com/v1/chat/completions"
        ));
        // A host that merely shares a suffix is a different host.
        assert!(!super::upstream_targets_this_gateway(
            &headers,
            "https://relay-api.birdcoder.com/v1"
        ));
    }

    #[test]
    fn rewriting_model_preserves_large_integers_and_decimal_precision() {
        let body = br#"{"model":"alias","seed":9007199254740993,"temperature":0.12345678901234567890123456789}"#;
        let rewritten = super::rewrite_json_body_model(
            InvocationBody::Bytes(body.to_vec()),
            "provider-model",
        );
        let InvocationBody::Bytes(rewritten) = rewritten else {
            panic!("rewritten JSON must remain bytes");
        };
        let rewritten = String::from_utf8(rewritten).expect("valid JSON bytes");
        assert!(rewritten.contains("\"seed\":9007199254740993"));
        assert!(rewritten.contains("0.12345678901234567890123456789"));
        let parsed: serde_json::Value =
            serde_json::from_str(&rewritten).expect("rewritten JSON");
        assert_eq!("provider-model", parsed["model"]);
    }
}
