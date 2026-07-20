use std::sync::LazyLock;

use axum::{
    body::Body,
    extract::Request,
    http::{Method, StatusCode},
    response::IntoResponse,
    Router,
};
use serde_json::Value;
use tower::ServiceExt;

const CLAWROUTER_OPEN_API: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../apis/open-api/clawrouter/clawrouter-open-api.openapi.json"
));
const PAYMENT_OPEN_API: &str = include_str!("../specs/payment-aggregate-openapi.json");
const PAAS_OPEN_API: &str = include_str!("../specs/paas-openapi.json");
const IAAS_OPEN_API: &str = include_str!("../specs/cloud-services-openapi.json");

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OpenApiCapability {
    Agent,
    Audio,
    Drive,
    Iaas,
    Image,
    Knowledgebase,
    Llm,
    Memory,
    Paas,
    Payment,
    Video,
}

#[derive(Debug)]
struct OwnedOperation {
    method: Method,
    path_pattern: String,
    capability: OpenApiCapability,
}

static OWNED_OPERATIONS: LazyLock<Vec<OwnedOperation>> = LazyLock::new(|| {
    let mut operations = Vec::new();
    append_tagged_operations(&mut operations, CLAWROUTER_OPEN_API);
    append_single_capability_operations(
        &mut operations,
        PAYMENT_OPEN_API,
        OpenApiCapability::Payment,
    );
    append_single_capability_operations(&mut operations, PAAS_OPEN_API, OpenApiCapability::Paas);
    append_single_capability_operations(&mut operations, IAAS_OPEN_API, OpenApiCapability::Iaas);
    operations
});

pub fn open_api_capability_for_request(method: &Method, path: &str) -> Option<OpenApiCapability> {
    schema_capability(path).or_else(|| {
        OWNED_OPERATIONS
            .iter()
            .find(|operation| {
                operation.method == *method
                    && sdkwork_claw_contract::matches_path_pattern(
                        operation.path_pattern.as_str(),
                        path,
                    )
            })
            .map(|operation| operation.capability)
    })
}

pub fn open_api_capability_router(upstream: Router, capability: OpenApiCapability) -> Router {
    Router::new().fallback(move |request: Request<Body>| {
        let upstream = upstream.clone();
        async move {
            if open_api_capability_for_request(request.method(), request.uri().path())
                != Some(capability)
            {
                return StatusCode::NOT_FOUND.into_response();
            }

            match upstream.oneshot(request).await {
                Ok(response) => response,
                Err(error) => match error {},
            }
        }
    })
}

fn schema_capability(path: &str) -> Option<OpenApiCapability> {
    match path {
        "/openapi.json" | "/openapi/schema-tabs.json" => Some(OpenApiCapability::Llm),
        "/payments/v3/openapi.json" => Some(OpenApiCapability::Payment),
        "/paas/v3/openapi.json" => Some(OpenApiCapability::Paas),
        "/cloud/v3/openapi.json" => Some(OpenApiCapability::Iaas),
        _ => None,
    }
}

fn append_tagged_operations(operations: &mut Vec<OwnedOperation>, document: &str) {
    append_operations(operations, document, |operation| {
        operation
            .get("tags")
            .and_then(Value::as_array)
            .and_then(|tags| tags.first())
            .and_then(Value::as_str)
            .map(capability_from_tag)
            .unwrap_or(OpenApiCapability::Llm)
    });
}

fn append_single_capability_operations(
    operations: &mut Vec<OwnedOperation>,
    document: &str,
    capability: OpenApiCapability,
) {
    append_operations(operations, document, |_| capability);
}

fn append_operations(
    operations: &mut Vec<OwnedOperation>,
    document: &str,
    capability: impl Fn(&Value) -> OpenApiCapability,
) {
    let document: Value =
        serde_json::from_str(document).expect("embedded ClawRouter OpenAPI must be valid JSON");
    let paths = document
        .get("paths")
        .and_then(Value::as_object)
        .expect("embedded ClawRouter OpenAPI must declare paths");

    for (path, path_item) in paths {
        let Some(path_item) = path_item.as_object() else {
            continue;
        };
        for (method, operation) in path_item {
            let method = method.to_ascii_uppercase();
            let Ok(method) = Method::from_bytes(method.as_bytes()) else {
                continue;
            };
            if !matches!(
                method,
                Method::GET
                    | Method::POST
                    | Method::PUT
                    | Method::PATCH
                    | Method::DELETE
                    | Method::HEAD
                    | Method::OPTIONS
            ) {
                continue;
            }
            operations.push(OwnedOperation {
                method,
                path_pattern: path.clone(),
                capability: capability(operation),
            });
        }
    }
}

fn capability_from_tag(tag: &str) -> OpenApiCapability {
    let family = tag.split('/').next().unwrap_or(tag);
    match family {
        "Assistants" => OpenApiCapability::Agent,
        "Audio" | "Realtime" => OpenApiCapability::Audio,
        "Containers" | "Files" | "Uploads" => OpenApiCapability::Drive,
        "Images" => OpenApiCapability::Image,
        "Vector Stores" => OpenApiCapability::Knowledgebase,
        "Conversations" => OpenApiCapability::Memory,
        "Videos" => OpenApiCapability::Video,
        _ => OpenApiCapability::Llm,
    }
}

#[cfg(test)]
mod tests {
    use super::{open_api_capability_for_request, OpenApiCapability};
    use axum::http::Method;

    #[test]
    fn resolves_each_open_api_capability_from_authoritative_operations() {
        let cases = [
            (Method::POST, "/v1/assistants", OpenApiCapability::Agent),
            (Method::POST, "/v1/audio/speech", OpenApiCapability::Audio),
            (Method::POST, "/v1/files", OpenApiCapability::Drive),
            (
                Method::POST,
                "/cloud/v3/iaas/compute/instances",
                OpenApiCapability::Iaas,
            ),
            (
                Method::POST,
                "/v1/images/generations",
                OpenApiCapability::Image,
            ),
            (
                Method::POST,
                "/v1/vector_stores/vector-1/search",
                OpenApiCapability::Knowledgebase,
            ),
            (Method::POST, "/v1/chat/completions", OpenApiCapability::Llm),
            (Method::POST, "/v1/conversations", OpenApiCapability::Memory),
            (
                Method::POST,
                "/paas/v3/ocr/recognitions",
                OpenApiCapability::Paas,
            ),
            (
                Method::POST,
                "/payments/v3/payment_intents",
                OpenApiCapability::Payment,
            ),
            (Method::POST, "/v1/videos", OpenApiCapability::Video),
        ];

        for (method, path, expected) in cases {
            assert_eq!(
                Some(expected),
                open_api_capability_for_request(&method, path)
            );
        }
    }

    #[test]
    fn does_not_claim_unknown_or_wrong_method_routes() {
        assert_eq!(
            None,
            open_api_capability_for_request(&Method::GET, "/v1/embeddings")
        );
        assert_eq!(
            None,
            open_api_capability_for_request(&Method::GET, "/not-an-api")
        );
    }
}
