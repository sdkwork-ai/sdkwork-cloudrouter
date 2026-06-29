use axum::extract::Request;
use axum::http::Extensions;
use sdkwork_iam_context_service::IamAppContext;
use sdkwork_iam_bootstrap::{
    parse_iam_sql_organization_id, parse_iam_sql_tenant_id, parse_iam_sql_user_id,
};
use sdkwork_web_core::WebRequestContext;

use crate::auth::{
    project_trusted_subject_for_legacy_handlers, TrustedRequestSubject, DEFAULT_USER_OPERATOR_TYPE,
};

fn parse_legacy_subject_user_i64(value: &str) -> Option<i64> {
    parse_iam_sql_user_id(value).ok()
}

fn parse_legacy_subject_tenant_i64(value: &str) -> Option<i64> {
    parse_iam_sql_tenant_id(value).ok()
}

fn parse_legacy_subject_organization_id(value: Option<&str>) -> i64 {
    parse_iam_sql_organization_id(value.unwrap_or("0")).unwrap_or(0)
}

fn trusted_request_subject_from_ids(
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
) -> TrustedRequestSubject {
    TrustedRequestSubject {
        tenant_id,
        organization_id,
        user_id,
        operator_id: user_id,
        operator_type: DEFAULT_USER_OPERATOR_TYPE,
    }
}

/// Returns true when sdkwork-web-framework already authenticated a principal but the
/// legacy `TrustedRequestSubject` bridge could not map string IDs into `i64` fields.
pub fn authenticated_principal_failed_trusted_subject_projection(
    extensions: &Extensions,
) -> bool {
    let Some(context) = extensions.get::<WebRequestContext>() else {
        return false;
    };
    let Some(principal) = context.principal.as_ref() else {
        return false;
    };
    if TrustedRequestSubject::from_extensions(extensions).is_some() {
        return false;
    }
    if trusted_request_subject_from_web_context(context).is_some() {
        return false;
    }
    if let Some(iam_context) = extensions.get::<IamAppContext>() {
        if trusted_request_subject_from_iam_app_context(iam_context).is_some() {
            return false;
        }
    }
    !principal.tenant_id().trim().is_empty() || !principal.user_id().trim().is_empty()
}

/// Projects IAM app context into the legacy `TrustedRequestSubject` shape used by SQL stores.
pub fn trusted_request_subject_from_iam_app_context(
    context: &IamAppContext,
) -> Option<TrustedRequestSubject> {
    let tenant_id = parse_legacy_subject_tenant_i64(&context.tenant_id)?;
    let organization_id = parse_legacy_subject_organization_id(context.organization_id.as_deref());
    let user_id = parse_legacy_subject_user_i64(&context.user_id)?;
    Some(trusted_request_subject_from_ids(
        tenant_id,
        organization_id,
        user_id,
    ))
}

/// Projects the standard `WebRequestContext` principal into the legacy
/// `TrustedRequestSubject` extension consumed by existing Claw handlers.
pub fn trusted_request_subject_from_web_context(
    context: &WebRequestContext,
) -> Option<TrustedRequestSubject> {
    let principal = context.principal.as_ref()?;
    let tenant_id = parse_legacy_subject_tenant_i64(principal.tenant_id())?;
    let organization_id =
        parse_legacy_subject_organization_id(principal.organization_id());
    let user_id = parse_legacy_subject_user_i64(principal.user_id())?;
    Some(trusted_request_subject_from_ids(
        tenant_id,
        organization_id,
        user_id,
    ))
}

/// Injects trusted-subject extensions for handlers that still extract
/// `TrustedRequestSubject` while the sdkwork-web-framework pipeline is active.
pub fn inject_legacy_handler_context_from_web_context(
    request: &mut Request<axum::body::Body>,
    context: &WebRequestContext,
) {
    if let Some(subject) = trusted_request_subject_from_web_context(context) {
        project_trusted_subject_for_legacy_handlers(request, subject);
        return;
    }
    if let Some(iam_context) = request.extensions().get::<IamAppContext>() {
        if let Some(subject) = trusted_request_subject_from_iam_app_context(iam_context) {
            project_trusted_subject_for_legacy_handlers(request, subject);
            return;
        }
    }
    if let Some(principal) = context.principal.as_ref() {
        tracing::warn!(
            tenant_id = principal.tenant_id(),
            organization_id = ?principal.organization_id(),
            user_id = principal.user_id(),
            "authenticated web-framework principal could not be projected to TrustedRequestSubject"
        );
    }
}

#[cfg(test)]
mod tests {
    use axum::body::Body;
    use axum::extract::Request;
    use sdkwork_web_core::{
        ServerRequestId, WebApiSurface, WebAuthLevel, WebAuthMode, WebDeploymentMode,
        WebEnvironment, WebLoginScope, WebRequestContext, WebRequestPrincipal, WebTransportFacts,
    };

    use crate::auth::TrustedRequestSubject;

    use super::{
        authenticated_principal_failed_trusted_subject_projection,
        inject_legacy_handler_context_from_web_context, trusted_request_subject_from_web_context,
    };

