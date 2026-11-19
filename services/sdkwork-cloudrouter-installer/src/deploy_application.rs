//! Deploy-side half of the bootstrap-credential **dual ensure**.
//!
//! A bootstrap access credential names an *installation*, and an installation is
//! one-to-one with a deploy application: IAM resolves the credential's
//! `app_id`/`aud` through `iam_tenant_application.deploy_application_id`, and the
//! gateway allow-list accepts exactly that value. Issuing the credential while the
//! deploy application does not exist therefore mints a token that can never name a
//! real deployment — a credential no host may accept and no operator can revoke by
//! deleting the application it pretends to belong to.
//!
//! This module is the deploy-side precondition of issuance. It talks to the Deploy
//! module's own HTTP surface because the deployment inventory is owned by
//! `sdkwork-deployments`, lives in a different schema, and cannot be reached by a
//! Cargo dependency from this repository (the dependency direction is
//! deploy -> IAM, never Cloud Router -> deploy). The deliberate exception is
//! recorded in `specs/backend-module-call-boundary.allow.json`.
//!
//! # Route authority (read from sdkwork-deployments, not guessed)
//!
//! - `crates/sdkwork-routes-deploy-app-api/src/http_route_manifest.rs:289-299`
//!   declares `GET /app/v3/api/apps` (`apps.list`),
//!   `POST /app/v3/api/apps` (`apps.create`, `x-sdkwork-idempotent: true`,
//!   permission `deploy.apps.write`) and `GET /app/v3/api/apps/{appId}`
//!   (`apps.retrieve`, permission `deploy.apps.read`). The backend surface
//!   (`.../sdkwork-routes-deploy-backend-api/src/http_route_manifest.rs`) carries
//!   *only* `POST /backend/v3/api/apps/{appId}/identity_provision` for applications
//!   — it has no create and no retrieve — so the app lifecycle routes are the
//!   app-api ones.
//! - `crates/sdkwork-routes-deploy-app-api/src/app_delivery_routes.rs:341-366`
//!   requires the `Idempotency-Key` header on `apps.create` and replays the
//!   original row for a repeated key; a reused key with a different body is a
//!   conflict.
//! - `crates/sdkwork-intelligence-deploy-repository-sqlx/src/apps.rs:201-202`
//!   mints both the BIGINT id (`next_id`) and the uuid (`new_uuid`) server-side,
//!   `:515` resolves `{appId}` against `deploy_app.uuid`, and `:307-332` replays
//!   the row recorded under the same `Idempotency-Key`.
//! - `crates/sdkwork-intelligence-deploy-repository-sqlx/src/apps.rs:614-616`
//!   links IAM with the BIGINT `deploy_app.id` as a decimal string, while the same
//!   file's public API addresses applications by `uuid`. The two identifiers are
//!   different facts; this installer accepts either as the configured anchor and
//!   canonicalizes IAM to the **decimal** `deployApplicationId` that `apps.create`
//!   already provisioned with. That is what keeps the IAM installation one-to-one.
//!
//! # Semantics
//!
//! `ensure` is get-or-create with a hard identity invariant:
//!
//! 1. `GET /app/v3/api/apps/{anchor}` — a `200` proves the application exists.
//!    The Deploy app API accepts the public uuid and (for this bootstrap path) the
//!    decimal `deployApplicationId`.
//! 2. `404` — create with a deterministic `Idempotency-Key` and a deterministic
//!    body, then require the resolved anchor to be the created application's uuid or
//!    decimal `deployApplicationId`.
//! 3. Anything else — refuse. No bootstrap token is ever issued when the deploy
//!    application cannot be proven to exist.
//!
//! Because Deploy mints ids server-side, step 2 cannot preserve a *pre-chosen*
//! anchor: the created application carries a newly minted decimal id. When that
//! happens the install refuses to sign and reports the minted **decimal**
//! `deployApplicationId`, which is then the value to configure as
//! `SDKWORK_DEPLOY_APPLICATION_ID`. A retry with that value is a pure `GET`, and the
//! deterministic `Idempotency-Key` means repeated runs never create a second
//! application.

use std::fmt::{Display, Formatter};
use std::time::Duration;

/// Deploy backend API base URL (scheme + host [+ path prefix], no trailing slash).
pub const DEPLOY_BACKEND_API_BASE_URL_ENV: &str = "SDKWORK_DEPLOY_BACKEND_API_BASE_URL";
/// `Access-Token` presented on the Deploy dual-token surfaces.
pub const DEPLOY_BACKEND_ACCESS_TOKEN_ENV: &str = "SDKWORK_DEPLOY_BACKEND_ACCESS_TOKEN";
/// `Authorization: Bearer <authToken>` presented on the Deploy dual-token surfaces.
pub const DEPLOY_BACKEND_AUTH_TOKEN_ENV: &str = "SDKWORK_DEPLOY_BACKEND_AUTH_TOKEN";
/// Optional per-call budget in milliseconds (500..=30000, default 10000).
pub const DEPLOY_BACKEND_TIMEOUT_MS_ENV: &str = "SDKWORK_DEPLOY_BACKEND_TIMEOUT_MS";

