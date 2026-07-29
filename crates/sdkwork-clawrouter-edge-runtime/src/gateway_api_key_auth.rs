use axum::http::{HeaderMap, Method, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_claw_http::{sanitize_sensitive_query_in_uri, ApiKeyIdentity, QueryStringApiKeyPolicy};
use sdkwork_claw_security::{
    InternalGatewayPrincipal, InternalGatewayRequestVerifier, SignedInternalGatewayRequest,
    X_SDKWORK_INTERNAL_ACCOUNT_GROUP_ID, X_SDKWORK_INTERNAL_API_KEY_ID,
    X_SDKWORK_INTERNAL_AUTH_VERSION, X_SDKWORK_INTERNAL_BODY_SHA256, X_SDKWORK_INTERNAL_EXPIRES_AT,
    X_SDKWORK_INTERNAL_ISSUED_AT, X_SDKWORK_INTERNAL_NONCE, X_SDKWORK_INTERNAL_ORGANIZATION_ID,
    X_SDKWORK_INTERNAL_SIGNATURE, X_SDKWORK_INTERNAL_TENANT_ID, X_SDKWORK_INTERNAL_USER_ID,
};
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

pub(crate) async fn authenticate_internal_gateway_request<C>(
    catalog: &C,
    verifier: &InternalGatewayRequestVerifier,
    headers: &HeaderMap,
    method: &Method,
    uri: &Uri,
    body: &[u8],
) -> Result<AuthenticatedApiKeyContext, Response>
where
    C: PricingCatalog,
{
    let signed_request = parse_signed_internal_gateway_request(headers)
        .map_err(|_| internal_gateway_auth_error())?;
    let path_and_query = uri
        .path_and_query()
        .map(|value| value.as_str())
        .unwrap_or_else(|| uri.path());
    let principal = verifier
        .verify(&signed_request, method.as_str(), path_and_query, body)
        .await
        .map_err(|_| internal_gateway_auth_error())?;
    authenticated_context_from_internal_principal(catalog, principal)
        .ok_or_else(internal_gateway_auth_error)
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

fn parse_signed_internal_gateway_request(
    headers: &HeaderMap,
) -> Result<SignedInternalGatewayRequest, ()> {
    Ok(SignedInternalGatewayRequest {
        version: required_internal_header(headers, X_SDKWORK_INTERNAL_AUTH_VERSION)?.to_owned(),
        principal: InternalGatewayPrincipal {
            api_key_id: required_internal_i64(headers, X_SDKWORK_INTERNAL_API_KEY_ID)?,
            tenant_id: required_internal_i64(headers, X_SDKWORK_INTERNAL_TENANT_ID)?,
            organization_id: required_internal_i64(headers, X_SDKWORK_INTERNAL_ORGANIZATION_ID)?,
            user_id: required_internal_i64(headers, X_SDKWORK_INTERNAL_USER_ID)?,
            account_group_id: required_internal_i64(headers, X_SDKWORK_INTERNAL_ACCOUNT_GROUP_ID)?,
        },
        issued_at: required_internal_u64(headers, X_SDKWORK_INTERNAL_ISSUED_AT)?,
        expires_at: required_internal_u64(headers, X_SDKWORK_INTERNAL_EXPIRES_AT)?,
        nonce: required_internal_header(headers, X_SDKWORK_INTERNAL_NONCE)?.to_owned(),
        body_sha256: required_internal_header(headers, X_SDKWORK_INTERNAL_BODY_SHA256)?.to_owned(),
        signature: required_internal_header(headers, X_SDKWORK_INTERNAL_SIGNATURE)?.to_owned(),
    })
}

fn required_internal_header<'a>(headers: &'a HeaderMap, name: &'static str) -> Result<&'a str, ()> {
    if headers.get_all(name).iter().count() != 1 {
        return Err(());
    }
    headers.get(name).ok_or(())?.to_str().map_err(|_| ())
}

fn required_internal_i64(headers: &HeaderMap, name: &'static str) -> Result<i64, ()> {
    required_internal_header(headers, name)?
        .parse::<i64>()
        .map_err(|_| ())
}

fn required_internal_u64(headers: &HeaderMap, name: &'static str) -> Result<u64, ()> {
    required_internal_header(headers, name)?
        .parse::<u64>()
        .map_err(|_| ())
}

fn authenticated_context_from_internal_principal<C>(
    catalog: &C,
    principal: InternalGatewayPrincipal,
) -> Option<AuthenticatedApiKeyContext>
where
    C: PricingCatalog,
{
    let api_key = catalog.find_api_key(principal.api_key_id)?;
    if api_key.status_code != 1
        || api_key.tenant_id != principal.tenant_id
        || api_key.organization_id != principal.organization_id
        || api_key.user_id != principal.user_id
        || !api_key
            .effective_account_group_bindings()
            .iter()
            .any(|binding| binding.account_group_id == principal.account_group_id)
    {
        return None;
    }
    let group = catalog.find_upstream_account_group(principal.account_group_id)?;
    if group.tenant_id != principal.tenant_id || group.organization_id != principal.organization_id
    {
        return None;
    }
    Some(AuthenticatedApiKeyContext {
        api_key_id: api_key.id,
        tenant_id: api_key.tenant_id,
        organization_id: api_key.organization_id,
        user_id: api_key.user_id,
        api_key_name_snapshot: api_key.display_name(),
        group_id: group.id,
        group_code: group.code,
        pricing_plan_code: group.pricing_plan_code,
    })
}

fn internal_gateway_auth_error() -> Response {
    gateway_auth_error(
        StatusCode::UNAUTHORIZED,
        "invalid_internal_authentication",
        "authentication_error",
        "internal gateway authentication is invalid",
    )
}
