use axum::body::Body;
use axum::http::{HeaderMap, HeaderValue, Request, Uri};
use sdkwork_claw_config::{
    AppSessionConfig, DeploymentProfile, DeploymentRuntime, RuntimeTarget, RuntimeTomlConfig,
    TrustedSubjectConfig,
};
use sdkwork_claw_http::{
    optional_app_request_subject, sanitize_sensitive_query, sanitize_sensitive_query_in_uri,
    sign_app_session_token, sign_trusted_request_subject, upsert_query_parameter,
    verified_app_request_subject, verified_signed_trusted_request_subject,
    verify_app_session_token, verify_app_session_token_claims, ApiKeyCredentialSource,
    ApiKeyIdentity, ApiKeyIdentityError, AppSessionTokenClaims, AppSessionTokenKind,
    AppSubjectBoundaryConfig, QueryStringApiKeyPolicy, TrustedRequestSubject,
};
use sdkwork_iam_context_service::IamAppContext;

#[test]
fn api_key_identity_rejects_multiple_header_credential_sources() {
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_static("Bearer sk-live-secret"),
    );
    headers.insert("x-api-key", HeaderValue::from_static("sk-other"));
    let uri: Uri = "/v1/chat/completions".parse().unwrap();

    let error = ApiKeyIdentity::from_headers_and_uri(&headers, &uri).unwrap_err();

    assert_eq!(ApiKeyIdentityError::AmbiguousCredentialSources, error);
    assert!(!error.to_string().contains("sk-live-secret"));
    assert!(!format!("{error:?}").contains("sk-other"));
}

#[test]
fn api_key_identity_supports_each_header_credential_form() {
    for (name, value, expected_source) in [
        (
            "authorization",
            "Bearer sk-bearer",
            ApiKeyCredentialSource::AuthorizationBearer,
        ),
        (
            "x-api-key",
            "sk-api-key",
            ApiKeyCredentialSource::ApiKeyHeader,
        ),
        (
            "x-goog-api-key",
            "sk-google",
            ApiKeyCredentialSource::GoogleApiKeyHeader,
        ),
    ] {
        let mut headers = HeaderMap::new();
        headers.insert(name, HeaderValue::from_str(value).unwrap());
        headers.insert("x-sdkwork-api-key-id", HeaderValue::from_static("100"));
        let uri: Uri = "/v1/models".parse().unwrap();

        let identity = ApiKeyIdentity::from_headers_and_uri(&headers, &uri).unwrap();

        assert_eq!(Some(100), identity.api_key_id());
        assert_eq!(Some(expected_source), identity.credential_source());
        assert!(!format!("{identity:?}").contains(value));
    }
}

#[test]
fn api_key_identity_rejects_header_and_query_credentials_as_ambiguous() {
    let mut headers = HeaderMap::new();
    headers.insert("x-goog-api-key", HeaderValue::from_static("sk-google"));
    let uri: Uri = "/google/v1beta/models?key=sk-query".parse().unwrap();
    let policy = standalone_desktop_query_key_policy();

    let error = ApiKeyIdentity::from_headers_and_uri_with_query_key_policy(&headers, &uri, policy)
        .unwrap_err();

    assert_eq!(ApiKeyIdentityError::AmbiguousCredentialSources, error);
}

#[test]
fn default_api_key_identity_denies_query_keys_even_in_desktop_process_env() {
    let _env = CanonicalRuntimeEnvGuard::standalone_desktop();
    let headers = HeaderMap::new();
    let uri: Uri = "/google/v1beta/models?foo=bar&key=sk-query"
        .parse()
        .unwrap();

    let error = ApiKeyIdentity::from_headers_and_uri(&headers, &uri).unwrap_err();

    assert_eq!(ApiKeyIdentityError::QueryKeyNotAllowed, error);
}

#[test]
fn typed_standalone_desktop_policy_accepts_decoded_google_query_key() {
    let headers = HeaderMap::new();
    let uri: Uri = "/google/v1beta/models?foo=bar&%6b%65%79=sk%2Dquery"
        .parse()
        .unwrap();
    let policy = standalone_desktop_query_key_policy();

    let identity =
        ApiKeyIdentity::from_headers_and_uri_with_query_key_policy(&headers, &uri, policy).unwrap();

    assert_eq!(None, identity.api_key_id());
    assert_eq!(Some("sk-query"), identity.credential_secret());
    assert_eq!(
        Some(ApiKeyCredentialSource::QueryKey),
        identity.credential_source()
    );
}

