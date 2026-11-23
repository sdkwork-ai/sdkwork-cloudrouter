use axum::http::Method;
use serde_json::Value;
use sha2::{Digest, Sha256};

use super::model_fields::model_query_value;
use super::multipart_form::{
    optional_model_from_multipart_form, request_content_type_is_multipart_form,
    require_multipart_boundary, require_non_blank_model,
};
use super::routing::SESSION_STICKY_OBJECT_TYPE;
use super::{
    meter_is_streamable, Invocation, InvocationBody, InvocationDispatch, InvocationError,
    InvocationErrorKind, InvocationFuture, InvocationInterceptor, InvocationRequest,
    InvocationShape, InvocationSurface, StickyMode, StickyRouting,
};
use crate::domain::{AiRouteModelRequirement, MODEL_REQUEST_FIELD_NAMES};

#[derive(Debug, Clone, Default)]
pub struct PayloadExtractionInterceptor;

impl InvocationInterceptor for PayloadExtractionInterceptor {
    fn name(&self) -> &str {
        "payload_extraction"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            extract_requested_model(invocation)?;
            extract_stream_flag(invocation);
            sync_sticky_ids(invocation);
            apply_session_sticky_default(invocation);
            validate_required_model(invocation)
        })
    }
}

/// Best-effort model extraction for callers that must resolve routing before
/// the pipeline's payload stage runs (the auth-token account-group selection).
///
/// Mirrors [`extract_requested_model`]'s order without failing the request:
/// anything unparseable returns `None`, and the caller falls back to its
/// modality/account-level defaults. Never used to dispatch; the pipeline still
/// performs the authoritative extraction (with validation and error mapping).
pub fn peek_requested_model(request: &InvocationRequest) -> Option<String> {
    if let Some(model) = invocation_request_path_model(request) {
        return Some(model);
    }
    if let Some(model) = request.query.as_deref().and_then(model_query_value) {
        return Some(model);
    }
    if request_content_type_is_multipart_form(&request.headers) {
        if let InvocationBody::Bytes(bytes) = &request.body {
            return optional_model_from_multipart_form(&request.headers, bytes)
                .ok()
                .flatten();
        }
        return None;
    }
    match &request.body {
        InvocationBody::Json(value) => model_from_json_value(value, &request.path).ok().flatten(),
        InvocationBody::Bytes(bytes) => serde_json::from_slice::<Value>(bytes)
            .ok()
            .and_then(|value| model_from_json_value(&value, &request.path).ok().flatten()),
        InvocationBody::Empty => None,
    }
}

fn invocation_request_path_model(request: &InvocationRequest) -> Option<String> {
    if request.method != Method::DELETE {
        return None;
    }
    request
        .path
        .strip_prefix("/v1/models/")
        .and_then(non_empty_text)
        .map(str::to_owned)
}

fn extract_requested_model(invocation: &mut Invocation) -> Result<(), InvocationError> {
    if let Some(model) = invocation.resource.requested_model.clone() {
        sync_provider_native_model_metadata(invocation, &model);
        return Ok(());
    }

    if invocation.request.method == Method::DELETE {
        if let Some(model) = invocation
            .request
            .path
            .strip_prefix("/v1/models/")
            .and_then(non_empty_text)
        {
            invocation.resource.requested_model = Some(model.to_owned());
            return Ok(());
        }
    }

    if let Some(model) = invocation
        .request
        .query
        .as_deref()
        .and_then(model_query_value)
    {
        apply_extracted_model(invocation, model);
        return Ok(());
    }

    if request_content_type_is_multipart_form(&invocation.request.headers) {
        require_multipart_boundary(&invocation.request.headers)?;
        if let InvocationBody::Bytes(bytes) = &invocation.request.body {
            if let Some(model) =
                optional_model_from_multipart_form(&invocation.request.headers, bytes)?
            {
                apply_extracted_model(invocation, model);
            }
        }
        return Ok(());
    }

    match &invocation.request.body {
        InvocationBody::Json(value) => {
            if let Some(model) = model_from_json_value(value, &invocation.request.path)? {
                apply_extracted_model(invocation, model);
            }
        }
        InvocationBody::Bytes(bytes) => {
            if let Ok(value) = serde_json::from_slice::<Value>(bytes) {
                if let Some(model) = model_from_json_value(&value, &invocation.request.path)? {
                    apply_extracted_model(invocation, model);
                }
            }
        }
        InvocationBody::Empty => {}
    }
    Ok(())
}

