use std::sync::Arc;

use serde_json::Value;

use crate::application::{AsyncUsagePoll, AsyncUsagePollFuture, AsyncUsageTaskExecutor};
use crate::domain::{
    AsyncUsageTask, AsyncUsageTaskKind, DomainError, DomainResult, UpstreamAccountRoute,
};
use crate::ports::{
    AsyncPollRequest, AsyncUsagePollTransport, ProviderSecretResolver, UpstreamAccountRouteCatalog,
};

/// Polls a completed asynchronous upstream task through an injected transport.
///
/// The executor owns **status interpretation** only: it resolves the account
/// that created the task, resolves its credential, performs one authenticated
/// read of `metadata.pollPath`, and maps the provider status onto
/// `Pending` / `Completed` / `Failed`. HTTP, TLS, proxy, outbound policy and
/// response-size limits stay in the host's transport implementation, so this
/// path cannot diverge from the gateway's existing outbound security posture.
///
/// Batch kinds are deliberately not interpreted yet: their usage lives in a
/// result file per request, and pretending a batch object carries it would
/// settle a task with no billable usage. They return an error so the task stays
/// visible until result-file reconciliation lands (their creation routes remain
/// fail-closed at preflight).
pub struct ProviderAsyncUsageExecutor<C> {
    catalog: Arc<C>,
    transport: Arc<dyn AsyncUsagePollTransport>,
    secret_resolver: Option<Arc<dyn ProviderSecretResolver + Send + Sync>>,
}

impl<C> ProviderAsyncUsageExecutor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    pub fn new(catalog: Arc<C>, transport: Arc<dyn AsyncUsagePollTransport>) -> Self {
        Self {
            catalog,
            transport,
            secret_resolver: None,
        }
    }

    pub fn with_secret_resolver(
        mut self,
        resolver: Arc<dyn ProviderSecretResolver + Send + Sync>,
    ) -> Self {
        self.secret_resolver = Some(resolver);
        self
    }

    fn route_for(&self, task: &AsyncUsageTask) -> DomainResult<UpstreamAccountRoute> {
        self.catalog
            .shared_upstream_account_routes()
            .iter()
            .find(|route| {
                route.account_id == task.account_id
                    && route
                        .supplier_code
                        .eq_ignore_ascii_case(&task.supplier_code)
            })
            .cloned()
            .ok_or_else(|| {
                DomainError::new(format!(
                    "async usage poll cannot resolve upstream account {}/{}",
                    task.supplier_code, task.account_id
                ))
            })
    }
}

impl<C> AsyncUsageTaskExecutor for ProviderAsyncUsageExecutor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    fn poll<'a>(&'a self, task: &'a AsyncUsageTask) -> AsyncUsagePollFuture<'a> {
        Box::pin(async move {
            let path = poll_path(task)?;
            if matches!(
                task.task_kind,
                AsyncUsageTaskKind::OpenAiBatch | AsyncUsageTaskKind::AnthropicBatch
            ) {
                return Err(DomainError::new(
                    "batch usage reconciliation requires reading the result file and is not implemented",
                ));
            }
            let account = self.route_for(task)?;
            let secret = match (account.secret_ref.as_deref(), self.secret_resolver.as_deref()) {
                (Some(secret_ref), Some(resolver)) => {
                    Some(resolver.resolve_secret_value(secret_ref)?)
                }
                (Some(_), None) => {
                    return Err(DomainError::new(
                        "async usage poll requires a provider secret resolver for a credentialed account",
                    ))
                }
                (None, _) => None,
            };
            let response = self
                .transport
                .get(AsyncPollRequest {
                    supplier_code: account.supplier_code.clone(),
                    account_id: account.account_id,
                    region_code: account.region_code.clone(),
                    base_url: account.base_url.clone(),
                    auth_profile: account.auth_profile.clone(),
                    timeout_ms: account.timeout_ms,
                    secret_ref: account.secret_ref.clone(),
                    secret,
                    path,
                })
                .await?;
            interpret_poll(task, response.status_code, response.body)
        })
    }
}

