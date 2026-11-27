//! API-key HTTP client for a relay's recharge Open API.

use std::time::Duration;

use async_trait::async_trait;
use serde::de::DeserializeOwned;
use serde::Deserialize;
use url::Url;

use crate::contract::{validate_amount, MAX_RECHARGE_AMOUNT};
pub use crate::contract::{
    RechargeBalance, RechargeOption, RechargeOptions, RechargeOrder, RechargeOrderRequest,
};
use crate::error::RechargeClientError;

/// Default per-request timeout for relay recharge calls.
pub const DEFAULT_RECHARGE_TIMEOUT: Duration = Duration::from_secs(15);

/// Everything the client needs to talk to one relay: origin plus API key.
///
/// The connection is built by the management layer from a supplier's account
/// credential and base URL; the client itself never reads configuration or
/// persists secrets.
#[derive(Clone, PartialEq, Eq)]
pub struct RechargeConnection {
    base_url: String,
    api_key: String,
    timeout: Duration,
}

impl RechargeConnection {
    /// Builds a connection from a relay origin (`https://api.example.com`) and
    /// an API key.
    pub fn new(
        base_url: impl AsRef<str>,
        api_key: impl AsRef<str>,
    ) -> Result<Self, RechargeClientError> {
        let base_url = normalize_origin(base_url.as_ref())?;
        let api_key = api_key.as_ref().trim();
        if api_key.is_empty() {
            return Err(RechargeClientError::InvalidConnection(
                "an API key is required".to_owned(),
            ));
        }
        Ok(Self {
            base_url,
            api_key: api_key.to_owned(),
            timeout: DEFAULT_RECHARGE_TIMEOUT,
        })
    }

    /// Overrides the per-request timeout.
    #[must_use]
    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout.max(Duration::from_millis(1));
        self
    }

    /// Relay origin used for every recharge call.
    #[must_use]
    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    /// Timeout applied to one recharge call.
    #[must_use]
    pub fn timeout(&self) -> Duration {
        self.timeout
    }

    /// Never log the secret; the connection's debug view redacts it.
    #[must_use]
    pub fn redacted_api_key(&self) -> String {
        let visible = self
            .api_key
            .chars()
            .rev()
            .take(4)
            .collect::<String>()
            .chars()
            .rev()
            .collect::<String>();
        format!("****{visible}")
    }
}

impl std::fmt::Debug for RechargeConnection {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("RechargeConnection")
            .field("base_url", &self.base_url)
            .field("api_key", &self.redacted_api_key())
            .field("timeout", &self.timeout)
            .finish()
    }
}

/// Normalizes an upstream supplier base URL into the relay recharge origin.
///
/// Supplier base URLs carry the protocol path (`/v1`, `/anthropic`, `/openai`);
/// the recharge surface always lives directly under the origin. Any prefix path
/// before the protocol segment is preserved so gateways mounted under
/// `/gateway/v1` keep working.
pub fn normalize_origin(base_url: &str) -> Result<String, RechargeClientError> {
    let parsed = Url::parse(base_url.trim()).map_err(|error| {
        RechargeClientError::InvalidConnection(format!("base URL is not absolute: {error}"))
    })?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err(RechargeClientError::InvalidConnection(
            "base URL must use http or https".to_owned(),
        ));
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err(RechargeClientError::InvalidConnection(
            "base URL must not contain embedded credentials".to_owned(),
        ));
    }
    if parsed.query().is_some() || parsed.fragment().is_some() {
        return Err(RechargeClientError::InvalidConnection(
            "base URL must not contain a query string or fragment".to_owned(),
        ));
    }
    // Only whole path segments mark a protocol path: `/v1`, `/v10`, `/v1beta`
    // must not be truncated by a naive substring search.
    const PROTOCOL_SEGMENTS: &[&str] = &["v1", "v1beta", "anthropic", "openai", "gemini", "beta"];
    let segments = parsed
        .path()
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>();
    let keep = segments
        .iter()
        .position(|segment| PROTOCOL_SEGMENTS.contains(segment))
        .unwrap_or(segments.len());
    let path = if keep == 0 {
        String::new()
    } else {
        format!("/{}", segments[..keep].join("/"))
    };
    let origin = format!(
        "{}://{}{}",
        parsed.scheme(),
        parsed
            .host_str()
            .ok_or_else(|| RechargeClientError::InvalidConnection(
                "base URL must contain a host".to_owned()
            ))?,
        parsed
            .port()
            .map(|port| format!(":{port}"))
            .unwrap_or_default(),
    );
    Ok(format!("{origin}{path}").trim_end_matches('/').to_owned())
}

