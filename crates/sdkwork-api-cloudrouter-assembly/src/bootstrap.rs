//! Host-neutral API composition for sdkwork-cloudrouter.

mod iam;

use std::{collections::BTreeMap, sync::Arc};

use anyhow::Context;
use axum::{
    body::Body,
    extract::State,
    http::{Method, Request, StatusCode},
    response::{IntoResponse, Response},
    Router,
};
use sdkwork_account_repository_sqlx::PostgresCommerceAccountStore;
use sdkwork_cloudrouter_http::{
    open_api_capability_for_request, remove_internal_trusted_subject_headers, OpenApiCapability,
};
use sdkwork_web_bootstrap::{
    ApiAssemblyContribution, CompositeReadinessCheck, ReadinessCheck, ReadinessFuture,
};
use sdkwork_web_contract::{merge_openapi_documents, route_inventory_from_routes, HttpRoute};
use sdkwork_web_core::HttpRouteManifest;
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

pub type ApiAssembly = ApiAssemblyContribution;

pub type ApiAssemblyError = anyhow::Error;

#[derive(Clone)]
struct ApplicationRouters {
    context: ApiAssemblyContext,
    upstreams: sdkwork_cloudrouter_edge_runtime::EdgeInProcessUpstreams,
    app_manifest: HttpRouteManifest,
    backend_manifest: HttpRouteManifest,
    open_manifest: HttpRouteManifest,
    open: OpenApiRouters,
    /// Account-domain wallet store used to provision the standard owner
    /// accounts (cash/points/token bank) right after a successful IAM
    /// registration in the standalone profile. `None` in cloud-gateway mode,
    /// where IAM is an external dependency.
    account_provisioner: Option<Arc<PostgresCommerceAccountStore>>,
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
    sdkwork_api_models_assembly::bootstrap_database_from_env()
        .await
        .map_err(anyhow::Error::msg)?;
    let upstreams =
        sdkwork_cloudrouter_edge_runtime::runtime::all_in_one_in_process_upstreams_from_env()
            .await?;
    let (upstreams, account_provisioner) = if context.includes_dependency_apis() {
        let iam_router = iam::wire_iam_app_router().await?;
        let provisioner = resolve_account_provisioner().await?;
        (
            upstreams.with_dependency_api_router(iam_router),
            Some(provisioner),
        )
    } else {
        (upstreams, None)
    };
    assemble_api_router_with_in_process_upstreams(context, upstreams, account_provisioner)
}

/// Bootstraps the account-domain service host and returns its PostgreSQL
/// store for registration-time wallet provisioning.
///
/// The wallet tables (`acct_*`) live in the account domain; bootstrapping the
/// account host runs that domain's schema lifecycle in the shared workspace
/// database. The store is idempotent, so reusing it for later provisioning
/// calls is safe.
async fn resolve_account_provisioner() -> Result<Arc<PostgresCommerceAccountStore>, ApiAssemblyError>
{
    let pool = sdkwork_account_service_host::AccountServiceHost::from_env()
        .await
        .map_err(anyhow::Error::msg)?
        .database_pool()
        .as_postgres()
        .cloned()
        .ok_or_else(|| {
            anyhow::Error::msg("standalone API assembly requires a PostgreSQL account pool")
        })?;
    Ok(Arc::new(PostgresCommerceAccountStore::new(pool)))
}

