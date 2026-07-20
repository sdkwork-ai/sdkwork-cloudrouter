use axum::http::{HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_claw_http::{sanitize_sensitive_query_in_uri, ApiKeyIdentity, QueryStringApiKeyPolicy};
use sdkwork_clawrouter_router_service::application::{
    ApiKeyAuthenticator, ApiKeySecretHasher, AuthenticateApiKeyQuery, AuthenticatedApiKeyContext,
};
use sdkwork_clawrouter_router_service::ports::PricingCatalog;
use serde_json::json;

pub(crate) fn authenticate_gateway_api_key<C>(
    catalog: &C,
    api_key_hasher: &(dyn ApiKeySecretHasher + Send + Sync),
    headers: &HeaderMap,
    uri: &Uri,
    query_string_api_key_policy: QueryStringApiKeyPolicy,
) -> Result<AuthenticatedApiKeyContext, Response>
where
    C: PricingCatalog,
{
    let identity = ApiKeyIdentity::from_headers_and_uri_with_query_key_policy(
        headers,
        uri,
        query_string_api_key_policy,
    )
    .map_err(|error| {
        gateway_auth_error(
            StatusCode::BAD_REQUEST,
            "invalid_request",
            "invalid_request_error",
            error.to_string(),
        )
    })?;
    let Some(credential_secret) = identity.credential_secret() else {
        return Err(gateway_auth_error(
            StatusCode::UNAUTHORIZED,
            "invalid_api_key",
            "invalid_request_error",
            "missing api key credential",
        ));
    };
    let authenticator = ApiKeyAuthenticator::new(catalog, api_key_hasher);
    authenticator
        .authenticate(AuthenticateApiKeyQuery { credential_secret })
        .map_err(|_| {
            gateway_auth_error(
                StatusCode::UNAUTHORIZED,
                "invalid_api_key",
                "invalid_request_error",
                "api key credential is invalid",
            )
        })
}

pub(crate) fn sanitize_authenticated_gateway_uri(uri: &Uri) -> Result<Uri, Response> {
    sanitize_sensitive_query_in_uri(uri).map_err(|_| {
        gateway_auth_error(
            StatusCode::BAD_REQUEST,
            "invalid_request",
            "invalid_request_error",
            "request URI could not be sanitized",
        )
    })
}

fn gateway_auth_error(
    status: StatusCode,
    code: &'static str,
    error_type: &'static str,
    message: impl ToString,
) -> Response {
    (
        status,
        Json(json!({
            "error": {
                "message": message.to_string(),
                "type": error_type,
                "param": null,
                "code": code
            }
        })),
    )
        .into_response()
}
