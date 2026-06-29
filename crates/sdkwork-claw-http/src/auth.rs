use std::fmt;
use std::time::{SystemTime, UNIX_EPOCH};

use axum::body::Body;
use axum::extract::{FromRequestParts, OptionalFromRequestParts, State};
use axum::http::{request::Parts, Extensions, HeaderMap, HeaderValue, Request, StatusCode, Uri};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::Json;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use sdkwork_claw_config::{
    AppSessionConfig, DeploymentMode as RuntimeDeploymentMode, TrustedSubjectConfig,
};
use sdkwork_iam_web_adapter::TenantSigningKeyStore;
use sdkwork_claw_security::redact_secret;
use sdkwork_iam_context_service::{AuthLevel, DeploymentMode, Environment, IamAppContext};
use serde::{Deserialize, Serialize};
use sha2::Sha256;

const AUTHORIZATION: &str = "authorization";
const ACCESS_TOKEN: &str = "Access-Token";
const X_API_KEY: &str = "x-api-key";
const X_GOOG_API_KEY: &str = "x-goog-api-key";
const X_SDKWORK_API_KEY_ID: &str = "x-sdkwork-api-key-id";
const X_SDKWORK_TENANT_ID: &str = "x-sdkwork-tenant-id";
const X_SDKWORK_ORGANIZATION_ID: &str = "x-sdkwork-organization-id";
const X_SDKWORK_USER_ID: &str = "x-sdkwork-user-id";
const X_SDKWORK_SUBJECT_TENANT_ID: &str = "x-sdkwork-subject-tenant-id";
const X_SDKWORK_SUBJECT_ORGANIZATION_ID: &str = "x-sdkwork-subject-organization-id";
const X_SDKWORK_SUBJECT_USER_ID: &str = "x-sdkwork-subject-user-id";
const X_SDKWORK_SUBJECT_TIMESTAMP: &str = "x-sdkwork-subject-timestamp";
const X_SDKWORK_SUBJECT_SIGNATURE: &str = "x-sdkwork-subject-signature";
pub(crate) const DEFAULT_USER_OPERATOR_TYPE: i32 = 1;
const APP_SESSION_TOKEN_VERSION: &str = "v1";
const APP_SESSION_CLAIM_TOKEN_VERSION: &str = "v2";
type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ApiKeyCredentialSource {
    AuthorizationBearer,
    ApiKeyHeader,
    GoogleApiKeyHeader,
    QueryKey,
}

#[derive(Clone, PartialEq, Eq)]
pub struct ApiKeyCredential {
    secret: String,
    source: ApiKeyCredentialSource,
}

