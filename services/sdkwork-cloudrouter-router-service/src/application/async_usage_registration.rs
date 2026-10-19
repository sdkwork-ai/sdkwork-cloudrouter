use std::sync::Arc;

use axum::http::Method;
use serde_json::Value;

use crate::application::{
    Invocation, InvocationError, InvocationErrorKind, InvocationFuture, InvocationInterceptor,
};
use crate::domain::{AsyncUsageTaskKind, DomainError, DomainResult, NewAsyncUsageTask};
use crate::ports::AsyncUsageTaskStore;

/// Builds and enqueues reconciliation rows for asynchronous upstream tasks.
///
/// The caller invokes this **after** a successful create response has been
/// parsed and the upstream id (`batch_...`, `resp_...`, `run_...`) is known.
/// Enqueue is idempotent on `(tenant, organization, kind, upstream_id)`, so a
/// retried create response cannot duplicate the later usage fact.
#[derive(Clone)]
pub struct AsyncUsageRegistrar {
    store: Arc<dyn AsyncUsageTaskStore>,
}

impl AsyncUsageRegistrar {
    pub fn new(store: Arc<dyn AsyncUsageTaskStore>) -> Self {
        Self { store }
    }

    /// Enqueues the reconciliation row.
    ///
    /// `poll_path` is the upstream **read** path the executor must poll (the
    /// create path is not pollable for every kind: a thread run is created at
    /// `/v1/threads/{thread_id}/runs` but polled at
    /// `/v1/threads/{thread_id}/runs/{run_id}`). It is stored with the task.
    pub async fn register(
        &self,
        invocation: &Invocation,
        kind: AsyncUsageTaskKind,
        upstream_id: &str,
        poll_path: Option<&str>,
    ) -> DomainResult<()> {
        let task = new_task_from_invocation(invocation, kind, upstream_id, poll_path)?;
        self.store.enqueue(task).await
    }
}

fn new_task_from_invocation(
    invocation: &Invocation,
    kind: AsyncUsageTaskKind,
    upstream_id: &str,
    poll_path: Option<&str>,
) -> DomainResult<NewAsyncUsageTask> {
    let upstream_id = upstream_id.trim();
    if upstream_id.is_empty() {
        return Err(DomainError::new(
            "async usage registration requires a non-empty upstream id",
        ));
    }
    let account = invocation.account.as_ref().ok_or_else(|| {
        DomainError::new("async usage registration requires a resolved upstream account")
    })?;
    let api_key_id = invocation
        .subject
        .api_key_id
        .ok_or_else(|| DomainError::new("async usage registration requires api key context"))?;
    Ok(NewAsyncUsageTask {
        tenant_id: invocation.subject.tenant_id,
        organization_id: invocation.subject.organization_id,
        user_id: Some(invocation.subject.user_id),
        api_key_id,
        request_id: invocation.request.request_id.clone(),
        task_kind: kind,
        upstream_id: upstream_id.to_owned(),
        catalog_key: invocation
            .resource
            .requested_model_catalog_key
            .clone()
            .filter(|key| !key.trim().is_empty()),
        supplier_code: account.supplier_code.clone(),
        account_id: account.account_id,
        region_code: account.region_code.clone(),
        // The pricing resolution is not serializable, so the settler re-prices
        // at completion. Capture the creation context that re-pricing needs:
        // the original surface, model, account group and plan.
        metadata: Some(serde_json::json!({
            "method": invocation.request.method.as_str(),
            "path": invocation.request.path.as_str(),
            "model": invocation.resource.requested_model.as_deref(),
            "apiCode": invocation.resource.api_code.as_str(),
            "routeKey": invocation.resource.route_key.as_str(),
            "accountGroupId": invocation
                .subject
                .account_group_id
                .or(account.account_group_id),
            "pricingPlanCode": invocation
                .subject
                .pricing_plan_code
                .as_deref()
                .or(account.pricing_plan_code.as_deref()),
            "pollPath": poll_path,
        })),
    })
}

/// Enqueues the reconciliation row for a successful asynchronous **create**.
///
/// Runs in the response `after` chain. It only reacts to the four creation
/// surfaces whose usage is not in the create response; polling/cancel paths and
/// synchronous calls pass through untouched. A create that succeeded upstream
/// but cannot be registered fails the pipeline (the client still receives the
/// normalized response) instead of leaving an unbilled upstream task behind.
#[derive(Clone)]
pub struct AsyncUsageRegistrationInterceptor {
    registrar: AsyncUsageRegistrar,
}

