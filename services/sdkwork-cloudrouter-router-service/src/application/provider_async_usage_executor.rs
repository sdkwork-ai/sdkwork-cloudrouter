use std::sync::Arc;

use serde_json::{json, Value};

use super::invocation::{sum_anthropic_batch_usage, sum_openai_batch_usage, BatchUsageBucket};
use crate::application::{AsyncUsagePoll, AsyncUsagePollFuture, AsyncUsageTaskExecutor};
use crate::domain::{
    AsyncUsageTask, AsyncUsageTaskKind, DomainError, DomainResult, UpstreamAccountRoute,
};
use crate::ports::{
    AsyncPollRequest, AsyncPollResponse, AsyncUsagePollTransport, ProviderSecretResolver,
    UpstreamAccountRouteCatalog,
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
/// Batch kinds are interpreted in two steps: the batch object says whether the
/// job finished and where its result file lives, and the result file (JSONL)
/// carries the per-request token usage. A batch is only `Completed` once its
/// result file has been read and aggregated; a batch object alone never carries
/// billable usage.
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

    fn resolve_secret(&self, account: &UpstreamAccountRoute) -> DomainResult<Option<String>> {
        match (
            account.secret_ref.as_deref(),
            self.secret_resolver.as_deref(),
        ) {
            (Some(secret_ref), Some(resolver)) => {
                Ok(Some(resolver.resolve_secret_value(secret_ref)?))
            }
            (Some(_), None) => Err(DomainError::new(
                "async usage poll requires a provider secret resolver for a credentialed account",
            )),
            (None, _) => Ok(None),
        }
    }

    async fn get(
        &self,
        account: &UpstreamAccountRoute,
        secret: Option<String>,
        path: String,
    ) -> DomainResult<AsyncPollResponse> {
        self.transport
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
            .await
    }

    async fn poll_openai_batch(
        &self,
        task: &AsyncUsageTask,
        account: &UpstreamAccountRoute,
        secret: Option<String>,
        response: AsyncPollResponse,
    ) -> DomainResult<AsyncUsagePoll> {
        if let Some(poll) = transport_terminal_poll(task, response.status_code) {
            return Ok(poll);
        }
        require_success(&task.upstream_id, response.status_code, "batch status")?;
        let body = response.body.ok_or_else(|| {
            DomainError::new(format!(
                "batch poll for {} returned no JSON body",
                task.upstream_id
            ))
        })?;
        let status = body
            .get("status")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase();
        match status.as_str() {
            "completed" => {}
            "failed" | "expired" | "cancelled" => {
                return Ok(AsyncUsagePoll::Failed(format!(
                    "batch finished with status {status}"
                )))
            }
            _ => return Ok(AsyncUsagePoll::Pending),
        }
        let output_file_id = body
            .get("output_file_id")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|id| !id.is_empty())
            .ok_or_else(|| {
                DomainError::new(format!(
                    "completed batch {} has no output file to reconcile",
                    task.upstream_id
                ))
            })?;
        let file = self
            .get(
                account,
                secret,
                format!("/v1/files/{output_file_id}/content"),
            )
            .await?;
        if let Some(poll) = transport_terminal_poll(task, file.status_code) {
            return Ok(poll);
        }
        require_success(&task.upstream_id, file.status_code, "batch result file")?;
        let bytes = file.body_bytes.ok_or_else(|| {
            DomainError::new(format!(
                "batch result file for {} returned no bytes",
                task.upstream_id
            ))
        })?;
        completed_batch_poll(task, sum_openai_batch_usage(&bytes)?)
    }

    async fn poll_anthropic_batch(
        &self,
        task: &AsyncUsageTask,
        account: &UpstreamAccountRoute,
        secret: Option<String>,
        response: AsyncPollResponse,
    ) -> DomainResult<AsyncUsagePoll> {
        if let Some(poll) = transport_terminal_poll(task, response.status_code) {
            return Ok(poll);
        }
        require_success(&task.upstream_id, response.status_code, "batch status")?;
        let body = response.body.ok_or_else(|| {
            DomainError::new(format!(
                "batch poll for {} returned no JSON body",
                task.upstream_id
            ))
        })?;
        let status = body
            .get("processing_status")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase();
        match status.as_str() {
            "ended" => {}
            "in_progress" | "canceling" => return Ok(AsyncUsagePoll::Pending),
            other => {
                return Err(DomainError::new(format!(
                    "anthropic batch {} reported unsupported processing_status {other:?}",
                    task.upstream_id
                )))
            }
        }
        let results_url = body
            .get("results_url")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|url| !url.is_empty())
            .ok_or_else(|| {
                DomainError::new(format!(
                    "ended anthropic batch {} has no results_url",
                    task.upstream_id
                ))
            })?;
        let file = self
            .get(account, secret, path_from_url(results_url))
            .await?;
        if let Some(poll) = transport_terminal_poll(task, file.status_code) {
            return Ok(poll);
        }
        require_success(&task.upstream_id, file.status_code, "batch result file")?;
        let bytes = file.body_bytes.ok_or_else(|| {
            DomainError::new(format!(
                "batch result file for {} returned no bytes",
                task.upstream_id
            ))
        })?;
        completed_batch_poll(task, sum_anthropic_batch_usage(&bytes)?)
    }
}

