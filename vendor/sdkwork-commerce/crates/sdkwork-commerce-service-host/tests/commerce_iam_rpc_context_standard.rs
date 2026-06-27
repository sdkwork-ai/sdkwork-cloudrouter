use sdkwork_commerce_rpc::{CommerceRpcContextResolver, CommerceRpcRequestMetadata};
use sdkwork_commerce_service_host::CommerceIamRpcContextResolver;
use sdkwork_web_core::encode_unsigned_test_jwt;
use serde_json::json;

fn commerce_rpc_test_dual_token_metadata() -> CommerceRpcRequestMetadata {
    std::env::set_var("SDKWORK_ENV", "test");
    std::env::set_var("SDKWORK_DEPLOYMENT_MODE", "local");

    let auth_token = encode_unsigned_test_jwt(json!({
        "tenant_id": "100001",
        "organization_id": "300001",
        "user_id": "30",
        "session_id": "s-1",
        "app_id": "sdkwork-commerce",
        "auth_level": "password",
        "login_scope": "ORGANIZATION",
        "data_scope": ["tenant:100001"],
        "permission_scope": ["commerce.*"],
    }));
    let access_token = encode_unsigned_test_jwt(json!({
        "tenant_id": "100001",
        "organization_id": "300001",
        "user_id": "30",
        "session_id": "s-1",
        "app_id": "sdkwork-commerce",
        "environment": "prod",
        "deployment_mode": "private",
        "login_scope": "ORGANIZATION",
        "data_scope": ["tenant:100001"],
        "permission_scope": ["commerce.*"],
    }));

    CommerceRpcRequestMetadata {
        authorization: Some(format!("Bearer {auth_token}")),
        access_token: Some(access_token),
        ..CommerceRpcRequestMetadata::default()
    }
}

#[test]
fn commerce_iam_rpc_context_resolver_rejects_missing_dual_token_metadata() {
    let resolver = CommerceIamRpcContextResolver::new(None);
    let error = resolver
        .resolve_runtime_context(
            "wallet.overview.retrieve",
            &CommerceRpcRequestMetadata::default(),
        )
        .unwrap_err();

    assert_eq!(error.code(), "unauthenticated");
}

#[test]
fn commerce_iam_rpc_context_resolver_resolves_dev_dual_token_without_database() {
    let resolver = CommerceIamRpcContextResolver::new(None);
    let context = resolver
        .resolve_runtime_context(
            "wallet.overview.retrieve",
            &commerce_rpc_test_dual_token_metadata(),
        )
        .expect("context");

    assert_eq!(context.tenant_id, "100001");
    assert_eq!(context.user_id, "30");
    assert_eq!(context.app_id, "sdkwork-commerce");
}

#[test]
fn commerce_iam_rpc_context_resolver_rejects_backend_admin_without_access_token_fallback() {
    let resolver = CommerceIamRpcContextResolver::new(None);
    let metadata = commerce_rpc_test_dual_token_metadata();
    let error = resolver
        .resolve_runtime_context(
            "payments.intents.list",
            &CommerceRpcRequestMetadata {
                authorization: metadata.authorization,
                ..CommerceRpcRequestMetadata::default()
            },
        )
        .unwrap_err();

    assert_eq!(error.code(), "unauthenticated");
}

#[test]
fn commerce_iam_rpc_context_resolver_allows_backend_admin_with_dual_token_fallback() {
    let resolver = CommerceIamRpcContextResolver::new(None);
    let context = resolver
        .resolve_runtime_context(
            "payments.intents.list",
            &commerce_rpc_test_dual_token_metadata(),
        )
        .expect("backend context");

    assert_eq!(context.tenant_id, "100001");
    assert_eq!(context.surface_profile.as_str(), "admin");
}