#[derive(Clone, PartialEq, Eq)]
pub struct ApiKeyIdentity {
    api_key_id: Option<i64>,
    credential: Option<ApiKeyCredential>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ApiKeyIdentityError {
    InvalidApiKeyId,
    InvalidHeaderValue(&'static str),
    InvalidAuthorizationScheme,
    EmptyCredential(ApiKeyCredentialSource),
    QueryKeyNotAllowed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TrustedRequestSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AppSessionTokenKind {
    Auth,
    Access,
    Refresh,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSessionTokenClaims {
    pub token_kind: AppSessionTokenKind,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub session_id: String,
    pub app_id: String,
    pub login_scope: String,
    pub environment: String,
    pub deployment_mode: String,
    pub auth_level: String,
    pub data_scope: Vec<String>,
    pub permission_scope: Vec<String>,
    pub issued_at: i64,
    pub expires_at: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kid: Option<String>,
}

impl AppSessionTokenClaims {
    pub fn trusted_subject(&self) -> TrustedRequestSubject {
        TrustedRequestSubject {
            tenant_id: self.tenant_id,
            organization_id: self.organization_id,
            user_id: self.user_id,
            operator_id: self.user_id,
            operator_type: DEFAULT_USER_OPERATOR_TYPE,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TrustedRequestSubjectError {
    MissingExtension,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TrustedSubjectBoundaryError {
    MissingHeader(&'static str),
    InvalidHeaderValue(&'static str),
    InvalidPositiveInteger(&'static str),
    InvalidTimestamp,
    TimestampOutsideClockSkew,
    InvalidSignature,
    SigningKeyInvalid,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AppSessionTokenError {
    MissingBearerToken,
    MissingAccessToken,
    InvalidAuthorizationScheme,
    InvalidHeaderValue(&'static str),
    InvalidTokenFormat,
    InvalidPositiveInteger(&'static str),
    InvalidTimestamp(&'static str),
    InvalidTokenType,
    InvalidLoginScope,
    IssuedAtOutsideClockSkew,
    Expired,
    InvalidSignature,
    SubjectMismatch,
    SigningKeyInvalid,
    Serialization(String),
}

#[derive(Clone)]
pub struct AppSubjectBoundaryConfig {
    trusted_subject: TrustedSubjectConfig,
    app_session: AppSessionConfig,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BoundaryErrorEnvelope {
    code: &'static str,
    msg: String,
    data: Option<()>,
}

impl ApiKeyIdentity {
    pub fn from_headers_and_uri(
        headers: &HeaderMap,
        uri: &Uri,
    ) -> Result<Self, ApiKeyIdentityError> {
        Ok(Self {
            api_key_id: parse_api_key_id(headers)?,
            credential: parse_credential(headers, uri)?,
        })
    }

    pub fn api_key_id(&self) -> Option<i64> {
        self.api_key_id
    }

    pub fn credential_secret(&self) -> Option<&str> {
        self.credential
            .as_ref()
            .map(|credential| credential.secret.as_str())
    }

    pub fn credential_source(&self) -> Option<ApiKeyCredentialSource> {
        self.credential.as_ref().map(|credential| credential.source)
    }
}

impl fmt::Debug for ApiKeyIdentity {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ApiKeyIdentity")
            .field("api_key_id", &self.api_key_id)
            .field("credential", &self.credential)
            .finish()
    }
}

impl fmt::Debug for ApiKeyCredential {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ApiKeyCredential")
            .field("secret", &redact_secret(&self.secret))
            .field("source", &self.source)
            .finish()
    }
}

impl fmt::Display for ApiKeyIdentityError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidApiKeyId => write!(formatter, "invalid api key id context"),
            Self::InvalidHeaderValue(name) => write!(formatter, "invalid {name} header value"),
            Self::InvalidAuthorizationScheme => {
                write!(formatter, "authorization header must use Bearer scheme")
            }
            Self::EmptyCredential(_) => write!(formatter, "api key credential must not be empty"),
            Self::QueryKeyNotAllowed => {
                write!(
                    formatter,
                    "api key query parameter is not allowed in this deployment mode"
                )
            }
        }
    }
}

impl std::error::Error for ApiKeyIdentityError {}

impl TrustedRequestSubject {
    pub fn from_extensions(extensions: &Extensions) -> Option<Self> {
        extensions.get::<Self>().copied()
    }

    /// Resolves the trusted subject from request extensions, web-framework context,
    /// or legacy signed headers when the web framework is disabled.
    pub fn resolve_optional(headers: &HeaderMap, extensions: &Extensions) -> Option<Self> {
        if let Some(subject) = Self::from_extensions(extensions) {
            return Some(subject);
        }
        if let Some(context) = extensions.get::<sdkwork_web_core::WebRequestContext>() {
            if let Some(subject) = crate::web_bridge::trusted_request_subject_from_web_context(context)
            {
                return Some(subject);
            }
        }
        if let Some(context) = extensions.get::<IamAppContext>() {
            if let Some(subject) =
                crate::web_bridge::trusted_request_subject_from_iam_app_context(context)
            {
                return Some(subject);
            }
        }
        if crate::web_framework_compat::claw_web_framework_enabled_from_env() {
            return None;
        }
        Self::from_headers(headers).ok()
    }

    pub fn resolve_optional_from_parts(parts: &Parts) -> Option<Self> {
        Self::resolve_optional(&parts.headers, &parts.extensions)
    }

    pub fn resolve_from_parts(parts: &Parts) -> Result<Self, TrustedRequestSubjectError> {
        Self::resolve_optional_from_parts(parts).ok_or(TrustedRequestSubjectError::MissingExtension)
    }

    pub fn from_headers(headers: &HeaderMap) -> Result<Self, TrustedSubjectBoundaryError> {
        let tenant_id = required_signed_positive_i64_header(headers, X_SDKWORK_TENANT_ID)?;
        let organization_id =
            required_signed_non_negative_i64_header(headers, X_SDKWORK_ORGANIZATION_ID)?;
        let user_id = required_signed_positive_i64_header(headers, X_SDKWORK_USER_ID)?;
        Ok(Self {
            tenant_id,
            organization_id,
            user_id,
            operator_id: user_id,
            operator_type: DEFAULT_USER_OPERATOR_TYPE,
        })
    }
}

impl<S> FromRequestParts<S> for TrustedRequestSubject
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        Self::resolve_from_parts(parts).map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                Json(BoundaryErrorEnvelope {
                    code: "4010",
                    msg: TrustedRequestSubjectError::MissingExtension.to_string(),
                    data: None,
                }),
            )
                .into_response()
        })
    }
}

impl<S> OptionalFromRequestParts<S> for TrustedRequestSubject
where
    S: Send + Sync,
{
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Option<Self>, Self::Rejection> {
        Ok(Self::resolve_optional_from_parts(parts))
    }
}

impl fmt::Display for TrustedRequestSubjectError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingExtension => write!(formatter, "trusted request subject is required"),
        }
    }
}

impl std::error::Error for TrustedRequestSubjectError {}

impl AppSubjectBoundaryConfig {
    pub fn new(trusted_subject: TrustedSubjectConfig, app_session: AppSessionConfig) -> Self {
        Self {
            trusted_subject,
            app_session,
        }
    }

    pub fn trusted_subject(&self) -> &TrustedSubjectConfig {
        &self.trusted_subject
    }

    pub fn app_session(&self) -> &AppSessionConfig {
        &self.app_session
    }
}

impl fmt::Debug for AppSubjectBoundaryConfig {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("AppSubjectBoundaryConfig")
            .field("trusted_subject", &self.trusted_subject)
            .field("app_session", &self.app_session)
            .finish()
    }
}

pub fn attach_trusted_request_subject(request: &mut Request<Body>, subject: TrustedRequestSubject) {
    project_trusted_subject_for_legacy_handlers(request, subject);
    request
        .extensions_mut()
        .insert(iam_app_context_from_trusted_subject(subject));
}

/// Projects trusted subject headers and extensions for handlers that still
/// read `TrustedRequestSubject::from_headers` or extension extractors.
pub fn project_trusted_subject_for_legacy_handlers(
    request: &mut Request<Body>,
    subject: TrustedRequestSubject,
) {
    if let Err(error) = insert_internal_trusted_subject_headers(request.headers_mut(), subject) {
        // `insert_internal_trusted_subject_headers` only fails when an i64-encoded
        // header value cannot be turned into a `HeaderValue`. That conversion is
        // provably safe for any `i64` (ASCII digits and optional `-`), so this
        // branch is unreachable in practice. We log and continue so that the
        // request still carries the subject extension even if header projection
        // fails for an unexpected reason.
        tracing::error!(
            error = %error,
            "failed to project trusted subject headers; continuing with extension only"
        );
    }
    request.extensions_mut().insert(subject);
}

fn iam_app_context_from_trusted_subject(subject: TrustedRequestSubject) -> IamAppContext {
    IamAppContext::new(
        subject.tenant_id.to_string(),
        Some(&subject.organization_id.to_string()),
        subject.user_id.to_string(),
        format!("claw-subject-{}", subject.user_id),
        "sdkwork-clawrouter",
        Environment::Prod,
        DeploymentMode::Private,
        AuthLevel::Password,
        vec!["app".to_owned()],
        vec!["app".to_owned()],
    )
}

pub async fn app_request_subject_boundary(
    State(config): State<AppSubjectBoundaryConfig>,
    mut request: Request<Body>,
    next: Next,
) -> Response {
    if crate::web_framework_compat::claw_web_framework_enabled_from_env() {
        if let Some(subject) =
            TrustedRequestSubject::resolve_optional(request.headers(), request.extensions())
        {
            attach_trusted_request_subject(&mut request, subject);
        }
        return next.run(request).await;
    }

    enforce_verified_app_request_subject(config, request, next).await
}

/// App-session boundary for federated T1 capability routers mounted into Claw Router.
/// These routes must accept Claw app-session dual tokens even when the outer app surface
/// runs in web-framework mode without a global resolver wrap.
pub async fn federated_app_request_subject_boundary(
    State(config): State<AppSubjectBoundaryConfig>,
    request: Request<Body>,
    next: Next,
) -> Response {
    enforce_verified_app_request_subject(config, request, next).await
}

async fn enforce_verified_app_request_subject(
    config: AppSubjectBoundaryConfig,
    mut request: Request<Body>,
    next: Next,
) -> Response {
    let method = request.method().as_str().to_owned();
    let path_and_query = request
        .uri()
        .path_and_query()
        .map(|value| value.as_str().to_owned())
        .unwrap_or_else(|| request.uri().path().to_owned());
    let now_unix_seconds = match current_unix_seconds() {
        Ok(seconds) => seconds,
        Err(error) => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(BoundaryErrorEnvelope {
                    code: "5030",
                    msg: error,
                    data: None,
                }),
            )
                .into_response();
        }
    };
    match verified_app_request_subject(
        request.headers_mut(),
        &method,
        &path_and_query,
        &config,
        now_unix_seconds,
    ) {
        Ok(subject) => {
            attach_trusted_request_subject(&mut request, subject);
            next.run(request).await
        }
        Err(message) => unauthorized_boundary_response(message),
    }
}