#[test]
fn typed_policy_allows_query_keys_only_on_exact_google_route_segments() {
    let headers = HeaderMap::new();

    for path in [
        "/google/v1beta/models",
        "/provider/google/v1beta/models",
        "/providers/google/v1beta/models",
    ] {
        let uri: Uri = format!("{path}?key=sk-query").parse().unwrap();
        let identity = ApiKeyIdentity::from_headers_and_uri_with_query_key_policy(
            &headers,
            &uri,
            standalone_desktop_query_key_policy(),
        )
        .unwrap();
        assert_eq!(Some("sk-query"), identity.credential_secret());
    }

    for path in [
        "/v1/models",
        "/anthropic/v1/messages",
        "/googleevil/v1beta/models",
        "/provider/googleevil/v1beta/models",
        "/providers/google-v2/v1beta/models",
    ] {
        let uri: Uri = format!("{path}?key=sk-query").parse().unwrap();
        let error = ApiKeyIdentity::from_headers_and_uri_with_query_key_policy(
            &headers,
            &uri,
            standalone_desktop_query_key_policy(),
        )
        .unwrap_err();
        assert_eq!(ApiKeyIdentityError::QueryKeyNotAllowed, error, "{path}");
    }
}

#[test]
fn non_desktop_configured_runtime_policy_denies_query_keys() {
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_profile = "cloud"
runtime_target = "container"
"#,
    )
    .unwrap();
    let runtime = DeploymentRuntime::resolve_configured(Some(&config)).unwrap();
    let policy = QueryStringApiKeyPolicy::from_configured_runtime(runtime);
    let uri: Uri = "/google/v1beta/models?key=sk-query".parse().unwrap();

    let error =
        ApiKeyIdentity::from_headers_and_uri_with_query_key_policy(&HeaderMap::new(), &uri, policy)
            .unwrap_err();

    assert_eq!(ApiKeyIdentityError::QueryKeyNotAllowed, error);
}

#[test]
fn duplicate_and_empty_query_keys_are_rejected() {
    let policy = standalone_desktop_query_key_policy();
    let duplicate: Uri = "/google/v1beta/models?key=one&%6b%65%79=two"
        .parse()
        .unwrap();
    let empty: Uri = "/google/v1beta/models?key=".parse().unwrap();

    let duplicate_error = ApiKeyIdentity::from_headers_and_uri_with_query_key_policy(
        &HeaderMap::new(),
        &duplicate,
        policy,
    )
    .unwrap_err();
    let empty_error = ApiKeyIdentity::from_headers_and_uri_with_query_key_policy(
        &HeaderMap::new(),
        &empty,
        policy,
    )
    .unwrap_err();

    assert_eq!(
        ApiKeyIdentityError::AmbiguousCredentialSources,
        duplicate_error
    );
    assert_eq!(
        ApiKeyIdentityError::EmptyCredential(ApiKeyCredentialSource::QueryKey),
        empty_error
    );
}

#[test]
fn sensitive_query_sanitizer_and_uri_rebuilder_preserve_non_sensitive_parameters() {
    let query = "alt=sse&KEY=gateway&%20api_key%20=one&apikey=two&access_token=three&token=four&q=hello+world&x=a%2Fb";

    assert_eq!(
        Some("alt=sse&q=hello+world&x=a%2Fb".to_owned()),
        sanitize_sensitive_query(Some(query))
    );

    let uri: Uri = format!("/google/v1beta/models?{query}").parse().unwrap();
    let sanitized = sanitize_sensitive_query_in_uri(&uri).unwrap();
    assert_eq!(
        "/google/v1beta/models?alt=sse&q=hello+world&x=a%2Fb",
        sanitized.to_string()
    );
}

#[test]
fn query_parameter_upsert_replaces_all_decoded_matches_once() {
    assert_eq!(
        "alt=sse&key=provider-owned",
        upsert_query_parameter(
            Some("key=gateway&alt=sse&%6b%65%79=duplicate"),
            "key",
            "provider-owned",
        )
    );
    assert_eq!(
        "purpose=assistants&api%2Bkey=provider%2Bsecret%2Fvalue",
        upsert_query_parameter(
            Some("purpose=assistants"),
            "api+key",
            "provider+secret/value",
        )
    );
}