fn transport_terminal_poll(task: &AsyncUsageTask, status_code: u16) -> Option<AsyncUsagePoll> {
    match status_code {
        404 => Some(AsyncUsagePoll::Failed(format!(
            "upstream task {} was not found",
            task.upstream_id
        ))),
        429 | 500..=599 => Some(AsyncUsagePoll::Pending),
        _ => None,
    }
}

fn require_success(upstream_id: &str, status_code: u16, what: &str) -> DomainResult<()> {
    if (200..300).contains(&status_code) {
        Ok(())
    } else {
        Err(DomainError::new(format!(
            "async usage poll for {upstream_id} read the {what} and got HTTP {status_code}"
        )))
    }
}

/// Strips scheme and host so an absolute provider URL can go through the
/// account-scoped transport, which always targets the account's own base URL.
fn path_from_url(url: &str) -> String {
    match url.split_once("://") {
        Some((_, rest)) => match rest.find('/') {
            Some(index) => rest[index..].to_owned(),
            None => "/".to_owned(),
        },
        None => url.to_owned(),
    }
}

fn completed_batch_poll(
    task: &AsyncUsageTask,
    buckets: Vec<BatchUsageBucket>,
) -> DomainResult<AsyncUsagePoll> {
    let billable = buckets
        .iter()
        .any(|bucket| bucket.totals.input_tokens > 0 || bucket.totals.output_tokens > 0);
    if !billable {
        // Every request failed: there is nothing to charge, and completing the
        // task with no usage would only make the settler retry forever.
        return Ok(AsyncUsagePoll::Failed(format!(
            "batch {} finished without any billable request",
            task.upstream_id
        )));
    }
    let rows: Vec<Value> = buckets
        .into_iter()
        .map(|bucket| {
            json!({
                "model": bucket.model,
                "kind": bucket.kind.as_str(),
                "requestCount": bucket.totals.request_count,
                "inputTokens": bucket.totals.input_tokens,
                "outputTokens": bucket.totals.output_tokens,
            })
        })
        .collect();
    Ok(AsyncUsagePoll::Completed {
        usage_snapshot: json!({ "batchUsage": rows }),
        billing_request_id: task.billing_request_id(),
    })
}