fn apply_extracted_model(invocation: &mut Invocation, model: String) {
    sync_provider_native_model_metadata(invocation, &model);
    invocation.resource.requested_model = Some(model);
}

fn sync_provider_native_model_metadata(invocation: &mut Invocation, model: &str) {
    if invocation.resource.surface == InvocationSurface::ProviderNative {
        if invocation.resource.provider_native_model.is_none() {
            invocation.resource.provider_native_model = Some(model.to_owned());
        }
        if invocation.resource.requested_model_catalog_key.is_none() {
            invocation.resource.requested_model_catalog_key =
                Some(provider_native_catalog_key(invocation, model));
        }
    }
}

fn extract_stream_flag(invocation: &mut Invocation) {
    let stream = match &invocation.request.body {
        InvocationBody::Json(value) => bool_field(value, "stream"),
        InvocationBody::Bytes(bytes) => serde_json::from_slice::<Value>(bytes)
            .ok()
            .and_then(|value| bool_field(&value, "stream")),
        InvocationBody::Empty => None,
    }
    .or_else(|| {
        invocation
            .request
            .query
            .as_deref()
            .and_then(query_value_stream)
    })
    .or_else(|| {
        // Detect streaming via Accept header (Anthropic, etc.)
        invocation
            .request
            .headers
            .get("accept")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| {
                if v.contains("text/event-stream") {
                    Some(true)
                } else {
                    None
                }
            })
    })
    .or_else(|| {
        // Detect Gemini streaming endpoints: :streamGenerateContent
        if invocation.request.path.contains(":streamGenerateContent") {
            Some(true)
        } else {
            None
        }
    })
    .unwrap_or(false);

    // 客户端可以把 `"stream": true` 写进任何请求体，而媒体路由（视频 / 图片 /
    // 音乐 / TTS / STT）声明的计量单位必须从**完整响应体**量出来。若照单全收地
    // 把形状改成 `SseStream`，计费就会切到流式累加器、在媒体响应里找不到 token
    // 字段 ⇒ 产不出用量行 ⇒ 免单。所以形状改写必须同时满足"该路由的单位能从流里
    // 量出来"。计费策略侧有一道同样的守卫（`declared_meter_is_streamable`），
    // 两处共用 `meter_is_streamable` 这一个判据。
    let streamable = meter_is_streamable(invocation.billing.meter.as_ref());
    if stream && !streamable {
        tracing::warn!(
            stage = "payload_extraction",
            api_code = %invocation.resource.api_code,
            request_id = %invocation.request.request_id,
            meter = invocation
                .billing
                .meter
                .as_ref()
                .map(|meter| meter.code())
                .unwrap_or("unknown"),
            "stream flag ignored: this route bills a unit that cannot be measured from a stream"
        );
    }
    if stream && streamable {
        invocation.dispatch = InvocationDispatch::sse_stream();
    } else if invocation.request.body.is_empty() {
        invocation.dispatch.invocation_shape = InvocationShape::Empty;
    }
}

fn sync_sticky_ids(invocation: &mut Invocation) {
    let Some(sticky) = invocation.routing.sticky.as_mut() else {
        return;
    };
    match sticky.mode {
        StickyMode::LookupSticky => {
            if invocation.resource.resource_id.is_none() {
                invocation.resource.resource_id = sticky.object_id.clone();
            }
            if sticky.object_id.is_none() {
                sticky.object_id = invocation.resource.resource_id.clone();
            }
        }
        StickyMode::ParentSticky => {
            if invocation.resource.parent_resource_id.is_none() {
                invocation.resource.parent_resource_id = sticky.parent_object_id.clone();
            }
            if sticky.parent_object_id.is_none() {
                sticky.parent_object_id = invocation.resource.parent_resource_id.clone();
            }
        }
        StickyMode::CreateThenSticky | StickyMode::None | StickyMode::SessionSticky => {}
    }
}

