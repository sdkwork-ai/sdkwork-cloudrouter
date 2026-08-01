#![allow(dead_code)]

use axum::extract::{MatchedPath, Request};
use axum::http::header::ALLOW;
use axum::http::{HeaderValue, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::MethodRouter;
use axum::Router;
use serde::de::IgnoredAny;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::OnceLock;

const METHOD_GET: u8 = 1 << 0;
const METHOD_POST: u8 = 1 << 1;
const METHOD_PUT: u8 = 1 << 2;
const METHOD_PATCH: u8 = 1 << 3;
const METHOD_DELETE: u8 = 1 << 4;

static OPENAI_ROUTE_METHODS: OnceLock<HashMap<String, u8>> = OnceLock::new();
static PROVIDER_ROUTE_METHODS: OnceLock<Vec<ProviderRouteContract>> = OnceLock::new();

struct ProviderRouteContract {
    provider: String,
    path: String,
    methods: u8,
}

#[derive(Deserialize)]
struct OpenApiDocument {
    paths: HashMap<String, OpenApiPathItem>,
}

#[derive(Deserialize)]
struct OpenApiPathItem {
    get: Option<IgnoredAny>,
    post: Option<IgnoredAny>,
    put: Option<IgnoredAny>,
    patch: Option<IgnoredAny>,
    delete: Option<IgnoredAny>,
}

pub(crate) fn reject_unsupported_openai_method(request: &Request) -> Option<Response> {
    let matched_path = request.extensions().get::<MatchedPath>()?.as_str();
    let allowed = openai_route_methods()
        .get(matched_path)
        .copied()
        .unwrap_or(0);
    if allowed & method_mask(request.method()) != 0 {
        return None;
    }

    let mut response = StatusCode::METHOD_NOT_ALLOWED.into_response();
    if let Ok(value) = HeaderValue::from_str(&allow_header(allowed)) {
        response.headers_mut().insert(ALLOW, value);
    }
    Some(response)
}

pub(crate) fn reject_unsupported_provider_route(request: &Request) -> Option<Response> {
    let (provider, provider_path) = split_provider_route(request.uri().path())?;
    let contract = provider_route_methods().iter().find(|contract| {
        (provider == contract.provider && path_template_matches(&contract.path, provider_path))
            || provider_path
                .strip_prefix(&contract.provider)
                .and_then(|path| path.strip_prefix('/'))
                .is_some_and(|path| path_template_matches(&contract.path, path))
    });
    let Some(contract) = contract else {
        return Some(StatusCode::NOT_FOUND.into_response());
    };
    if contract.methods & method_mask(request.method()) != 0 {
        return None;
    }

    let mut response = StatusCode::METHOD_NOT_ALLOWED.into_response();
    if let Ok(value) = HeaderValue::from_str(&allow_header(contract.methods)) {
        response.headers_mut().insert(ALLOW, value);
    }
    Some(response)
}

fn openai_route_methods() -> &'static HashMap<String, u8> {
    OPENAI_ROUTE_METHODS.get_or_init(|| {
        let document: OpenApiDocument = serde_json::from_str(include_str!(
            "../../../apps/sdkwork-clawrouter-pc/public/openapi.json"
        ))
        .expect("embedded Claw Router OpenAPI contract must be valid JSON");
        document
            .paths
            .into_iter()
            .filter(|(path, _)| path.starts_with("/v1/"))
            .map(|(path, item)| (path, path_item_method_mask(&item)))
            .collect()
    })
}

fn provider_route_methods() -> &'static [ProviderRouteContract] {
    PROVIDER_ROUTE_METHODS.get_or_init(|| {
        let document: OpenApiDocument = serde_json::from_str(include_str!(
            "../../../apps/sdkwork-clawrouter-pc/public/openapi.json"
        ))
        .expect("embedded Claw Router OpenAPI contract must be valid JSON");
        document
            .paths
            .into_iter()
            .filter_map(|(path, item)| {
                let path = path.strip_prefix('/')?;
                let (provider, path) = path.split_once('/')?;
                if provider == "v1" {
                    return None;
                }
                Some(ProviderRouteContract {
                    provider: provider.to_owned(),
                    path: path.to_owned(),
                    methods: path_item_method_mask(&item),
                })
            })
            .collect()
    })
}

