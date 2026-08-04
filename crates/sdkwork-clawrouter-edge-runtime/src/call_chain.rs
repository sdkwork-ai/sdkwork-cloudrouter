//! Call-chain interceptor wiring the generic `sdkwork-web-chain` guard
//! engine into the invocation pipeline.
//!
//! The interceptor runs the composable call chain (concurrency bulkhead +
//! IP access lists today) around every open-API invocation:
//!
//! - `before` resolves the effective per-scope policy and evaluates all
//!   enabled chain stages; a rejection short-circuits with
//!   `Authorization` (IP denied, 403) or `RateLimit` (concurrency, 429).
//! - `after` / `on_error` release stage resources (concurrency leases)
//!   exactly once via the chain context stored on the invocation.

use std::net::IpAddr;
use std::sync::Arc;

use sdkwork_clawrouter_router_service::application::{
    Invocation, InvocationError, InvocationErrorKind, InvocationFuture, InvocationInterceptor,
};
use sdkwork_web_chain::{
    ChainOutcome, ChainPolicy, ChainScopes, ConcurrencyStage, IpAccessStage, PolicyResolver,
    ResolvedChainPolicy,
};

/// Call-chain interceptor backed by a pre-assembled [`sdkwork_web_chain::CallChain`].
#[derive(Clone)]
pub struct CallChainInterceptor {
    chain: Arc<sdkwork_web_chain::CallChain>,
}

impl CallChainInterceptor {
    pub fn new(chain: sdkwork_web_chain::CallChain) -> Self {
        Self {
            chain: Arc::new(chain),
        }
    }

    /// Assembles the standard open-API guard chain: IP access first (cheap
    /// static check), then the concurrency bulkhead (global + per-API-key).
    ///
    /// `store` backs the concurrency budgets (memory for single-node,
    /// distributed for multi-replica deployments) and `resolver` computes the
    /// effective policy (defaults → global → per-API-key).
    pub fn standard(
        store: Arc<dyn sdkwork_web_core::ConcurrentAdmissionStore>,
        resolver: Arc<dyn PolicyResolver>,
    ) -> Self {
        let chain = sdkwork_web_chain::CallChainBuilder::new()
            .with_stage(Arc::new(IpAccessStage::new()))
            .with_stage(Arc::new(ConcurrencyStage::new(store)))
            .with_policy_resolver(resolver)
            .build()
            .expect("standard call chain stages are unique");
        Self::new(chain)
    }

/// Emits a structured audit log line for chain rejections so operations can
/// correlate denials (IP blocks, concurrency limits) with API keys and
/// client IPs without digging through request traces.
fn log_chain_rejection(
    reason: Option<&sdkwork_web_chain::RejectReason>,
    invocation: &Invocation,
    client_ip: Option<IpAddr>,
) {
    let Some(reason) = reason else {
        return;
    };
    tracing::info!(
        event = "call_chain.rejected",
        stage_kind = ?reason.kind,
        http_status = reason.http_status,
        api_key_id = invocation.subject.api_key_id,
        tenant_id = invocation.subject.tenant_id,
        organization_id = invocation.subject.organization_id,
        client_ip = ?client_ip,
        request_id = %invocation.request.request_id,
        message = %reason.message,
        "open-api call chain rejected invocation"
    );
}

    fn error_from_outcome(outcome: ChainOutcome) -> InvocationError {
        match outcome {
            ChainOutcome::Rejected(reason) => {
                let kind = match reason.kind {
                    sdkwork_web_chain::RejectKind::IpForbidden => {
                        InvocationErrorKind::Authorization
                    }
                    sdkwork_web_chain::RejectKind::ConcurrencyExceeded => {
                        InvocationErrorKind::RateLimit
                    }
                    sdkwork_web_chain::RejectKind::Custom => {
                        if reason.http_status == 429 {
                            InvocationErrorKind::RateLimit
                        } else {
                            InvocationErrorKind::Authorization
                        }
                    }
                };
                let mut error = InvocationError::new(kind, reason.message);
                if let Some(retry_after) = reason.retry_after_secs {
                    error = error.with_retry_after(retry_after);
                }
                error
            }
            ChainOutcome::Failed(error) => {
                InvocationError::new(InvocationErrorKind::Internal, error.message)
            }
        }
    }
}