/// `apps.list` / `apps.create` (app-api route manifest).
pub const DEPLOY_APPS_PATH: &str = "/app/v3/api/apps";
/// `apps.retrieve` (app-api route manifest).
pub const DEPLOY_APP_PATH: &str = "/app/v3/api/apps/{appId}";

/// Stable prefix of the deterministic `apps.create` idempotency key.
///
/// The full key is `<prefix><anchor>`; it stays inside the route contract's
/// 128-character limit and is identical on every retry for one anchor, which is
/// what makes the create replay instead of colliding on `uk_deploy_app_tenant_slug`.
pub const DEPLOY_APP_CREATE_IDEMPOTENCY_KEY_PREFIX: &str = "cloudrouter-bootstrap-app:";

const DEFAULT_TIMEOUT: Duration = Duration::from_secs(10);
const MIN_TIMEOUT_MS: u64 = 500;
const MAX_TIMEOUT_MS: u64 = 30_000;
const APP_SLUG_MAX_LEN: usize = 120;
const DEFAULT_ENVIRONMENT_MAX_LEN: usize = 16;
const APP_NAME_MAX_LEN: usize = 200;
/// Deploy's application kind for a server-side API installation.
const DEPLOY_APP_KIND_API_SERVICE: &str = "API_SERVICE";
const DEPLOY_APP_STATUS_ARCHIVED: &str = "ARCHIVED";

/// Everything one Deploy API call needs besides its transport.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DeployBackendSettings {
    /// Normalised base URL (no trailing slash).
    pub base_url: String,
    pub access_token: String,
    pub auth_token: String,
    pub timeout: Duration,
}

impl DeployBackendSettings {
    /// Resolves the settings from the environment.
    ///
    /// Every value except the timeout is required. The error names the exact
    /// variable: an operator who is being refused a bootstrap credential must be
    /// able to fix the deployment without reading this source.
    pub fn from_env() -> Result<Self, DeployApplicationEnsureError> {
        let base_url = read_required(DEPLOY_BACKEND_API_BASE_URL_ENV)?;
        let base_url = base_url.trim().trim_end_matches('/').to_owned();
        validate_base_url(&base_url)?;
        let access_token = read_required(DEPLOY_BACKEND_ACCESS_TOKEN_ENV)?;
        let auth_token = read_required(DEPLOY_BACKEND_AUTH_TOKEN_ENV)?;
        Ok(Self {
            base_url,
            access_token: access_token.trim().to_owned(),
            auth_token: auth_token.trim().to_owned(),
            timeout: resolve_timeout()?,
        })
    }
}

fn read_required(key: &'static str) -> Result<String, DeployApplicationEnsureError> {
    match std::env::var(key) {
        Ok(value) if !value.trim().is_empty() => Ok(value),
        _ => Err(DeployApplicationEnsureError::MissingSetting { key }),
    }
}

fn validate_base_url(base_url: &str) -> Result<(), DeployApplicationEnsureError> {
    let Some((scheme, rest)) = base_url.split_once("://") else {
        return Err(DeployApplicationEnsureError::InvalidSetting {
            key: DEPLOY_BACKEND_API_BASE_URL_ENV,
            reason: "must be an absolute http(s) URL such as http://127.0.0.1:3902".to_owned(),
        });
    };
    let scheme = scheme.to_ascii_lowercase();
    if scheme != "http" && scheme != "https" {
        return Err(DeployApplicationEnsureError::InvalidSetting {
            key: DEPLOY_BACKEND_API_BASE_URL_ENV,
            reason: format!("scheme {scheme:?} is not http or https"),
        });
    }
    if rest.trim().is_empty() {
        return Err(DeployApplicationEnsureError::InvalidSetting {
            key: DEPLOY_BACKEND_API_BASE_URL_ENV,
            reason: "must name a host".to_owned(),
        });
    }
    // A credential embedded in the URL would leak into logs and process listings;
    // the Deploy surface takes its tokens from dedicated variables.
    if rest.contains('@') {
        return Err(DeployApplicationEnsureError::InvalidSetting {
            key: DEPLOY_BACKEND_API_BASE_URL_ENV,
            reason: "must not embed userinfo; Deploy credentials come from \
                     SDKWORK_DEPLOY_BACKEND_ACCESS_TOKEN and SDKWORK_DEPLOY_BACKEND_AUTH_TOKEN"
                .to_owned(),
        });
    }
    Ok(())
}

/// Reads the per-attempt budget, bounded so a typo cannot create an unbounded
/// external await.
fn resolve_timeout() -> Result<Duration, DeployApplicationEnsureError> {
    let raw = match std::env::var(DEPLOY_BACKEND_TIMEOUT_MS_ENV) {
        Ok(value) if !value.trim().is_empty() => value,
        _ => return Ok(DEFAULT_TIMEOUT),
    };
    let Ok(millis) = raw.trim().parse::<u64>() else {
        return Err(DeployApplicationEnsureError::InvalidSetting {
            key: DEPLOY_BACKEND_TIMEOUT_MS_ENV,
            reason: format!("{raw:?} is not an integer number of milliseconds"),
        });
    };
    if !(MIN_TIMEOUT_MS..=MAX_TIMEOUT_MS).contains(&millis) {
        return Err(DeployApplicationEnsureError::InvalidSetting {
            key: DEPLOY_BACKEND_TIMEOUT_MS_ENV,
            reason: format!(
                "{millis} is outside the supported {MIN_TIMEOUT_MS}..={MAX_TIMEOUT_MS} ms range"
            ),
        });
    }
    Ok(Duration::from_millis(millis))
}