impl<C> AsyncUsageTaskExecutor for ProviderAsyncUsageExecutor<C>
where
    C: UpstreamAccountRouteCatalog + Send + Sync + 'static,
{
    fn poll<'a>(&'a self, task: &'a AsyncUsageTask) -> AsyncUsagePollFuture<'a> {
        Box::pin(async move {
            let path = poll_path(task)?;
            let account = self.route_for(task)?;
            let secret = self.resolve_secret(&account)?;
            let response = self.get(&account, secret.clone(), path).await?;
            match task.task_kind {
                AsyncUsageTaskKind::OpenAiBatch => {
                    self.poll_openai_batch(task, &account, secret, response)
                        .await
                }
                AsyncUsageTaskKind::AnthropicBatch => {
                    self.poll_anthropic_batch(task, &account, secret, response)
                        .await
                }
                _ => interpret_poll(task, response.status_code, response.body),
            }
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
        responses: Mutex<Vec<AsyncPollResponse>>,
        paths: Mutex<Vec<String>>,
        secrets: Mutex<Vec<Option<String>>>,
    }

    impl FakeTransport {
        fn returning(status_code: u16, body: Value) -> Arc<Self> {
            Arc::new(Self {
                responses: Mutex::new(vec![AsyncPollResponse {
                    status_code,
                    body: Some(body),
                    body_bytes: None,
                }]),
                ..Self::default()
            })
        }

        fn sequence(responses: Vec<AsyncPollResponse>) -> Arc<Self> {
            Arc::new(Self {
                responses: Mutex::new(responses),
                ..Self::default()
            })
        }
    }

    impl AsyncUsagePollTransport for FakeTransport {
        fn get(&self, request: AsyncPollRequest) -> crate::ports::AsyncPollFuture<'_> {
            self.paths.lock().expect("paths").push(request.path);
            self.secrets.lock().expect("secrets").push(request.secret);
            let mut responses = self.responses.lock().expect("responses");
            let response = if responses.is_empty() {
                AsyncPollResponse {
                    status_code: 500,
                    body: None,
                    body_bytes: None,
                }
            } else {
                responses.remove(0)
            };
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
    async fn a_completed_batch_downloads_and_aggregates_its_result_file() {
        let jsonl = br#"{"custom_id":"a","response":{"status_code":200,"body":{"model":"gpt-4o","object":"chat.completion","usage":{"prompt_tokens":100,"completion_tokens":50}}},"error":null}
{"custom_id":"b","response":{"status_code":200,"body":{"model":"gpt-4o","object":"chat.completion","usage":{"prompt_tokens":10,"completion_tokens":5}}},"error":null}
"#;
        let transport = FakeTransport::sequence(vec![
            AsyncPollResponse {
                status_code: 200,
                body: Some(serde_json::json!({
                    "id": "batch_1",
                    "status": "completed",
                    "output_file_id": "file_1"
                })),
                body_bytes: None,
            },
            AsyncPollResponse {
                status_code: 200,
                body: None,
                body_bytes: Some(jsonl.to_vec()),
            },
        ]);
        let executor = ProviderAsyncUsageExecutor::new(catalog(), transport.clone());
        let mut task = task(AsyncUsageTaskKind::OpenAiBatch);
        task.metadata = Some(serde_json::json!({
            "pollPath": "/v1/batches/batch_1",
            "model": "gpt-4o"
        }));

        let poll = executor.poll(&task).await.expect("poll");
        match poll {
            AsyncUsagePoll::Completed {
                usage_snapshot,
                billing_request_id,
            } => {
                assert_eq!("async:openai_batch:up_1", billing_request_id);
                let row = &usage_snapshot["batchUsage"][0];
                assert_eq!("gpt-4o", row["model"]);
                assert_eq!("chat.completion", row["kind"]);
                assert_eq!(2, row["requestCount"]);
                assert_eq!(110, row["inputTokens"]);
                assert_eq!(55, row["outputTokens"]);
            }
            other => panic!("expected completion, got {other:?}"),
        }
        assert_eq!(
            vec![
                "/v1/batches/batch_1".to_owned(),
                "/v1/files/file_1/content".to_owned()
            ],
            *transport.paths.lock().unwrap(),
            "the result file must be read through the same account transport"
        );
    }

    #[tokio::test]
    async fn a_batch_whose_every_request_failed_is_terminal_without_charging() {
        let jsonl = br#"{"custom_id":"a","response":{"status_code":500,"body":null},"error":{"message":"boom"}}
"#;
        let transport = FakeTransport::sequence(vec![
            AsyncPollResponse {
                status_code: 200,
                body: Some(serde_json::json!({
                    "id": "batch_1",
                    "status": "completed",
                    "output_file_id": "file_1"
                })),
                body_bytes: None,
            },
            AsyncPollResponse {
                status_code: 200,
                body: None,
                body_bytes: Some(jsonl.to_vec()),
            },
        ]);
        let executor = ProviderAsyncUsageExecutor::new(catalog(), transport);
        let mut task = task(AsyncUsageTaskKind::OpenAiBatch);
        task.metadata = Some(serde_json::json!({"pollPath": "/v1/batches/batch_1"}));

        assert!(matches!(
            executor.poll(&task).await.expect("poll"),
            AsyncUsagePoll::Failed(_)
        ));
    }

    #[tokio::test]
    async fn a_running_batch_stays_pending_and_a_failed_batch_is_terminal() {
        let transport = FakeTransport::returning(
            200,
            serde_json::json!({"status": "in_progress", "output_file_id": null}),
        );
        let executor = ProviderAsyncUsageExecutor::new(catalog(), transport);
        let mut task = task(AsyncUsageTaskKind::OpenAiBatch);
        task.metadata = Some(serde_json::json!({"pollPath": "/v1/batches/batch_1"}));
        assert_eq!(
            AsyncUsagePoll::Pending,
            executor.poll(&task).await.expect("poll")
        );

        let transport = FakeTransport::returning(200, serde_json::json!({"status": "failed"}));
        let executor = ProviderAsyncUsageExecutor::new(catalog(), transport);
        assert!(matches!(
            executor.poll(&task).await.expect("poll"),
            AsyncUsagePoll::Failed(_)
        ));
    }
}