fn assemble_api_router_with_in_process_upstreams(
    context: ApiAssemblyContext,
    upstreams: sdkwork_cloudrouter_edge_runtime::EdgeInProcessUpstreams,
    account_provisioner: Option<Arc<PostgresCommerceAccountStore>>,
) -> Result<ApiAssembly, ApiAssemblyError> {
    let app_manifest = sdkwork_routes_cloudrouter_app_api::http_route_manifest();
    let backend_manifest = sdkwork_routes_cloudrouter_backend_api::http_route_manifest();
    let open_manifest = crate::generated_open_http_route_manifest::http_route_manifest();
    validate_no_route_collisions(&[
        ("sdkwork-cloudrouter-app-api", &app_manifest),
        ("sdkwork-cloudrouter-backend-api", &backend_manifest),
        ("sdkwork-cloudrouter-open-api", &open_manifest),
    ])?;

    let app_openapi = parse_openapi(
        "sdkwork-cloudrouter-app-api",
        include_str!("../../../apis/app-api/cloudrouter/cloudrouter-app-api.openapi.json"),
    )?;
    let backend_openapi = parse_openapi(
        "sdkwork-cloudrouter-backend-api",
        include_str!("../../../apis/backend-api/cloudrouter/cloudrouter-backend-api.openapi.json"),
    )?;
    let open_openapi = parse_openapi(
        "sdkwork-cloudrouter-open-api",
        include_str!("../../../apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json"),
    )?;
    let openapi = merge_openapi_documents(
        "SDKWork Cloud Router API",
        [
            ("sdkwork-cloudrouter-app-api", &app_openapi),
            ("sdkwork-cloudrouter-backend-api", &backend_openapi),
            ("sdkwork-cloudrouter-open-api", &open_openapi),
        ],
    )?;

    let readiness_check = Arc::new(CompositeReadinessCheck::new(vec![
        Arc::new(RouterReadinessCheck::new(
            "cloudrouter-open-api",
            upstreams.gateway_router(),
        )) as Arc<dyn ReadinessCheck>,
        Arc::new(RouterReadinessCheck::new(
            "cloudrouter-app-api",
            upstreams.app_router(),
        )),
        Arc::new(RouterReadinessCheck::new(
            "cloudrouter-backend-api",
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
            drive: sdkwork_routes_cloudrouter_drive_open_api::gateway_mount(open_runtime.clone()),
            iaas: sdkwork_routes_iaas_open_api::gateway_mount(open_runtime.clone()),
            image: sdkwork_routes_image_open_api::gateway_mount(open_runtime.clone()),
            knowledgebase: sdkwork_routes_cloudrouter_knowledgebase_open_api::gateway_mount(
                open_runtime.clone(),
            ),
            llm: sdkwork_routes_cloudrouter_llm_open_api::gateway_mount(open_runtime.clone()),
            memory: sdkwork_routes_cloudrouter_memory_open_api::gateway_mount(open_runtime.clone()),
            paas: sdkwork_routes_paas_open_api::gateway_mount(open_runtime.clone()),
            payment: sdkwork_routes_payment_open_api::gateway_mount(open_runtime.clone()),
            video: sdkwork_routes_video_open_api::gateway_mount(open_runtime),
        },
        account_provisioner,
    };
    let router = Router::new()
        // Surface dispatcher is mounted as an explicit catch-all route, not as
        // a fallback: `ComposedApiAssembly::into_hosted` installs the web
        // framework contract fallback (manifest-known -> 501, unknown -> 404),
        // which would otherwise shadow a fallback-based dispatcher and turn
        // every app/backend/open-api request into a contract error.
        .route("/{*path}", axum::routing::any(dispatch_application_request))
        .with_state(routers);
    let mut routes = Vec::new();
    routes.extend_from_slice(app_manifest.routes());
    routes.extend_from_slice(backend_manifest.routes());
    routes.extend_from_slice(open_manifest.routes());
    let route_manifest = HttpRouteManifest::from_owned_routes(routes);
    let permission_catalog = permission_catalog(route_manifest.routes());

    ApiAssemblyContribution::try_new(
        "sdkwork-cloudrouter",
        router,
        route_manifest,
        openapi,
        permission_catalog,
        vec![
            sdkwork_routes_cloudrouter_app_api::cloud_router_app_domain_context_injector(),
            sdkwork_routes_cloudrouter_backend_api::cloud_router_backend_domain_context_injector(),
        ],
        readiness_check,
    )
    .map_err(anyhow::Error::msg)
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
        Value::String("SDKWork Cloud Router API assembly.".to_owned()),
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
    mut request: Request<Body>,
) -> Response {
    let method = request.method().clone();
    let path = request.uri().path().to_owned();
    let is_registration = method == Method::POST && path == REGISTRATION_APP_PATH;
    let router = if is_backend_path(&path) {
        (routers.context.includes_dependency_apis()
            || routers
                .backend_manifest
                .match_route(method.as_str(), path.as_str())
                .is_some())
        .then(|| routers.upstreams.backend_router())
    } else if is_app_path(&path) {
        (routers.context.includes_dependency_apis()
            || routers
                .app_manifest
                .match_route(method.as_str(), path.as_str())
                .is_some())
        .then(|| routers.upstreams.router_for_path(path.as_str()))
        .flatten()
    } else if routers.context.includes_dependency_apis()
        || routers
            .open_manifest
            .match_route(method.as_str(), path.as_str())
            .is_some()
    {
        open_api_capability_for_request(&method, path.as_str())
            .map(|capability| routers.open.for_capability(capability))
    } else {
        None
    };

    let Some(router) = router else {
        return StatusCode::NOT_FOUND.into_response();
    };

    // The outer Web Framework pipeline has already authenticated the request
    // and its domain injector projected the principal into internal
    // `x-sdkwork-tenant-id`/`x-sdkwork-organization-id`/`x-sdkwork-user-id`
    // headers. The in-process upstream runs its own Web Framework pipeline,
    // whose surface classification rejects those headers as client-supplied
    // identity projection (40001). Strip them before dispatch so the upstream
    // re-authenticates from the dual tokens and re-projects its own subject.
    remove_internal_trusted_subject_headers(request.headers_mut());

    // Reset extensions before running the upstream: axum appends (rather than
    // replaces) matched path params on the request extension, so the outer
    // `/{*path}` capture would leak into the upstream match and every
    // single-capture `Path<T>` extractor would observe the wildcard plus its
    // own capture (40001 "Expected 1 but got 2"). Each surface router re-runs
    // its own Web Framework pipeline, which re-creates the request context,
    // locale, and domain projections from a clean slate.
    let (mut parts, body) = request.into_parts();
    parts.extensions = axum::http::Extensions::new();
    let request = Request::from_parts(parts, body);

    let response = match router.oneshot(request).await {
        Ok(response) => response,
        Err(error) => match error {},
    };
    if is_registration {
        provision_accounts_after_registration(&routers, response).await
    } else {
        response
    }
}

/// IAM app registration path (`POST /app/v3/api/auth/registrations`).
const REGISTRATION_APP_PATH: &str = "/app/v3/api/auth/registrations";

/// Upper bound for the registration response body the provisioner inspects.
const REGISTRATION_RESPONSE_BODY_LIMIT: usize = 1 << 20;

/// After a successful IAM registration, provision the new owner's standard
/// wallet accounts (cash, points, token bank) so the wallet exists with zero
/// initial balances immediately after signup.
///
/// Provisioning is best-effort and idempotent: a failure only degrades to the
/// lazy provision-on-read behaviour of the account read paths and never
/// alters the registration response.
async fn provision_accounts_after_registration(
    routers: &ApplicationRouters,
    response: Response,
) -> Response {
    let Some(store) = routers.account_provisioner.as_ref() else {
        return response;
    };
    if !response.status().is_success() {
        return response;
    }
    let (parts, body) = response.into_parts();
    let body_bytes = match axum::body::to_bytes(body, REGISTRATION_RESPONSE_BODY_LIMIT).await {
        Ok(bytes) => bytes,
        Err(error) => {
            tracing::warn!(
                target = "cloudrouter.assembly.registration",
                error = %error,
                "registration response body read failed; skipping account provisioning"
            );
            return Response::from_parts(parts, Body::empty());
        }
    };
    let Some((tenant_id, user_id)) = registration_user_subject(&body_bytes) else {
        tracing::warn!(
            target = "cloudrouter.assembly.registration",
            "registration response carried no resolvable user subject; skipping account provisioning"
        );
        return Response::from_parts(parts, Body::from(body_bytes));
    };
    if let Err(error) = store
        .provision_owner_accounts(&tenant_id, None, &user_id, None)
        .await
    {
        tracing::warn!(
            target = "cloudrouter.assembly.registration",
            tenant_id = %tenant_id,
            owner_user_id = %user_id,
            error = error.message(),
            "registration account provisioning failed; wallet will provision on first read"
        );
    }
    Response::from_parts(parts, Body::from(body_bytes))
}

/// Extracts `(tenantId, userId)` from the IAM registration response envelope
/// (`data.user.tenantId` / `data.user.id`), which both the session and the
/// login-context-challenge shapes carry.
fn registration_user_subject(body: &[u8]) -> Option<(String, String)> {
    let value: Value = serde_json::from_slice(body).ok()?;
    let user = value.get("data")?.get("user")?;
    let tenant_id = user.get("tenantId")?.as_str()?.to_owned();
    let user_id = user.get("id")?.as_str()?.to_owned();
    Some((tenant_id, user_id))
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
        body::{to_bytes, Body},
        extract::Path,
        http::{Request, StatusCode},
        routing::{get as route_get, post as route_post},
        Router,
    };
    use serde_json::json;
    use tower::ServiceExt;

    use super::{
        assemble_api_router_with_in_process_upstreams, registration_user_subject,
        ApiAssemblyContext,
    };

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
        // Dependency-owned membership backend surface is dispatched to the
        // in-process backend router in the standalone profile
        // (API_ASSEMBLY_SPEC §6.1 same-origin dependency composition).
        assert_status(
            &router,
            get("/backend/v3/api/memberships/plans"),
            StatusCode::OK,
        )
        .await;
        assert_status(
            &router,
            get("/backend/v3/api/memberships/package_groups"),
            StatusCode::OK,
        )
        .await;
        // Dependency-owned community backend surface is dispatched to the
        // in-process backend router in the standalone profile
        // (API_ASSEMBLY_SPEC §6.1 same-origin dependency composition).
        assert_status(
            &router,
            get("/backend/v3/api/community/categories"),
            StatusCode::OK,
        )
        .await;
    }

    #[tokio::test]
    async fn cloud_assembly_exposes_only_cloudrouter_owned_routes() {
        let router = test_assembly(ApiAssemblyContext::cloud_gateway());

        assert_status(
            &router,
            get("/app/v3/api/ai/dashboard/overview"),
            StatusCode::OK,
        )
        .await;
        // Dependency-owned membership app surface is not part of the
        // Cloud Router-owned route inventory; the cloud profile does not
        // expose it (external dependency upstream serves it).
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
        // Dependency-owned membership backend surface is not part of the
        // Cloud Router-owned route inventory; the cloud profile does not
        // expose it (external dependency upstream serves it).
        assert_status(
            &router,
            get("/backend/v3/api/memberships/plans"),
            StatusCode::NOT_FOUND,
        )
        .await;
        // Dependency-owned community backend surface is likewise external in
        // the cloud profile (API_ASSEMBLY_SPEC §6.2 external dependency
        // upstream serves it).
        assert_status(
            &router,
            get("/backend/v3/api/community/categories"),
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
            .route(
                "/backend/v3/api/memberships/plans",
                route_get(|| async { "membership-plans" }),
            )
            .route(
                "/backend/v3/api/memberships/package_groups",
                route_get(|| async { "membership-groups" }),
            )
            .route(
                "/backend/v3/api/community/categories",
                route_get(|| async { "community-categories" }),
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
            .route(
                "/app/v3/api/ai/agents/{agentId}",
                route_get(|Path(agent_id): Path<String>| async move { agent_id }),
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
            sdkwork_cloudrouter_edge_runtime::EdgeInProcessUpstreams::new(
                gateway_router,
                backend_router,
                app_router,
            )
            .with_dependency_api_router(dependency_router),
            None,
        )
        .expect("valid Cloudrouter assembly")
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

    #[tokio::test]
    async fn dispatcher_does_not_leak_catch_all_param_into_upstream_path_extractor() {
        // The catch-all dispatcher route captures `{*path}`; axum appends
        // matched params to the existing extension instead of replacing
        // them, so an upstream single-capture `Path<T>` extractor would
        // observe the outer wildcard plus its own capture and fail with
        // 40001 "Expected 1 but got 2". Dispatch must reset path params.
        let router = test_assembly(ApiAssemblyContext::default());
        let response = router
            .clone()
            .oneshot(get("/app/v3/api/ai/agents/agent.chat.default"))
            .await
            .expect("router response");
        assert_eq!(response.status(), StatusCode::OK);
        let body = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body should be readable");
        assert_eq!(&body[..], b"agent.chat.default");
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

    #[test]
    fn registration_user_subject_resolves_session_envelope() {
        let body = json!({
            "code": 0,
            "data": {
                "accessToken": "session-token",
                "user": {
                    "id": "344117034923069440",
                    "tenantId": "100001",
                    "username": "new-user"
                }
            },
            "traceId": "trace-1"
        });
        assert_eq!(
            registration_user_subject(&serde_json::to_vec(&body).expect("json")),
            Some(("100001".to_owned(), "344117034923069440".to_owned()))
        );
    }

    #[test]
    fn registration_user_subject_resolves_challenge_envelope() {
        let body = json!({
            "code": 0,
            "data": {
                "challengeType": "LOGIN_CONTEXT_SELECTION",
                "accessToken": null,
                "user": {
                    "id": "344117034923069440",
                    "tenantId": "100001"
                }
            },
            "traceId": "trace-2"
        });
        assert_eq!(
            registration_user_subject(&serde_json::to_vec(&body).expect("json")),
            Some(("100001".to_owned(), "344117034923069440".to_owned()))
        );
    }

    #[test]
    fn registration_user_subject_rejects_non_success_envelopes() {
        let body = json!({
            "code": 1001,
            "data": null,
            "message": "conflict",
            "traceId": "trace-3"
        });
        assert_eq!(
            registration_user_subject(&serde_json::to_vec(&body).expect("json")),
            None
        );
        assert_eq!(registration_user_subject(b"not json"), None);
        assert_eq!(registration_user_subject(b"{}"), None);
    }

    #[test]
    fn merged_route_manifest_passes_standalone_gateway_surface_auth_validation() {
        use sdkwork_web_core::{classify_api_surface, WebApiSurface, WebEnvironment};

        let app_manifest = sdkwork_routes_cloudrouter_app_api::http_route_manifest();
        let backend_manifest = sdkwork_routes_cloudrouter_backend_api::http_route_manifest();
        let open_manifest = crate::generated_open_http_route_manifest::http_route_manifest();
        super::validate_no_route_collisions(&[
            ("sdkwork-cloudrouter-app-api", &app_manifest),
            ("sdkwork-cloudrouter-backend-api", &backend_manifest),
            ("sdkwork-cloudrouter-open-api", &open_manifest),
        ])
        .expect("merged route manifests must not collide");
        let mut routes = Vec::new();
        routes.extend_from_slice(app_manifest.routes());
        routes.extend_from_slice(backend_manifest.routes());
        routes.extend_from_slice(open_manifest.routes());
        let manifest = sdkwork_web_core::HttpRouteManifest::from_owned_routes(routes);

        // Mirror sdkwork-api-cloudrouter-standalone-gateway::main: `/v1` and
        // the vendor prefixes are open-api surfaces, and the gateway surface
        // must exclude them. Otherwise open-api auth profiles
        // (api-key-or-dual-token) are rejected as gateway-api routes during
        // framework startup validation.
        let open_api_prefixes = [
            "/v1",
            "/anthropic/v1",
            "/google/v1beta",
            "/kling/v1",
            "/midjourney/v1",
            "/nano-banana/v1",
            "/suno/v1",
        ]
        .iter()
        .map(|prefix| (*prefix).to_owned())
        .collect::<Vec<_>>();
        let gateway_api_prefixes = sdkwork_web_core::WebRequestContextProfile::default()
            .gateway_api_prefixes
            .into_iter()
            .filter(|prefix| !open_api_prefixes.iter().any(|open| open == prefix))
            .collect::<Vec<_>>();
        assert!(
            gateway_api_prefixes.is_empty(),
            "the standalone gateway profile must not treat /v1 as a gateway surface"
        );
        let profile = sdkwork_web_core::WebRequestContextProfile {
            open_api_prefixes,
            gateway_api_prefixes,
            environment: WebEnvironment::Dev,
            ..sdkwork_web_core::WebRequestContextProfile::default()
        };

        for path in [
            "/v1/assistants",
            "/v1/chat/completions",
            "/anthropic/v1/messages",
        ] {
            assert_eq!(
                classify_api_surface(path, &profile),
                WebApiSurface::OpenApi,
                "{path} must classify as open-api for the standalone gateway"
            );
        }
        manifest
            .validate_route_auth_for_surfaces(&profile)
            .expect("standalone gateway route manifest must satisfy surface auth validation");
    }
}