/// One deploy application, as far as the bootstrap credential depends on it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EnsuredDeployApplication {
    /// The public deploy application id (`deploy_app.uuid`) the Deploy API uses
    /// in its own paths — equal to the anchor.
    pub app_id: String,
    /// The **decimal** `deploy_app.id`, which is the IAM installation anchor the
    /// deploy plane provisions (`apps.create` → `identity_provision`). The IAM
    /// bootstrap credential must name this value, not the uuid, or the installer
    /// would mint a second installation for the same application.
    pub deploy_application_id: String,
    /// Tenant that owns the deploy application; must equal the IAM tenant.
    pub tenant_id: String,
    /// `deploy_app.app_status` at the time of the check.
    pub app_status: String,
    /// `true` when this call created the application and the create preserved the
    /// configured anchor.
    pub created: bool,
}

/// Typed refusal of the deploy-side precondition.
///
/// Every variant's `Display` names the variable or the route an operator must act
/// on; none of them is a bare status code.
#[derive(Debug)]
pub enum DeployApplicationEnsureError {
    /// A required environment variable is absent or blank.
    MissingSetting { key: &'static str },
    /// A setting is present but unusable.
    InvalidSetting { key: &'static str, reason: String },
    /// The deploy backend could not be reached, or did not answer in the budget.
    Unreachable {
        base_url: String,
        path: String,
        cause: String,
    },
    /// The deploy backend answered with a non-success status.
    Rejected {
        method: &'static str,
        path: String,
        status: u16,
        code: String,
    },
    /// The success envelope did not carry the application the credential needs.
    UnreadableResponse { path: String, reason: String },
    /// The resolved application is not the configured anchor.
    IdentityMismatch { expected: String, actual: String },
    /// The application belongs to another tenant than the IAM installation.
    TenantMismatch { expected: String, actual: String },
    /// The application exists but was retired.
    Archived { app_id: String },
    /// The HTTP client itself could not be built.
    HttpClientUnavailable { reason: String },
}

impl Display for DeployApplicationEnsureError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::MissingSetting { key } => write!(
                formatter,
                "deploy application cannot be verified before issuing a bootstrap access \
                 credential: {key} is not set. Set it (and the matching \
                 {DEPLOY_BACKEND_ACCESS_TOKEN_ENV}/{DEPLOY_BACKEND_AUTH_TOKEN_ENV} credential) \
                 so the installer can check {DEPLOY_APP_PATH} on the deploy backend API"
            ),
            Self::InvalidSetting { key, reason } => write!(
                formatter,
                "deploy application cannot be verified: {key} is invalid ({reason})"
            ),
            Self::Unreachable {
                base_url,
                path,
                cause,
            } => write!(
                formatter,
                "deploy backend API {base_url}{path} is unreachable ({cause}); refusing to issue a \
                 bootstrap access credential. Verify {DEPLOY_BACKEND_API_BASE_URL_ENV} and that the \
                 deploy application service is running for this deployment"
            ),
            Self::Rejected {
                method,
                path,
                status,
                code,
            } => write!(
                formatter,
                "deploy backend API rejected {method} {path} with HTTP {status} (problem code \
                 {code}); refusing to issue a bootstrap access credential. The credential in \
                 {DEPLOY_BACKEND_ACCESS_TOKEN_ENV}/{DEPLOY_BACKEND_AUTH_TOKEN_ENV} must hold \
                 deploy.apps.read (and deploy.apps.write when the application has to be created) \
                 for this tenant"
            ),
            Self::UnreadableResponse { path, reason } => write!(
                formatter,
                "deploy backend API answered {path} without a readable application item ({reason}); \
                 refusing to issue a bootstrap access credential because the deploy application \
                 could not be proven to exist"
            ),
            Self::IdentityMismatch { expected, actual } => write!(
                formatter,
                "deploy application {expected} (configured by \
                 SDKWORK_DEPLOY_APPLICATION_ID) does not exist, and the deploy module minted \
                 application {actual} instead. Deploy assigns application ids server-side, so a \
                 create cannot preserve a preconfigured id. Set \
                 SDKWORK_DEPLOY_APPLICATION_ID={actual} (the application now exists and a re-run \
                 only reads it) and rebuild the client profiles for the same anchor; no bootstrap \
                 access credential was issued"
            ),
            Self::TenantMismatch { expected, actual } => write!(
                formatter,
                "deploy application belongs to tenant {actual} but the IAM installation is being \
                 provisioned for tenant {expected}; refusing to issue a bootstrap access credential \
                 because both modules must name the same tenant"
            ),
            Self::Archived { app_id } => write!(
                formatter,
                "deploy application {app_id} is ARCHIVED; refusing to issue a bootstrap access \
                 credential for a retired application"
            ),
            Self::HttpClientUnavailable { reason } => write!(
                formatter,
                "could not build the deploy backend HTTP client ({reason}); refusing to issue a \
                 bootstrap access credential"
            ),
        }
    }
}