fn standalone_desktop_query_key_policy() -> QueryStringApiKeyPolicy {
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[runtime]
deployment_profile = "standalone"
runtime_target = "desktop"
"#,
    )
    .unwrap();
    let runtime = DeploymentRuntime::resolve_configured(Some(&config)).unwrap();
    QueryStringApiKeyPolicy::from_configured_runtime(runtime)
}

struct CanonicalRuntimeEnvGuard {
    previous_profile: Option<std::ffi::OsString>,
    previous_target: Option<std::ffi::OsString>,
}

impl CanonicalRuntimeEnvGuard {
    fn standalone_desktop() -> Self {
        let guard = Self {
            previous_profile: std::env::var_os(DeploymentProfile::ENV_DEPLOYMENT_PROFILE),
            previous_target: std::env::var_os(RuntimeTarget::ENV_RUNTIME_TARGET),
        };
        unsafe {
            std::env::set_var(DeploymentProfile::ENV_DEPLOYMENT_PROFILE, "standalone");
            std::env::set_var(RuntimeTarget::ENV_RUNTIME_TARGET, "desktop");
        }
        guard
    }
}

impl Drop for CanonicalRuntimeEnvGuard {
    fn drop(&mut self) {
        unsafe {
            match self.previous_profile.take() {
                Some(value) => std::env::set_var(DeploymentProfile::ENV_DEPLOYMENT_PROFILE, value),
                None => std::env::remove_var(DeploymentProfile::ENV_DEPLOYMENT_PROFILE),
            }
            match self.previous_target.take() {
                Some(value) => std::env::set_var(RuntimeTarget::ENV_RUNTIME_TARGET, value),
                None => std::env::remove_var(RuntimeTarget::ENV_RUNTIME_TARGET),
            }
        }
    }
}

#[test]
fn api_key_identity_rejects_invalid_context_without_echoing_input() {
    let mut headers = HeaderMap::new();
    headers.insert(
        "x-sdkwork-api-key-id",
        HeaderValue::from_static("100-secret-invalid"),
    );
    let uri: Uri = "/v1/models".parse().unwrap();

    let error = ApiKeyIdentity::from_headers_and_uri(&headers, &uri).unwrap_err();

    assert_eq!("invalid api key id context", error.to_string());
    assert!(!format!("{error:?}").contains("100-secret-invalid"));
}

#[test]
fn trusted_request_subject_is_read_from_request_extensions() {
    let subject = TrustedRequestSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        operator_id: 30,
        operator_type: 1,
    };
    let mut request = Request::new(Body::empty());
    request.extensions_mut().insert(subject);

    assert_eq!(
        Some(subject),
        TrustedRequestSubject::from_extensions(request.extensions())
    );
}

#[test]
fn attach_trusted_request_subject_exposes_appbase_iam_context() {
    let subject = TrustedRequestSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        operator_id: 30,
        operator_type: 1,
    };
    let mut request = Request::new(Body::empty());

    sdkwork_claw_http::attach_trusted_request_subject(&mut request, subject);

    let context = request
        .extensions()
        .get::<IamAppContext>()
        .expect("appbase iam context");
    assert_eq!("100001", context.tenant_id);
    assert_eq!(None, context.organization_id.as_deref());
    assert_eq!("30", context.user_id);
    assert_eq!("sdkwork-clawrouter", context.app_id);
}

#[test]
fn trusted_request_subject_is_read_from_internal_headers() {
    let mut headers = HeaderMap::new();
    headers.insert("x-sdkwork-tenant-id", HeaderValue::from_static("100001"));
    headers.insert("x-sdkwork-organization-id", HeaderValue::from_static("0"));
    headers.insert("x-sdkwork-user-id", HeaderValue::from_static("30"));

    let subject = TrustedRequestSubject::from_headers(&headers).unwrap();

    assert_eq!(
        TrustedRequestSubject {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            operator_id: 30,
            operator_type: 1,
        },
        subject
    );
}

#[test]
fn trusted_request_subject_extension_is_absent_without_verified_boundary() {
    let request = Request::new(Body::empty());

    assert_eq!(
        None,
        TrustedRequestSubject::from_extensions(request.extensions())
    );
}