fn path_item_method_mask(item: &OpenApiPathItem) -> u8 {
    let mut methods = 0;
    if item.get.is_some() {
        methods |= METHOD_GET;
    }
    if item.post.is_some() {
        methods |= METHOD_POST;
    }
    if item.put.is_some() {
        methods |= METHOD_PUT;
    }
    if item.patch.is_some() {
        methods |= METHOD_PATCH;
    }
    if item.delete.is_some() {
        methods |= METHOD_DELETE;
    }
    methods
}

fn split_provider_route(path: &str) -> Option<(&str, &str)> {
    let path = path
        .strip_prefix("/provider/")
        .or_else(|| path.strip_prefix('/'))?;
    let (provider, provider_path) = path.split_once('/')?;
    (!provider.is_empty() && !provider_path.is_empty()).then_some((provider, provider_path))
}

fn path_template_matches(template: &str, path: &str) -> bool {
    let template_segments = template.split('/');
    let path_segments = path.split('/');
    template_segments
        .zip(path_segments)
        .all(|(template, path)| path_segment_template_matches(template, path))
        && template.split('/').count() == path.split('/').count()
}

fn path_segment_template_matches(template: &str, path: &str) -> bool {
    let Some(open) = template.find('{') else {
        return template == path;
    };
    let Some(close) = template[open + 1..].find('}').map(|index| open + 1 + index) else {
        return false;
    };
    let prefix = &template[..open];
    let suffix = &template[close + 1..];
    path.starts_with(prefix) && path.ends_with(suffix) && path.len() > prefix.len() + suffix.len()
}

fn method_mask(method: &Method) -> u8 {
    match *method {
        Method::GET => METHOD_GET,
        Method::POST => METHOD_POST,
        Method::PUT => METHOD_PUT,
        Method::PATCH => METHOD_PATCH,
        Method::DELETE => METHOD_DELETE,
        _ => 0,
    }
}

fn allow_header(methods: u8) -> String {
    [
        (METHOD_GET, "GET"),
        (METHOD_POST, "POST"),
        (METHOD_PUT, "PUT"),
        (METHOD_PATCH, "PATCH"),
        (METHOD_DELETE, "DELETE"),
    ]
    .into_iter()
    .filter_map(|(mask, method)| (methods & mask != 0).then_some(method))
    .collect::<Vec<_>>()
    .join(", ")
}

pub(crate) fn apply_openai_passthrough_routes<S>(
    mut router: Router<S>,
    handler: MethodRouter<S>,
) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    for path in OPENAI_COMPATIBLE_PASSTHROUGH_PATHS {
        router = router.route(path, handler.clone());
    }
    router
}

pub(crate) fn apply_openai_method_passthrough_routes<S>(
    mut router: Router<S>,
    handler: MethodRouter<S>,
) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    for path in OPENAI_METHOD_PASSTHROUGH_PATHS {
        router = router.route(path, handler.clone());
    }
    router
}

pub(crate) fn apply_stored_chat_completion_passthrough_routes<S>(
    mut router: Router<S>,
    handler: MethodRouter<S>,
) -> Router<S>
where
    S: Clone + Send + Sync + 'static,
{
    for path in STORED_CHAT_COMPLETION_PASSTHROUGH_PATHS {
        router = router.route(path, handler.clone());
    }
    router
}