impl std::error::Error for DeployApplicationEnsureError {}

/// Ensures the deploy application that the bootstrap credential will name.
///
/// The call is bounded by [`DeployBackendSettings::timeout`]; it never panics and
/// never returns a partially-verified application.
pub async fn ensure_deploy_application(
    settings: &DeployBackendSettings,
    tenant_id: &str,
    anchor: &str,
) -> Result<EnsuredDeployApplication, DeployApplicationEnsureError> {
    let anchor = anchor.trim();
    if anchor.is_empty() {
        return Err(DeployApplicationEnsureError::MissingSetting {
            key: "SDKWORK_DEPLOY_APPLICATION_ID",
        });
    }
    validate_anchor_segment(anchor)?;
    let client = reqwest::Client::builder()
        .timeout(settings.timeout)
        .connect_timeout(settings.timeout)
        .build()
        .map_err(
            |error| DeployApplicationEnsureError::HttpClientUnavailable {
                reason: error.to_string(),
            },
        )?;

    let retrieve_path = deploy_app_path(anchor);
    match request_deploy_app(&client, settings, &retrieve_path).await? {
        Ok(item) => {
            verify_deploy_app(&item, anchor, tenant_id)?;
            Ok(EnsuredDeployApplication {
                app_id: item.id,
                deploy_application_id: item.deploy_application_id,
                tenant_id: item.tenant_id,
                app_status: item.app_status,
                created: false,
            })
        }
        Err(()) => {
            // `apps.retrieve` answered 404: the application does not exist. Create
            // it with a deterministic key and body, then hold the result to the same
            // identity invariant.
            let item = create_deploy_app(&client, settings, anchor).await?;
            verify_deploy_app(&item, anchor, tenant_id)?;
            Ok(EnsuredDeployApplication {
                app_id: item.id,
                deploy_application_id: item.deploy_application_id,
                tenant_id: item.tenant_id,
                app_status: item.app_status,
                created: true,
            })
        }
    }
}

/// Deploy application item read out of the `SdkWorkApiResponse` envelope.
#[derive(Clone, Debug, PartialEq, Eq)]
struct DeployAppItem {
    id: String,
    /// Decimal `deploy_app.id`: the IAM installation anchor.
    deploy_application_id: String,
    tenant_id: String,
    app_status: String,
}

async fn request_deploy_app(
    client: &reqwest::Client,
    settings: &DeployBackendSettings,
    path: &str,
) -> Result<Result<DeployAppItem, ()>, DeployApplicationEnsureError> {
    let (status, body) = send(client, settings, reqwest::Method::GET, path, None).await?;
    if status == 404 {
        return Ok(Err(()));
    }
    if !(200..300).contains(&status) {
        return Err(reject("GET", path, status, &body));
    }
    Ok(Ok(parse_app_item(path, &body)?))
}

async fn create_deploy_app(
    client: &reqwest::Client,
    settings: &DeployBackendSettings,
    anchor: &str,
) -> Result<DeployAppItem, DeployApplicationEnsureError> {
    let body = create_app_body(anchor);
    let (status, response_body) = send(
        client,
        settings,
        reqwest::Method::POST,
        DEPLOY_APPS_PATH,
        Some((&body, idempotency_key(anchor))),
    )
    .await?;
    if !(200..300).contains(&status) {
        return Err(reject("POST", DEPLOY_APPS_PATH, status, &response_body));
    }
    parse_app_item(DEPLOY_APPS_PATH, &response_body)
}

async fn send(
    client: &reqwest::Client,
    settings: &DeployBackendSettings,
    method: reqwest::Method,
    path: &str,
    body: Option<(&serde_json::Value, String)>,
) -> Result<(u16, String), DeployApplicationEnsureError> {
    let url = format!("{}{}", settings.base_url, path);
    let mut request = client
        .request(method.clone(), url.as_str())
        .header("accept", "application/json")
        .header("access-token", settings.access_token.as_str())
        .header(
            "authorization",
            format!("Bearer {}", settings.auth_token.as_str()),
        );
    if let Some((body, idempotency_key)) = body {
        request = request
            .header("content-type", "application/json")
            .header("idempotency-key", idempotency_key)
            .body(serde_json::to_vec(body).map_err(|error| {
                DeployApplicationEnsureError::UnreadableResponse {
                    path: path.to_owned(),
                    reason: format!("could not serialize the application create body: {error}"),
                }
            })?);
    }
    let attempt = async { request.send().await };
    let response = match tokio::time::timeout(settings.timeout, attempt).await {
        Ok(Ok(response)) => response,
        Ok(Err(error)) => {
            return Err(DeployApplicationEnsureError::Unreachable {
                base_url: settings.base_url.clone(),
                path: path.to_owned(),
                cause: error.to_string(),
            })
        }
        Err(_) => {
            return Err(DeployApplicationEnsureError::Unreachable {
                base_url: settings.base_url.clone(),
                path: path.to_owned(),
                cause: format!("no response within {} ms", settings.timeout.as_millis()),
            })
        }
    };
    let status = response.status().as_u16();
    let text =
        response
            .text()
            .await
            .map_err(|error| DeployApplicationEnsureError::Unreachable {
                base_url: settings.base_url.clone(),
                path: path.to_owned(),
                cause: format!("response body was not readable: {error}"),
            })?;
    Ok((status, text))
}

