use axum::extract::Request;
use axum::http::{header, HeaderName, HeaderValue, StatusCode};
use axum::middleware::{from_fn, from_fn_with_state, Next};
use axum::response::{IntoResponse, Response};
use axum::Json;
use axum::Router;
use sdkwork_claw_config::is_production_like_runtime_environment;
use sdkwork_utils_rust::{SdkWorkProblemDetail, SdkWorkProblemRouting, SdkWorkResultCode};
use sdkwork_web_core::WebRequestContext;

use crate::auth::{
    app_request_subject_boundary, federated_app_request_subject_boundary,
    optional_app_request_subject_boundary, project_trusted_subject_for_legacy_handlers,
    AppSubjectBoundaryConfig, TrustedRequestSubject,
};
use crate::web_bridge::authenticated_principal_failed_trusted_subject_projection;

fn env_flag_enabled(value: Option<&str>) -> bool {
    matches!(value, Some("1" | "true" | "TRUE" | "yes" | "YES"))
}

fn env_flag_disabled(value: Option<&str>) -> bool {
    matches!(value, Some("0" | "false" | "FALSE" | "no" | "NO"))
}

/// Returns true when the sdkwork-web-framework pipeline should own HTTP auth/context.
pub fn claw_web_framework_enabled_from_env() -> bool {
    if env_flag_enabled(
        std::env::var("SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY")
            .ok()
            .as_deref(),
    ) {
        return false;
    }
    match std::env::var("SDKWORK_CLAW_WEB_FRAMEWORK_ENABLED")
        .ok()
        .as_deref()
    {
        value if env_flag_disabled(value) => false,
        value if env_flag_enabled(value) => true,
        _ => true,
    }
}

/// Projects `TrustedRequestSubject` from the sdkwork-web-framework `WebRequestContext`
/// already attached by the outer pipeline. This is the claw-specific bridge for legacy
/// SQL handlers and must not parse claw app-session tokens.
pub async fn project_trusted_subject_from_web_request_context(
    mut request: Request<axum::body::Body>,
    next: Next,
) -> Response {
    if TrustedRequestSubject::from_extensions(request.extensions()).is_none() {
        if let Some(subject) =
            TrustedRequestSubject::resolve_optional(request.headers(), request.extensions())
        {
            project_trusted_subject_for_legacy_handlers(&mut request, subject);
        } else if authenticated_principal_failed_trusted_subject_projection(request.extensions())
        {
            return trusted_subject_projection_failed_response(&request);
        }
    }
    next.run(request).await
}

/// Fail fast when production-like deployments disable sdkwork-web-framework IAM.
pub fn ensure_production_web_framework_security_policy() {
    let runtime_toml = sdkwork_claw_config::RuntimeTomlConfig::from_env_config_file()
        .ok()
        .flatten();
    if !is_production_like_runtime_environment(runtime_toml.as_ref()) {
        return;
    }
    if env_flag_enabled(
        std::env::var("SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY")
            .ok()
            .as_deref(),
    ) {
        panic!(
            "SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY must not be enabled in production-like environments"
        );
    }
    if !claw_web_framework_enabled_from_env() {
        panic!(
            "sdkwork-web-framework must remain enabled in production-like environments; do not set SDKWORK_CLAW_WEB_FRAMEWORK_ENABLED=false"
        );
    }
}

fn trusted_subject_projection_failed_response(request: &Request<axum::body::Body>) -> Response {
    let trace_id = request
        .extensions()
        .get::<WebRequestContext>()
        .map(|context| context.resolved_trace_id())
        .unwrap_or_else(sdkwork_utils_rust::uuid);
    let routing = request
        .extensions()
        .get::<WebRequestContext>()
        .map(WebRequestContext::problem_routing)
        .unwrap_or_else(|| {
            SdkWorkProblemRouting::from_parts(
                Some(request.method().as_str()),
                None,
                Some(request.uri().path()),
                None,
            )
        });
    let problem = SdkWorkProblemDetail::platform_enriched(
        SdkWorkResultCode::InternalError,
        "authenticated principal could not be projected to trusted request subject",
        trace_id.clone(),
        routing,
    );
    let mut response = (
        StatusCode::INTERNAL_SERVER_ERROR,
        [(header::CONTENT_TYPE, "application/problem+json")],
        Json(problem),
    )
        .into_response();
    if let Ok(value) = HeaderValue::from_str(&trace_id) {
        response.headers_mut().insert(
            HeaderName::from_static("x-sdkwork-trace-id"),
            value,
        );
    }
    response
}

pub fn apply_app_subject_boundary_if_legacy(
    router: Router,
    config: AppSubjectBoundaryConfig,
) -> Router {
    if claw_web_framework_enabled_from_env() {
        return router.layer(from_fn(project_trusted_subject_from_web_request_context));
    }
    router.layer(from_fn_with_state(config, app_request_subject_boundary))
}

pub fn apply_optional_app_subject_boundary_if_legacy(
    router: Router,
    config: AppSubjectBoundaryConfig,
) -> Router {
    if claw_web_framework_enabled_from_env() {
        return router.layer(from_fn(project_trusted_subject_from_web_request_context));
    }
    router.layer(from_fn_with_state(
        config,
        optional_app_request_subject_boundary,
    ))
}

/// Merges app-api routers that resolve SQL scope from `WebRequestContext` directly.
/// Legacy subject-boundary middleware is only mounted when web-framework mode is disabled.
pub fn merge_web_framework_scoped_app_router(
    router: Router,
    scoped_router: Router,
    legacy_config: AppSubjectBoundaryConfig,
) -> Router {
    merge_web_framework_scoped_app_read_router(router, scoped_router, legacy_config)
}

/// Merges app-api read routers that resolve SQL scope from `WebRequestContext` directly.
/// Legacy subject-boundary middleware is only mounted when web-framework mode is disabled.
pub fn merge_web_framework_scoped_app_read_router(
    router: Router,
    scoped_router: Router,
    legacy_config: AppSubjectBoundaryConfig,
) -> Router {
    if claw_web_framework_enabled_from_env() {
        router.merge(scoped_router)
    } else {
        router.merge(apply_app_subject_boundary_if_legacy(
            scoped_router,
            legacy_config,
        ))
    }
}

/// Merges federated T1 app-api capability routers with Claw app-session auth.
pub fn merge_federated_app_capability_router(
    router: Router,
    capability_router: Router,
    legacy_config: AppSubjectBoundaryConfig,
) -> Router {
    router.merge(
        capability_router.layer(from_fn_with_state(
            legacy_config,
            federated_app_request_subject_boundary,
        )),
    )
}

/// Merges federated commerce routers that include manifest-public routes such as
/// `GET /app/v3/api/recharges/packages`.
pub fn merge_federated_app_capability_router_with_optional_auth(
    router: Router,
    capability_router: Router,
    legacy_config: AppSubjectBoundaryConfig,
) -> Router {
    router.merge(
        capability_router.layer(from_fn_with_state(
            legacy_config,
            optional_app_request_subject_boundary,
        )),
    )
}

#[cfg(test)]
mod tests {
    use super::claw_web_framework_enabled_from_env;

    #[test]
    fn claw_web_framework_enabled_by_default() {
        let legacy = std::env::var("SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY")
            .ok()
            .filter(|value| !value.trim().is_empty())
            .is_some();
        if legacy {
            return;
        }
        assert!(claw_web_framework_enabled_from_env());
    }
}