#[test]
fn trusted_request_subject_boundary_strips_direct_headers_and_returns_signed_subject() {
    let config =
        TrustedSubjectConfig::from_signing_secret("0123456789abcdef0123456789abcdef").unwrap();
    let subject = TrustedRequestSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        operator_id: 30,
        operator_type: 1,
    };
    let timestamp = 1_800_000_000;
    let signature = sign_trusted_request_subject(
        &config,
        subject,
        timestamp,
        "POST",
        "/app/v3/api/router/api_keys",
    );
    let mut headers = HeaderMap::new();
    headers.insert("x-sdkwork-tenant-id", HeaderValue::from_static("999"));
    headers.insert(
        "x-sdkwork-subject-tenant-id",
        HeaderValue::from_static("100001"),
    );
    headers.insert(
        "x-sdkwork-subject-organization-id",
        HeaderValue::from_static("0"),
    );
    headers.insert("x-sdkwork-subject-user-id", HeaderValue::from_static("30"));
    headers.insert(
        "x-sdkwork-subject-timestamp",
        HeaderValue::from_static("1800000000"),
    );
    headers.insert(
        "x-sdkwork-subject-signature",
        HeaderValue::from_str(&signature).unwrap(),
    );

    let parsed = verified_signed_trusted_request_subject(
        &mut headers,
        "POST",
        "/app/v3/api/router/api_keys",
        &config,
        timestamp,
    )
    .unwrap()
    .unwrap();

    assert_eq!(subject, parsed);
    assert!(headers.get("x-sdkwork-tenant-id").is_none());
    assert!(headers.get("x-sdkwork-organization-id").is_none());
    assert!(headers.get("x-sdkwork-user-id").is_none());
    assert!(headers.get("x-sdkwork-subject-signature").is_none());
}

#[test]
fn trusted_request_subject_boundary_rejects_bad_signature_without_echoing_input() {
    let config =
        TrustedSubjectConfig::from_signing_secret("0123456789abcdef0123456789abcdef").unwrap();
    let mut headers = HeaderMap::new();
    headers.insert(
        "x-sdkwork-subject-tenant-id",
        HeaderValue::from_static("100001"),
    );
    headers.insert(
        "x-sdkwork-subject-organization-id",
        HeaderValue::from_static("0"),
    );
    headers.insert("x-sdkwork-subject-user-id", HeaderValue::from_static("30"));
    headers.insert(
        "x-sdkwork-subject-timestamp",
        HeaderValue::from_static("1800000000"),
    );
    headers.insert(
        "x-sdkwork-subject-signature",
        HeaderValue::from_static("secret-signature"),
    );

    let error = verified_signed_trusted_request_subject(
        &mut headers,
        "POST",
        "/app/v3/api/router/api_keys",
        &config,
        1_800_000_000,
    )
    .unwrap_err();

    assert_eq!("trusted subject signature is invalid", error.to_string());
    assert!(!format!("{error:?}").contains("secret-signature"));
}

#[test]
fn app_session_token_verifies_subject_without_leaking_token_material() {
    let config =
        AppSessionConfig::from_signing_secret("app-session-secret-0123456789abcd").unwrap();
    let subject = TrustedRequestSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        operator_id: 30,
        operator_type: 1,
    };
    let token = sign_app_session_token(&config, subject, 1_800_000_000, 1_800_000_300);

    let parsed = verify_app_session_token(&config, &token, 1_800_000_001).unwrap();

    assert_eq!(subject, parsed);
    assert!(!format!("{config:?}").contains("app-session-secret"));
}

#[test]
fn app_session_claim_token_accepts_tenant_level_organization_zero() {
    let config =
        AppSessionConfig::from_signing_secret("app-session-secret-0123456789abcd").unwrap();
    let claims = AppSessionTokenClaims {
        token_kind: AppSessionTokenKind::Access,
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        session_id: "session-tenant-scope".to_owned(),
        app_id: "sdkwork-clawrouter".to_owned(),
        login_scope: "TENANT".to_owned(),
        environment: "dev".to_owned(),
        deployment_mode: "saas".to_owned(),
        auth_level: "password".to_owned(),
        data_scope: vec!["tenant:10".to_owned(), "user:30".to_owned()],
        permission_scope: vec!["clawrouter.console.access".to_owned()],
        issued_at: 1_800_000_000,
        expires_at: 1_800_000_300,
        kid: None,
    };

    let token = sdkwork_claw_http::sign_app_session_token_with_claims(&config, &claims);
    let parsed = verify_app_session_token_claims(&config, &token, 1_800_000_001).unwrap();

    assert_eq!(claims, parsed);
    assert_eq!(
        0,
        verify_app_session_token(&config, &token, 1_800_000_001)
            .unwrap()
            .organization_id
    );
}