/// 无状态 LLM 会话型路由：同一会话固定打到同一上游账号时，请求体中的
/// 会话 id 会原样透传给上游，从而最大化供应商侧 prompt cache 命中率。
const SESSION_STICKY_ROUTE_KEYS: [&str; 2] =
    ["openai/model/chat_completions", "openai/model/completions"];

/// 会话 sticky 默认路由：无状态会话型请求携带会话 id（请求体 `session_id`
/// / `prompt_cache_key`，或请求头 `x-session-id`）时，按会话维度做账户
/// sticky 绑定。已有显式对象 sticky（response/thread/file 等）时不覆盖；
/// 未携带会话 id 时保持原有无 sticky 路由。
fn apply_session_sticky_default(invocation: &mut Invocation) {
    if invocation.routing.sticky.is_some() {
        return;
    }
    if !SESSION_STICKY_ROUTE_KEYS.contains(&invocation.resource.route_key.as_str()) {
        return;
    }
    let Some(session_id) = session_sticky_key(invocation) else {
        return;
    };
    invocation.routing.sticky = Some(StickyRouting::session(
        SESSION_STICKY_OBJECT_TYPE,
        session_sticky_binding_key(&session_id),
    ));
}

/// `ai_upstream_object_route.object_id` 为 VARCHAR(256)。客户端可控的会话
/// id 可能超过安全长度，超出时用 sha256 指纹作绑定键——查找与提交使用同一
/// 归一化函数，保证两端一致；透传给上游的仍是原始会话 id，不影响缓存语义。
const SESSION_STICKY_MAX_ID_LEN: usize = 200;

fn session_sticky_binding_key(session_id: &str) -> String {
    if session_id.chars().count() <= SESSION_STICKY_MAX_ID_LEN {
        return session_id.to_owned();
    }
    let mut hasher = Sha256::new();
    hasher.update(session_id.as_bytes());
    hex::encode(hasher.finalize())
}

/// 会话 id 提取优先级：`session_id` > `prompt_cache_key`（OpenAI 官方的
/// cache 亲和字段）> `x-session-id` 请求头。
fn session_sticky_key(invocation: &Invocation) -> Option<String> {
    if let Some(key) = request_body_text_field(invocation, "session_id")
        .or_else(|| request_body_text_field(invocation, "prompt_cache_key"))
    {
        return Some(key);
    }
    invocation
        .request
        .headers
        .get("x-session-id")
        .and_then(|value| value.to_str().ok())
        .and_then(non_empty_text)
        .map(str::to_owned)
}

fn request_body_text_field(invocation: &Invocation, field: &str) -> Option<String> {
    match &invocation.request.body {
        InvocationBody::Json(value) => text_field(value, field),
        InvocationBody::Bytes(bytes) => serde_json::from_slice::<Value>(bytes)
            .ok()
            .and_then(|value| text_field(&value, field)),
        InvocationBody::Empty => None,
    }
}

fn text_field(value: &Value, field: &str) -> Option<String> {
    value
        .get(field)
        .and_then(Value::as_str)
        .and_then(non_empty_text)
        .map(str::to_owned)
}

fn validate_required_model(invocation: &Invocation) -> Result<(), InvocationError> {
    if invocation.resource.model_requirement == AiRouteModelRequirement::Required
        && invocation
            .resource
            .requested_model
            .as_deref()
            .and_then(non_empty_text)
            .is_none()
    {
        // The mapped ProblemDetail only states that a model is required. The
        // access event records the resulting status, not the cause, so without
        // this trace a rejected request is invisible in the gateway log — which
        // is exactly how an intermittent caller-side omission of `model` reads
        // as a gateway fault. Log the shape of the offending request instead.
        let body_bytes = match &invocation.request.body {
            InvocationBody::Json(value) => serde_json::to_vec(value)
                .map(|encoded| encoded.len())
                .unwrap_or_default(),
            InvocationBody::Bytes(bytes) => bytes.len(),
            InvocationBody::Empty => 0,
        };
        tracing::warn!(
            stage = "payload_extraction",
            api_code = %invocation.resource.api_code,
            route_key = %invocation.resource.route_key,
            method = %invocation.request.method,
            path = %invocation.request.path,
            content_type = invocation.request.content_type.as_deref().unwrap_or(""),
            body_bytes,
            accepted_model_fields = ?crate::domain::MODEL_REQUEST_FIELD_NAMES,
            request_id = %invocation.request.request_id,
            "required route rejected a request that carries no model"
        );
        return Err(InvocationError::new(
            InvocationErrorKind::InvalidRequest,
            format!("model is required for {}", invocation.resource.api_code),
        ));
    }
    Ok(())
}