impl AsyncUsageRegistrationInterceptor {
    pub fn new(store: Arc<dyn AsyncUsageTaskStore>) -> Self {
        Self {
            registrar: AsyncUsageRegistrar::new(store),
        }
    }
}

impl InvocationInterceptor for AsyncUsageRegistrationInterceptor {
    fn name(&self) -> &str {
        "async_usage_registration"
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            let Some(task) = pending_async_task(invocation)? else {
                return Ok(());
            };
            self.registrar
                .register(
                    invocation,
                    task.kind,
                    &task.upstream_id,
                    Some(task.poll_path.as_str()),
                )
                .await
                .map_err(|error| {
                    InvocationError::new(
                        InvocationErrorKind::Usage,
                        format!("async usage registration failed: {error}"),
                    )
                })
        })
    }
}

struct PendingAsyncTask {
    kind: AsyncUsageTaskKind,
    upstream_id: String,
    poll_path: String,
}

/// Identifies a successful asynchronous create and its pollable read path.
///
/// `Ok(None)` means "not an asynchronous creation route" and is the common
/// case; `Err` means the route is asynchronous but the upstream response cannot
/// be reconciled (missing id / thread id), which must fail closed.
fn pending_async_task(
    invocation: &Invocation,
) -> Result<Option<PendingAsyncTask>, InvocationError> {
    if invocation.request.method != Method::POST || !invocation.billing.settlement_required {
        return Ok(None);
    }
    let path = invocation.request.path.as_str();
    let api_code = invocation.resource.api_code.as_str();
    let kind = match (api_code, path) {
        ("openai.batches", "/v1/batches") => AsyncUsageTaskKind::OpenAiBatch,
        ("anthropic.batches", "/anthropic/v1/messages/batches") => {
            AsyncUsageTaskKind::AnthropicBatch
        }
        ("openai.responses", "/v1/responses") if background_requested(invocation) => {
            AsyncUsageTaskKind::BackgroundResponse
        }
        ("openai.threads", "/v1/threads/runs") => AsyncUsageTaskKind::ThreadRun,
        ("openai.threads", path) if path.starts_with("/v1/threads/") && path.ends_with("/runs") => {
            AsyncUsageTaskKind::ThreadRun
        }
        _ => return Ok(None),
    };

    let Some(response) = invocation.dispatch.response.as_ref() else {
        return Ok(None);
    };
    // A failed create made no upstream task, so there is nothing to reconcile.
    if !(200..300).contains(&response.status_code) {
        return Ok(None);
    }
    let body = response.body.clone().ok_or_else(|| {
        registration_error(format!(
            "{api_code} create returned no reconcilable response body"
        ))
    })?;
    let upstream_id = body
        .get("id")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|id| !id.is_empty())
        .ok_or_else(|| {
            registration_error(format!("{api_code} create response carried no upstream id"))
        })?
        .to_owned();

    let poll_path = match kind {
        AsyncUsageTaskKind::OpenAiBatch => format!("/v1/batches/{upstream_id}"),
        AsyncUsageTaskKind::AnthropicBatch => {
            format!("/anthropic/v1/messages/batches/{upstream_id}")
        }
        AsyncUsageTaskKind::BackgroundResponse => format!("/v1/responses/{upstream_id}"),
        AsyncUsageTaskKind::ThreadRun => {
            let thread_id = body
                .get("thread_id")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|id| !id.is_empty())
                .map(str::to_owned)
                .or_else(|| {
                    path.strip_prefix("/v1/threads/")
                        .and_then(|rest| rest.strip_suffix("/runs"))
                        .filter(|id| !id.is_empty())
                        .map(str::to_owned)
                })
                .ok_or_else(|| {
                    registration_error("thread run response carried no thread id to poll")
                })?;
            format!("/v1/threads/{thread_id}/runs/{upstream_id}")
        }
    };
    Ok(Some(PendingAsyncTask {
        kind,
        upstream_id,
        poll_path,
    }))
}

fn background_requested(invocation: &Invocation) -> bool {
    match &invocation.request.body {
        crate::application::InvocationBody::Json(body) => {
            body.get("background").and_then(Value::as_bool) == Some(true)
        }
        _ => false,
    }
}