impl InvocationInterceptor for CallChainInterceptor {
    fn name(&self) -> &str {
        "call_chain"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            let client_ip = invocation
                .request
                .client_ip
                .as_deref()
                .and_then(|value| value.parse::<IpAddr>().ok());
            let scopes = ChainScopes {
                tenant_id: Some(invocation.subject.tenant_id),
                organization_id: Some(invocation.subject.organization_id),
                api_key_id: invocation.subject.api_key_id,
            };
            match self.chain.before(client_ip, &scopes).await {
                Ok(ctx) => {
                    invocation.call_chain = Some(ctx);
                    Ok(())
                }
                Err(outcome) => {
                    Self::log_chain_rejection(outcome.as_reject_reason(), &invocation, client_ip);
                    Err(Self::error_from_outcome(outcome))
                }
            }
        })
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if let Some(mut ctx) = invocation.call_chain.take() {
                if let Err(error) = self.chain.after(&mut ctx).await {
                    return Err(InvocationError::new(
                        InvocationErrorKind::Internal,
                        error.message,
                    ));
                }
            }
            Ok(())
        })
    }

    fn on_error<'a>(
        &'a self,
        invocation: &'a mut Invocation,
        error: &'a InvocationError,
    ) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if let Some(mut ctx) = invocation.call_chain.take() {
                let chain_error = sdkwork_web_core::WebFrameworkError::internal_server_error(
                    format!("{}: {}", error.kind.code(), error.message),
                );
                self.chain.on_error(&mut ctx, &chain_error).await;
            }
            Ok(())
        })
    }
}

/// Resolver wired from static configuration (built-in defaults merged over a
/// global [`ChainPolicy`]). Per-API-key overrides are supplied by the
/// database-backed resolver once chain policy persistence lands.
pub struct StaticChainPolicyResolver {
    global: ChainPolicy,
}

impl StaticChainPolicyResolver {
    pub fn new(global: ChainPolicy) -> Self {
        Self { global }
    }

    pub fn no_policy() -> Self {
        Self::new(ChainPolicy::default())
    }
}