fn reject(
    method: &'static str,
    path: &str,
    status: u16,
    body: &str,
) -> DeployApplicationEnsureError {
    DeployApplicationEnsureError::Rejected {
        method,
        path: path.to_owned(),
        status,
        code: problem_code(body),
    }
}

/// Reads the numeric problem code out of an `application/problem+json` body.
///
/// Only the code is kept: a problem detail can quote stored values, and the
/// installer's error line is not the place for them.
fn problem_code(body: &str) -> String {
    let Ok(value) = serde_json::from_str::<serde_json::Value>(body) else {
        return "unknown".to_owned();
    };
    match value.get("code") {
        Some(serde_json::Value::String(code)) => code.clone(),
        Some(code) => code.to_string(),
        None => "unknown".to_owned(),
    }
}

fn parse_app_item(path: &str, body: &str) -> Result<DeployAppItem, DeployApplicationEnsureError> {
    let value: serde_json::Value = serde_json::from_str(body).map_err(|error| {
        DeployApplicationEnsureError::UnreadableResponse {
            path: path.to_owned(),
            reason: format!("response is not JSON: {error}"),
        }
    })?;
    let item = value
        .get("data")
        .and_then(|data| data.get("item"))
        .ok_or_else(|| DeployApplicationEnsureError::UnreadableResponse {
            path: path.to_owned(),
            reason: "response has no data.item".to_owned(),
        })?;
    let read = |key: &str| {
        item.get(key)
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_owned)
    };
    // `deploy_app.id` is the uuid on the wire (`AppResponse.id`,
    // `apps/{appId}` path parameter). The BIGINT id is internal and is not
    // addressable on this API.
    let id = read("id").ok_or_else(|| DeployApplicationEnsureError::UnreadableResponse {
        path: path.to_owned(),
        reason: "data.item.id is missing".to_owned(),
    })?;
    let deploy_application_id = match item.get("deployApplicationId") {
        // `int64` travels as a decimal string (`API_SPEC` §13.6); accept a JSON
        // number too because older deployments serialize it numerically.
        Some(serde_json::Value::String(value)) if !value.trim().is_empty() => {
            value.trim().to_owned()
        }
        Some(serde_json::Value::Number(value)) => value.to_string(),
        _ => {
            return Err(DeployApplicationEnsureError::UnreadableResponse {
                path: path.to_owned(),
                reason: "data.item.deployApplicationId is missing".to_owned(),
            })
        }
    };
    let tenant_id = match item.get("tenantId") {
        // `int64` travels as a decimal string (API_SPEC §13.6); a number is
        // tolerated because the deploy contract also serializes some int64 fields
        // numerically, but it is stringified rather than reformatted.
        Some(serde_json::Value::String(value)) if !value.trim().is_empty() => {
            value.trim().to_owned()
        }
        Some(serde_json::Value::Number(value)) => value.to_string(),
        _ => {
            return Err(DeployApplicationEnsureError::UnreadableResponse {
                path: path.to_owned(),
                reason: "data.item.tenantId is missing".to_owned(),
            })
        }
    };
    let app_status =
        read("appStatus").ok_or_else(|| DeployApplicationEnsureError::UnreadableResponse {
            path: path.to_owned(),
            reason: "data.item.appStatus is missing".to_owned(),
        })?;
    Ok(DeployAppItem {
        id,
        deploy_application_id,
        tenant_id,
        app_status,
    })
}

fn verify_deploy_app(
    item: &DeployAppItem,
    anchor: &str,
    tenant_id: &str,
) -> Result<(), DeployApplicationEnsureError> {
    let canonical = item.deploy_application_id.trim();
    // The configured anchor may be the public uuid (the documented bootstrap
    // value) or the decimal IAM anchor; both name the same application. Anything
    // else is a real identity mismatch.
    if item.id != anchor && canonical != anchor {
        return Err(DeployApplicationEnsureError::IdentityMismatch {
            expected: anchor.to_owned(),
            actual: canonical.to_owned(),
        });
    }
    if item.tenant_id != tenant_id.trim() {
        return Err(DeployApplicationEnsureError::TenantMismatch {
            expected: tenant_id.trim().to_owned(),
            actual: item.tenant_id.clone(),
        });
    }
    if item
        .app_status
        .eq_ignore_ascii_case(DEPLOY_APP_STATUS_ARCHIVED)
    {
        return Err(DeployApplicationEnsureError::Archived {
            app_id: item.id.clone(),
        });
    }
    Ok(())
}

fn deploy_app_path(anchor: &str) -> String {
    format!("{DEPLOY_APPS_PATH}/{anchor}")
}

