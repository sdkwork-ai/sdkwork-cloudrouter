//! Host-neutral API composition for sdkwork-clawrouter.

mod iam;

use std::{collections::BTreeMap, sync::Arc};

use anyhow::Context;
use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
    Router,
};
use sdkwork_claw_http::{open_api_capability_for_request, OpenApiCapability};
use sdkwork_web_bootstrap::{CompositeReadinessCheck, ReadinessCheck, ReadinessFuture};
use sdkwork_web_contract::{merge_openapi_documents, route_inventory_from_routes, HttpRoute};
use sdkwork_web_core::{DomainContextInjector, HttpRouteManifest};
use serde_json::{Map, Value};
use tower::ServiceExt;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ApiAssemblyContext {
    include_dependency_apis: bool,
}

impl ApiAssemblyContext {
    pub const fn cloud_gateway() -> Self {
        Self {
            include_dependency_apis: false,
        }
    }

    const fn includes_dependency_apis(self) -> bool {
        self.include_dependency_apis
    }
}

impl Default for ApiAssemblyContext {
    fn default() -> Self {
        Self {
            include_dependency_apis: true,
        }
    }
}

pub struct ApiAssembly {
    pub router: Router,
    pub route_manifest: HttpRouteManifest,
    pub openapi: serde_json::Value,
    pub permission_catalog: Vec<&'static str>,
    pub domain_context_injectors: Vec<Arc<dyn DomainContextInjector>>,
    pub readiness_check: Arc<dyn ReadinessCheck>,
}

pub type ApiAssemblyError = anyhow::Error;

#[derive(Clone)]
struct ApplicationRouters {
    context: ApiAssemblyContext,
    upstreams: sdkwork_clawrouter_edge_runtime::EdgeInProcessUpstreams,
    app_manifest: HttpRouteManifest,
    backend_manifest: HttpRouteManifest,
    open_manifest: HttpRouteManifest,
    open: OpenApiRouters,
}

#[derive(Clone)]
struct OpenApiRouters {
    agent: Router,
    audio: Router,
    drive: Router,
    iaas: Router,
    image: Router,
    knowledgebase: Router,
    llm: Router,
    memory: Router,
    paas: Router,
    payment: Router,
    video: Router,
}

#[derive(Clone)]
struct RouterReadinessCheck {
    owner: &'static str,
    router: Router,
}

impl RouterReadinessCheck {
    fn new(owner: &'static str, router: Router) -> Self {
        Self { owner, router }
    }
}

impl ReadinessCheck for RouterReadinessCheck {
    fn check(&self) -> ReadinessFuture<'_> {
        let owner = self.owner;
        let router = self.router.clone();
        Box::pin(async move {
            let request = Request::builder()
                .uri("/readyz")
                .body(Body::empty())
                .map_err(|error| format!("{owner} readiness request build failed: {error}"))?;
            let response = match router.oneshot(request).await {
                Ok(response) => response,
                Err(error) => match error {},
            };
            if response.status() == StatusCode::OK {
                Ok(())
            } else {
                Err(format!(
                    "{owner} readiness returned HTTP {}",
                    response.status()
                ))
            }
        })
    }
}

pub async fn assemble_api_router(
    context: ApiAssemblyContext,
) -> Result<ApiAssembly, ApiAssemblyError> {
    let upstreams =
        sdkwork_clawrouter_edge_runtime::runtime::all_in_one_in_process_upstreams_from_env()
            .await?;
    let upstreams = if context.includes_dependency_apis() {
        let iam_router = iam::wire_iam_app_router().await?;
        upstreams.with_dependency_api_router(iam_router)
    } else {
        upstreams
    };
    assemble_api_router_with_in_process_upstreams(context, upstreams)
}

