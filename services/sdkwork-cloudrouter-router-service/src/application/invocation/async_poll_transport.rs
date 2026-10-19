use std::sync::Arc;

use axum::http::Method;

use super::provider_request::ProviderRequestBuilder;
use super::{
    Invocation, InvocationAccount, InvocationAuthType, InvocationBilling,
    InvocationClassificationRequest, InvocationRequest, InvocationResourceClassifier,
    InvocationSubject, OpenAiResourceClassifier, ProviderNativeResourceClassifier,
    ResolvedProviderSecret,
};
use crate::domain::{BillingOwnerKind, DomainError};
use crate::ports::{
    AsyncPollFuture, AsyncPollRequest, AsyncPollResponse, AsyncUsagePollTransport,
    InvocationDispatcher,
};

/// Hosts the async usage poll on the gateway's **existing** dispatch stack.
///
/// The poll is expressed as a synthetic free `GET` invocation and sent through
/// the injected [`InvocationDispatcher`], which already owns TLS, proxying, the
/// outbound target policy, timeouts, and response-size limits. Reusing it means
/// polling cannot silently bypass the egress controls that every other upstream
/// call obeys, and no second HTTP client is introduced.
pub struct PipelineAsyncPollTransport {
    dispatcher: Arc<dyn InvocationDispatcher>,
}

impl PipelineAsyncPollTransport {
    pub fn new(dispatcher: Arc<dyn InvocationDispatcher>) -> Self {
        Self { dispatcher }
    }

    fn build_invocation(request: &AsyncPollRequest) -> Result<Invocation, DomainError> {
        let method = Method::GET;
        let classification = classify(&method, &request.path, &request.supplier_code)?;
        let (resource, _billing, routing) = classification.into_parts();
        let mut invocation = Invocation::new(
            InvocationRequest::new(method, request.path.as_str()).with_request_id(format!(
                "async-poll:{}:{}",
                request.supplier_code, request.account_id
            )),
            // Polling is an internal read: no client identity is asserted, and
            // the account below carries the only credential that is used.
            InvocationSubject {
                auth_type: InvocationAuthType::InternalService,
                api_key_id: None,
                api_key_name_snapshot: None,
                tenant_id: 0,
                organization_id: 0,
                user_id: 0,
                billing_organization_id: 0,
                billing_owner: BillingOwnerKind::Personal,
                account_group_id: None,
                account_group_code: None,
                pricing_plan_code: None,
                roles: Vec::new(),
                scopes: Vec::new(),
            },
            resource,
            InvocationBilling::free(),
        );
        invocation.routing = routing;
        Ok(invocation)
    }
}

impl AsyncUsagePollTransport for PipelineAsyncPollTransport {
    fn get(&self, request: AsyncPollRequest) -> AsyncPollFuture<'_> {
        Box::pin(async move {
            let mut invocation = Self::build_invocation(&request)?;
            let account = InvocationAccount {
                supplier_code: request.supplier_code.clone(),
                account_id: request.account_id,
                region_code: request.region_code.clone(),
                credential_id: None,
                credential_rotation: None,
                base_url: request.base_url.clone(),
                secret_ref: request.secret_ref.clone(),
                auth_profile: request.auth_profile.clone(),
                timeout_ms: request.timeout_ms,
                retry_policy: None,
                provider_model: None,
                billing_mode: super::AccountBillingMode::Prepay,
                account_group_id: None,
                account_group_code: None,
                pricing_plan_code: None,
            };
            invocation.account = Some(account.clone());
            let resolved_secret = request.secret.as_ref().map(|value| ResolvedProviderSecret {
                secret_ref: account.secret_ref.clone().unwrap_or_default(),
                value: value.clone(),
            });
            let provider_request = ProviderRequestBuilder
                .build(&invocation, &account, resolved_secret.as_ref())
                .map_err(|error| DomainError::new(error.message))?;
            invocation.dispatch.provider_request = Some(provider_request);
            invocation.dispatch.resolved_secret = resolved_secret;

            let response = self
                .dispatcher
                .dispatch(&invocation, &account)
                .await
                .map_err(|error| {
                    DomainError::new(format!(
                        "async usage poll dispatch failed: {} ({})",
                        error.message, error.code
                    ))
                })?;
            Ok(AsyncPollResponse {
                status_code: response.status_code,
                body: response.body,
                body_bytes: response.body_bytes,
            })
        })
    }
}