fn registration_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Usage, message)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::{
        AccountBillingMode, Invocation, InvocationAccount, InvocationBilling, InvocationBody,
        InvocationDispatch, InvocationRequest, InvocationResource, InvocationSubject,
        InvocationSurface, ResourceType,
    };
    use crate::domain::{AsyncUsageTaskKind, DomainError, RoutingCapability};
    use crate::infrastructure::InMemoryAsyncUsageTaskStore;

    fn invocation() -> Invocation {
        let mut invocation = Invocation::new(
            InvocationRequest::new(axum::http::Method::POST, "/v1/batches")
                .with_request_id("req-async-registration")
                .with_body(InvocationBody::json(
                    serde_json::json!({"input_file_id": "file-1"}),
                )),
            InvocationSubject {
                auth_type: crate::application::InvocationAuthType::GatewayApiKey,
                api_key_id: Some(100),
                api_key_name_snapshot: Some("test".to_owned()),
                tenant_id: 10,
                organization_id: 20,
                user_id: 30,
                billing_organization_id: 0,
                billing_owner: Default::default(),
                account_group_id: Some(10),
                account_group_code: Some("standard-group".to_owned()),
                pricing_plan_code: Some("standard".to_owned()),
                roles: Vec::new(),
                scopes: Vec::new(),
            },
            InvocationResource {
                surface: InvocationSurface::OpenAiCompatible,
                provider_family: None,
                supplier_code: None,
                route_key: "openai/management/batches".to_owned(),
                api_code: "openai.batches".to_owned(),
                endpoint_key: None,
                operation_id: None,
                resource_type: ResourceType::Batch,
                resource_id: None,
                parent_resource_type: None,
                parent_resource_id: None,
                capability: RoutingCapability::Network,
                model_requirement: crate::domain::AiRouteModelRequirement::Ignored,
                route_kind: None,
                requested_model: None,
                requested_model_catalog_key: Some("openai/gpt-5.6-sol".to_owned()),
                resolved_vendor_codes: Vec::new(),
                provider_native_model: None,
            },
            InvocationBilling {
                mode: crate::application::BillingMode::Free,
                meter: None,
                quantity_source: crate::application::BillingQuantitySource::None,
                pricing_required: false,
                settlement_required: false,
                result_gate: crate::application::BillingResultGate::Any,
            },
        );
        invocation.account = Some(InvocationAccount {
            supplier_code: "openai".to_owned(),
            account_id: 3001,
            region_code: "global".to_owned(),
            credential_id: None,
            credential_rotation: None,
            base_url: Some("https://api.openai.example".to_owned()),
            secret_ref: None,
            auth_profile: Default::default(),
            timeout_ms: None,
            retry_policy: None,
            provider_model: None,
            billing_mode: AccountBillingMode::Prepay,
            account_group_id: Some(10),
            account_group_code: Some("standard-group".to_owned()),
            pricing_plan_code: Some("standard".to_owned()),
        });
        invocation
    }

    #[tokio::test]
    async fn registration_is_idempotent_on_the_upstream_id() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let registrar = AsyncUsageRegistrar::new(store.clone());
        let invocation = invocation();

        registrar
            .register(
                &invocation,
                AsyncUsageTaskKind::OpenAiBatch,
                "batch-1",
                Some("/v1/batches/batch-1"),
            )
            .await
            .expect("register");
        registrar
            .register(
                &invocation,
                AsyncUsageTaskKind::OpenAiBatch,
                "batch-1",
                Some("/v1/batches/batch-1"),
            )
            .await
            .expect("register");

        let claimed = store
            .claim_due(
                chrono::Utc::now() + chrono::Duration::seconds(1),
                10,
                chrono::Duration::seconds(30),
            )
            .await
            .expect("claim");
        assert_eq!(1, claimed.len());
        assert_eq!("batch-1", claimed[0].upstream_id);
        assert_eq!(
            Some("openai/gpt-5.6-sol".to_owned()),
            claimed[0].catalog_key
        );
        assert_eq!(
            Some("/v1/batches/batch-1"),
            claimed[0]
                .metadata
                .as_ref()
                .and_then(|metadata| metadata.get("pollPath"))
                .and_then(|value| value.as_str())
        );
    }

    #[tokio::test]
    async fn registration_rejects_a_missing_upstream_id() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let registrar = AsyncUsageRegistrar::new(store);
        let error = registrar
            .register(&invocation(), AsyncUsageTaskKind::OpenAiBatch, "", None)
            .await
            .expect_err("empty upstream id must be rejected");
        assert!(matches!(error, DomainError { .. }));
    }

    fn async_creation(path: &str, api_code: &str, body: serde_json::Value) -> Invocation {
        let mut invocation = invocation();
        invocation.request = InvocationRequest::new(axum::http::Method::POST, path)
            .with_request_id("req-async-create")
            .with_body(InvocationBody::json(body));
        invocation.resource.api_code = api_code.to_owned();
        invocation.billing =
            InvocationBilling::composite(crate::domain::BillingMeter::LlmInputToken);
        invocation
    }

    async fn registered_task(
        store: &Arc<InMemoryAsyncUsageTaskStore>,
    ) -> crate::domain::AsyncUsageTask {
        let claimed = store
            .claim_due(
                chrono::Utc::now() + chrono::Duration::seconds(1),
                10,
                chrono::Duration::seconds(30),
            )
            .await
            .expect("claim");
        assert_eq!(1, claimed.len(), "exactly one reconciliation row");
        claimed[0].clone()
    }

    #[tokio::test]
    async fn registers_a_background_response_creation() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let mut invocation = async_creation(
            "/v1/responses",
            "openai.responses",
            serde_json::json!({"background": true}),
        );
        invocation.dispatch =
            InvocationDispatch::json_response(200, serde_json::json!({"id": "resp_1"}));

        AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
            .await
            .expect("register");

        let task = registered_task(&store).await;
        assert_eq!(AsyncUsageTaskKind::BackgroundResponse, task.task_kind);
        assert_eq!("resp_1", task.upstream_id);
        assert_eq!(
            Some("/v1/responses/resp_1"),
            task.metadata
                .as_ref()
                .and_then(|metadata| metadata.get("pollPath"))
                .and_then(|value| value.as_str())
        );
    }

    #[tokio::test]
    async fn synchronous_responses_are_not_registered() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let mut invocation = async_creation(
            "/v1/responses",
            "openai.responses",
            serde_json::json!({"model": "gpt-4o"}),
        );
        invocation.dispatch =
            InvocationDispatch::json_response(200, serde_json::json!({"id": "resp_1"}));

        AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
            .await
            .expect("no-op");

        assert!(store
            .claim_due(
                chrono::Utc::now() + chrono::Duration::seconds(1),
                10,
                chrono::Duration::seconds(30),
            )
            .await
            .expect("claim")
            .is_empty());
    }

    #[tokio::test]
    async fn registers_a_thread_run_with_a_pollable_path() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let mut invocation = async_creation(
            "/v1/threads/thread_9/runs",
            "openai.threads",
            serde_json::json!({"model": "gpt-4o", "assistant_id": "asst_1"}),
        );
        invocation.dispatch = InvocationDispatch::json_response(
            200,
            serde_json::json!({"id": "run_7", "thread_id": "thread_9"}),
        );

        AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
            .await
            .expect("register");

        let task = registered_task(&store).await;
        assert_eq!(AsyncUsageTaskKind::ThreadRun, task.task_kind);
        assert_eq!(
            Some("/v1/threads/thread_9/runs/run_7"),
            task.metadata
                .as_ref()
                .and_then(|metadata| metadata.get("pollPath"))
                .and_then(|value| value.as_str())
        );
    }

    #[tokio::test]
    async fn failed_creation_responses_are_not_registered() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let mut invocation = async_creation(
            "/v1/batches",
            "openai.batches",
            serde_json::json!({"input_file_id": "f"}),
        );
        invocation.dispatch =
            InvocationDispatch::json_response(400, serde_json::json!({"error": "bad input"}));

        AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
            .await
            .expect("no-op");
        assert!(store
            .claim_due(
                chrono::Utc::now() + chrono::Duration::seconds(1),
                10,
                chrono::Duration::seconds(30),
            )
            .await
            .expect("claim")
            .is_empty());
    }

    #[tokio::test]
    async fn a_thread_run_without_a_thread_id_fails_closed() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        // `/v1/threads/runs` carries the thread id only in the response body.
        let mut invocation = async_creation(
            "/v1/threads/runs",
            "openai.threads",
            serde_json::json!({"model": "gpt-4o", "assistant_id": "asst_1"}),
        );
        invocation.dispatch =
            InvocationDispatch::json_response(200, serde_json::json!({"id": "run_7"}));

        let error = AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
            .await
            .expect_err("an unpollable run must not be silently dropped");
        assert!(
            error.message.contains("thread id"),
            "unexpected error: {error}"
        );
    }
}