/// API-key recharge operations a relay must provide.
#[async_trait]
pub trait UpstreamRechargeClient: Send + Sync {
    /// Reads the API key owner's balance on the relay.
    async fn retrieve_balance(
        &self,
        connection: &RechargeConnection,
    ) -> Result<RechargeBalance, RechargeClientError>;

    /// Reads the relay's recharge package catalog.
    async fn list_options(
        &self,
        connection: &RechargeConnection,
    ) -> Result<RechargeOptions, RechargeClientError>;

    /// Creates a recharge order on the relay.
    async fn create_order(
        &self,
        connection: &RechargeConnection,
        request: RechargeOrderRequest,
    ) -> Result<RechargeOrder, RechargeClientError>;

    /// Reads one recharge order from the relay.
    async fn retrieve_order(
        &self,
        connection: &RechargeConnection,
        order_id: &str,
    ) -> Result<RechargeOrder, RechargeClientError>;
}

/// `reqwest`-backed client used by the management API.
#[derive(Clone)]
pub struct HttpUpstreamRechargeClient {
    http: reqwest::Client,
}

impl HttpUpstreamRechargeClient {
    /// Builds a client with a shared connection pool.
    pub fn new() -> Result<Self, RechargeClientError> {
        let http = reqwest::Client::builder()
            .user_agent("sdkwork-cloudrouter-upstream-recharge/1.0")
            .build()
            .map_err(|error| {
                RechargeClientError::InvalidConnection(format!(
                    "failed to build the relay HTTP client: {error}"
                ))
            })?;
        Ok(Self { http })
    }

    /// Builds a client around a caller-supplied `reqwest::Client`.
    #[must_use]
    pub fn with_http_client(http: reqwest::Client) -> Self {
        Self { http }
    }

    fn url(connection: &RechargeConnection, suffix: &str) -> String {
        format!("{}{suffix}", connection.base_url)
    }

    async fn execute<T: DeserializeOwned>(
        &self,
        method: reqwest::Method,
        connection: &RechargeConnection,
        suffix: &str,
        body: Option<&RechargeOrderRequest>,
    ) -> Result<T, RechargeClientError> {
        let url = Self::url(connection, suffix);
        let mut request = self
            .http
            .request(method, &url)
            .bearer_auth(&connection.api_key)
            .header(reqwest::header::ACCEPT, "application/json")
            .timeout(connection.timeout);
        if let Some(body) = body {
            // The workspace `reqwest` build intentionally omits the `json`
            // feature, so the body is encoded here and sent as a byte payload.
            let encoded = serde_json::to_vec(body).map_err(|error| {
                RechargeClientError::InvalidConnection(format!(
                    "failed to encode the recharge request: {error}"
                ))
            })?;
            request = request
                .header(reqwest::header::CONTENT_TYPE, "application/json")
                .body(encoded);
        }
        let response = request.send().await.map_err(|error| {
            if error.is_timeout() {
                RechargeClientError::Transport(format!("request to {url} timed out"))
            } else {
                RechargeClientError::Transport(format!("request to {url} failed: {error}"))
            }
        })?;
        let status = response.status();
        let body = response.text().await.map_err(|error| {
            RechargeClientError::Transport(format!("failed to read the response body: {error}"))
        })?;
        if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
            return Err(RechargeClientError::Unauthorized(problem_detail(&body)));
        }
        if !status.is_success() {
            let (code, detail) = problem_code_and_detail(&body);
            return Err(RechargeClientError::Relay {
                status: status.as_u16(),
                code,
                detail,
            });
        }
        let envelope: Envelope = serde_json::from_str(&body).map_err(|error| {
            RechargeClientError::InvalidResponse(format!(
                "response is not a valid envelope: {error}"
            ))
        })?;
        if envelope.code != 0 {
            return Err(RechargeClientError::Relay {
                status: status.as_u16(),
                code: i64::from(envelope.code),
                detail: envelope
                    .detail
                    .unwrap_or_else(|| "the relay rejected the recharge request".to_owned()),
            });
        }
        let data = envelope.data.ok_or_else(|| {
            RechargeClientError::InvalidResponse("the envelope carries no data".to_owned())
        })?;
        serde_json::from_value(data).map_err(|error| {
            RechargeClientError::InvalidResponse(format!(
                "data does not match the contract: {error}"
            ))
        })
    }
}