fn classify(
    method: &Method,
    path: &str,
    supplier_code: &str,
) -> Result<crate::application::InvocationClassification, DomainError> {
    if path == "/v1" || path.starts_with("/v1/") {
        return OpenAiResourceClassifier
            .classify(&InvocationClassificationRequest::new(method.clone(), path))
            .map_err(|error| DomainError::new(error.message));
    }
    let (vendor, rest) = path
        .trim_start_matches('/')
        .split_once('/')
        .ok_or_else(|| DomainError::new(format!("unsupported async poll path: {path}")))?;
    let supplier = if supplier_code.trim().is_empty() {
        vendor
    } else {
        supplier_code
    };
    ProviderNativeResourceClassifier
        .classify(
            &InvocationClassificationRequest::new(method.clone(), format!("/{rest}"))
                .with_supplier_code(supplier),
        )
        .map_err(|error| DomainError::new(error.message))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::{InvocationDispatchError, InvocationDispatcherFuture};
    use serde_json::{json, Value};
    use std::sync::Mutex;

    #[derive(Default)]
    struct FakeDispatcher {
        calls: Mutex<Vec<(String, String, Option<String>)>>,
        status_code: Mutex<u16>,
        body: Mutex<Option<Value>>,
        fail: bool,
    }

    impl InvocationDispatcher for FakeDispatcher {
        fn dispatch<'a>(
            &'a self,
            invocation: &'a Invocation,
            _account: &'a InvocationAccount,
        ) -> InvocationDispatcherFuture<'a> {
            let provider_request = invocation.dispatch.provider_request.as_ref();
            self.calls.lock().expect("calls").push((
                invocation.request.path.clone(),
                provider_request
                    .map(|request| request.method.to_string())
                    .unwrap_or_default(),
                provider_request.and_then(|request| {
                    request
                        .headers
                        .get(axum::http::header::AUTHORIZATION)
                        .and_then(|value| value.to_str().ok())
                        .map(str::to_owned)
                }),
            ));
            let status_code = *self.status_code.lock().expect("status");
            let body = self.body.lock().expect("body").clone();
            let fail = self.fail;
            Box::pin(async move {
                if fail {
                    return Err(InvocationDispatchError::new(
                        "upstream_unreachable",
                        "connection refused",
                        None,
                        true,
                    ));
                }
                Ok(super::super::InvocationDispatchResponse::json(
                    status_code,
                    body.unwrap_or(Value::Null),
                ))
            })
        }
    }

    fn request(secret: Option<&str>) -> AsyncPollRequest {
        AsyncPollRequest {
            supplier_code: "openai".to_owned(),
            account_id: 3001,
            region_code: "global".to_owned(),
            base_url: Some("https://api.openai.example/v1".to_owned()),
            auth_profile: crate::domain::ProviderAuthProfile::default(),
            timeout_ms: Some(5_000),
            secret_ref: secret.map(|_| "managed://upstream-account-credential/1".to_owned()),
            secret: secret.map(str::to_owned),
            path: "/v1/responses/resp_1".to_owned(),
        }
    }

    #[tokio::test]
    async fn a_poll_becomes_a_credentialed_get_on_the_existing_dispatcher() {
        let dispatcher = Arc::new(FakeDispatcher {
            status_code: Mutex::new(200),
            body: Mutex::new(Some(
                json!({"status": "completed", "usage": {"input_tokens": 10}}),
            )),
            ..FakeDispatcher::default()
        });
        let transport = PipelineAsyncPollTransport::new(dispatcher.clone());

        let response = transport
            .get(request(Some("sk-upstream")))
            .await
            .expect("poll");
        assert_eq!(200, response.status_code);
        assert_eq!(
            Some(10),
            response
                .body
                .as_ref()
                .and_then(|body| body.pointer("/usage/input_tokens"))
                .and_then(Value::as_i64)
        );

        let calls = dispatcher.calls.lock().expect("calls");
        assert_eq!("/v1/responses/resp_1", calls[0].0);
        assert_eq!("GET", calls[0].1);
        assert_eq!(
            Some("Bearer sk-upstream".to_owned()),
            calls[0].2,
            "the account secret must be applied by the provider request builder"
        );
    }

    #[tokio::test]
    async fn a_poll_without_a_secret_stays_anonymous() {
        let dispatcher = Arc::new(FakeDispatcher {
            status_code: Mutex::new(200),
            body: Mutex::new(Some(json!({"status": "in_progress"}))),
            ..FakeDispatcher::default()
        });
        let transport = PipelineAsyncPollTransport::new(dispatcher.clone());
        transport.get(request(None)).await.expect("poll");
        let calls = dispatcher.calls.lock().expect("calls");
        assert_eq!(None, calls[0].2);
    }

    #[tokio::test]
    async fn upstream_statuses_pass_through_unchanged() {
        let dispatcher = Arc::new(FakeDispatcher {
            status_code: Mutex::new(429),
            body: Mutex::new(Some(json!({"error": "rate limited"}))),
            ..FakeDispatcher::default()
        });
        let transport = PipelineAsyncPollTransport::new(dispatcher);
        let response = transport
            .get(request(Some("sk-upstream")))
            .await
            .expect("poll");
        assert_eq!(429, response.status_code);
    }

    #[tokio::test]
    async fn transport_failures_surface_as_errors() {
        let dispatcher = Arc::new(FakeDispatcher {
            status_code: Mutex::new(500),
            body: Mutex::new(None),
            fail: true,
            ..FakeDispatcher::default()
        });
        let transport = PipelineAsyncPollTransport::new(dispatcher);
        let error = transport
            .get(request(Some("sk-upstream")))
            .await
            .expect_err("dispatch failure");
        assert!(
            error.to_string().contains("dispatch failed"),
            "unexpected error: {error}"
        );
    }
}