#[async_trait::async_trait]
impl PolicyResolver for StaticChainPolicyResolver {
    async fn resolve(&self, _scopes: &ChainScopes) -> ResolvedChainPolicy {
        sdkwork_web_chain::merge_chain_policies(&ChainPolicy::default(), &self.global, None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_clawrouter_router_service::application::{
        InvocationAuthType, InvocationBilling, InvocationBody, InvocationRequest,
        InvocationResource, InvocationSubject,
    };
    use sdkwork_web_chain::{
        ChainPolicy, ConcurrencyPolicy, IpAccessMode, IpAccessPolicy,
    };
    use sdkwork_web_core::memory_concurrent_admission_store;
    use std::sync::Arc;

    fn test_invocation(api_key_id: i64, client_ip: Option<&str>) -> Invocation {
        let mut request = InvocationRequest::new(
            axum::http::Method::POST,
            "/v1/chat/completions",
        )
        .with_request_id("call-chain-test");
        request.client_ip = client_ip.map(str::to_owned);
        Invocation::new(
            request,
            InvocationSubject {
                auth_type: InvocationAuthType::GatewayApiKey,
                api_key_id: Some(api_key_id),
                api_key_name_snapshot: None,
                tenant_id: 10,
                organization_id: 20,
                user_id: 30,
                account_group_id: None,
                account_group_code: None,
                pricing_plan_code: None,
                roles: Vec::new(),
                scopes: Vec::new(),
            },
            InvocationResource::api_resource(
                "openai/chat/completions",
                "openai.chat.completions",
                sdkwork_clawrouter_router_service::domain::RoutingCapability::Chat,
            ),
            InvocationBilling::free(),
        )
    }

    fn ip_deny_policy() -> ChainPolicy {
        ChainPolicy {
            ip_access: Some(IpAccessPolicy {
                mode: IpAccessMode::Open,
                allowlist: vec![],
                denylist: vec!["10.0.0.0/8".to_owned()],
            }),
            ..ChainPolicy::default()
        }
    }

    #[tokio::test]
    async fn denied_ip_rejects_with_authorization_kind() {
        let interceptor = CallChainInterceptor::standard(
            memory_concurrent_admission_store(),
            Arc::new(StaticChainPolicyResolver::new(ip_deny_policy())),
        );
        let mut invocation = test_invocation(1, Some("10.1.2.3"));
        let error = interceptor
            .before(&mut invocation)
            .await
            .expect_err("denied");
        assert_eq!(InvocationErrorKind::Authorization, error.kind);
        assert!(invocation.call_chain.is_none());
    }

    #[tokio::test]
    async fn allowed_ip_passes_and_leases_release_exactly_once() {
        let store = memory_concurrent_admission_store();
        let resolver: Arc<dyn PolicyResolver> =
            Arc::new(StaticChainPolicyResolver::new(ChainPolicy {
                concurrency: Some(ConcurrencyPolicy {
                    max_inflight: Some(1),
                    max_inflight_per_scope: None,
                }),
                ..ChainPolicy::default()
            }));
        let interceptor = CallChainInterceptor::standard(store.clone(), resolver);
        let mut invocation = test_invocation(1, Some("8.8.8.8"));
        interceptor
            .before(&mut invocation)
            .await
            .expect("passes");
        assert!(invocation.call_chain.is_some());
        interceptor.after(&mut invocation).await.expect("release");
        // Exactly-once: a second release is a no-op and must not double count.
        interceptor.after(&mut invocation).await.expect("idempotent");
        // Slot is free for another key after release.
        let mut second = test_invocation(2, Some("8.8.4.4"));
        interceptor
            .before(&mut second)
            .await
            .expect("slot free");
        interceptor.after(&mut second).await.expect("release");
    }

    #[tokio::test]
    async fn concurrency_limit_rejects_with_rate_limit_kind() {
        let store = memory_concurrent_admission_store();
        let policy = ChainPolicy {
            concurrency: Some(ConcurrencyPolicy {
                max_inflight: Some(1),
                max_inflight_per_scope: None,
            }),
            ..ChainPolicy::default()
        };
        let interceptor = CallChainInterceptor::standard(
            store.clone(),
            Arc::new(StaticChainPolicyResolver::new(policy)),
        );
        let mut first = test_invocation(1, None);
        interceptor.before(&mut first).await.expect("first");
        let mut second = test_invocation(2, None);
        let error = interceptor.before(&mut second).await.expect_err("429");
        assert_eq!(InvocationErrorKind::RateLimit, error.kind);
        // RFC 6585: rate-limit rejections carry a Retry-After hint.
        assert_eq!(error.retry_after_secs, Some(1));
        interceptor.after(&mut first).await.expect("release");
    }

    #[tokio::test]
    async fn on_error_releases_leases() {
        let store = memory_concurrent_admission_store();
        let policy = ChainPolicy {
            concurrency: Some(ConcurrencyPolicy {
                max_inflight: Some(1),
                max_inflight_per_scope: None,
            }),
            ..ChainPolicy::default()
        };
        let interceptor = CallChainInterceptor::standard(
            store.clone(),
            Arc::new(StaticChainPolicyResolver::new(policy)),
        );
        let mut invocation = test_invocation(1, None);
        interceptor.before(&mut invocation).await.expect("acquired");
        let error = InvocationError::new(InvocationErrorKind::Dispatch, "upstream failed");
        interceptor.on_error(&mut invocation, &error).await.expect("released");
        assert!(invocation.call_chain.is_none());
        // The released slot is available again.
        let mut retry = test_invocation(1, None);
        interceptor.before(&mut retry).await.expect("slot free");
        interceptor.after(&mut retry).await.expect("release");
    }
}