fn model_from_json_value(value: &Value, _path: &str) -> Result<Option<String>, InvocationError> {
    if let Some(model) = top_level_model_from_json_value(value)? {
        return Ok(Some(model));
    }
    Ok(None)
}

fn top_level_model_from_json_value(value: &Value) -> Result<Option<String>, InvocationError> {
    // 厂商原生命名差异：OpenAI/Anthropic 用 `model`，Kling 用 `model_name`，
    // ElevenLabs / MiniMax 等音频族用 `model_id`。三者都要认，否则厂商原生媒体
    // 请求会被当成"未携带模型"，定价键只能退化为 api code，而 sdkwork-models
    // 目录对这些能力计价的对象是模型（`elevenlabs/eleven_multilingual_v2`），
    // 于是拿 api code 去查价必然 `model not found`。
    let Some(object) = value.as_object() else {
        return Ok(None);
    };
    for field in MODEL_REQUEST_FIELD_NAMES {
        let Some(model) = object.get(field) else {
            continue;
        };
        return match model {
            Value::String(model) => require_non_blank_model(model).map(Some),
            _ => Err(InvocationError::new(
                InvocationErrorKind::InvalidRequest,
                "model must be a string",
            )),
        };
    }
    Ok(None)
}

fn provider_native_catalog_key(invocation: &Invocation, model: &str) -> String {
    let model = model.trim();
    let supplier_code = invocation
        .resource
        .supplier_code
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if let Some(supplier_code) = supplier_code {
        let model_provider = model
            .split('/')
            .map(str::trim)
            .find(|part| !part.is_empty());
        if model_provider == Some(supplier_code) {
            return model.to_owned();
        }
        return format!("{supplier_code}/{model}");
    }
    model.to_owned()
}

fn bool_field(value: &Value, field: &str) -> Option<bool> {
    value.get(field).and_then(Value::as_bool)
}

fn query_value_stream(query: &str) -> Option<bool> {
    query_value(query, "stream").and_then(|value| {
        match value.trim().to_ascii_lowercase().as_str() {
            "1" | "true" | "yes" => Some(true),
            "0" | "false" | "no" => Some(false),
            _ => None,
        }
    })
}

fn query_value(query: &str, key: &str) -> Option<String> {
    query.split('&').find_map(|pair| {
        let (name, value) = pair.split_once('=')?;
        (name == key).then(|| decode_form_value(value))
    })
}

fn decode_form_value(value: &str) -> String {
    let mut decoded = Vec::with_capacity(value.len());
    let bytes = value.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'+' => {
                decoded.push(b' ');
                index += 1;
            }
            b'%' if index + 2 < bytes.len() => {
                if let Ok(hex) = std::str::from_utf8(&bytes[index + 1..index + 3]) {
                    if let Ok(byte) = u8::from_str_radix(hex, 16) {
                        decoded.push(byte);
                        index += 3;
                        continue;
                    }
                }
                decoded.push(bytes[index]);
                index += 1;
            }
            byte => {
                decoded.push(byte);
                index += 1;
            }
        }
    }
    String::from_utf8(decoded).unwrap_or_else(|_| value.to_owned())
}

fn non_empty_text(value: &str) -> Option<&str> {
    let value = value.trim();
    (!value.is_empty()).then_some(value)
}

#[cfg(test)]
mod tests {
    use super::model_query_value;

    #[test]
    fn query_value_model_decodes_utf8_percent_encoded_value() {
        assert_eq!(
            Some("openrouter/模型+latest".to_owned()),
            model_query_value("model=openrouter%2F%E6%A8%A1%E5%9E%8B%2Blatest")
        );
    }

    #[test]
    fn query_value_model_accepts_vendor_native_field_names() {
        assert_eq!(
            Some("eleven_multilingual_v2".to_owned()),
            model_query_value("model_id=eleven_multilingual_v2")
        );
        assert_eq!(
            Some("kling-v3".to_owned()),
            model_query_value("model_name=kling-v3&duration=8")
        );
    }
}
