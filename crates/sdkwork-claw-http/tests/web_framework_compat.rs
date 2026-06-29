use axum::body::Body;
use axum::extract::Request;
use axum::middleware::from_fn;
use axum::routing::get;
use axum::Router;
use sdkwork_web_core::{
    ServerRequestId, WebApiSurface, WebAuthLevel, WebAuthMode, WebDeploymentMode,
    WebEnvironment, WebLoginScope, WebRequestContext, WebRequestPrincipal, WebTransportFacts,
};
use tower::ServiceExt;

use sdkwork_claw_http::{
    project_trusted_subject_from_web_request_context, TrustedRequestSubject,
};

async fn echo_subject(subject: Option<TrustedRequestSubject>) -> String {
    subject
        .map(|value| format!("{}:{}:{}", value.tenant_id, value.organization_id, value.user_id))
        .unwrap_or_else(|| "missing".to_owned())
}

#[tokio::test]
async fn project_trusted_subject_middleware_resolves_from_web_request_context() {
    let router = Router::new()
        .route("/probe", get(echo_subject))
        .layer(from_fn(project_trusted_subject_from_web_request_context));

    let principal = WebRequestPrincipal::builder()
        .tenant_id("100001")
        .organization_id(Some("0".to_owned()))
        .user_id("30")
        .login_scope(WebLoginScope::Organization)
        .session_id(Some("session-1".to_owned()))
        .app_id("sdkwork-clawrouter")
        .environment(WebEnvironment::Dev)
        .deployment_mode(WebDeploymentMode::Private)
        .auth_level(WebAuthLevel::Password)
        .build();
    let context = WebRequestContext {
        request_id: ServerRequestId("compat-test".to_owned()),
        trace_id: None,
        api_surface: WebApiSurface::AppApi,
        auth_mode: WebAuthMode::DualToken,
        transport: WebTransportFacts {
            path: "/probe".to_owned(),
            method: "GET".to_owned(),
            auth_token_present: true,
            access_token_present: true,
            api_key_present: false,
            oauth_bearer_present: false,
            agent_token_present: false,
        },
        principal: Some(principal),
        locale: None,
        client_kind: None,
        operation: None,
    };

    let mut request = Request::new(Body::empty());
    *request.method_mut() = axum::http::Method::GET;
    *request.uri_mut() = "/probe".parse().expect("uri");
    request.extensions_mut().insert(context);

    let response = router.oneshot(request).await.expect("response");
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body");
    assert_eq!("100001:0:30", String::from_utf8(body.to_vec()).expect("utf8"));
}

#[tokio::test]
async fn project_trusted_subject_middleware_returns_projection_error_for_non_numeric_principal(
) {
    let router = Router::new()
        .route("/probe", get(echo_subject))
        .layer(from_fn(project_trusted_subject_from_web_request_context));

    let principal = WebRequestPrincipal::builder()
        .tenant_id("tenant-bootstrap")
        .organization_id(Some("0".to_owned()))
        .user_id("system")
        .login_scope(WebLoginScope::Tenant)
        .session_id(Some("session-1".to_owned()))
        .app_id("sdkwork-clawrouter")
        .environment(WebEnvironment::Dev)
        .deployment_mode(WebDeploymentMode::Private)
        .auth_level(WebAuthLevel::Password)
        .build();
    let context = WebRequestContext {
        request_id: ServerRequestId("compat-test".to_owned()),
        trace_id: None,
        api_surface: WebApiSurface::AppApi,
        auth_mode: WebAuthMode::DualToken,
        transport: WebTransportFacts {
            path: "/probe".to_owned(),
            method: "GET".to_owned(),
            auth_token_present: true,
            access_token_present: true,
            api_key_present: false,
            oauth_bearer_present: false,
            agent_token_present: false,
        },
        principal: Some(principal),
        locale: None,
        client_kind: None,
        operation: None,
    };

    let mut request = Request::new(Body::empty());
    *request.method_mut() = axum::http::Method::GET;
    *request.uri_mut() = "/probe".parse().expect("uri");
    request.extensions_mut().insert(context);

    let response = router.oneshot(request).await.expect("response");
    assert_eq!(axum::http::StatusCode::INTERNAL_SERVER_ERROR, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body");
    let payload: serde_json::Value = serde_json::from_slice(&body).expect("json");
    assert_eq!("5001", payload["code"]);
}