pub async fn optional_app_request_subject_boundary(
    State(config): State<AppSubjectBoundaryConfig>,
    mut request: Request<Body>,
    next: Next,
) -> Response {
    if crate::web_framework_compat::claw_web_framework_enabled_from_env() {
        if let Some(subject) =
            TrustedRequestSubject::resolve_optional(request.headers(), request.extensions())
        {
            attach_trusted_request_subject(&mut request, subject);
        }
        next.run(request).await
    } else {
        let method = request.method().as_str().to_owned();
        let path_and_query = request
            .uri()
            .path_and_query()
            .map(|value| value.as_str().to_owned())
            .unwrap_or_else(|| request.uri().path().to_owned());
        if let Ok(now_unix_seconds) = current_unix_seconds() {
            if let Some(subject) = optional_app_request_subject(
                request.headers_mut(),
                &method,
                &path_and_query,
                &config,
                now_unix_seconds,
            ) {
                attach_trusted_request_subject(&mut request, subject);
            }
        } else {
            remove_internal_trusted_subject_headers(request.headers_mut());
            remove_signed_subject_headers(request.headers_mut());
            remove_app_session_token_headers(request.headers_mut());
        }
        next.run(request).await
    }
}

pub fn verified_app_request_subject(
    headers: &mut HeaderMap,
    method: &str,
    path_and_query: &str,
    config: &AppSubjectBoundaryConfig,
    now_unix_seconds: i64,
) -> Result<TrustedRequestSubject, String> {
    if let Some(subject) = verified_signed_trusted_request_subject(
        headers,
        method,
        path_and_query,
        config.trusted_subject(),
        now_unix_seconds,
    )
    .map_err(|error| error.to_string())?
    {
        return Ok(subject);
    }
    let subject =
        match verify_dual_app_session_headers(headers, config.app_session(), now_unix_seconds) {
            Ok(subject) => subject,
            Err(error) => {
                remove_app_session_token_headers(headers);
                return Err(error.to_string());
            }
        };
    remove_app_session_token_headers(headers);
    remove_internal_trusted_subject_headers(headers);
    Ok(subject)
}

pub fn optional_app_request_subject(
    headers: &mut HeaderMap,
    method: &str,
    path_and_query: &str,
    config: &AppSubjectBoundaryConfig,
    now_unix_seconds: i64,
) -> Option<TrustedRequestSubject> {
    match verified_signed_trusted_request_subject(
        headers,
        method,
        path_and_query,
        config.trusted_subject(),
        now_unix_seconds,
    ) {
        Ok(Some(subject)) => return Some(subject),
        Ok(None) => {}
        Err(_) => {
            remove_internal_trusted_subject_headers(headers);
            remove_signed_subject_headers(headers);
        }
    }

    if !has_any_app_session_token_header(headers) {
        return None;
    };
    match verify_dual_app_session_headers(headers, config.app_session(), now_unix_seconds) {
        Ok(subject) => {
            remove_app_session_token_headers(headers);
            remove_internal_trusted_subject_headers(headers);
            Some(subject)
        }
        Err(_) => {
            remove_app_session_token_headers(headers);
            None
        }
    }
}

pub async fn trusted_request_subject_boundary(
    State(config): State<TrustedSubjectConfig>,
    mut request: Request<Body>,
    next: Next,
) -> Response {
    let method = request.method().as_str().to_owned();
    let path_and_query = request
        .uri()
        .path_and_query()
        .map(|value| value.as_str().to_owned())
        .unwrap_or_else(|| request.uri().path().to_owned());
    let now_unix_seconds = match current_unix_seconds() {
        Ok(seconds) => seconds,
        Err(error) => {
            return (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(BoundaryErrorEnvelope {
                    code: "5030",
                    msg: error,
                    data: None,
                }),
            )
                .into_response();
        }
    };
    match verified_signed_trusted_request_subject(
        request.headers_mut(),
        &method,
        &path_and_query,
        &config,
        now_unix_seconds,
    ) {
        Ok(Some(subject)) => {
            attach_trusted_request_subject(&mut request, subject);
            next.run(request).await
        }
        Ok(None) => {
            unauthorized_boundary_response("trusted request subject is required".to_owned())
        }
        Err(error) => unauthorized_boundary_response(error.to_string()),
    }
}

pub fn verified_signed_trusted_request_subject(
    headers: &mut HeaderMap,
    method: &str,
    path_and_query: &str,
    config: &TrustedSubjectConfig,
    now_unix_seconds: i64,
) -> Result<Option<TrustedRequestSubject>, TrustedSubjectBoundaryError> {
    remove_internal_trusted_subject_headers(headers);
    if !has_any_signed_subject_header(headers) {
        return Ok(None);
    }

    let tenant_id = required_signed_positive_i64_header(headers, X_SDKWORK_SUBJECT_TENANT_ID)?;
    let organization_id =
        required_signed_non_negative_i64_header(headers, X_SDKWORK_SUBJECT_ORGANIZATION_ID)?;
    let user_id = required_signed_positive_i64_header(headers, X_SDKWORK_SUBJECT_USER_ID)?;
    let timestamp = required_signed_timestamp(headers)?;
    let signature = required_signed_header(headers, X_SDKWORK_SUBJECT_SIGNATURE)?.to_owned();
    remove_signed_subject_headers(headers);

    validate_timestamp(timestamp, now_unix_seconds, config)?;
    let subject = TrustedRequestSubject {
        tenant_id,
        organization_id,
        user_id,
        operator_id: user_id,
        operator_type: DEFAULT_USER_OPERATOR_TYPE,
    };
    verify_trusted_request_subject_signature(
        config,
        subject,
        timestamp,
        method,
        path_and_query,
        &signature,
    )?;
    remove_internal_trusted_subject_headers(headers);
    Ok(Some(subject))
}