#[derive(Debug, Deserialize)]
struct Envelope {
    code: i32,
    #[serde(default)]
    data: Option<serde_json::Value>,
    #[serde(default)]
    detail: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProblemBody {
    #[serde(default)]
    code: Option<i64>,
    #[serde(default)]
    detail: Option<String>,
    #[serde(default)]
    title: Option<String>,
    #[serde(default, rename = "i18nKey")]
    i18n_key: Option<String>,
}

fn problem_code_and_detail(body: &str) -> (i64, String) {
    let Ok(problem) = serde_json::from_str::<ProblemBody>(body) else {
        return (50001, truncate(body));
    };
    let detail = problem
        .detail
        .or(problem.title)
        .or(problem.i18n_key)
        .unwrap_or_else(|| "the relay rejected the recharge request".to_owned());
    (problem.code.unwrap_or(50001), truncate(&detail))
}

fn problem_detail(body: &str) -> String {
    problem_code_and_detail(body).1
}

fn truncate(value: &str) -> String {
    const MAX: usize = 512;
    let value = value.trim();
    if value.chars().count() <= MAX {
        return value.to_owned();
    }
    value.chars().take(MAX).collect()
}

#[async_trait]
impl UpstreamRechargeClient for HttpUpstreamRechargeClient {
    async fn retrieve_balance(
        &self,
        connection: &RechargeConnection,
    ) -> Result<RechargeBalance, RechargeClientError> {
        self.execute(
            reqwest::Method::GET,
            connection,
            "/v1/recharge/balance",
            None,
        )
        .await
    }

    async fn list_options(
        &self,
        connection: &RechargeConnection,
    ) -> Result<RechargeOptions, RechargeClientError> {
        self.execute(
            reqwest::Method::GET,
            connection,
            "/v1/recharge/options",
            None,
        )
        .await
    }

    async fn create_order(
        &self,
        connection: &RechargeConnection,
        request: RechargeOrderRequest,
    ) -> Result<RechargeOrder, RechargeClientError> {
        let request = request
            .normalized()
            .map_err(|error| RechargeClientError::InvalidConnection(error.to_string()))?;
        self.execute(
            reqwest::Method::POST,
            connection,
            "/v1/recharge/orders",
            Some(&request),
        )
        .await
    }

    async fn retrieve_order(
        &self,
        connection: &RechargeConnection,
        order_id: &str,
    ) -> Result<RechargeOrder, RechargeClientError> {
        let order_id = order_id.trim();
        if order_id.is_empty() {
            return Err(RechargeClientError::InvalidConnection(
                "order id must not be empty".to_owned(),
            ));
        }
        let suffix = format!("/v1/recharge/orders/{order_id}");
        self.execute(reqwest::Method::GET, connection, &suffix, None)
            .await
    }
}

/// Validates a custom amount against the contract ceiling.
pub fn validate_custom_amount(amount: &str) -> Result<(), RechargeClientError> {
    validate_amount(amount)
        .map_err(|error| RechargeClientError::InvalidConnection(error.to_string()))?;
    let limit: f64 = MAX_RECHARGE_AMOUNT
        .parse()
        .expect("MAX_RECHARGE_AMOUNT is a decimal literal");
    let value: f64 = amount.trim().parse().map_err(|_| {
        RechargeClientError::InvalidConnection("amount must be a decimal number".to_owned())
    })?;
    if value > limit {
        return Err(RechargeClientError::InvalidConnection(format!(
            "amount must not exceed {MAX_RECHARGE_AMOUNT}"
        )));
    }
    Ok(())
}