/// Refuses an anchor that is not one URL path segment.
///
/// The anchor is interpolated into `{appId}`; letting it carry `/`, `?`, `#`, `%`,
/// whitespace, or control characters would let a configuration value address a
/// different route than `apps.retrieve`. Only the characters an application id can
/// contain are accepted.
fn validate_anchor_segment(anchor: &str) -> Result<(), DeployApplicationEnsureError> {
    const MAX_ANCHOR_LEN: usize = 128;
    let invalid = anchor.len() > MAX_ANCHOR_LEN
        || !anchor
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'));
    if invalid {
        return Err(DeployApplicationEnsureError::InvalidSetting {
            key: "SDKWORK_DEPLOY_APPLICATION_ID",
            reason: format!(
                "{anchor:?} is not a single application id segment (allowed: ascii letters, \
                 digits, '-', '_', '.', ':' up to {MAX_ANCHOR_LEN} characters)"
            ),
        });
    }
    Ok(())
}

/// Deterministic `apps.create` idempotency key for one anchor.
fn idempotency_key(anchor: &str) -> String {
    format!("{DEPLOY_APP_CREATE_IDEMPOTENCY_KEY_PREFIX}{anchor}")
}

/// Deterministic `apps.create` body for one anchor.
///
/// Every persisted field is derived from the anchor and the environment only, so a
/// retry produces the same `request_sha256` and replays the first row instead of
/// being rejected as a key reused with a different body.
fn create_app_body(anchor: &str) -> serde_json::Value {
    let mut body = serde_json::Map::new();
    body.insert(
        "name".to_owned(),
        serde_json::Value::String(app_name(anchor)),
    );
    body.insert(
        "slug".to_owned(),
        serde_json::Value::String(app_slug(anchor)),
    );
    body.insert(
        "appKind".to_owned(),
        serde_json::Value::String(DEPLOY_APP_KIND_API_SERVICE.to_owned()),
    );
    let environment = sdkwork_iam_web_adapter::resolve_bootstrap_environment();
    let environment = environment.trim().to_ascii_lowercase();
    if !environment.is_empty()
        && environment.len() <= DEFAULT_ENVIRONMENT_MAX_LEN
        && environment
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
    {
        body.insert(
            "defaultEnvironment".to_owned(),
            serde_json::Value::String(environment),
        );
    }
    serde_json::Value::Object(body)
}

fn app_name(anchor: &str) -> String {
    let name = format!("SDKWork Cloud Router ({anchor})");
    truncate_chars(&name, APP_NAME_MAX_LEN)
}

/// One bounded lowercase DNS/path label for `apps.create`.
///
/// `slug` is `1..=120` lowercase ascii letters, digits, and hyphens. An installation
/// anchor such as a uuid is already valid; anything else is normalised
/// deterministically so the idempotency hash stays stable across runs.
fn app_slug(anchor: &str) -> String {
    let mut slug = String::with_capacity(anchor.len());
    let mut last_was_hyphen = false;
    for character in anchor.chars() {
        let character = character.to_ascii_lowercase();
        if character.is_ascii_alphanumeric() {
            slug.push(character);
            last_was_hyphen = false;
        } else if !last_was_hyphen && !slug.is_empty() {
            slug.push('-');
            last_was_hyphen = true;
        }
    }
    while slug.ends_with('-') {
        slug.pop();
    }
    if slug.is_empty() {
        return "sdkwork-cloudrouter-installation".to_owned();
    }
    truncate_chars(&slug, APP_SLUG_MAX_LEN)
}