#[test]
fn app_request_subject_boundary_rejects_swapped_auth_and_access_token_types() {
    let trusted_subject_config =
        TrustedSubjectConfig::from_signing_secret("0123456789abcdef0123456789abcdef").unwrap();
    let app_session_config =
        AppSessionConfig::from_signing_secret("app-session-secret-0123456789abcd").unwrap();
    let boundary_config =
        AppSubjectBoundaryConfig::new(trusted_subject_config, app_session_config.clone());
    let common_claims = AppSessionTokenClaims {
        token_kind: AppSessionTokenKind::Access,
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        session_id: "session-token-type".to_owned(),
        app_id: "sdkwork-clawrouter".to_owned(),
        login_scope: "TENANT".to_owned(),
        environment: "dev".to_owned(),
        deployment_mode: "saas".to_owned(),
        auth_level: "password".to_owned(),
        data_scope: vec!["tenant:100001".to_owned(), "user:30".to_owned()],
        permission_scope: vec!["clawrouter.console.access".to_owned()],
        issued_at: 1_800_000_000,
        expires_at: 1_800_000_300,
        kid: None,
    };
    let auth_header_token =
        sdkwork_claw_http::sign_app_session_token_with_claims(&app_session_config, &common_claims);
    let mut access_claims = common_claims.clone();
    access_claims.token_kind = AppSessionTokenKind::Auth;
    access_claims.issued_at += 1;
    access_claims.expires_at += 1;
    let access_header_token =
        sdkwork_claw_http::sign_app_session_token_with_claims(&app_session_config, &access_claims);
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {auth_header_token}")).unwrap(),
    );
    headers.insert(
        "Access-Token",
        HeaderValue::from_str(&access_header_token).unwrap(),
    );

    let error = verified_app_request_subject(
        &mut headers,
        "POST",
        "/app/v3/api/router/api_keys",
        &boundary_config,
        1_800_000_001,
    )
    .unwrap_err();

    assert_eq!("app session token type is invalid for this header", error);
    assert!(headers.get("authorization").is_none());
    assert!(headers.get("Access-Token").is_none());
}

#[test]
fn app_request_subject_boundary_rejects_access_token_from_different_session() {
    let trusted_subject_config =
        TrustedSubjectConfig::from_signing_secret("0123456789abcdef0123456789abcdef").unwrap();
    let app_session_config =
        AppSessionConfig::from_signing_secret("app-session-secret-0123456789abcd").unwrap();
    let boundary_config =
        AppSubjectBoundaryConfig::new(trusted_subject_config, app_session_config.clone());
    let auth_claims = AppSessionTokenClaims {
        token_kind: AppSessionTokenKind::Auth,
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        session_id: "session-auth".to_owned(),
        app_id: "sdkwork-clawrouter".to_owned(),
        login_scope: "TENANT".to_owned(),
        environment: "dev".to_owned(),
        deployment_mode: "saas".to_owned(),
        auth_level: "password".to_owned(),
        data_scope: vec!["tenant:100001".to_owned(), "user:30".to_owned()],
        permission_scope: vec!["clawrouter.console.access".to_owned()],
        issued_at: 1_800_000_000,
        expires_at: 1_800_000_300,
        kid: None,
    };
    let mut access_claims = auth_claims.clone();
    access_claims.token_kind = AppSessionTokenKind::Access;
    access_claims.session_id = "session-access".to_owned();
    access_claims.issued_at += 1;
    access_claims.expires_at += 1;
    let auth_token =
        sdkwork_claw_http::sign_app_session_token_with_claims(&app_session_config, &auth_claims);
    let access_token =
        sdkwork_claw_http::sign_app_session_token_with_claims(&app_session_config, &access_claims);
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {auth_token}")).unwrap(),
    );
    headers.insert(
        "Access-Token",
        HeaderValue::from_str(&access_token).unwrap(),
    );

    let error = verified_app_request_subject(
        &mut headers,
        "POST",
        "/app/v3/api/router/api_keys",
        &boundary_config,
        1_800_000_001,
    )
    .unwrap_err();

    assert_eq!(
        "app session auth token and access token subjects do not match",
        error
    );
}

