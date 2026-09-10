//! Bounded HTTP execution for outbound payment provider calls.
//!
//! Every payment adapter dispatch runs under one connect timeout, one total
//! request deadline, and a hard response-body ceiling. A hung or oversized
//! provider response must never pin a worker task or grow process memory
//! without bound (`TECH_ARCHITECTURE.md` §7 "Egress And Runtime Safety":
//! request and response bodies require explicit bounds).

use std::time::Duration;

use bytes::{Bytes, BytesMut};
use http_body_util::{BodyExt, Full};
use hyper::{Request, StatusCode};
use hyper_rustls::HttpsConnector;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use sdkwork_cloudrouter_http::ensure_rustls_crypto_provider;

/// Connect (and happy-eyeballs) budget for one provider TCP/TLS handshake.
pub(crate) const PAYMENT_PROVIDER_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// Total deadline for one provider dispatch: connect, request write, response
/// headers, and bounded body drain combined.
pub(crate) const PAYMENT_PROVIDER_REQUEST_TIMEOUT: Duration = Duration::from_secs(60);

/// Hard ceiling on one buffered provider response body. Payment APIs return
/// JSON documents; anything near this bound is a contract violation, not a
/// payload to accumulate.
pub(crate) const MAX_PAYMENT_PROVIDER_RESPONSE_BYTES: usize = 4 * 1024 * 1024;

pub(crate) type PaymentProviderRequestBody = Full<Bytes>;
pub(crate) type PaymentProviderConnector = HttpsConnector<HttpConnector>;
pub(crate) type PaymentProviderHttpClient =
    Client<PaymentProviderConnector, PaymentProviderRequestBody>;

/// Failure modes of one bounded provider dispatch. Adapters map these onto
/// their own provider-error constructors without losing the retry signal.
#[derive(Debug)]
pub(crate) enum PaymentProviderHttpError {
    /// Connect, transport, deadline, or body-read failure. Callers may retry
    /// when the operation's idempotency policy allows it.
    Transport(String),
    /// The provider response body exceeded
    /// [`MAX_PAYMENT_PROVIDER_RESPONSE_BYTES`]; the response contract itself is
    /// violated, so the payload is never buffered.
    ResponseTooLarge { limit_bytes: usize },
}

impl std::fmt::Display for PaymentProviderHttpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Transport(message) => f.write_str(message),
            Self::ResponseTooLarge { limit_bytes } => {
                write!(f, "response body exceeded the {limit_bytes} byte bound")
            }
        }
    }
}

/// One bounded provider response. Headers are pre-flattened because adapters
/// (WeChat Pay signature verification) inspect them before the body is
/// dropped.
pub(crate) struct PaymentProviderHttpResponse {
    pub(crate) status: StatusCode,
    pub(crate) headers: Vec<(String, String)>,
    pub(crate) body: Bytes,
}

/// Build the shared payment-provider HTTP client: HTTPS-only with webpki
/// roots, connector-level connect/happy-eyeballs/read/write timeouts, and
/// hyper's default bounded pool.
pub(crate) fn build_payment_provider_http_client() -> PaymentProviderHttpClient {
    ensure_rustls_crypto_provider();
    let mut http = HttpConnector::new();
    http.set_connect_timeout(Some(PAYMENT_PROVIDER_CONNECT_TIMEOUT));
    http.set_happy_eyeballs_timeout(Some(PAYMENT_PROVIDER_CONNECT_TIMEOUT));
    let https = hyper_rustls::HttpsConnectorBuilder::new()
        .with_webpki_roots()
        .https_or_http()
        .enable_http1()
        .wrap_connector(http);
    Client::builder(TokioExecutor::new()).build(https)
}

/// Execute one provider dispatch under the shared bounds. The total deadline
/// covers the whole exchange, and the body is accumulated chunk-wise so an
/// oversized response fails fast instead of buffering without limit.
pub(crate) async fn send_bounded(
    client: &PaymentProviderHttpClient,
    request: Request<PaymentProviderRequestBody>,
) -> Result<PaymentProviderHttpResponse, PaymentProviderHttpError> {
    tokio::time::timeout(PAYMENT_PROVIDER_REQUEST_TIMEOUT, async move {
        let response = client.request(request).await.map_err(|error| {
            PaymentProviderHttpError::Transport(format!("payment provider request failed: {error}"))
        })?;
        let status = response.status();
        let mut headers = Vec::new();
        for (name, value) in response.headers() {
            if let Ok(value) = value.to_str() {
                headers.push((name.as_str().to_owned(), value.to_owned()));
            }
        }
        let mut body = response.into_body();
        let mut buffered = BytesMut::new();
        while let Some(frame) = body.frame().await {
            let frame = frame.map_err(|error| {
                PaymentProviderHttpError::Transport(format!(
                    "payment provider response body failed: {error}"
                ))
            })?;
            if let Some(data) = frame.data_ref() {
                if buffered.len() + data.len() > MAX_PAYMENT_PROVIDER_RESPONSE_BYTES {
                    return Err(PaymentProviderHttpError::ResponseTooLarge {
                        limit_bytes: MAX_PAYMENT_PROVIDER_RESPONSE_BYTES,
                    });
                }
                buffered.extend_from_slice(data);
            }
        }
        Ok(PaymentProviderHttpResponse {
            status,
            headers,
            body: buffered.freeze(),
        })
    })
    .await
    .map_err(|_| {
        PaymentProviderHttpError::Transport(format!(
            "payment provider request timed out after {PAYMENT_PROVIDER_REQUEST_TIMEOUT:?}"
        ))
    })?
}