fn truncate_chars(value: &str, max_chars: usize) -> String {
    let mut out = String::with_capacity(value.len().min(max_chars));
    for character in value.chars().take(max_chars) {
        out.push(character);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::sync::Mutex;

    fn settings(base_url: &str) -> DeployBackendSettings {
        DeployBackendSettings {
            base_url: base_url.to_owned(),
            access_token: "access-token".to_owned(),
            auth_token: "auth-token".to_owned(),
            timeout: Duration::from_millis(2_000),
        }
    }

    fn app_envelope(id: &str, tenant_id: &str, status: &str) -> String {
        format!(
            r#"{{"code":0,"data":{{"item":{{"id":"{id}","deployApplicationId":"1845123456789012345","tenantId":"{tenant_id}","appStatus":"{status}","name":"SDKWork Cloud Router","appKind":"API_SERVICE"}}}},"traceId":"trace"}}"#
        )
    }

    fn problem(status: u16, code: i64) -> String {
        format!(
            r#"{{"type":"about:blank","title":"x","status":{status},"code":{code},"traceId":"t"}}"#
        )
    }

    /// One-shot HTTP/1.1 stub that records the request lines and answers with the
    /// queued responses, so the ensure flow is exercised over a real socket.
    async fn serve(responses: Vec<(u16, String)>) -> (String, Arc<Mutex<Vec<String>>>) {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind stub");
        let address = listener.local_addr().expect("stub address");
        let recorded: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
        let recorded_handle = Arc::clone(&recorded);
        tokio::spawn(async move {
            for (status, body) in responses {
                let Ok((mut stream, _)) = listener.accept().await else {
                    return;
                };
                let mut buffer = vec![0_u8; 8192];
                let read = stream.read(&mut buffer).await.unwrap_or(0);
                let request = String::from_utf8_lossy(&buffer[..read]).to_string();
                recorded_handle.lock().await.push(request);
                let reason = if status < 400 { "OK" } else { "ERROR" };
                let response = format!(
                    "HTTP/1.1 {status} {reason}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                    body.len()
                );
                let _ = stream.write_all(response.as_bytes()).await;
                let _ = stream.shutdown().await;
            }
        });
        (format!("http://{address}"), recorded)
    }

    #[test]
    fn trailing_slash_is_removed_before_the_path_is_appended() {
        let settings = DeployBackendSettings {
            base_url: "http://127.0.0.1:3902/".trim_end_matches('/').to_owned(),
            access_token: "a".to_owned(),
            auth_token: "b".to_owned(),
            timeout: DEFAULT_TIMEOUT,
        };
        assert_eq!(
            format!("{}{}", settings.base_url, deploy_app_path("app-1")),
            "http://127.0.0.1:3902/app/v3/api/apps/app-1"
        );
    }

    #[test]
    fn base_url_must_be_absolute_and_carry_no_userinfo() {
        assert!(validate_base_url("http://127.0.0.1:3902").is_ok());
        assert!(validate_base_url("https://deploy.example.com").is_ok());
        assert!(validate_base_url("127.0.0.1:3902").is_err());
        assert!(validate_base_url("ftp://deploy.example.com").is_err());
        assert!(validate_base_url("http://user:secret@deploy.example.com").is_err());
    }

    #[test]
    fn slug_is_a_stable_lowercase_label() {
        assert_eq!(
            app_slug("0f8b7f26-2d7c-4f43-8a4b-0c5a51e1f0aa"),
            "0f8b7f26-2d7c-4f43-8a4b-0c5a51e1f0aa"
        );
        assert_eq!(app_slug("App_CY3D99"), "app-cy3d99");
        assert_eq!(app_slug("---"), "sdkwork-cloudrouter-installation");
        assert!(app_slug(&"A".repeat(400)).len() <= APP_SLUG_MAX_LEN);
    }

    #[test]
    fn create_body_is_deterministic_and_carries_the_api_kind() {
        let first = create_app_body("app-anchor-1");
        let second = create_app_body("app-anchor-1");
        assert_eq!(first, second);
        assert_eq!(first["appKind"], serde_json::json!("API_SERVICE"));
        assert_eq!(first["slug"], serde_json::json!("app-anchor-1"));
        assert_eq!(
            idempotency_key("app-anchor-1"),
            "cloudrouter-bootstrap-app:app-anchor-1"
        );
    }

    #[test]
    fn identity_mismatch_names_the_anchor_and_the_minted_application() {
        let item = DeployAppItem {
            id: "minted-uuid".to_owned(),
            deploy_application_id: "1845123456789012345".to_owned(),
            tenant_id: "100001".to_owned(),
            app_status: "DRAFT".to_owned(),
        };
        let error = verify_deploy_app(&item, "app-anchor-1", "100001")
            .expect_err("a different application must be refused");
        let message = error.to_string();
        assert!(message.contains("app-anchor-1"), "got: {message}");
        assert!(message.contains("1845123456789012345"), "got: {message}");
        assert!(
            message.contains("SDKWORK_DEPLOY_APPLICATION_ID=1845123456789012345"),
            "the remediation must name the canonical decimal anchor, got: {message}"
        );
    }

    #[test]
    fn decimal_anchor_is_the_canonical_iam_identity() {
        let item = DeployAppItem {
            id: "0f8b7f26-2d7c-4f43-8a4b-0c5a51e1f0aa".to_owned(),
            deploy_application_id: "1845123456789012345".to_owned(),
            tenant_id: "100001".to_owned(),
            app_status: "DRAFT".to_owned(),
        };
        verify_deploy_app(&item, "1845123456789012345", "100001")
            .expect("the decimal anchor must be accepted");
        verify_deploy_app(&item, "0f8b7f26-2d7c-4f43-8a4b-0c5a51e1f0aa", "100001")
            .expect("the public uuid must stay accepted for legacy configuration");
    }

    #[test]
    fn archived_and_foreign_tenants_are_refused() {
        let archived = DeployAppItem {
            id: "app-anchor-1".to_owned(),
            deploy_application_id: "1845123456789012345".to_owned(),
            tenant_id: "100001".to_owned(),
            app_status: "ARCHIVED".to_owned(),
        };
        assert!(matches!(
            verify_deploy_app(&archived, "app-anchor-1", "100001"),
            Err(DeployApplicationEnsureError::Archived { .. })
        ));

        let foreign = DeployAppItem {
            id: "app-anchor-1".to_owned(),
            deploy_application_id: "1845123456789012345".to_owned(),
            tenant_id: "200002".to_owned(),
            app_status: "DRAFT".to_owned(),
        };
        assert!(matches!(
            verify_deploy_app(&foreign, "app-anchor-1", "100001"),
            Err(DeployApplicationEnsureError::TenantMismatch { .. })
        ));
    }

    #[tokio::test]
    async fn an_existing_application_is_verified_with_one_get() {
        let (base_url, recorded) =
            serve(vec![(200, app_envelope("app-anchor-1", "100001", "DRAFT"))]).await;
        let ensured = ensure_deploy_application(&settings(&base_url), "100001", "app-anchor-1")
            .await
            .expect("an existing application must be accepted");
        assert_eq!(ensured.app_id, "app-anchor-1");
        assert_eq!(ensured.deploy_application_id, "1845123456789012345");
        assert!(!ensured.created);
        let requests = recorded.lock().await;
        assert_eq!(
            requests.len(),
            1,
            "ensure must not create what already exists"
        );
        assert!(requests[0].starts_with("GET /app/v3/api/apps/app-anchor-1 "));
        assert!(requests[0]
            .to_ascii_lowercase()
            .contains("access-token: access-token"));
        assert!(requests[0]
            .to_ascii_lowercase()
            .contains("authorization: bearer auth-token"));
    }

    #[tokio::test]
    async fn a_missing_application_is_created_with_a_deterministic_key() {
        let (base_url, recorded) = serve(vec![
            (404, problem(404, 40401)),
            (201, app_envelope("app-anchor-1", "100001", "DRAFT")),
        ])
        .await;
        let ensured = ensure_deploy_application(&settings(&base_url), "100001", "app-anchor-1")
            .await
            .expect("a create that preserves the anchor must be accepted");
        assert!(ensured.created);
        let requests = recorded.lock().await;
        assert!(requests[0].starts_with("GET /app/v3/api/apps/app-anchor-1 "));
        assert!(requests[1].starts_with("POST /app/v3/api/apps "));
        let post = requests[1].to_ascii_lowercase();
        assert!(post.contains("idempotency-key: cloudrouter-bootstrap-app:app-anchor-1"));
        assert!(post.contains("content-type: application/json"));
    }

    #[tokio::test]
    async fn a_create_that_mints_another_id_refuses_instead_of_signing() {
        let (base_url, _recorded) = serve(vec![
            (404, problem(404, 40401)),
            (201, app_envelope("minted-uuid", "100001", "DRAFT")),
        ])
        .await;
        let error = ensure_deploy_application(&settings(&base_url), "100001", "app-anchor-1")
            .await
            .expect_err("a minted id must not be accepted as the anchor");
        assert!(matches!(
            error,
            DeployApplicationEnsureError::IdentityMismatch { .. }
        ));
        assert!(error
            .to_string()
            .contains("no bootstrap access credential was issued"));
    }

    #[tokio::test]
    async fn a_rejected_retrieve_names_the_status_and_the_credential_variables() {
        let (base_url, _recorded) = serve(vec![(403, problem(403, 40301))]).await;
        let error = ensure_deploy_application(&settings(&base_url), "100001", "app-anchor-1")
            .await
            .expect_err("a refusal must not be treated as absence");
        let message = error.to_string();
        assert!(message.contains("HTTP 403"), "got: {message}");
        assert!(
            message.contains("SDKWORK_DEPLOY_BACKEND_ACCESS_TOKEN"),
            "got: {message}"
        );
        assert!(message.contains("deploy.apps.read"), "got: {message}");
    }

    #[tokio::test]
    async fn an_unreachable_backend_refuses_and_names_the_base_url_variable() {
        // Bind then drop the listener so the port is closed: connect must fail.
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("bind");
        let address = listener.local_addr().expect("address");
        drop(listener);
        let error = ensure_deploy_application(
            &settings(&format!("http://{address}")),
            "100001",
            "app-anchor-1",
        )
        .await
        .expect_err("an unreachable backend must refuse");
        assert!(matches!(
            error,
            DeployApplicationEnsureError::Unreachable { .. }
        ));
        assert!(error
            .to_string()
            .contains("SDKWORK_DEPLOY_BACKEND_API_BASE_URL"));
    }

    #[test]
    fn blank_anchor_is_refused_before_any_request() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime");
        let error = runtime
            .block_on(ensure_deploy_application(
                &settings("http://127.0.0.1:1"),
                "100001",
                "   ",
            ))
            .expect_err("a blank anchor must fail closed");
        assert!(matches!(
            error,
            DeployApplicationEnsureError::MissingSetting { .. }
        ));
    }

    /// The anchor is interpolated into the `{appId}` path segment: a value carrying
    /// `?`, `/`, `#`, `%`, or whitespace would address a different route on the
    /// deploy API instead of `apps.retrieve`.
    #[test]
    fn an_anchor_that_is_not_one_path_segment_is_refused() {
        for anchor in [
            "app-1/users",
            "app-1?x=1",
            "app-1#frag",
            "app%2F1",
            "app 1",
            "app\n1",
        ] {
            assert!(
                validate_anchor_segment(anchor).is_err(),
                "{anchor:?} must not reach the retrieve path"
            );
        }
        assert!(validate_anchor_segment("0f8b7f26-2d7c-4f43-8a4b-0c5a51e1f0aa").is_ok());
        assert!(validate_anchor_segment("app-cy3d99").is_ok());
    }
}