pub fn sign_trusted_request_subject(
    config: &TrustedSubjectConfig,
    subject: TrustedRequestSubject,
    timestamp: i64,
    method: &str,
    path_and_query: &str,
) -> String {
    let mut mac = hmac_for_config(config).unwrap_or_else(|error| {
        tracing::error!(
            error = %error,
            "signing trusted request subject failed (unreachable for HMAC-SHA256); using zero-key fallback signature"
        );
        // SAFETY: `Mac::new` is the infallible constructor (takes a fixed-size key).
        // HMAC-SHA256 accepts any key length, so the error branch above is unreachable.
        // The zero-key fallback only runs in the unreachable case; the produced
        // signature will be invalid but the process will not panic.
        HmacSha256::new(&Default::default())
    });
    mac.update(trusted_subject_payload(subject, timestamp, method, path_and_query).as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

pub fn sign_app_session_token(
    config: &AppSessionConfig,
    subject: TrustedRequestSubject,
    issued_at: i64,
    expires_at: i64,
) -> String {
    let payload = app_session_payload(subject, issued_at, expires_at);
    let mut mac = app_session_hmac_for_config(config).unwrap_or_else(|error| {
        tracing::error!(
            error = %error,
            "signing app session token failed (unreachable for HMAC-SHA256); using zero-key fallback signature"
        );
        HmacSha256::new(&Default::default())
    });
    mac.update(payload.as_bytes());
    format!(
        "{}.{}.{}",
        APP_SESSION_TOKEN_VERSION,
        payload.replace('\n', "."),
        hex::encode(mac.finalize().into_bytes())
    )
}

pub fn sign_app_session_token_with_claims(
    config: &AppSessionConfig,
    claims: &AppSessionTokenClaims,
) -> String {
    sign_app_session_token_with_claims_and_secret(config.signing_secret().as_bytes(), claims)
}

pub fn sign_app_session_token_with_claims_and_secret(
    signing_secret: &[u8],
    claims: &AppSessionTokenClaims,
) -> String {
    let payload = match app_session_claim_payload(claims) {
        Ok(payload) => payload,
        Err(error) => {
            tracing::error!(
                error = %error,
                "signing app session token with claims failed (claims serialization); returning empty token"
            );
            return String::new();
        }
    };
    let encoded_payload = URL_SAFE_NO_PAD.encode(payload.as_bytes());
    let mut mac = app_session_hmac_for_secret(signing_secret).unwrap_or_else(|error| {
        tracing::error!(
            error = %error,
            "signing app session token with claims failed (unreachable for HMAC-SHA256); using zero-key fallback signature"
        );
        HmacSha256::new(&Default::default())
    });
    mac.update(encoded_payload.as_bytes());
    format!(
        "{}.{}.{}",
        APP_SESSION_CLAIM_TOKEN_VERSION,
        encoded_payload,
        hex::encode(mac.finalize().into_bytes())
    )
}

pub fn decode_app_session_token_claims_unverified(
    token: &str,
) -> Result<AppSessionTokenClaims, AppSessionTokenError> {
    let parts: Vec<&str> = token.trim().split('.').collect();
    if parts.len() != 3 || parts[0] != APP_SESSION_CLAIM_TOKEN_VERSION {
        return Err(AppSessionTokenError::InvalidTokenFormat);
    }
    let decoded_payload = URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|_| AppSessionTokenError::InvalidTokenFormat)?;
    serde_json::from_slice(&decoded_payload).map_err(|_| AppSessionTokenError::InvalidTokenFormat)
}

pub fn verify_app_session_token_claims_with_signing_secret(
    config: &AppSessionConfig,
    signing_secret: &[u8],
    token: &str,
    now_unix_seconds: i64,
) -> Result<AppSessionTokenClaims, AppSessionTokenError> {
    let parts: Vec<&str> = token.trim().split('.').collect();
    if parts.len() != 3 || parts[0] != APP_SESSION_CLAIM_TOKEN_VERSION {
        return Err(AppSessionTokenError::InvalidTokenFormat);
    }
    verify_app_session_claim_signature_with_secret(signing_secret, parts[1], parts[2])?;
    let claims = decode_app_session_token_claims_unverified(token)?;
    validate_app_session_claims(config, &claims, now_unix_seconds)?;
    Ok(claims)
}

/// Sign an app session token using a per-tenant signing key store.
///
/// When the store has an active key for the claims' tenant, this function
/// signs the token with that per-tenant key and embeds the `key_id` in the
/// claims (`kid` field) so verifiers can look up the correct key later.
///
/// Falls back to the shared `AppSessionConfig` HMAC secret when no
/// per-tenant key is configured for the tenant (backward compatibility).
pub async fn sign_app_session_token_with_claims_and_store(
    config: &AppSessionConfig,
    store: &dyn TenantSigningKeyStore,
    claims: &AppSessionTokenClaims,
) -> Result<String, String> {
    let tenant_id_str = claims.tenant_id.to_string();
    match store.ensure_active_key(&tenant_id_str).await {
        Ok(key_material) => {
            let mut claims_with_kid = claims.clone();
            claims_with_kid.kid = Some(key_material.kid.clone());
            Ok(sign_app_session_token_with_claims_and_secret(
                &key_material.secret,
                &claims_with_kid,
            ))
        }
        Err(error) => {
            tracing::warn!(
                error = %error,
                tenant_id = claims.tenant_id,
                "failed to resolve per-tenant signing key; falling back to shared HMAC secret",
            );
            Ok(sign_app_session_token_with_claims(config, claims))
        }
    }
}

/// Verify an app session token using a per-tenant key resolver.
///
/// When the token carries a `kid` claim and the resolver knows the key, this
/// function verifies the signature with the per-tenant key. This supports
/// key rotation windows where multiple keys may be valid simultaneously.
///
/// Falls back to the shared `AppSessionConfig` HMAC secret when no `kid` is
/// present or the resolver does not know the key (backward compatibility).
pub async fn verify_app_session_token_claims_with_resolver(
    config: &AppSessionConfig,
    resolver: &dyn sdkwork_iam_web_adapter::TenantSigningKeyResolver,
    token: &str,
    now_unix_seconds: i64,
) -> Result<AppSessionTokenClaims, AppSessionTokenError> {
    let parts: Vec<&str> = token.trim().split('.').collect();
    if parts.len() != 3 || parts[0] != APP_SESSION_CLAIM_TOKEN_VERSION {
        return Err(AppSessionTokenError::InvalidTokenFormat);
    }
    // Decode claims without signature verification to extract tenant_id and kid.
    // This is safe: the claims are validated against config (TTL, clock skew,
    // login scope) after signature verification succeeds.
    let decoded_payload = URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|_| AppSessionTokenError::InvalidTokenFormat)?;
    let unverified_claims: AppSessionTokenClaims = serde_json::from_slice(&decoded_payload)
        .map_err(|_| AppSessionTokenError::InvalidTokenFormat)?;
    // Try per-tenant key when kid is present and resolver has the key.
    if let Some(kid) = unverified_claims.kid.as_deref() {
        if let Some(secret) = resolver.resolve_signing_secret_by_kid(kid).await {
            verify_app_session_claim_signature_with_secret(&secret, parts[1], parts[2])?;
            let claims: AppSessionTokenClaims = serde_json::from_slice(&decoded_payload)
                .map_err(|_| AppSessionTokenError::InvalidTokenFormat)?;
            validate_app_session_claims(config, &claims, now_unix_seconds)?;
            return Ok(claims);
        }
    }
    // Fallback to shared HMAC secret for backward compatibility.
    verify_app_session_token_claims(config, token, now_unix_seconds)
}