    #[test]
    fn trusted_request_subject_from_web_context_maps_principal_ids() {
        let principal = WebRequestPrincipal::builder()
            .tenant_id("100001")
            .organization_id(Some("30002".to_owned()))
            .user_id("40003")
            .login_scope(WebLoginScope::Organization)
            .session_id(Some("session-1".to_owned()))
            .app_id("sdkwork-clawrouter")
            .environment(WebEnvironment::Dev)
            .deployment_mode(WebDeploymentMode::Private)
            .auth_level(WebAuthLevel::Password)
            .build();
        let context = WebRequestContext {
            request_id: ServerRequestId("test-request".to_owned()),
            trace_id: None,
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            transport: WebTransportFacts {
                path: "/app/v3/api/test".to_owned(),
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

        let subject = trusted_request_subject_from_web_context(&context).expect("subject");
        assert_eq!(100_001, subject.tenant_id);
        assert_eq!(30_002, subject.organization_id);
        assert_eq!(40_003, subject.user_id);
    }

    #[test]
    fn inject_legacy_handler_context_projects_headers_and_extension() {
        let principal = WebRequestPrincipal::builder()
            .tenant_id("100001")
            .organization_id(Some("30002".to_owned()))
            .user_id("40003")
            .login_scope(WebLoginScope::Organization)
            .session_id(Some("session-1".to_owned()))
            .app_id("sdkwork-clawrouter")
            .environment(WebEnvironment::Dev)
            .deployment_mode(WebDeploymentMode::Private)
            .auth_level(WebAuthLevel::Password)
            .build();
        let context = WebRequestContext {
            request_id: ServerRequestId("test-request".to_owned()),
            trace_id: None,
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            transport: WebTransportFacts {
                path: "/app/v3/api/test".to_owned(),
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
        inject_legacy_handler_context_from_web_context(&mut request, &context);

        let subject = request
            .extensions()
            .get::<TrustedRequestSubject>()
            .copied()
            .expect("trusted subject extension");
        assert_eq!(100_001, subject.tenant_id);
        assert_eq!(
            "100001",
            request
                .headers()
                .get("x-sdkwork-tenant-id")
                .expect("tenant header")
                .to_str()
                .expect("tenant header utf8")
        );
        assert_eq!(
            "30002",
            request
                .headers()
                .get("x-sdkwork-organization-id")
                .expect("organization header")
                .to_str()
                .expect("organization header utf8")
        );
        assert_eq!(
            "40003",
            request
                .headers()
                .get("x-sdkwork-user-id")
                .expect("user header")
                .to_str()
                .expect("user header utf8")
        );
        assert_eq!(
            subject,
            TrustedRequestSubject::resolve_optional(request.headers(), request.extensions())
                .expect("resolved subject")
        );
    }

    #[test]
    fn resolve_optional_prefers_web_request_context_principal() {
        let principal = WebRequestPrincipal::builder()
            .tenant_id("100001")
            .organization_id(Some("30002".to_owned()))
            .user_id("40003")
            .login_scope(WebLoginScope::Organization)
            .session_id(Some("session-1".to_owned()))
            .app_id("sdkwork-clawrouter")
            .environment(WebEnvironment::Dev)
            .deployment_mode(WebDeploymentMode::Private)
            .auth_level(WebAuthLevel::Password)
            .build();
        let context = WebRequestContext {
            request_id: ServerRequestId("test-request".to_owned()),
            trace_id: None,
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            transport: WebTransportFacts {
                path: "/app/v3/api/test".to_owned(),
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
        request.extensions_mut().insert(context);

        let subject =
            TrustedRequestSubject::resolve_optional(request.headers(), request.extensions())
                .expect("subject from web context");
        assert_eq!(100_001, subject.tenant_id);
        assert_eq!(30_002, subject.organization_id);
        assert_eq!(40_003, subject.user_id);
    }

    #[test]
    fn trusted_request_subject_from_web_context_trims_numeric_ids() {
        let principal = WebRequestPrincipal::builder()
            .tenant_id(" 100001 ")
            .organization_id(Some(" 30002 ".to_owned()))
            .user_id(" 40003 ")
            .login_scope(WebLoginScope::Organization)
            .session_id(Some("session-1".to_owned()))
            .app_id("sdkwork-clawrouter")
            .environment(WebEnvironment::Dev)
            .deployment_mode(WebDeploymentMode::Private)
            .auth_level(WebAuthLevel::Password)
            .build();
        let context = WebRequestContext {
            request_id: ServerRequestId("test-request".to_owned()),
            trace_id: None,
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            transport: WebTransportFacts {
                path: "/app/v3/api/test".to_owned(),
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

        let subject = trusted_request_subject_from_web_context(&context).expect("subject");
        assert_eq!(100_001, subject.tenant_id);
        assert_eq!(30_002, subject.organization_id);
        assert_eq!(40_003, subject.user_id);
    }

    #[test]
    fn authenticated_principal_failed_projection_detects_non_numeric_ids() {
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
            request_id: ServerRequestId("test-request".to_owned()),
            trace_id: None,
            api_surface: WebApiSurface::AppApi,
            auth_mode: WebAuthMode::DualToken,
            transport: WebTransportFacts {
                path: "/app/v3/api/ai/dashboard/overview".to_owned(),
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
        request.extensions_mut().insert(context);

        assert!(trusted_request_subject_from_web_context(
            request.extensions().get::<WebRequestContext>().expect("context")
        )
        .is_none());
        assert!(authenticated_principal_failed_trusted_subject_projection(
            request.extensions()
        ));
    }
}