fn assemble_api_router_with_in_process_upstreams(
    context: ApiAssemblyContext,
    upstreams: sdkwork_clawrouter_edge_runtime::EdgeInProcessUpstreams,
) -> Result<ApiAssembly, ApiAssemblyError> {
    let app_manifest = sdkwork_routes_clawrouter_app_api::http_route_manifest();
    let backend_manifest = sdkwork_routes_clawrouter_backend_api::http_route_manifest();
    let open_manifest = crate::generated_open_http_route_manifest::http_route_manifest();
    validate_no_route_collisions(&[
        ("sdkwork-clawrouter-app-api", &app_manifest),
        ("sdkwork-clawrouter-backend-api", &backend_manifest),
        ("sdkwork-clawrouter-open-api", &open_manifest),
    ])?;

    let app_openapi = parse_openapi(
        "sdkwork-clawrouter-app-api",
        include_str!("../../../apis/app-api/clawrouter/clawrouter-app-api.openapi.json"),
    )?;
    let backend_openapi = parse_openapi(
        "sdkwork-clawrouter-backend-api",
        include_str!("../../../apis/backend-api/clawrouter/clawrouter-backend-api.openapi.json"),
    )?;
    let open_openapi = parse_openapi(
        "sdkwork-clawrouter-open-api",
        include_str!("../../../apis/open-api/clawrouter/clawrouter-open-api.openapi.json"),
    )?;
    let openapi = merge_openapi_documents(
        "SDKWork Claw Router API",
        [
            ("sdkwork-clawrouter-app-api", &app_openapi),
            ("sdkwork-clawrouter-backend-api", &backend_openapi),
            ("sdkwork-clawrouter-open-api", &open_openapi),
        ],
    )?;

    let readiness_check = Arc::new(CompositeReadinessCheck::new(vec![
        Arc::new(RouterReadinessCheck::new(
            "clawrouter-open-api",
            upstreams.gateway_router(),
        )) as Arc<dyn ReadinessCheck>,
        Arc::new(RouterReadinessCheck::new(
            "clawrouter-app-api",
            upstreams.app_router(),
        )),
        Arc::new(RouterReadinessCheck::new(
            "clawrouter-backend-api",
            upstreams.backend_router(),
        )),
    ]));
    let open_runtime = upstreams.gateway_router();
    let routers = ApplicationRouters {
        context,
        upstreams,
        app_manifest: app_manifest.clone(),
        backend_manifest: backend_manifest.clone(),
        open_manifest: open_manifest.clone(),
        open: OpenApiRouters {
            agent: sdkwork_routes_agent_open_api::gateway_mount(open_runtime.clone()),
            audio: sdkwork_routes_audio_open_api::gateway_mount(open_runtime.clone()),
            drive: sdkwork_routes_clawrouter_drive_open_api::gateway_mount(open_runtime.clone()),
            iaas: sdkwork_routes_iaas_open_api::gateway_mount(open_runtime.clone()),
            image: sdkwork_routes_image_open_api::gateway_mount(open_runtime.clone()),
            knowledgebase: sdkwork_routes_clawrouter_knowledgebase_open_api::gateway_mount(
                open_runtime.clone(),
            ),
            llm: sdkwork_routes_clawrouter_llm_open_api::gateway_mount(open_runtime.clone()),
            memory: sdkwork_routes_clawrouter_memory_open_api::gateway_mount(open_runtime.clone()),
            paas: sdkwork_routes_paas_open_api::gateway_mount(open_runtime.clone()),
            payment: sdkwork_routes_payment_open_api::gateway_mount(open_runtime.clone()),
            video: sdkwork_routes_video_open_api::gateway_mount(open_runtime),
        },
    };
    let router = Router::new()
        .fallback(dispatch_application_request)
        .with_state(routers);
    let mut routes = Vec::new();
    routes.extend_from_slice(app_manifest.routes());
    routes.extend_from_slice(backend_manifest.routes());
    routes.extend_from_slice(open_manifest.routes());
    let route_manifest = HttpRouteManifest::from_owned_routes(routes);
    let permission_catalog = permission_catalog(route_manifest.routes());

    Ok(ApiAssembly {
        router,
        route_manifest,
        openapi,
        permission_catalog,
        domain_context_injectors: vec![
            sdkwork_routes_clawrouter_app_api::claw_router_app_domain_context_injector(),
            sdkwork_routes_clawrouter_backend_api::claw_router_backend_domain_context_injector(),
        ],
        readiness_check,
    })
}

fn parse_openapi(owner: &str, source: &str) -> Result<Value, ApiAssemblyError> {
    let mut document: Value = serde_json::from_str(source)
        .with_context(|| format!("invalid {owner} OpenAPI authority"))?;
    normalize_openapi_for_composition(owner, &mut document)?;
    Ok(document)
}

fn normalize_openapi_for_composition(
    owner: &str,
    document: &mut Value,
) -> Result<(), ApiAssemblyError> {
    normalize_nullable_schemas(owner, document)?;
    let root = document
        .as_object_mut()
        .with_context(|| format!("{owner} OpenAPI authority root must be an object"))?;
    root.insert("openapi".to_owned(), Value::String("3.1.2".to_owned()));
    root.insert(
        "jsonSchemaDialect".to_owned(),
        Value::String("https://json-schema.org/draft/2020-12/schema".to_owned()),
    );
    for field in ["x-api-prefix", "x-sdk-client", "x-sdk-family"] {
        root.remove(field);
    }

    let info = root
        .get_mut("info")
        .and_then(Value::as_object_mut)
        .with_context(|| format!("{owner} OpenAPI authority info must be an object"))?;
    info.insert(
        "version".to_owned(),
        Value::String(env!("CARGO_PKG_VERSION").to_owned()),
    );
    info.insert(
        "description".to_owned(),
        Value::String("SDKWork Claw Router API assembly.".to_owned()),
    );
    Ok(())
}