pub fn verify_app_session_authorization_header(
    config: &AppSessionConfig,
    authorization: &str,
    now_unix_seconds: i64,
) -> Result<TrustedRequestSubject, AppSessionTokenError> {
    let token = parse_app_session_authorization_bearer(authorization)?;
    verify_app_session_token(config, token, now_unix_seconds)
}

pub fn verify_dual_app_session_token_pair(
    config: &AppSessionConfig,
    authorization: &str,
    access_token: &str,
    now_unix_seconds: i64,
) -> Result<TrustedRequestSubject, AppSessionTokenError> {
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        authorization
            .trim()
            .parse()
            .map_err(|_| AppSessionTokenError::InvalidHeaderValue(AUTHORIZATION))?,
    );
    headers.insert(
        ACCESS_TOKEN,
        access_token
            .trim()
            .parse()
            .map_err(|_| AppSessionTokenError::InvalidHeaderValue(ACCESS_TOKEN))?,
    );
    verify_dual_app_session_headers(&headers, config, now_unix_seconds)
}

pub fn verify_dual_app_session_headers(
    headers: &HeaderMap,
    config: &AppSessionConfig,
    now_unix_seconds: i64,
) -> Result<TrustedRequestSubject, AppSessionTokenError> {
    let authorization = headers
        .get(AUTHORIZATION)
        .ok_or(AppSessionTokenError::MissingBearerToken)?
        .to_str()
        .map_err(|_| AppSessionTokenError::InvalidHeaderValue(AUTHORIZATION))?;
    let auth_token = parse_app_session_authorization_bearer(authorization)?;
    let auth_claims = verify_app_session_token_claims(config, auth_token, now_unix_seconds)
        .and_then(|claims| {
            if claims.token_kind == AppSessionTokenKind::Auth {
                Ok(claims)
            } else {
                Err(AppSessionTokenError::InvalidTokenType)
            }
        });
    let auth_subject = match auth_claims.as_ref() {
        Ok(claims) => claims.trusted_subject(),
        Err(AppSessionTokenError::InvalidTokenFormat) => {
            verify_app_session_token(config, auth_token, now_unix_seconds)?
        }
        Err(error) => return Err(error.clone()),
    };

    let access_token = headers
        .get(ACCESS_TOKEN)
        .ok_or(AppSessionTokenError::MissingAccessToken)?
        .to_str()
        .map(str::trim)
        .map_err(|_| AppSessionTokenError::InvalidHeaderValue(ACCESS_TOKEN))?;
    if access_token.is_empty() {
        return Err(AppSessionTokenError::MissingAccessToken);
    }
    let access_claims = verify_app_session_token_claims(config, access_token, now_unix_seconds)
        .and_then(|claims| {
            if claims.token_kind == AppSessionTokenKind::Access {
                Ok(claims)
            } else {
                Err(AppSessionTokenError::InvalidTokenType)
            }
        });
    let access_subject = match access_claims.as_ref() {
        Ok(claims) => claims.trusted_subject(),
        Err(AppSessionTokenError::InvalidTokenFormat) => {
            verify_app_session_token(config, access_token, now_unix_seconds)?
        }
        Err(error) => return Err(error.clone()),
    };
    if auth_subject != access_subject {
        return Err(AppSessionTokenError::SubjectMismatch);
    }
    if let (Ok(auth_claims), Ok(access_claims)) = (auth_claims, access_claims) {
        validate_matching_app_session_claims(&auth_claims, &access_claims)?;
    }
    Ok(auth_subject)
}

pub fn verify_app_session_token(
    config: &AppSessionConfig,
    token: &str,
    now_unix_seconds: i64,
) -> Result<TrustedRequestSubject, AppSessionTokenError> {
    if token.trim().starts_with(APP_SESSION_CLAIM_TOKEN_VERSION) {
        return verify_app_session_token_claims(config, token, now_unix_seconds)
            .map(|claims| claims.trusted_subject());
    }
    let parts: Vec<&str> = token.trim().split('.').collect();
    if parts.len() != 7 || parts[0] != APP_SESSION_TOKEN_VERSION {
        return Err(AppSessionTokenError::InvalidTokenFormat);
    }
    let tenant_id = parse_session_positive_i64(parts[1], "tenant_id")?;
    let organization_id = parse_session_non_negative_i64(
        parts[2]
            .parse::<i64>()
            .map_err(|_| AppSessionTokenError::InvalidPositiveInteger("organization_id"))?,
        "organization_id",
    )?;
    let user_id = parse_session_positive_i64(parts[3], "user_id")?;
    let issued_at = parse_session_timestamp(parts[4], "issued_at")?;
    let expires_at = parse_session_timestamp(parts[5], "expires_at")?;
    if expires_at <= issued_at {
        return Err(AppSessionTokenError::InvalidTimestamp("expires_at"));
    }
    validate_app_session_time_window(config, issued_at, expires_at, now_unix_seconds)?;
    let subject = TrustedRequestSubject {
        tenant_id,
        organization_id,
        user_id,
        operator_id: user_id,
        operator_type: DEFAULT_USER_OPERATOR_TYPE,
    };
    verify_app_session_signature(config, subject, issued_at, expires_at, parts[6])?;
    Ok(subject)
}

pub fn verify_app_session_token_claims(
    config: &AppSessionConfig,
    token: &str,
    now_unix_seconds: i64,
) -> Result<AppSessionTokenClaims, AppSessionTokenError> {
    let parts: Vec<&str> = token.trim().split('.').collect();
    if parts.len() != 3 || parts[0] != APP_SESSION_CLAIM_TOKEN_VERSION {
        return Err(AppSessionTokenError::InvalidTokenFormat);
    }
    verify_app_session_claim_signature(config, parts[1], parts[2])?;
    let decoded_payload = URL_SAFE_NO_PAD
        .decode(parts[1])
        .map_err(|_| AppSessionTokenError::InvalidTokenFormat)?;
    let claims: AppSessionTokenClaims = serde_json::from_slice(&decoded_payload)
        .map_err(|_| AppSessionTokenError::InvalidTokenFormat)?;
    validate_app_session_claims(config, &claims, now_unix_seconds)?;
    Ok(claims)
}

