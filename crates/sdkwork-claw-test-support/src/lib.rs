use sdkwork_claw_config::{
    ApiKeySecurityConfig, AppSessionConfig, PaymentWebhookConfig, TrustedSubjectConfig,
};
use sdkwork_claw_http::{
    sign_app_session_token, sign_trusted_request_subject, TrustedRequestSubject,
};

pub const API_KEY_PEPPER: &str = "0123456789abcdef0123456789abcdef";
pub const GATEWAY_API_KEY: &str = "sk-live-test-gateway";
pub const TRUSTED_SUBJECT_SECRET: &str = "trusted-subject-secret-0123456789abcdef";
pub const APP_SESSION_SECRET: &str = "app-session-secret-0123456789abcdef012";
pub const PAYMENT_WEBHOOK_SECRET: &str = "payment-webhook-secret-0123456789abcdef";

/// Mirrors `sdkwork-iam-module-registry::bootstrap_subject` canonical bootstrap scope.
pub const DEFAULT_TENANT_ID: i64 = 100_001;
pub const DEFAULT_ORGANIZATION_ID: i64 = 0;
pub const DEFAULT_TENANT_CODE: &str = "SDKWORK";
pub const DEFAULT_ORGANIZATION_CODE: &str = "root";
pub const DEFAULT_TENANT_ID_STR: &str = "100001";
pub const DEFAULT_ORGANIZATION_ID_STR: &str = "0";
pub const DEFAULT_USER_ID: i64 = 30;
pub const DEFAULT_OPERATOR_TYPE: i32 = 1;

pub fn api_key_security_config() -> anyhow::Result<ApiKeySecurityConfig> {
    ApiKeySecurityConfig::from_pepper_secret(API_KEY_PEPPER).map_err(anyhow::Error::msg)
}

pub fn trusted_subject_config() -> anyhow::Result<TrustedSubjectConfig> {
    TrustedSubjectConfig::from_signing_secret(TRUSTED_SUBJECT_SECRET).map_err(anyhow::Error::msg)
}

pub fn app_session_config() -> anyhow::Result<AppSessionConfig> {
    AppSessionConfig::from_signing_secret(APP_SESSION_SECRET).map_err(anyhow::Error::msg)
}

pub fn payment_webhook_config() -> anyhow::Result<PaymentWebhookConfig> {
    PaymentWebhookConfig::from_signing_secret(PAYMENT_WEBHOOK_SECRET).map_err(anyhow::Error::msg)
}

pub fn trusted_request_subject(
    tenant_id: i64,
    organization_id: i64,
    user_id: i64,
) -> TrustedRequestSubject {
    TrustedRequestSubject {
        tenant_id,
        organization_id,
        user_id,
        operator_id: user_id,
        operator_type: DEFAULT_OPERATOR_TYPE,
    }
}

pub fn default_trusted_request_subject() -> TrustedRequestSubject {
    trusted_request_subject(DEFAULT_TENANT_ID, DEFAULT_ORGANIZATION_ID, DEFAULT_USER_ID)
}

pub fn app_session_bearer_token(
    subject: TrustedRequestSubject,
    issued_at: i64,
    expires_at: i64,
) -> anyhow::Result<String> {
    let token = sign_app_session_token(&app_session_config()?, subject, issued_at, expires_at);
    Ok(format!("Bearer {token}"))
}

pub fn app_session_access_token(
    subject: TrustedRequestSubject,
    issued_at: i64,
    expires_at: i64,
) -> anyhow::Result<String> {
    Ok(sign_app_session_token(
        &app_session_config()?,
        subject,
        issued_at + 1,
        expires_at + 1,
    ))
}

pub fn app_session_dual_token_headers(
    subject: TrustedRequestSubject,
    issued_at: i64,
    expires_at: i64,
) -> anyhow::Result<(String, String)> {
    Ok((
        app_session_bearer_token(subject, issued_at, expires_at)?,
        app_session_access_token(subject, issued_at, expires_at)?,
    ))
}

pub fn trusted_subject_signature(
    subject: TrustedRequestSubject,
    timestamp: i64,
    method: &str,
    path: &str,
) -> anyhow::Result<String> {
    Ok(sign_trusted_request_subject(
        &trusted_subject_config()?,
        subject,
        timestamp,
        method,
        path,
    ))
}

/// Asserts gateway/router responses use a server-generated RFC 4122 UUID v4 request id
/// instead of honoring a client-supplied `x-request-id`.
pub fn assert_server_generated_request_id(actual: &str, client_request_id: &str) {
    assert_ne!(
        client_request_id, actual,
        "gateway must ignore client supplied x-request-id and use a server request id"
    );
    assert_eq!(36, actual.len(), "server request id must be a UUID");
    assert_eq!(Some('-'), actual.chars().nth(8));
    assert_eq!(Some('-'), actual.chars().nth(13));
    assert_eq!(Some('-'), actual.chars().nth(18));
    assert_eq!(Some('-'), actual.chars().nth(23));
    assert_eq!(Some('4'), actual.chars().nth(14));
    let variant = actual
        .chars()
        .nth(19)
        .expect("server request id must include UUID variant");
    assert!(
        matches!(variant, '8' | '9' | 'a' | 'b'),
        "server request id must be an RFC 4122 variant UUID"
    );
}

#[cfg(test)]
mod tests {
    use axum::http::{HeaderMap, HeaderValue};
    use sdkwork_claw_http::{
        verified_signed_trusted_request_subject, verify_app_session_authorization_header,
    };

    #[test]
    fn standard_runtime_subject_helpers_create_verifiable_tokens_and_signatures() {
        let subject = super::default_trusted_request_subject();
        let issued_at = 1_800_000_000;
        let expires_at = issued_at + 300;
        let authorization =
            super::app_session_bearer_token(subject, issued_at, expires_at).unwrap();

        let verified_subject = verify_app_session_authorization_header(
            &super::app_session_config().unwrap(),
            authorization.as_str(),
            issued_at + 1,
        )
        .unwrap();

        assert_eq!(super::DEFAULT_TENANT_ID, verified_subject.tenant_id);
        assert_eq!(
            super::DEFAULT_ORGANIZATION_ID,
            verified_subject.organization_id
        );
        assert_eq!(super::DEFAULT_USER_ID, verified_subject.user_id);

        let signature = super::trusted_subject_signature(
            subject,
            issued_at,
            "GET",
            "/backend/v3/api/ai/models",
        )
        .unwrap();
        let mut headers = HeaderMap::new();
        headers.insert("x-sdkwork-subject-tenant-id", subject.tenant_id.into());
        headers.insert(
            "x-sdkwork-subject-organization-id",
            subject.organization_id.into(),
        );
        headers.insert("x-sdkwork-subject-user-id", subject.user_id.into());
        headers.insert("x-sdkwork-subject-timestamp", issued_at.into());
        headers.insert(
            "x-sdkwork-subject-signature",
            HeaderValue::from_str(signature.as_str()).unwrap(),
        );

        let verified_subject = verified_signed_trusted_request_subject(
            &mut headers,
            "GET",
            "/backend/v3/api/ai/models",
            &super::trusted_subject_config().unwrap(),
            issued_at + 1,
        )
        .unwrap()
        .unwrap();

        assert_eq!(subject, verified_subject);
        assert!(headers.get("x-sdkwork-tenant-id").is_none());
        assert!(headers.get("x-sdkwork-organization-id").is_none());
        assert!(headers.get("x-sdkwork-user-id").is_none());
    }
}
