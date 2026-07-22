//! Host-neutral API composition for sdkwork-clawrouter.

mod iam;

use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
    Router,
};
use sdkwork_claw_http::{open_api_capability_for_request, OpenApiCapability};
use tower::ServiceExt;

pub struct ApiAssembly {
    pub router: Router,
}

pub type ApiAssemblyError = anyhow::Error;

#[derive(Clone)]
struct ApplicationRouters {
    upstreams: sdkwork_clawrouter_edge_runtime::EdgeInProcessUpstreams,
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

pub async fn assemble_api_router() -> Result<ApiAssembly, ApiAssemblyError> {
    let upstreams =
        sdkwork_clawrouter_edge_runtime::runtime::all_in_one_in_process_upstreams_from_env()
            .await?;
    let iam_router = iam::wire_iam_app_router().await?;
    Ok(assemble_api_router_with_in_process_upstreams(
        upstreams.with_dependency_api_router(iam_router),
    ))
}

fn assemble_api_router_with_in_process_upstreams(
    upstreams: sdkwork_clawrouter_edge_runtime::EdgeInProcessUpstreams,
) -> ApiAssembly {
    let open_runtime = upstreams.gateway_router();
    let routers = ApplicationRouters {
        upstreams,
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
    ApiAssembly { router }
}

async fn dispatch_application_request(
    State(routers): State<ApplicationRouters>,
    request: Request<Body>,
) -> Response {
    let path = request.uri().path();
    let router = if is_backend_path(path) || is_app_path(path) {
        routers.upstreams.router_for_path(path)
    } else {
        open_api_capability_for_request(request.method(), path)
            .map(|capability| routers.open.for_capability(capability))
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

    use super::assemble_api_router_with_in_process_upstreams;

    #[tokio::test]
    async fn application_assembly_dispatches_shared_runtime_surfaces() {
        let gateway_router = Router::new().route("/openapi.json", route_get(|| async { "open" }));
        let backend_router = Router::new().route(
            "/backend/v3/api/openapi.json",
            route_get(|| async { "backend" }),
        );
        let app_router = Router::new()
            .route("/app/v3/api/openapi.json", route_get(|| async { "app" }))
            .route(
                "/app/v3/api/memberships/package_groups",
                route_get(|| async { "membership" }),
            );
        let dependency_router = Router::new()
            .route(
                "/app/v3/api/system/iam/runtime",
                route_get(|| async { "iam-runtime" }),
            )
            .route(
                "/app/v3/api/oauth/device_authorizations",
                route_post(|| async { "device-authorization" }),
            );
        let router = assemble_api_router_with_in_process_upstreams(
            sdkwork_clawrouter_edge_runtime::EdgeInProcessUpstreams::new(
                gateway_router,
                backend_router,
                app_router,
            )
            .with_dependency_api_router(dependency_router),
        )
        .router;

        let app_response = router
            .clone()
            .oneshot(get("/app/v3/api/openapi.json"))
            .await
            .expect("app router response");
        assert_eq!(StatusCode::OK, app_response.status());

        let backend_response = router
            .clone()
            .oneshot(get("/backend/v3/api/openapi.json"))
            .await
            .expect("backend router response");
        assert_eq!(StatusCode::OK, backend_response.status());

        let llm_schema_response = router
            .clone()
            .oneshot(get("/openapi.json"))
            .await
            .expect("LLM schema response");
        assert_eq!(StatusCode::OK, llm_schema_response.status());

        let iam_runtime_response = router
            .clone()
            .oneshot(get("/app/v3/api/system/iam/runtime"))
            .await
            .expect("IAM runtime response");
        assert_eq!(StatusCode::OK, iam_runtime_response.status());

        let device_authorization_response = router
            .clone()
            .oneshot(post("/app/v3/api/oauth/device_authorizations"))
            .await
            .expect("device authorization response");
        assert_eq!(StatusCode::OK, device_authorization_response.status());

        let membership_response = router
            .oneshot(get("/app/v3/api/memberships/package_groups"))
            .await
            .expect("membership response");
        assert_eq!(StatusCode::OK, membership_response.status());
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