impl fmt::Display for TrustedSubjectBoundaryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingHeader(name) => {
                write!(formatter, "{name} header is required for trusted subject")
            }
            Self::InvalidHeaderValue(name) => write!(formatter, "{name} header value is invalid"),
            Self::InvalidPositiveInteger(name) => {
                write!(formatter, "{name} header must be a positive integer")
            }
            Self::InvalidTimestamp => {
                write!(
                    formatter,
                    "{X_SDKWORK_SUBJECT_TIMESTAMP} header must be a positive unix timestamp"
                )
            }
            Self::TimestampOutsideClockSkew => {
                write!(
                    formatter,
                    "trusted subject timestamp is outside allowed clock skew"
                )
            }
            Self::InvalidSignature => write!(formatter, "trusted subject signature is invalid"),
            Self::SigningKeyInvalid => write!(
                formatter,
                "trusted subject signing key is invalid for HMAC-SHA256"
            ),
        }
    }
}

impl std::error::Error for TrustedSubjectBoundaryError {}

impl fmt::Display for AppSessionTokenError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::MissingBearerToken => write!(formatter, "app session bearer token is required"),
            Self::MissingAccessToken => {
                write!(formatter, "{ACCESS_TOKEN} header is required")
            }
            Self::InvalidAuthorizationScheme => {
                write!(
                    formatter,
                    "authorization header must use Bearer app session scheme"
                )
            }
            Self::InvalidHeaderValue(name) => write!(formatter, "{name} header value is invalid"),
            Self::InvalidTokenFormat => write!(formatter, "app session token format is invalid"),
            Self::InvalidPositiveInteger(field) => {
                write!(formatter, "app session {field} must be a positive integer")
            }
            Self::InvalidTimestamp(field) => {
                write!(
                    formatter,
                    "app session {field} must be a valid unix timestamp"
                )
            }
            Self::InvalidTokenType => {
                write!(
                    formatter,
                    "app session token type is invalid for this header"
                )
            }
            Self::InvalidLoginScope => {
                write!(formatter, "app session login scope is invalid")
            }
            Self::IssuedAtOutsideClockSkew => {
                write!(
                    formatter,
                    "app session issued_at is outside allowed clock skew"
                )
            }
            Self::Expired => write!(formatter, "app session token has expired"),
            Self::InvalidSignature => write!(formatter, "app session token signature is invalid"),
            Self::SubjectMismatch => write!(
                formatter,
                "app session auth token and access token subjects do not match"
            ),
            Self::SigningKeyInvalid => write!(
                formatter,
                "app session signing key is invalid for HMAC-SHA256"
            ),
            Self::Serialization(message) => write!(
                formatter,
                "app session token claims serialization failed: {message}"
            ),
        }
    }
}

impl std::error::Error for AppSessionTokenError {}

fn unauthorized_boundary_response(message: String) -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(BoundaryErrorEnvelope {
            code: "4010",
            msg: message,
            data: None,
        }),
    )
        .into_response()
}

fn current_unix_seconds() -> Result<i64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .map_err(|error| {
            tracing::error!("system clock error: unable to determine current unix time: {error}");
            format!("system clock error: unable to determine current unix time: {error}")
        })
}

fn remove_internal_trusted_subject_headers(headers: &mut HeaderMap) {
    headers.remove(X_SDKWORK_TENANT_ID);
    headers.remove(X_SDKWORK_ORGANIZATION_ID);
    headers.remove(X_SDKWORK_USER_ID);
}

fn insert_internal_trusted_subject_headers(
    headers: &mut HeaderMap,
    subject: TrustedRequestSubject,
) -> Result<(), TrustedSubjectBoundaryError> {
    headers.insert(
        X_SDKWORK_TENANT_ID,
        HeaderValue::from_str(&subject.tenant_id.to_string())
            .map_err(|_| TrustedSubjectBoundaryError::InvalidHeaderValue(X_SDKWORK_TENANT_ID))?,
    );
    headers.insert(
        X_SDKWORK_ORGANIZATION_ID,
        HeaderValue::from_str(&subject.organization_id.to_string())
            .map_err(|_| {
                TrustedSubjectBoundaryError::InvalidHeaderValue(X_SDKWORK_ORGANIZATION_ID)
            })?,
    );
    headers.insert(
        X_SDKWORK_USER_ID,
        HeaderValue::from_str(&subject.user_id.to_string())
            .map_err(|_| TrustedSubjectBoundaryError::InvalidHeaderValue(X_SDKWORK_USER_ID))?,
    );
    Ok(())
}

fn has_any_app_session_token_header(headers: &HeaderMap) -> bool {
    headers.contains_key(AUTHORIZATION) || headers.contains_key(ACCESS_TOKEN)
}

fn remove_app_session_token_headers(headers: &mut HeaderMap) {
    headers.remove(AUTHORIZATION);
    headers.remove(ACCESS_TOKEN);
}

fn has_any_signed_subject_header(headers: &HeaderMap) -> bool {
    [
        X_SDKWORK_SUBJECT_TENANT_ID,
        X_SDKWORK_SUBJECT_ORGANIZATION_ID,
        X_SDKWORK_SUBJECT_USER_ID,
        X_SDKWORK_SUBJECT_TIMESTAMP,
        X_SDKWORK_SUBJECT_SIGNATURE,
    ]
    .iter()
    .any(|name| headers.contains_key(*name))
}

fn remove_signed_subject_headers(headers: &mut HeaderMap) {
    headers.remove(X_SDKWORK_SUBJECT_TENANT_ID);
    headers.remove(X_SDKWORK_SUBJECT_ORGANIZATION_ID);
    headers.remove(X_SDKWORK_SUBJECT_USER_ID);
    headers.remove(X_SDKWORK_SUBJECT_TIMESTAMP);
    headers.remove(X_SDKWORK_SUBJECT_SIGNATURE);
}

fn required_signed_header<'a>(
    headers: &'a HeaderMap,
    name: &'static str,
) -> Result<&'a str, TrustedSubjectBoundaryError> {
    headers
        .get(name)
        .ok_or(TrustedSubjectBoundaryError::MissingHeader(name))?
        .to_str()
        .map(str::trim)
        .map_err(|_| TrustedSubjectBoundaryError::InvalidHeaderValue(name))
        .and_then(|value| {
            if value.is_empty() {
                Err(TrustedSubjectBoundaryError::InvalidHeaderValue(name))
            } else {
                Ok(value)
            }
        })
}

fn required_signed_positive_i64_header(
    headers: &HeaderMap,
    name: &'static str,
) -> Result<i64, TrustedSubjectBoundaryError> {
    let value = required_signed_header(headers, name)?;
    let parsed = value
        .parse::<i64>()
        .map_err(|_| TrustedSubjectBoundaryError::InvalidPositiveInteger(name))?;
    if parsed <= 0 {
        return Err(TrustedSubjectBoundaryError::InvalidPositiveInteger(name));
    }
    Ok(parsed)
}

