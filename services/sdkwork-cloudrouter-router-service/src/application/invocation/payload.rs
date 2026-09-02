use axum::http::Method;
use serde_json::Value;
use sha2::{Digest, Sha256};

use super::multipart_form::{
    optional_model_from_multipart_form, request_content_type_is_multipart_form,
    require_multipart_boundary, require_non_blank_model,
};
use super::routing::SESSION_STICKY_OBJECT_TYPE;
use super::{
    Invocation, InvocationBody, InvocationDispatch, InvocationError, InvocationErrorKind,
    InvocationFuture, InvocationInterceptor, InvocationShape, InvocationSurface, StickyMode,
    StickyRouting,
};
use crate::domain::AiRouteModelRequirement;

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
        .and_then(query_value_model)
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

    if stream {
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
    for field in ["model", "model_name", "modelName"] {
        let Some(model) = value.get(field) else {
            continue;
        };
        match model {
            Value::String(model) => return require_non_blank_model(model).map(Some),
            _ => {
                return Err(InvocationError::new(
                    InvocationErrorKind::InvalidRequest,
                    "model must be a string",
                ));
            }
        }
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

fn query_value_model(query: &str) -> Option<String> {
    query_value(query, "model").and_then(|value| non_empty_text(&value).map(str::to_owned))
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
    use super::query_value_model;

    #[test]
    fn query_value_model_decodes_utf8_percent_encoded_value() {
        assert_eq!(
            Some("openrouter/模型+latest".to_owned()),
            query_value_model("model=openrouter%2F%E6%A8%A1%E5%9E%8B%2Blatest")
        );
    }
}