#[test]
fn app_request_subject_boundary_returns_session_subject_after_stripping_direct_headers() {
    let trusted_subject_config =
        TrustedSubjectConfig::from_signing_secret("0123456789abcdef0123456789abcdef").unwrap();
    let app_session_config =
        AppSessionConfig::from_signing_secret("app-session-secret-0123456789abcd").unwrap();
    let boundary_config =
        AppSubjectBoundaryConfig::new(trusted_subject_config, app_session_config.clone());
    let subject = TrustedRequestSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        operator_id: 30,
        operator_type: 1,
    };
    let auth_token =
        sign_app_session_token(&app_session_config, subject, 1_800_000_000, 1_800_000_300);
    let access_token =
        sign_app_session_token(&app_session_config, subject, 1_800_000_001, 1_800_000_301);
    let mut headers = HeaderMap::new();
    headers.insert("x-sdkwork-tenant-id", HeaderValue::from_static("999"));
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {auth_token}")).unwrap(),
    );
    headers.insert(
        "Access-Token",
        HeaderValue::from_str(&access_token).unwrap(),
    );

    let parsed = verified_app_request_subject(
        &mut headers,
        "POST",
        "/app/v3/api/router/api_keys",
        &boundary_config,
        1_800_000_001,
    )
    .unwrap();

    assert_eq!(subject, parsed);
    assert!(headers.get("x-sdkwork-tenant-id").is_none());
    assert!(headers.get("x-sdkwork-organization-id").is_none());
    assert!(headers.get("x-sdkwork-user-id").is_none());
    assert!(headers.get("authorization").is_none());
    assert!(headers.get("Access-Token").is_none());
}

#[test]
fn app_request_subject_boundary_rejects_incomplete_session_token_headers() {
    let trusted_subject_config =
        TrustedSubjectConfig::from_signing_secret("0123456789abcdef0123456789abcdef").unwrap();
    let app_session_config =
        AppSessionConfig::from_signing_secret("app-session-secret-0123456789abcd").unwrap();
    let boundary_config =
        AppSubjectBoundaryConfig::new(trusted_subject_config, app_session_config.clone());
    let subject = TrustedRequestSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        operator_id: 30,
        operator_type: 1,
    };
    let auth_token =
        sign_app_session_token(&app_session_config, subject, 1_800_000_000, 1_800_000_300);
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {auth_token}")).unwrap(),
    );

    let error = verified_app_request_subject(
        &mut headers,
        "POST",
        "/app/v3/api/router/api_keys",
        &boundary_config,
        1_800_000_001,
    )
    .unwrap_err();

    assert_eq!("Access-Token header is required", error);
    assert!(headers.get("authorization").is_none());
    assert!(headers.get("Access-Token").is_none());
}

#[test]
fn app_request_subject_boundary_rejects_direct_subject_headers_without_tokens() {
    let trusted_subject_config =
        TrustedSubjectConfig::from_signing_secret("0123456789abcdef0123456789abcdef").unwrap();
    let app_session_config =
        AppSessionConfig::from_signing_secret("app-session-secret-0123456789abcd").unwrap();
    let boundary_config =
        AppSubjectBoundaryConfig::new(trusted_subject_config, app_session_config.clone());
    let mut headers = HeaderMap::new();
    headers.insert("x-sdkwork-tenant-id", HeaderValue::from_static("999"));
    headers.insert("x-sdkwork-organization-id", HeaderValue::from_static("999"));
    headers.insert("x-sdkwork-user-id", HeaderValue::from_static("999"));

    let error = verified_app_request_subject(
        &mut headers,
        "POST",
        "/app/v3/api/router/api_keys",
        &boundary_config,
        1_800_000_001,
    )
    .unwrap_err();

    assert_eq!("app session bearer token is required", error);
    assert!(headers.get("x-sdkwork-tenant-id").is_none());
    assert!(headers.get("x-sdkwork-organization-id").is_none());
    assert!(headers.get("x-sdkwork-user-id").is_none());
}