fn required_signed_non_negative_i64_header(
    headers: &HeaderMap,
    name: &'static str,
) -> Result<i64, TrustedSubjectBoundaryError> {
    let value = required_signed_header(headers, name)?;
    let parsed = value
        .parse::<i64>()
        .map_err(|_| TrustedSubjectBoundaryError::InvalidPositiveInteger(name))?;
    if parsed < 0 {
        return Err(TrustedSubjectBoundaryError::InvalidPositiveInteger(name));
    }
    Ok(parsed)
}

fn required_signed_timestamp(headers: &HeaderMap) -> Result<i64, TrustedSubjectBoundaryError> {
    let value = required_signed_header(headers, X_SDKWORK_SUBJECT_TIMESTAMP)?;
    let parsed = value
        .parse::<i64>()
        .map_err(|_| TrustedSubjectBoundaryError::InvalidTimestamp)?;
    if parsed <= 0 {
        return Err(TrustedSubjectBoundaryError::InvalidTimestamp);
    }
    Ok(parsed)
}

fn validate_timestamp(
    timestamp: i64,
    now_unix_seconds: i64,
    config: &TrustedSubjectConfig,
) -> Result<(), TrustedSubjectBoundaryError> {
    let delta = if now_unix_seconds >= timestamp {
        now_unix_seconds - timestamp
    } else {
        timestamp - now_unix_seconds
    };
    if delta as u64 > config.max_clock_skew_seconds() {
        return Err(TrustedSubjectBoundaryError::TimestampOutsideClockSkew);
    }
    Ok(())
}

fn verify_trusted_request_subject_signature(
    config: &TrustedSubjectConfig,
    subject: TrustedRequestSubject,
    timestamp: i64,
    method: &str,
    path_and_query: &str,
    signature: &str,
) -> Result<(), TrustedSubjectBoundaryError> {
    let decoded_signature =
        hex::decode(signature).map_err(|_| TrustedSubjectBoundaryError::InvalidSignature)?;
    let mut mac = hmac_for_config(config)?;
    mac.update(trusted_subject_payload(subject, timestamp, method, path_and_query).as_bytes());
    mac.verify_slice(&decoded_signature)
        .map_err(|_| TrustedSubjectBoundaryError::InvalidSignature)
}

fn hmac_for_config(config: &TrustedSubjectConfig) -> Result<HmacSha256, TrustedSubjectBoundaryError> {
    HmacSha256::new_from_slice(config.signing_secret().as_bytes())
        .map_err(|error| {
            tracing::error!(
                error = %error,
                "HMAC-SHA256 key construction failed for trusted subject boundary (unreachable for HMAC, which accepts any key length)"
            );
            TrustedSubjectBoundaryError::SigningKeyInvalid
        })
}

fn app_session_hmac_for_config(
    config: &AppSessionConfig,
) -> Result<HmacSha256, AppSessionTokenError> {
    app_session_hmac_for_secret(config.signing_secret().as_bytes())
}

fn app_session_hmac_for_secret(
    signing_secret: &[u8],
) -> Result<HmacSha256, AppSessionTokenError> {
    HmacSha256::new_from_slice(signing_secret)
        .map_err(|error| {
            tracing::error!(
                error = %error,
                "HMAC-SHA256 key construction failed for app session token (unreachable for HMAC, which accepts any key length)"
            );
            AppSessionTokenError::SigningKeyInvalid
        })
}

fn app_session_payload(subject: TrustedRequestSubject, issued_at: i64, expires_at: i64) -> String {
    format!(
        "{}\n{}\n{}\n{}\n{}",
        subject.tenant_id, subject.organization_id, subject.user_id, issued_at, expires_at
    )
}

fn app_session_claim_payload(
    claims: &AppSessionTokenClaims,
) -> Result<String, AppSessionTokenError> {
    serde_json::to_string(claims).map_err(|error| {
        tracing::error!(
            error = %error,
            "app session token claims serialization failed"
        );
        AppSessionTokenError::Serialization(error.to_string())
    })
}

fn parse_session_positive_i64(
    value: &str,
    field: &'static str,
) -> Result<i64, AppSessionTokenError> {
    let parsed = value
        .parse::<i64>()
        .map_err(|_| AppSessionTokenError::InvalidPositiveInteger(field))?;
    if parsed <= 0 {
        return Err(AppSessionTokenError::InvalidPositiveInteger(field));
    }
    Ok(parsed)
}

fn parse_session_non_negative_i64(
    value: i64,
    field: &'static str,
) -> Result<i64, AppSessionTokenError> {
    if value < 0 {
        return Err(AppSessionTokenError::InvalidPositiveInteger(field));
    }
    Ok(value)
}

fn parse_session_timestamp(value: &str, field: &'static str) -> Result<i64, AppSessionTokenError> {
    let parsed = value
        .parse::<i64>()
        .map_err(|_| AppSessionTokenError::InvalidTimestamp(field))?;
    if parsed <= 0 {
        return Err(AppSessionTokenError::InvalidTimestamp(field));
    }
    Ok(parsed)
}

fn validate_app_session_claims(
    config: &AppSessionConfig,
    claims: &AppSessionTokenClaims,
    now_unix_seconds: i64,
) -> Result<(), AppSessionTokenError> {
    parse_session_non_negative_i64(claims.organization_id, "organization_id")?;
    if claims.tenant_id <= 0 {
        return Err(AppSessionTokenError::InvalidPositiveInteger("tenant_id"));
    }
    if claims.user_id <= 0 {
        return Err(AppSessionTokenError::InvalidPositiveInteger("user_id"));
    }
    if claims.session_id.trim().is_empty()
        || claims.app_id.trim().is_empty()
        || claims.environment.trim().is_empty()
        || claims.deployment_mode.trim().is_empty()
        || claims.auth_level.trim().is_empty()
    {
        return Err(AppSessionTokenError::InvalidTokenFormat);
    }
    if claims.expires_at <= claims.issued_at {
        return Err(AppSessionTokenError::InvalidTimestamp("expires_at"));
    }
    validate_app_session_time_window(
        config,
        claims.issued_at,
        claims.expires_at,
        now_unix_seconds,
    )?;
    match (claims.login_scope.trim(), claims.organization_id) {
        ("TENANT", 0) => Ok(()),
        ("ORGANIZATION", organization_id) if organization_id > 0 => Ok(()),
        _ => Err(AppSessionTokenError::InvalidLoginScope),
    }
}

fn validate_matching_app_session_claims(
    auth_claims: &AppSessionTokenClaims,
    access_claims: &AppSessionTokenClaims,
) -> Result<(), AppSessionTokenError> {
    if auth_claims.tenant_id != access_claims.tenant_id
        || auth_claims.organization_id != access_claims.organization_id
        || auth_claims.user_id != access_claims.user_id
        || auth_claims.session_id != access_claims.session_id
        || auth_claims.app_id != access_claims.app_id
        || auth_claims.login_scope != access_claims.login_scope
    {
        return Err(AppSessionTokenError::SubjectMismatch);
    }
    Ok(())
}

