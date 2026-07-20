//! Host-neutral API composition for sdkwork-clawrouter.

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

pub type ApiAssemblyError = sdkwork_clawrouter_edge_runtime::GatewayRouterError;

#[derive(Clone)]
struct ApplicationRouters {
    app: Router,
    backend: Router,
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
    let open_runtime = sdkwork_clawrouter_edge_runtime::router_from_env().await?;
    Ok(assemble_api_router_with_open_runtime(open_runtime))
}

fn assemble_api_router_with_open_runtime(open_runtime: Router) -> ApiAssembly {
    let routers = ApplicationRouters {
        app: sdkwork_routes_clawrouter_app_api::gateway_mount(),
        backend: sdkwork_routes_clawrouter_backend_api::gateway_mount(),
        open: OpenApiRouters {
            agent: sdkwork_routes_agent_open_api::gateway_mount(open_runtime.clone()),
            audio: sdkwork_routes_audio_open_api::gateway_mount(open_runtime.clone()),
            drive: sdkwork_routes_drive_open_api::gateway_mount(open_runtime.clone()),
            iaas: sdkwork_routes_iaas_open_api::gateway_mount(open_runtime.clone()),
            image: sdkwork_routes_image_open_api::gateway_mount(open_runtime.clone()),
            knowledgebase: sdkwork_routes_knowledgebase_open_api::gateway_mount(
                open_runtime.clone(),
            ),
            llm: sdkwork_routes_llm_open_api::gateway_mount(open_runtime.clone()),
            memory: sdkwork_routes_memory_open_api::gateway_mount(open_runtime.clone()),
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
    let router = if is_backend_path(path) {
        Some(routers.backend)
    } else if is_app_path(path) {
        Some(routers.app)
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
    };
    use tower::ServiceExt;

    use super::assemble_api_router_with_open_runtime;

    #[tokio::test]
    async fn application_assembly_dispatches_each_api_surface() {
        let router =
            assemble_api_router_with_open_runtime(sdkwork_clawrouter_edge_runtime::router()).router;

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

        let payment_schema_response = router
            .oneshot(get("/payments/v3/openapi.json"))
            .await
            .expect("payment schema response");
        assert_eq!(StatusCode::OK, payment_schema_response.status());
    }

    fn get(path: &str) -> Request<Body> {
        Request::builder()
            .uri(path)
            .body(Body::empty())
            .expect("request")
    }
}