fn normalize_nullable_schemas(owner: &str, value: &mut Value) -> Result<(), ApiAssemblyError> {
    match value {
        Value::Object(object) => {
            for child in object.values_mut() {
                normalize_nullable_schemas(owner, child)?;
            }
            let Some(nullable) = object.remove("nullable") else {
                return Ok(());
            };
            let Value::Bool(nullable) = nullable else {
                object.insert("nullable".to_owned(), nullable);
                return Ok(());
            };
            if !nullable {
                return Ok(());
            }
            add_null_schema_type(owner, object)?;
            if let Some(variants) = object.get_mut("enum").and_then(Value::as_array_mut) {
                if !variants.iter().any(Value::is_null) {
                    variants.push(Value::Null);
                }
            }
        }
        Value::Array(values) => {
            for child in values {
                normalize_nullable_schemas(owner, child)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn add_null_schema_type(
    owner: &str,
    schema: &mut Map<String, Value>,
) -> Result<(), ApiAssemblyError> {
    let schema_type = schema.get_mut("type").with_context(|| {
        format!("{owner} OpenAPI nullable schema must declare a type before composition")
    })?;
    match schema_type {
        Value::String(current) if current != "null" => {
            *schema_type = Value::Array(vec![
                Value::String(current.clone()),
                Value::String("null".to_owned()),
            ]);
        }
        Value::String(_) => {}
        Value::Array(types) => {
            if !types.iter().any(|value| value.as_str() == Some("null")) {
                types.push(Value::String("null".to_owned()));
            }
        }
        _ => anyhow::bail!("{owner} OpenAPI schema type must be a string or string array"),
    }
    Ok(())
}

fn validate_no_route_collisions(
    manifests: &[(&'static str, &HttpRouteManifest)],
) -> Result<(), ApiAssemblyError> {
    let mut routes = BTreeMap::<(String, String, String), (&str, String)>::new();
    for (owner, manifest) in manifests {
        for route in route_inventory_from_routes(manifest.routes()) {
            let identity = (
                route.surface.clone(),
                route.method.clone(),
                route.normalized_path.clone(),
            );
            if let Some((existing_owner, existing_operation)) =
                routes.insert(identity.clone(), (owner, route.operation_id.clone()))
            {
                anyhow::bail!(
                    "route collision for {} {} {}: {} ({}) conflicts with {} ({})",
                    identity.0,
                    identity.1,
                    identity.2,
                    existing_owner,
                    existing_operation,
                    owner,
                    route.operation_id
                );
            }
        }
    }
    Ok(())
}

fn permission_catalog(routes: &[HttpRoute]) -> Vec<&'static str> {
    let mut permissions = std::collections::BTreeSet::new();
    for route in routes {
        if let Some(permission) = route.required_permission {
            permissions.insert(permission);
        }
        if let Some(alternates) = route.alternate_permissions {
            permissions.extend(alternates.iter().copied());
        }
    }
    permissions.into_iter().collect()
}

async fn dispatch_application_request(
    State(routers): State<ApplicationRouters>,
    request: Request<Body>,
) -> Response {
    let method = request.method();
    let path = request.uri().path();
    let router = if is_backend_path(path) {
        (routers.context.includes_dependency_apis()
            || routers
                .backend_manifest
                .match_route(method.as_str(), path)
                .is_some())
        .then(|| routers.upstreams.backend_router())
    } else if is_app_path(path) {
        (routers.context.includes_dependency_apis()
            || routers
                .app_manifest
                .match_route(method.as_str(), path)
                .is_some())
        .then(|| routers.upstreams.router_for_path(path))
        .flatten()
    } else if routers.context.includes_dependency_apis()
        || routers
            .open_manifest
            .match_route(method.as_str(), path)
            .is_some()
    {
        open_api_capability_for_request(method, path)
            .map(|capability| routers.open.for_capability(capability))
    } else {
        None
    };

    let Some(router) = router else {
        return StatusCode::NOT_FOUND.into_response();
    };

    match router.oneshot(request).await {
        Ok(response) => response,
        Err(error) => match error {},
    }
}

impl OpenApiRouters {
    fn for_capability(&self, capability: OpenApiCapability) -> Router {
        match capability {
            OpenApiCapability::Agent => self.agent.clone(),
            OpenApiCapability::Audio => self.audio.clone(),
            OpenApiCapability::Drive => self.drive.clone(),
            OpenApiCapability::Iaas => self.iaas.clone(),
            OpenApiCapability::Image => self.image.clone(),
            OpenApiCapability::Knowledgebase => self.knowledgebase.clone(),
            OpenApiCapability::Llm => self.llm.clone(),
            OpenApiCapability::Memory => self.memory.clone(),
            OpenApiCapability::Paas => self.paas.clone(),
            OpenApiCapability::Payment => self.payment.clone(),
            OpenApiCapability::Video => self.video.clone(),
        }
    }
}

fn is_backend_path(path: &str) -> bool {
    path == "/backend" || path.starts_with("/backend/")
}

fn is_app_path(path: &str) -> bool {
    path == "/app" || path.starts_with("/app/")
}

#[cfg(test)]
mod tests {
    use axum::{
        body::Body,
        http::{Request, StatusCode},
        routing::{get as route_get, post as route_post},
        Router,
    };
    use tower::ServiceExt;

    use super::{assemble_api_router_with_in_process_upstreams, ApiAssemblyContext};

    #[tokio::test]
    async fn standalone_assembly_dispatches_selected_dependency_surfaces() {
        let router = test_assembly(ApiAssemblyContext::default());

        assert_status(&router, get("/app/v3/api/openapi.json"), StatusCode::OK).await;
        assert_status(&router, get("/backend/v3/api/openapi.json"), StatusCode::OK).await;
        assert_status(&router, get("/openapi.json"), StatusCode::OK).await;
        assert_status(
            &router,
            get("/app/v3/api/system/iam/runtime"),
            StatusCode::OK,
        )
        .await;
        assert_status(
            &router,
            post("/app/v3/api/oauth/device_authorizations"),
            StatusCode::OK,
        )
        .await;
        assert_status(
            &router,
            get("/app/v3/api/memberships/package_groups"),
            StatusCode::OK,
        )
        .await;
    }

    #[tokio::test]
    async fn cloud_assembly_exposes_only_clawrouter_owned_routes() {
        let router = test_assembly(ApiAssemblyContext::cloud_gateway());

        assert_status(
            &router,
            get("/app/v3/api/ai/dashboard/overview"),
            StatusCode::OK,
        )
        .await;
        assert_status(
            &router,
            get("/app/v3/api/memberships/package_groups"),
            StatusCode::NOT_FOUND,
        )
        .await;
        assert_status(
            &router,
            get("/app/v3/api/system/iam/runtime"),
            StatusCode::NOT_FOUND,
        )
        .await;
    }

    fn test_assembly(context: ApiAssemblyContext) -> Router {
        let gateway_router = Router::new()
            .route("/openapi.json", route_get(|| async { "open" }))
            .route("/readyz", route_get(|| async { "ready" }));
        let backend_router = Router::new()
            .route(
                "/backend/v3/api/openapi.json",
                route_get(|| async { "backend" }),
            )
            .route("/readyz", route_get(|| async { "ready" }));
        let app_router = Router::new()
            .route("/app/v3/api/openapi.json", route_get(|| async { "app" }))
            .route(
                "/app/v3/api/ai/dashboard/overview",
                route_get(|| async { "dashboard" }),
            )
            .route(
                "/app/v3/api/memberships/package_groups",
                route_get(|| async { "membership" }),
            )
            .route("/readyz", route_get(|| async { "ready" }));
        let dependency_router = Router::new()
            .route(
                "/app/v3/api/system/iam/runtime",
                route_get(|| async { "iam-runtime" }),
            )
            .route(
                "/app/v3/api/oauth/device_authorizations",
                route_post(|| async { "device-authorization" }),
            );
        assemble_api_router_with_in_process_upstreams(
            context,
            sdkwork_clawrouter_edge_runtime::EdgeInProcessUpstreams::new(
                gateway_router,
                backend_router,
                app_router,
            )
            .with_dependency_api_router(dependency_router),
        )
        .expect("valid Clawrouter assembly")
        .router
    }

    async fn assert_status(router: &Router, request: Request<Body>, expected: StatusCode) {
        let response = router
            .clone()
            .oneshot(request)
            .await
            .expect("router response");
        assert_eq!(expected, response.status());
    }

    fn get(path: &str) -> Request<Body> {
        Request::builder()
            .uri(path)
            .body(Body::empty())
            .expect("request")
    }

    fn post(path: &str) -> Request<Body> {
        Request::builder()
            .method("POST")
            .uri(path)
            .body(Body::empty())
            .expect("request")
    }
}
