use axum::http::request::Builder;
use axum::http::Request;
use sdkwork_web_core::{
    ServerRequestId, WebApiSurface, WebAuthLevel, WebAuthMode, WebDeploymentMode, WebEnvironment,
    WebLoginScope, WebRequestContext, WebRequestPrincipal, WebTransportFacts,
};
use std::sync::Once;

pub const INTERNAL_TENANT_HEADER: &str = concat!("x-sdkwork-", "tenant-id");
pub const INTERNAL_ORGANIZATION_HEADER: &str = concat!("x-sdkwork-", "organization-id");
pub const INTERNAL_USER_HEADER: &str = concat!("x-sdkwork-", "user-id");

static LEGACY_TRUSTED_SUBJECT_ENV: Once = Once::new();

pub fn enable_legacy_trusted_subject_headers() {
    LEGACY_TRUSTED_SUBJECT_ENV.call_once(|| {
        // Router unit tests inject trusted subject via signed internal headers.
        // Disable web-framework-only resolution so header fallback remains available.
        std::env::set_var("SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY", "true");
    });
}

pub trait InternalTrustedSubjectHeaders {
    fn internal_trusted_subject(self, tenant_id: i64, organization_id: i64, user_id: i64) -> Self;
}

impl InternalTrustedSubjectHeaders for Builder {
    fn internal_trusted_subject(self, tenant_id: i64, organization_id: i64, user_id: i64) -> Self {
        enable_legacy_trusted_subject_headers();
        self.header(INTERNAL_TENANT_HEADER, tenant_id.to_string())
            .header(INTERNAL_ORGANIZATION_HEADER, organization_id.to_string())
            .header(INTERNAL_USER_HEADER, user_id.to_string())
    }
}

#[allow(dead_code)]
pub fn missing_internal_tenant_header_message() -> &'static str {
    concat!("x-sdkwork-", "tenant-id", " header is required")
}

pub fn web_framework_app_request<B>(
    method: &str,
    uri: &str,
    body: B,
    tenant_id: &str,
    organization_id: Option<&str>,
    user_id: &str,
) -> Request<B>
where
    B: Send + 'static,
{
    let principal = WebRequestPrincipal::builder()
        .tenant_id(tenant_id)
        .organization_id(organization_id.map(str::to_owned))
        .user_id(user_id)
        .login_scope(WebLoginScope::Organization)
        .session_id(Some("session-1".to_owned()))
        .app_id("sdkwork-clawrouter")
        .environment(WebEnvironment::Dev)
        .deployment_mode(WebDeploymentMode::Private)
        .auth_level(WebAuthLevel::Password)
        .build();
    let context = WebRequestContext {
        request_id: ServerRequestId("router-test".to_owned()),
        trace_id: None,
        api_surface: WebApiSurface::AppApi,
        auth_mode: WebAuthMode::DualToken,
        transport: WebTransportFacts {
            path: uri.to_owned(),
            method: method.to_owned(),
            auth_token_present: true,
            access_token_present: true,
            api_key_present: false,
            oauth_bearer_present: false,
        },
        principal: Some(principal),
        locale: None,
        client_kind: None,
        operation: None,
    };

    let mut request = Request::builder()
        .method(method)
        .uri(uri)
        .body(body)
        .expect("request");
    request.extensions_mut().insert(context);
    request
}
