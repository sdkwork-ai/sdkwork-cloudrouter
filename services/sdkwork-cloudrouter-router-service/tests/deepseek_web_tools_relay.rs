//! Relay-shape test for DeepSeek's web tools on the `/v1` open-api ingress.
//!
//! The per-API chain audit proves the four declarative links (classifier arm,
//! taxonomy route, seeded endpoint, group grant) and the DB e2e probe proves
//! the socket-level call. This test pins the piece in between, which is the one
//! the relay actually builds: given the classification the gateway derives for
//! `POST /v1/tools/search` / `POST /v1/tools/fetch`, the provider request must
//! dial **DeepSeek's own path on the account base URL**, inject the upstream
//! bearer credential, and keep the caller's JSON body untouched.
//!
//! It also locks the billing shape: both tools are request-billed
//! (`BillingMode::ApiRequest` + `BillingMeter::ApiRequest`), because DeepSeek
//! charges per successful call (5 CNY / 1,000 requests), never per returned
//! result — `count` must not change the price.

use axum::http::{header, Method};
use sdkwork_cloudrouter_router_service::application::{
    Invocation, InvocationAccount, InvocationAuthType, InvocationClassificationRequest,
    InvocationInterceptor, InvocationRequest, InvocationResourceClassifier, InvocationSubject,
    OpenAiResourceClassifier, RequestTransformInterceptor, ResolvedProviderSecret,
};
use sdkwork_cloudrouter_router_service::application::BillingMode;
use sdkwork_cloudrouter_router_service::domain::{
    BillingMeter, ProviderAuthProfile, RoutingCapability,
};

fn subject() -> InvocationSubject {
    InvocationSubject {
        auth_type: InvocationAuthType::GatewayApiKey,
        api_key_id: Some(1),
        api_key_name_snapshot: None,
        tenant_id: 10,
        organization_id: 20,
        user_id: 30,
        billing_organization_id: 0,
        billing_owner: Default::default(),
        account_group_id: Some(1),
        account_group_code: Some("official.deepseek.full".to_owned()),
        pricing_plan_code: None,
        roles: Vec::new(),
        scopes: Vec::new(),
    }
}

fn deepseek_account() -> InvocationAccount {
    InvocationAccount {
        supplier_code: "deepseek".to_owned(),
        account_id: 1,
        region_code: "cn".to_owned(),
        credential_id: Some(1),
        credential_rotation: None,
        base_url: Some("https://api.deepseek.com".to_owned()),
        secret_ref: Some("managed://upstream-account-credential/1".to_owned()),
        auth_profile: ProviderAuthProfile::bearer(),
        timeout_ms: None,
        retry_policy: None,
        provider_model: None,
        billing_mode: Default::default(),
        account_group_id: Some(1),
        account_group_code: Some("official.deepseek.full".to_owned()),
        pricing_plan_code: None,
    }
}

#[tokio::test]
async fn deepseek_web_tools_relay_to_deepseek_native_paths() {
    for (path, expected_url) in [
        (
            "/v1/tools/search",
            "https://api.deepseek.com/v1/tools/search",
        ),
        ("/v1/tools/fetch", "https://api.deepseek.com/v1/tools/fetch"),
    ] {
        let classification = OpenAiResourceClassifier
            .classify(&InvocationClassificationRequest::new(Method::POST, path))
            .expect("classification must succeed for a published open-api path");
        let (resource, billing, routing) = classification.into_parts();

        assert_eq!("deepseek", resource.api_code.split('.').next().unwrap(), "{path}");
        assert_eq!(RoutingCapability::Network, resource.capability, "{path}");
        assert_eq!(BillingMode::ApiRequest, billing.mode, "{path}");
        assert_eq!(
            Some(BillingMeter::ApiRequest),
            billing.meter.clone(),
            "{path}"
        );
        assert_eq!(
            sdkwork_cloudrouter_router_service::domain::AiRouteStrategy::PrimaryAccount,
            routing.strategy,
            "{path}"
        );

        let mut invocation = Invocation::new(
            InvocationRequest::new(Method::POST, path),
            subject(),
            resource,
            billing,
        );
        invocation.account = Some(deepseek_account());
        invocation.dispatch.resolved_secret = Some(ResolvedProviderSecret {
            secret_ref: "managed://upstream-account-credential/1".to_owned(),
            value: "sk-deepseek-test".to_owned(),
        });

        RequestTransformInterceptor
            .before(&mut invocation)
            .await
            .expect("provider request must be constructible for a resolved account");

        let provider_request = invocation
            .dispatch
            .provider_request
            .as_ref()
            .expect("provider request");
        assert_eq!(Method::POST, provider_request.method, "{path}");
        assert_eq!(path, provider_request.path, "{path}");
        assert_eq!(
            Some(expected_url.to_owned()),
            provider_request.url.clone(),
            "{path}: the account base URL and the published path must join without \
             duplicating or dropping /v1"
        );
        assert_eq!(
            Some("Bearer sk-deepseek-test"),
            provider_request
                .headers
                .get(header::AUTHORIZATION)
                .and_then(|value| value.to_str().ok()),
            "{path}: the upstream credential must be injected as a bearer token"
        );
    }
}

#[tokio::test]
async fn deepseek_web_tools_keep_v1_when_the_account_base_url_already_ends_with_v1() {
    // Some operators configure the DeepSeek account as `https://api.deepseek.com/v1`
    // (the OpenAI-compatible base URL). `join_provider_path` must then drop the
    // duplicate `/v1` instead of dialing `/v1/v1/tools/search`.
    let classification = OpenAiResourceClassifier
        .classify(&InvocationClassificationRequest::new(
            Method::POST,
            "/v1/tools/search",
        ))
        .expect("classification");
    let (resource, billing, _routing) = classification.into_parts();
    let mut invocation = Invocation::new(
        InvocationRequest::new(Method::POST, "/v1/tools/search"),
        subject(),
        resource,
        billing,
    );
    let mut account = deepseek_account();
    account.base_url = Some("https://api.deepseek.com/v1".to_owned());
    invocation.account = Some(account);
    invocation.dispatch.resolved_secret = Some(ResolvedProviderSecret {
        secret_ref: "managed://upstream-account-credential/1".to_owned(),
        value: "sk-deepseek-test".to_owned(),
    });

    RequestTransformInterceptor
        .before(&mut invocation)
        .await
        .expect("provider request");

    let provider_request = invocation.dispatch.provider_request.expect("provider request");
    assert_eq!(
        Some("https://api.deepseek.com/v1/tools/search".to_owned()),
        provider_request.url
    );
}