fn poll_path(task: &AsyncUsageTask) -> DomainResult<String> {
    task.metadata
        .as_ref()
        .and_then(|metadata| metadata.get("pollPath"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|path| !path.is_empty())
        .map(str::to_owned)
        .ok_or_else(|| {
            DomainError::new(format!(
                "async usage task {} has no pollable path",
                task.upstream_id
            ))
        })
}

fn interpret_poll(
    task: &AsyncUsageTask,
    status_code: u16,
    body: Option<Value>,
) -> DomainResult<AsyncUsagePoll> {
    // A missing upstream object can never produce usage; anything transient is
    // retried on the next claim instead of being turned into a terminal state.
    if status_code == 404 {
        return Ok(AsyncUsagePoll::Failed(format!(
            "upstream task {} was not found",
            task.upstream_id
        )));
    }
    if status_code == 429 || status_code >= 500 {
        return Ok(AsyncUsagePoll::Pending);
    }
    if !(200..300).contains(&status_code) {
        return Err(DomainError::new(format!(
            "async usage poll for {} returned HTTP {status_code}",
            task.upstream_id
        )));
    }
    let body = body.ok_or_else(|| {
        DomainError::new(format!(
            "async usage poll for {} returned no JSON body",
            task.upstream_id
        ))
    })?;
    let status = body
        .get("status")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    match task.task_kind {
        AsyncUsageTaskKind::BackgroundResponse => match status.as_str() {
            "completed" => Ok(AsyncUsagePoll::Completed {
                usage_snapshot: body,
                billing_request_id: task.billing_request_id(),
            }),
            "failed" | "cancelled" | "incomplete" => Ok(AsyncUsagePoll::Failed(format!(
                "upstream response finished with status {status}"
            ))),
            _ => Ok(AsyncUsagePoll::Pending),
        },
        AsyncUsageTaskKind::ThreadRun => match status.as_str() {
            "completed" => Ok(AsyncUsagePoll::Completed {
                usage_snapshot: body,
                billing_request_id: task.billing_request_id(),
            }),
            // `requires_action` waits for submit_tool_outputs and is not terminal.
            "failed" | "cancelled" | "expired" => Ok(AsyncUsagePoll::Failed(format!(
                "upstream run finished with status {status}"
            ))),
            _ => Ok(AsyncUsagePoll::Pending),
        },
        AsyncUsageTaskKind::OpenAiBatch | AsyncUsageTaskKind::AnthropicBatch => {
            Err(DomainError::new(
                "batch usage reconciliation requires reading the result file and is not implemented",
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::AsyncUsageTaskStatus;
    use crate::infrastructure::InMemoryPricingCatalog;
    use crate::ports::AsyncPollResponse;
    use chrono::Utc;
    use std::sync::Mutex;

    #[derive(Default)]
    struct FakeTransport {
        response: Mutex<Option<AsyncPollResponse>>,
        paths: Mutex<Vec<String>>,
        secrets: Mutex<Vec<Option<String>>>,
    }

    impl FakeTransport {
        fn returning(status_code: u16, body: Value) -> Arc<Self> {
            Arc::new(Self {
                response: Mutex::new(Some(AsyncPollResponse {
                    status_code,
                    body: Some(body),
                })),
                ..Self::default()
            })
        }
    }

    impl AsyncUsagePollTransport for FakeTransport {
        fn get(&self, request: AsyncPollRequest) -> crate::ports::AsyncPollFuture<'_> {
            self.paths.lock().expect("paths").push(request.path);
            self.secrets.lock().expect("secrets").push(request.secret);
            let response =
                self.response
                    .lock()
                    .expect("response")
                    .clone()
                    .unwrap_or(AsyncPollResponse {
                        status_code: 500,
                        body: None,
                    });
            Box::pin(async move { Ok(response) })
        }
    }

    fn catalog() -> Arc<InMemoryPricingCatalog> {
        let mut catalog = InMemoryPricingCatalog::default();
        let mut route = UpstreamAccountRoute::new("openai", 3001);
        route.base_url = Some("https://api.openai.example".to_owned());
        catalog.add_upstream_account_route(route);
        Arc::new(catalog)
    }

    fn task(kind: AsyncUsageTaskKind) -> AsyncUsageTask {
        AsyncUsageTask {
            id: 1,
            uuid: "async-task-1".to_owned(),
            tenant_id: 10,
            organization_id: 20,
            user_id: Some(30),
            api_key_id: 100,
            request_id: "req-create".to_owned(),
            task_kind: kind,
            upstream_id: "up_1".to_owned(),
            catalog_key: Some("openai/gpt-4o".to_owned()),
            supplier_code: "openai".to_owned(),
            account_id: 3001,
            region_code: "global".to_owned(),
            task_status: AsyncUsageTaskStatus::Running,
            attempts: 1,
            next_poll_at: Utc::now(),
            billing_request_id: None,
            usage_snapshot: None,
            metadata: Some(serde_json::json!({
                "pollPath": "/v1/responses/resp_1",
                "model": "gpt-4o"
            })),
        }
    }

    #[tokio::test]
    async fn a_completed_background_response_is_ready_to_settle() {
        let transport = FakeTransport::returning(
            200,
            serde_json::json!({
                "id": "resp_1",
                "status": "completed",
                "usage": {"input_tokens": 10, "output_tokens": 5}
            }),
        );
        let executor = ProviderAsyncUsageExecutor::new(catalog(), transport.clone());
        let poll = executor
            .poll(&task(AsyncUsageTaskKind::BackgroundResponse))
            .await
            .expect("poll");

        match poll {
            AsyncUsagePoll::Completed {
                usage_snapshot,
                billing_request_id,
            } => {
                assert_eq!(
                    Some(10),
                    usage_snapshot
                        .pointer("/usage/input_tokens")
                        .and_then(Value::as_i64)
                );
                assert_eq!("async:background_response:up_1", billing_request_id);
            }
            other => panic!("expected completion, got {other:?}"),
        }
        assert_eq!(
            vec!["/v1/responses/resp_1".to_owned()],
            *transport.paths.lock().unwrap()
        );
    }

    #[tokio::test]
    async fn running_states_stay_pending() {
        for status in ["queued", "in_progress", "cancelling", "requires_action"] {
            let transport = FakeTransport::returning(200, serde_json::json!({"status": status}));
            let executor = ProviderAsyncUsageExecutor::new(catalog(), transport);
            assert_eq!(
                AsyncUsagePoll::Pending,
                executor
                    .poll(&task(AsyncUsageTaskKind::ThreadRun))
                    .await
                    .expect("poll"),
                "{status} must not be terminal"
            );
        }
    }

    #[tokio::test]
    async fn terminal_failures_never_charge() {
        for status in ["failed", "cancelled", "incomplete"] {
            let transport = FakeTransport::returning(200, serde_json::json!({"status": status}));
            let executor = ProviderAsyncUsageExecutor::new(catalog(), transport);
            assert!(
                matches!(
                    executor
                        .poll(&task(AsyncUsageTaskKind::BackgroundResponse))
                        .await
                        .expect("poll"),
                    AsyncUsagePoll::Failed(_)
                ),
                "{status} must be terminal failure"
            );
        }
    }

    #[tokio::test]
    async fn transient_upstream_errors_stay_pending_and_missing_tasks_fail() {
        for status_code in [429u16, 500, 503] {
            let transport =
                FakeTransport::returning(status_code, serde_json::json!({"error": "busy"}));
            let executor = ProviderAsyncUsageExecutor::new(catalog(), transport);
            assert_eq!(
                AsyncUsagePoll::Pending,
                executor
                    .poll(&task(AsyncUsageTaskKind::BackgroundResponse))
                    .await
                    .expect("poll")
            );
        }
        let transport = FakeTransport::returning(404, serde_json::json!({"error": "missing"}));
        let executor = ProviderAsyncUsageExecutor::new(catalog(), transport);
        assert!(matches!(
            executor
                .poll(&task(AsyncUsageTaskKind::BackgroundResponse))
                .await
                .expect("poll"),
            AsyncUsagePoll::Failed(_)
        ));
    }

    #[tokio::test]
    async fn a_task_without_a_poll_path_fails_closed() {
        let transport = FakeTransport::returning(200, serde_json::json!({"status": "completed"}));
        let executor = ProviderAsyncUsageExecutor::new(catalog(), transport);
        let mut task = task(AsyncUsageTaskKind::BackgroundResponse);
        task.metadata = Some(serde_json::json!({"model": "gpt-4o"}));

        let error = executor.poll(&task).await.expect_err("no poll path");
        assert!(error.to_string().contains("no pollable path"), "{error}");
    }

    #[tokio::test]
    async fn an_unknown_account_fails_closed() {
        let transport = FakeTransport::returning(200, serde_json::json!({"status": "completed"}));
        let executor = ProviderAsyncUsageExecutor::new(catalog(), transport);
        let mut task = task(AsyncUsageTaskKind::BackgroundResponse);
        task.account_id = 9999;

        let error = executor.poll(&task).await.expect_err("unknown account");
        assert!(
            error
                .to_string()
                .contains("cannot resolve upstream account"),
            "{error}"
        );
    }

    #[tokio::test]
    async fn batch_kinds_are_not_interpreted_yet() {
        let transport = FakeTransport::returning(200, serde_json::json!({"status": "completed"}));
        let executor = ProviderAsyncUsageExecutor::new(catalog(), transport);
        let error = executor
            .poll(&task(AsyncUsageTaskKind::OpenAiBatch))
            .await
            .expect_err("batch is not implemented");
        assert!(error.to_string().contains("result file"), "{error}");
    }
}