#[test]
fn optional_app_request_subject_boundary_strips_incomplete_session_token_headers() {
    let trusted_subject_config =
        TrustedSubjectConfig::from_signing_secret("0123456789abcdef0123456789abcdef").unwrap();
    let app_session_config =
        AppSessionConfig::from_signing_secret("app-session-secret-0123456789abcd").unwrap();
    let boundary_config =
        AppSubjectBoundaryConfig::new(trusted_subject_config, app_session_config.clone());
    let subject = TrustedRequestSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        operator_id: 30,
        operator_type: 1,
    };
    let auth_token =
        sign_app_session_token(&app_session_config, subject, 1_800_000_000, 1_800_000_300);
    let mut headers = HeaderMap::new();
    headers.insert("x-sdkwork-tenant-id", HeaderValue::from_static("999"));
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {auth_token}")).unwrap(),
    );

    let subject = optional_app_request_subject(
        &mut headers,
        "GET",
        "/app/v3/api/platform/apps/store",
        &boundary_config,
        1_800_000_001,
    );

    assert_eq!(None, subject);
    assert!(headers.get("x-sdkwork-tenant-id").is_none());
    assert!(headers.get("authorization").is_none());
    assert!(headers.get("Access-Token").is_none());
}

#[test]
fn app_request_subject_boundary_rejects_mismatched_auth_and_access_subjects() {
    let trusted_subject_config =
        TrustedSubjectConfig::from_signing_secret("0123456789abcdef0123456789abcdef").unwrap();
    let app_session_config =
        AppSessionConfig::from_signing_secret("app-session-secret-0123456789abcd").unwrap();
    let boundary_config =
        AppSubjectBoundaryConfig::new(trusted_subject_config, app_session_config.clone());
    let auth_subject = TrustedRequestSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        operator_id: 30,
        operator_type: 1,
    };
    let access_subject = TrustedRequestSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 31,
        operator_id: 31,
        operator_type: 1,
    };
    let auth_token = sign_app_session_token(
        &app_session_config,
        auth_subject,
        1_800_000_000,
        1_800_000_300,
    );
    let access_token = sign_app_session_token(
        &app_session_config,
        access_subject,
        1_800_000_001,
        1_800_000_301,
    );
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {auth_token}")).unwrap(),
    );
    headers.insert(
        "Access-Token",
        HeaderValue::from_str(&access_token).unwrap(),
    );

    let error = verified_app_request_subject(
        &mut headers,
        "POST",
        "/app/v3/api/router/api_keys",
        &boundary_config,
        1_800_000_001,
    )
    .unwrap_err();

    assert_eq!(
        "app session auth token and access token subjects do not match",
        error
    );
    assert!(headers.get("authorization").is_none());
    assert!(headers.get("Access-Token").is_none());
}

#[test]
fn app_session_authorization_header_accepts_case_insensitive_bearer_scheme() {
    let config =
        AppSessionConfig::from_signing_secret("app-session-secret-0123456789abcd").unwrap();
    let subject = TrustedRequestSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        operator_id: 30,
        operator_type: 1,
    };
    let token = sign_app_session_token(&config, subject, 1_800_000_000, 1_800_000_300);

    let parsed = sdkwork_claw_http::verify_app_session_authorization_header(
        &config,
        &format!("  bearer   {token}  "),
        1_800_000_001,
    )
    .unwrap();

    assert_eq!(subject, parsed);
}

#[test]
fn app_session_token_rejects_tampering_without_echoing_token() {
    let config =
        AppSessionConfig::from_signing_secret("app-session-secret-0123456789abcd").unwrap();
    let subject = TrustedRequestSubject {
        tenant_id: 100001,
        organization_id: 0,
        user_id: 30,
        operator_id: 30,
        operator_type: 1,
    };
    let token = sign_app_session_token(&config, subject, 1_800_000_000, 1_800_000_300);
    let tampered = token.replacen(".30.", ".31.", 1);

    let error = verify_app_session_token(&config, &tampered, 1_800_000_001).unwrap_err();

    assert_eq!("app session token signature is invalid", error.to_string());
    assert!(!format!("{error:?}").contains(&tampered));
}