fn validate_app_session_time_window(
    config: &AppSessionConfig,
    issued_at: i64,
    expires_at: i64,
    now_unix_seconds: i64,
) -> Result<(), AppSessionTokenError> {
    if issued_at - now_unix_seconds > config.max_clock_skew_seconds() as i64 {
        return Err(AppSessionTokenError::IssuedAtOutsideClockSkew);
    }
    if now_unix_seconds - expires_at > config.max_clock_skew_seconds() as i64 {
        return Err(AppSessionTokenError::Expired);
    }
    if (expires_at - issued_at) as u64 > config.session_ttl_seconds() {
        return Err(AppSessionTokenError::InvalidTimestamp("expires_at"));
    }
    Ok(())
}

fn verify_app_session_claim_signature(
    config: &AppSessionConfig,
    encoded_payload: &str,
    signature: &str,
) -> Result<(), AppSessionTokenError> {
    verify_app_session_claim_signature_with_secret(
        config.signing_secret().as_bytes(),
        encoded_payload,
        signature,
    )
}

fn verify_app_session_claim_signature_with_secret(
    signing_secret: &[u8],
    encoded_payload: &str,
    signature: &str,
) -> Result<(), AppSessionTokenError> {
    let decoded_signature =
        hex::decode(signature).map_err(|_| AppSessionTokenError::InvalidSignature)?;
    let mut mac = app_session_hmac_for_secret(signing_secret)?;
    mac.update(encoded_payload.as_bytes());
    mac.verify_slice(&decoded_signature)
        .map_err(|_| AppSessionTokenError::InvalidSignature)
}

fn verify_app_session_signature(
    config: &AppSessionConfig,
    subject: TrustedRequestSubject,
    issued_at: i64,
    expires_at: i64,
    signature: &str,
) -> Result<(), AppSessionTokenError> {
    let decoded_signature =
        hex::decode(signature).map_err(|_| AppSessionTokenError::InvalidSignature)?;
    let mut mac = app_session_hmac_for_config(config)?;
    mac.update(app_session_payload(subject, issued_at, expires_at).as_bytes());
    mac.verify_slice(&decoded_signature)
        .map_err(|_| AppSessionTokenError::InvalidSignature)
}

fn parse_app_session_authorization_bearer(
    authorization: &str,
) -> Result<&str, AppSessionTokenError> {
    let mut parts = authorization.split_whitespace();
    let Some(scheme) = parts.next() else {
        return Err(AppSessionTokenError::MissingBearerToken);
    };
    let Some(token) = parts.next() else {
        return Err(AppSessionTokenError::MissingBearerToken);
    };
    if parts.next().is_some() || !scheme.eq_ignore_ascii_case("bearer") {
        return Err(AppSessionTokenError::InvalidAuthorizationScheme);
    }
    Ok(token)
}

fn trusted_subject_payload(
    subject: TrustedRequestSubject,
    timestamp: i64,
    method: &str,
    path_and_query: &str,
) -> String {
    format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        subject.tenant_id,
        subject.organization_id,
        subject.user_id,
        timestamp,
        method.to_ascii_uppercase(),
        path_and_query
    )
}

fn parse_api_key_id(headers: &HeaderMap) -> Result<Option<i64>, ApiKeyIdentityError> {
    let Some(value) = header_value(headers, X_SDKWORK_API_KEY_ID)? else {
        return Ok(None);
    };
    let api_key_id = value
        .trim()
        .parse::<i64>()
        .map_err(|_| ApiKeyIdentityError::InvalidApiKeyId)?;
    if api_key_id <= 0 {
        return Err(ApiKeyIdentityError::InvalidApiKeyId);
    }
    Ok(Some(api_key_id))
}

fn parse_credential(
    headers: &HeaderMap,
    uri: &Uri,
) -> Result<Option<ApiKeyCredential>, ApiKeyIdentityError> {
    if let Some(value) = header_value(headers, AUTHORIZATION)? {
        return parse_authorization_bearer(value).map(Some);
    }
    if let Some(value) = header_value(headers, X_API_KEY)? {
        return credential(value, ApiKeyCredentialSource::ApiKeyHeader).map(Some);
    }
    if let Some(value) = header_value(headers, X_GOOG_API_KEY)? {
        return credential(value, ApiKeyCredentialSource::GoogleApiKeyHeader).map(Some);
    }
    if let Some(value) = query_key(uri) {
        if !allows_query_string_api_key() {
            return Err(ApiKeyIdentityError::QueryKeyNotAllowed);
        }
        return credential(value, ApiKeyCredentialSource::QueryKey).map(Some);
    }
    Ok(None)
}

fn allows_query_string_api_key() -> bool {
    matches!(
        RuntimeDeploymentMode::from_env(),
        RuntimeDeploymentMode::Desktop
    )
}

fn parse_authorization_bearer(value: &str) -> Result<ApiKeyCredential, ApiKeyIdentityError> {
    let mut parts = value.split_whitespace();
    let Some(scheme) = parts.next() else {
        return Err(ApiKeyIdentityError::EmptyCredential(
            ApiKeyCredentialSource::AuthorizationBearer,
        ));
    };
    let Some(secret) = parts.next() else {
        return Err(ApiKeyIdentityError::EmptyCredential(
            ApiKeyCredentialSource::AuthorizationBearer,
        ));
    };
    if parts.next().is_some() || !scheme.eq_ignore_ascii_case("bearer") {
        return Err(ApiKeyIdentityError::InvalidAuthorizationScheme);
    }
    credential(secret, ApiKeyCredentialSource::AuthorizationBearer)
}

fn credential(
    value: &str,
    source: ApiKeyCredentialSource,
) -> Result<ApiKeyCredential, ApiKeyIdentityError> {
    let secret = value.trim();
    if secret.is_empty() {
        return Err(ApiKeyIdentityError::EmptyCredential(source));
    }
    Ok(ApiKeyCredential {
        secret: secret.to_owned(),
        source,
    })
}

fn header_value<'a>(
    headers: &'a HeaderMap,
    name: &'static str,
) -> Result<Option<&'a str>, ApiKeyIdentityError> {
    headers
        .get(name)
        .map(|value| {
            value
                .to_str()
                .map_err(|_| ApiKeyIdentityError::InvalidHeaderValue(name))
        })
        .transpose()
}

fn query_key(uri: &Uri) -> Option<&str> {
    uri.query()?.split('&').find_map(|pair| {
        let (name, value) = pair.split_once('=')?;
        (name == "key").then_some(value)
    })
}
