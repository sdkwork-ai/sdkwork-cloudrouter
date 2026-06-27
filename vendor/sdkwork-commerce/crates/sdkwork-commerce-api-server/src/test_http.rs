//! Shared HTTP test helpers for Commerce route crate unit and integration tests.

use axum::body::Body;
use axum::http::request::Builder;
use axum::http::Request;
use axum::Extension;
use axum::Router;
use sdkwork_commerce_storage_repository_sqlx::commerce_migrated_sqlite_memory_pool;
use sdkwork_iam_context_service::{
    AuthLevel, DeploymentMode, Environment, IamAppContext, LoginScope,
};
use sdkwork_web_core::encode_unsigned_test_jwt;
use serde_json::json;
use sqlx::SqlitePool;

/// Enables IAM JWT dev fallback for router integration tests (no IAM database pool).
pub fn commerce_enable_dev_auth_fallback() {
    std::env::set_var("SDKWORK_ENV", "test");
    std::env::set_var("SDKWORK_DEPLOYMENT_MODE", "local");
}

pub fn commerce_standard_test_context() -> IamAppContext {
    IamAppContext::new(
        "100001",
        Some("300001"),
        "30",
        "session-1",
        "app-1",
        Environment::Test,
        DeploymentMode::Local,
        AuthLevel::Password,
        vec!["tenant:100001".to_owned()],
        vec!["commerce.*".to_owned()],
    )
}

pub async fn commerce_migrated_sqlite_pool() -> SqlitePool {
    commerce_migrated_sqlite_memory_pool().await
}

pub fn commerce_test_auth_headers(context: &IamAppContext) -> [(&'static str, String); 2] {
    let auth_level = match context.auth_level {
        AuthLevel::Anonymous => "anonymous",
        AuthLevel::Password => "password",
        AuthLevel::Mfa => "mfa",
        AuthLevel::System => "system",
    };
    let environment = match context.environment {
        Environment::Dev => "dev",
        Environment::Test => "test",
        Environment::Prod => "prod",
    };
    let deployment_mode = match context.deployment_mode {
        DeploymentMode::Saas => "saas",
        DeploymentMode::Local => "local",
        DeploymentMode::Private => "private",
    };
    let organization_id = context
        .organization_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let login_scope = if matches!(organization_id, Some(value) if value != "0") {
        match context.login_scope {
            LoginScope::Tenant => "TENANT",
            LoginScope::Organization => "ORGANIZATION",
        }
    } else {
        "TENANT"
    };
    let organization_id = organization_id.unwrap_or("0");

    let auth_token = encode_unsigned_test_jwt(json!({
        "tenant_id": context.tenant_id,
        "organization_id": organization_id,
        "user_id": context.user_id,
        "session_id": context.session_id,
        "app_id": context.app_id,
        "auth_level": auth_level,
        "login_scope": login_scope,
        "data_scope": context.data_scope,
        "permission_scope": context.permission_scope,
    }));
    let access_token = encode_unsigned_test_jwt(json!({
        "tenant_id": context.tenant_id,
        "organization_id": organization_id,
        "user_id": context.user_id,
        "session_id": context.session_id,
        "app_id": context.app_id,
        "environment": environment,
        "deployment_mode": deployment_mode,
        "login_scope": login_scope,
        "data_scope": context.data_scope,
        "permission_scope": context.permission_scope,
    }));

    [
        ("Authorization", format!("Bearer {auth_token}")),
        ("Access-Token", access_token),
    ]
}

pub fn commerce_test_request(
    builder: Builder,
    context: Option<&IamAppContext>,
    body: Body,
) -> Request<Body> {
    if context.is_some() {
        commerce_enable_dev_auth_fallback();
    }
    let mut request_builder = builder;
    if let Some(context) = context {
        for (name, value) in commerce_test_auth_headers(context) {
            request_builder = request_builder.header(name, value);
        }
    }
    let mut request = request_builder.body(body).expect("request");
    if let Some(context) = context {
        request.extensions_mut().insert(context.clone());
    }
    request
}

pub fn commerce_test_json_request(
    method: &str,
    uri: &str,
    context: &IamAppContext,
    body: Body,
) -> Request<Body> {
    commerce_test_request(
        Request::builder()
            .method(method)
            .uri(uri)
            .header("content-type", "application/json"),
        Some(context),
        body,
    )
}

pub fn commerce_test_router_with_iam_context(router: Router, context: IamAppContext) -> Router {
    router.layer(Extension(context))
}

pub fn commerce_app_write_request(
    method: &str,
    uri: impl AsRef<str>,
    scope: &str,
    context: &IamAppContext,
    idempotency_key: &str,
    body_json: &str,
) -> Request<Body> {
    commerce_app_write_request_with_options(
        method,
        uri,
        scope,
        context,
        idempotency_key,
        Some(&format!("{idempotency_key}-request")),
        body_json,
        &[],
    )
}

pub fn commerce_app_write_request_without_request_no(
    method: &str,
    uri: impl AsRef<str>,
    scope: &str,
    context: &IamAppContext,
    idempotency_key: &str,
    body_json: &str,
    extra_headers: &[(&'static str, &str)],
) -> Request<Body> {
    commerce_app_write_request_with_options(
        method,
        uri,
        scope,
        context,
        idempotency_key,
        None,
        body_json,
        extra_headers,
    )
}

#[allow(clippy::too_many_arguments)]
pub fn commerce_app_write_request_with_options(
    method: &str,
    uri: impl AsRef<str>,
    scope: &str,
    context: &IamAppContext,
    idempotency_key: &str,
    request_no: Option<&str>,
    body_json: &str,
    extra_headers: &[(&'static str, &str)],
) -> Request<Body> {
    let body_value: serde_json::Value =
        serde_json::from_str(body_json).expect("app write request body must be valid json");
    let request_hash = crate::request_hash::stable_canonical_json_request_hash(scope, &body_value);
    let mut builder = Request::builder()
        .method(method)
        .uri(uri.as_ref())
        .header("content-type", "application/json")
        .header("Idempotency-Key", idempotency_key)
        .header("Sdkwork-Request-Hash", request_hash);
    if let Some(request_no) = request_no {
        builder = builder.header("Sdkwork-Request-No", request_no);
    }
    for (name, value) in extra_headers {
        builder = builder.header(*name, *value);
    }
    commerce_test_request(builder, Some(context), Body::from(body_json.to_owned()))
}

pub fn commerce_backend_write_request(
    method: &str,
    uri: impl AsRef<str>,
    scope: &str,
    context: &IamAppContext,
    idempotency_key: &str,
    body_json: &str,
) -> Request<Body> {
    commerce_app_write_request(method, uri, scope, context, idempotency_key, body_json)
}

pub fn commerce_test_command_request(
    method: &str,
    uri: impl AsRef<str>,
    context: &IamAppContext,
    idempotency_key: &str,
    request_no: &str,
    request_hash: Option<&str>,
    body: Body,
) -> Request<Body> {
    let mut builder = Request::builder()
        .method(method)
        .uri(uri.as_ref())
        .header("content-type", "application/json")
        .header("Idempotency-Key", idempotency_key)
        .header("Sdkwork-Request-No", request_no);
    if let Some(request_hash) = request_hash {
        builder = builder.header("Sdkwork-Request-Hash", request_hash);
    }
    commerce_test_request(builder, Some(context), body)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn commerce_test_auth_headers_include_dual_token_pair() {
        let context = commerce_standard_test_context();
        let headers = commerce_test_auth_headers(&context);
        assert!(headers[0].1.starts_with("Bearer eyJ"));
        assert!(headers[1].1.contains('.'));
    }
}