const OPENAI_COMPATIBLE_PASSTHROUGH_PATHS: &[&str] = &[
    "/v1/completions",
    "/v1/moderations",
    "/v1/responses/input_tokens",
    "/v1/responses/compact",
    "/v1/responses/{response_id}",
    "/v1/responses/{response_id}/cancel",
    "/v1/responses/{response_id}/input_items",
    "/v1/images/generations",
    "/v1/images/edits",
    "/v1/images/variations",
    "/v1/videos",
    "/v1/videos/characters",
    "/v1/videos/characters/{character_id}",
    "/v1/videos/edits",
    "/v1/videos/extensions",
    "/v1/videos/{video_id}",
    "/v1/videos/{video_id}/content",
    "/v1/videos/{video_id}/remix",
    "/v1/audio/speech",
    "/v1/audio/voices",
    "/v1/audio/voices/{voice_id}",
    "/v1/audio/voice_consents",
    "/v1/audio/voice_consents/{consent_id}",
    "/v1/audio/transcriptions",
    "/v1/audio/translations",
    "/v1/files",
    "/v1/files/{file_id}",
    "/v1/files/{file_id}/content",
    "/v1/vector_stores",
    "/v1/vector_stores/{vector_store_id}",
    "/v1/vector_stores/{vector_store_id}/search",
    "/v1/vector_stores/{vector_store_id}/files",
    "/v1/vector_stores/{vector_store_id}/files/{file_id}",
    "/v1/vector_stores/{vector_store_id}/file_batches",
    "/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}",
    "/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}/cancel",
    "/v1/vector_stores/{vector_store_id}/file_batches/{batch_id}/files",
    "/v1/assistants",
    "/v1/assistants/{assistant_id}",
    "/v1/threads",
    "/v1/threads/runs",
    "/v1/threads/{thread_id}",
    "/v1/threads/{thread_id}/messages",
    "/v1/threads/{thread_id}/messages/{message_id}",
    "/v1/threads/{thread_id}/runs",
    "/v1/threads/{thread_id}/runs/{run_id}",
    "/v1/threads/{thread_id}/runs/{run_id}/cancel",
    "/v1/threads/{thread_id}/runs/{run_id}/submit_tool_outputs",
    "/v1/threads/{thread_id}/runs/{run_id}/steps",
    "/v1/threads/{thread_id}/runs/{run_id}/steps/{step_id}",
    "/v1/batches",
    "/v1/batches/{batch_id}",
    "/v1/batches/{batch_id}/cancel",
    "/v1/conversations",
    "/v1/conversations/{conversation_id}",
    "/v1/conversations/{conversation_id}/items",
    "/v1/conversations/{conversation_id}/items/{item_id}",
    "/v1/containers",
    "/v1/containers/{container_id}",
    "/v1/containers/{container_id}/files",
    "/v1/containers/{container_id}/files/{file_id}",
    "/v1/containers/{container_id}/files/{file_id}/content",
    "/v1/uploads",
    "/v1/uploads/{upload_id}/parts",
    "/v1/uploads/{upload_id}/complete",
    "/v1/uploads/{upload_id}/cancel",
    "/v1/realtime/client_secrets",
    "/v1/realtime/calls",
    "/v1/realtime/calls/{call_id}/accept",
    "/v1/realtime/calls/{call_id}/hangup",
    "/v1/realtime/calls/{call_id}/refer",
    "/v1/realtime/calls/{call_id}/reject",
    "/v1/realtime/sessions",
    "/v1/realtime/transcription_sessions",
    "/v1/realtime/translations",
];

pub fn openai_compatible_passthrough_paths() -> &'static [&'static str] {
    OPENAI_COMPATIBLE_PASSTHROUGH_PATHS
}

pub fn openai_method_passthrough_paths() -> &'static [&'static str] {
    OPENAI_METHOD_PASSTHROUGH_PATHS
}

pub fn stored_chat_completion_passthrough_paths() -> &'static [&'static str] {
    STORED_CHAT_COMPLETION_PASSTHROUGH_PATHS
}

const OPENAI_METHOD_PASSTHROUGH_PATHS: &[&str] = &[];

const STORED_CHAT_COMPLETION_PASSTHROUGH_PATHS: &[&str] = &[
    "/v1/chat/completions",
    "/v1/chat/completions/{completion_id}",
    "/v1/chat/completions/{completion_id}/messages",
];

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;

    fn request(method: Method, uri: &str) -> Request {
        Request::builder()
            .method(method)
            .uri(uri)
            .body(Body::empty())
            .expect("provider-native test request must be valid")
    }

    #[test]
    fn provider_contract_accepts_declared_direct_and_aliased_routes() {
        assert!(reject_unsupported_provider_route(&request(
            Method::POST,
            "/provider/google/v1beta/models/gemini-2.5-flash:generateContent",
        ))
        .is_none());
        assert!(reject_unsupported_provider_route(&request(
            Method::POST,
            "/tencent-cloud/vidu/ent/v2/start-end2video",
        ))
        .is_none());
    }

    #[test]
    fn provider_contract_rejects_unknown_paths_before_forwarding() {
        let response = reject_unsupported_provider_route(&request(
            Method::POST,
            "/provider/google/v1beta/projects/project-1/locations/global",
        ))
        .expect("unknown provider-native route must be rejected");
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[test]
    fn provider_contract_rejects_undeclared_methods_with_allow_header() {
        let response = reject_unsupported_provider_route(&request(
            Method::DELETE,
            "/provider/anthropic/v1/messages",
        ))
        .expect("undeclared provider-native method must be rejected");
        assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
        assert_eq!(
            response.headers().get(ALLOW),
            Some(&HeaderValue::from_static("POST"))
        );
    }
}
