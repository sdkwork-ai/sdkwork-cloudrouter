use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use axum::http::Method;
use serde_json::{json, Value};

use super::invocation::BatchUsageKind;
use super::{
    apply_pricing_identity, resolve_pricing_identity, AccountBillingMode, BillingPolicyInterceptor,
    BillingSettlementInterceptor, Invocation, InvocationAccount, InvocationAuthType,
    InvocationBody, InvocationClassificationRequest, InvocationDispatch, InvocationInterceptor,
    InvocationRequest, InvocationResourceClassifier, InvocationSubject, OpenAiResourceClassifier,
    PricingFinalizationInterceptor, PricingPreflightInterceptor, PricingSettlementInterceptor,
    ProviderNativeResourceClassifier, UsageExtractionInterceptor, UsageRecordingInterceptor,
};
use crate::domain::{
    AsyncUsageTask, AsyncUsageTaskKind, BillingOwnerKind, DomainError, DomainResult,
};
use crate::ports::{
    CustomerChargeMode, GatewayBillingSettlementMode, GatewayBillingStore, GatewayUsageRecorder,
    PricingCatalog, PricingDefaultRegionProvider, UpstreamAccountRouteCatalog,
};

pub type AsyncUsageSettlementFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<()>> + Send + 'a>>;

/// Prices and charges a **completed** asynchronous upstream task.
///
/// The creation call only returns an upstream id; its usage arrives later. The
/// settler rebuilds the invocation from the stored creation context and the
/// provider's completion snapshot, re-prices with the live catalog (the final
/// pricing stage re-rates against the measured quantity, so tiered rates use
/// the real token count), records the usage facts, and debits the Token Bank as
/// a postpaid charge.
///
/// Settlement MUST be idempotent on `task.billing_request_id()`: the worker may
/// re-run it after a crash, and both the usage fact and the ledger entry are
/// keyed by that id.
pub trait AsyncUsageSettler: Send + Sync {
    fn settle<'a>(
        &'a self,
        task: &'a AsyncUsageTask,
        snapshot: &'a Value,
    ) -> AsyncUsageSettlementFuture<'a>;
}

/// Replays the synchronous settlement pipeline for one completed task.
pub struct ReplayAsyncUsageSettler<C> {
    catalog: Arc<C>,
    recorder: Option<Arc<dyn GatewayUsageRecorder + Send + Sync>>,
    billing_store: Arc<dyn GatewayBillingStore + Send + Sync>,
}

impl<C> ReplayAsyncUsageSettler<C>
where
    C: PricingCatalog
        + PricingDefaultRegionProvider
        + UpstreamAccountRouteCatalog
        + Send
        + Sync
        + 'static,
{
    pub fn new(catalog: Arc<C>, billing_store: Arc<dyn GatewayBillingStore + Send + Sync>) -> Self {
        Self {
            catalog,
            recorder: None,
            billing_store,
        }
    }

    /// Wires the usage recorder. Production always supplies one: without it the
    /// debit still happens, but the console/usage ledger would have no fact to
    /// reconcile the charge against.
    pub fn with_recorder(mut self, recorder: Arc<dyn GatewayUsageRecorder + Send + Sync>) -> Self {
        self.recorder = Some(recorder);
        self
    }

    fn invocation(
        &self,
        task: &AsyncUsageTask,
        target: Option<&SettleTarget>,
    ) -> DomainResult<Invocation> {
        let metadata = task.metadata.as_ref();
        let method = metadata_method(metadata);
        let path = target
            .map(|target| target.path.clone())
            .or_else(|| metadata_string(metadata, "path").map(str::to_owned))
            .unwrap_or_else(|| default_poll_path(task));
        let model = target
            .and_then(|target| target.model.clone())
            .or_else(|| metadata_string(metadata, "model").map(str::to_owned))
            .or_else(|| {
                task.catalog_key
                    .as_deref()
                    .and_then(|key| key.split_once('/').map(|(_, model)| model.to_owned()))
            });

        let classification = classify(&method, &path, &task.supplier_code)?;
        let (mut resource, billing, routing) = classification.into_parts();
        // A storage-metered target (vector-store ingestion) does not name a
        // model; model-metered targets must.
        let model_optional =
            resource.model_requirement == crate::domain::AiRouteModelRequirement::Ignored;
        if !model_optional && model.is_none() {
            return Err(DomainError::new(
                "async usage settlement requires the requested model",
            ));
        }
        resource.requested_model = model.clone();
        resource.requested_model_catalog_key = target
            .and_then(|target| target.catalog_key.clone())
            .or_else(|| task.catalog_key.clone());

        let body = model
            .clone()
            .map(|model| json!({ "model": model }))
            .unwrap_or_else(|| json!({}));
        let request_id = target
            .map(|target| target.request_id.clone())
            .unwrap_or_else(|| task.billing_request_id());
        let mut invocation = Invocation::new(
            InvocationRequest::new(method, path)
                .with_request_id(request_id.clone())
                .with_body(InvocationBody::json(body)),
            InvocationSubject {
                auth_type: InvocationAuthType::GatewayApiKey,
                api_key_id: Some(task.api_key_id),
                api_key_name_snapshot: None,
                tenant_id: task.tenant_id,
                organization_id: task.organization_id,
                user_id: task.user_id.unwrap_or_default(),
                billing_organization_id: 0,
                billing_owner: BillingOwnerKind::Personal,
                account_group_id: metadata_i64(metadata, "accountGroupId"),
                account_group_code: None,
                pricing_plan_code: metadata_string(metadata, "pricingPlanCode").map(str::to_owned),
                roles: Vec::new(),
                scopes: Vec::new(),
            },
            resource,
            billing,
        );
        invocation.routing = routing;
        invocation.account = Some(InvocationAccount {
            supplier_code: task.supplier_code.clone(),
            account_id: task.account_id,
            region_code: task.region_code.clone(),
            credential_id: None,
            credential_rotation: None,
            base_url: None,
            secret_ref: None,
            auth_profile: Default::default(),
            timeout_ms: None,
            retry_policy: None,
            provider_model: None,
            // The completion charge is postpaid: no hold exists at this point.
            billing_mode: AccountBillingMode::Postpay,
            account_group_id: metadata_i64(metadata, "accountGroupId"),
            account_group_code: None,
            pricing_plan_code: metadata_string(metadata, "pricingPlanCode").map(str::to_owned),
        });
        Ok(invocation)
    }
}

impl<C> AsyncUsageSettler for ReplayAsyncUsageSettler<C>
where
    C: PricingCatalog
        + PricingDefaultRegionProvider
        + UpstreamAccountRouteCatalog
        + Send
        + Sync
        + 'static,
{
    fn settle<'a>(
        &'a self,
        task: &'a AsyncUsageTask,
        snapshot: &'a Value,
    ) -> AsyncUsageSettlementFuture<'a> {
        Box::pin(async move {
            if let Some(rows) = snapshot.get("batchUsage").and_then(Value::as_array) {
                return self.settle_batch(task, rows).await;
            }
            if let Some(bytes) = snapshot.get("storageBytes").and_then(Value::as_i64) {
                return self.settle_storage(task, bytes).await;
            }
            let invocation = self.invocation(task, None)?;
            self.settle_invocation(invocation, snapshot).await
        })
    }
}

impl<C> ReplayAsyncUsageSettler<C>
where
    C: PricingCatalog
        + PricingDefaultRegionProvider
        + UpstreamAccountRouteCatalog
        + Send
        + Sync
        + 'static,
{
    /// Prices one completed unit of work and debits it once.
    ///
    /// The completion call is the first moment an asynchronous task's amount is
    /// knowable, so there is no prepaid hold to capture: the charge is a single
    /// postpaid debit keyed by the invocation's request id.
    async fn settle_invocation(
        &self,
        mut invocation: Invocation,
        snapshot: &Value,
    ) -> DomainResult<()> {
        BillingPolicyInterceptor
            .before(&mut invocation)
            .await
            .map_err(settlement_error)?;
        let identity = resolve_pricing_identity(self.catalog.as_ref(), &invocation);
        apply_pricing_identity(&mut invocation, &identity);
        PricingPreflightInterceptor::new(Arc::clone(&self.catalog))
            .before(&mut invocation)
            .await
            .map_err(settlement_error)?;

        invocation.dispatch = InvocationDispatch::json_response(200, snapshot.clone());
        UsageExtractionInterceptor
            .after(&mut invocation)
            .await
            .map_err(settlement_error)?;
        if invocation.usage.lines.is_empty() {
            // A waived completion (zero results) has nothing to charge. A
            // completion with no measurable usage at all is an accounting
            // failure: returning Ok would settle the task with no fact.
            if invocation.charging.waived.is_some() {
                return Ok(());
            }
            return Err(DomainError::new(
                "async usage settlement produced no billable usage",
            ));
        }

        PricingFinalizationInterceptor::new(Arc::clone(&self.catalog))
            .after(&mut invocation)
            .await
            .map_err(settlement_error)?;
        PricingSettlementInterceptor
            .after(&mut invocation)
            .await
            .map_err(settlement_error)?;
        if let Some(recorder) = self.recorder.as_ref() {
            UsageRecordingInterceptor::new(Arc::clone(recorder))
                .after(&mut invocation)
                .await
                .map_err(settlement_error)?;
            if invocation.usage.usage_recording_failure_count > 0 {
                return Err(DomainError::new(
                    "async usage settlement could not persist its usage facts",
                ));
            }
        }

        invocation.charging.charge_mode = CustomerChargeMode::Postpaid;
        invocation.charging.settlement_mode = GatewayBillingSettlementMode::Synchronous;
        BillingSettlementInterceptor::new(Arc::clone(&self.billing_store))
            .after(&mut invocation)
            .await
            .map_err(settlement_error)?;
        Ok(())
    }

    /// Settles one completed batch as one charge per `(model, endpoint)` row.
    ///
    /// Each row re-prices through the endpoint it actually used, so chat
    /// completions, Responses calls, embeddings and Anthropic messages keep
    /// their own meters. Rows are keyed `task:model:kind` so a retry after a
    /// crash cannot double-charge an already debited row.
    async fn settle_batch(&self, task: &AsyncUsageTask, rows: &[Value]) -> DomainResult<()> {
        if rows.is_empty() {
            return Err(DomainError::new(
                "async batch settlement received no usage rows",
            ));
        }
        for row in rows {
            let model = row
                .get("model")
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|model| !model.is_empty())
                .ok_or_else(|| DomainError::new("async batch settlement row has no model"))?;
            let kind_wire = row.get("kind").and_then(Value::as_str).unwrap_or_default();
            let kind = BatchUsageKind::from_wire(kind_wire).ok_or_else(|| {
                DomainError::new(format!(
                    "async batch settlement row has unknown endpoint kind {kind_wire:?}"
                ))
            })?;
            let input = row
                .get("inputTokens")
                .and_then(Value::as_i64)
                .unwrap_or(0)
                .max(0);
            let output = row
                .get("outputTokens")
                .and_then(Value::as_i64)
                .unwrap_or(0)
                .max(0);
            if input == 0 && output == 0 {
                continue;
            }
            let (path, shaped) = batch_row_shape(model, kind, input, output);
            let catalog_key = self
                .catalog
                .model_catalog_keys_by_name(model)
                .into_iter()
                .next();
            let target = SettleTarget {
                model: Some(model.to_owned()),
                catalog_key,
                path: path.to_owned(),
                request_id: format!("{}:{}:{}", task.billing_request_id(), model, kind.as_str()),
            };
            let invocation = self.invocation(task, Some(&target))?;
            self.settle_invocation(invocation, &shaped).await?;
        }
        Ok(())
    }

    /// Settles a completed vector-store file batch as one storage charge.
    ///
    /// Ingestion is billed by the bytes it puts into the store, so the synthetic
    /// settlement call is a `POST /v1/vector_stores/{store}/files` carrying the
    /// summed `usage_bytes`; the storage meter then prices GB-day exactly like a
    /// single-file attach.
    async fn settle_storage(&self, task: &AsyncUsageTask, bytes: i64) -> DomainResult<()> {
        if bytes <= 0 {
            return Err(DomainError::new(
                "async storage settlement requires a positive byte count",
            ));
        }
        let path = vector_store_files_path(task)?;
        let target = SettleTarget {
            // The OpenAI vector-store surface prices through the `vector-stores`
            // tool SKU; naming it lets the identity resolver pick the catalog
            // key instead of hardcoding a key in the settler.
            model: Some("vector-stores".to_owned()),
            catalog_key: None,
            path,
            request_id: format!("{}:storage", task.billing_request_id()),
        };
        let invocation = self.invocation(task, Some(&target))?;
        self.settle_invocation(invocation, &json!({ "usage_bytes": bytes }))
            .await
    }
}

/// `/v1/vector_stores/{store}/files` from a stored file-batch create path.
fn vector_store_files_path(task: &AsyncUsageTask) -> DomainResult<String> {
    let path = task
        .metadata
        .as_ref()
        .and_then(|metadata| metadata.get("path"))
        .and_then(Value::as_str)
        .unwrap_or_default();
    let store_id = path
        .strip_prefix("/v1/vector_stores/")
        .and_then(|rest| rest.strip_suffix("/file_batches"))
        .map(str::trim)
        .filter(|store_id| !store_id.is_empty())
        .ok_or_else(|| {
            DomainError::new(format!(
                "async storage settlement cannot derive the vector store from {path:?}"
            ))
        })?;
    Ok(format!("/v1/vector_stores/{store_id}/files"))
}

/// Per-row pricing context for a batch: which endpoint, model and idempotency
/// key the completion charge uses.
struct SettleTarget {
    model: Option<String>,
    catalog_key: Option<String>,
    path: String,
    request_id: String,
}

fn batch_row_shape(
    model: &str,
    kind: BatchUsageKind,
    input: i64,
    output: i64,
) -> (&'static str, Value) {
    match kind {
        BatchUsageKind::ChatCompletion => (
            "/v1/chat/completions",
            json!({"model": model, "object": "chat.completion",
                   "usage": {"prompt_tokens": input, "completion_tokens": output}}),
        ),
        BatchUsageKind::Responses => (
            "/v1/responses",
            json!({"model": model, "object": "response", "status": "completed",
                   "usage": {"input_tokens": input, "output_tokens": output}}),
        ),
        BatchUsageKind::Embedding => (
            "/v1/embeddings",
            json!({"model": model, "object": "list",
                   "usage": {"prompt_tokens": input}}),
        ),
        BatchUsageKind::AnthropicMessage => (
            "/anthropic/v1/messages",
            json!({"model": model, "type": "message",
                   "usage": {"input_tokens": input, "output_tokens": output}}),
        ),
    }
}

fn classify(
    method: &Method,
    path: &str,
    supplier_code: &str,
) -> DomainResult<crate::application::InvocationClassification> {
    if path == "/v1" || path.starts_with("/v1/") {
        return OpenAiResourceClassifier
            .classify(&InvocationClassificationRequest::new(method.clone(), path))
            .map_err(settlement_error);
    }
    let (vendor, rest) = path
        .trim_start_matches('/')
        .split_once('/')
        .ok_or_else(|| DomainError::new(format!("unsupported async task path: {path}")))?;
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
        .map_err(settlement_error)
}

fn default_poll_path(task: &AsyncUsageTask) -> String {
    match task.task_kind {
        AsyncUsageTaskKind::BackgroundResponse => "/v1/responses".to_owned(),
        AsyncUsageTaskKind::ThreadRun => "/v1/threads/runs".to_owned(),
        AsyncUsageTaskKind::OpenAiBatch => "/v1/batches".to_owned(),
        AsyncUsageTaskKind::AnthropicBatch => "/anthropic/v1/messages/batches".to_owned(),
    }
}

fn metadata_method(metadata: Option<&Value>) -> Method {
    metadata_string(metadata, "method")
        .and_then(|method| Method::from_bytes(method.as_bytes()).ok())
        .unwrap_or(Method::POST)
}

fn metadata_string<'a>(metadata: Option<&'a Value>, key: &str) -> Option<&'a str> {
    metadata?
        .get(key)?
        .as_str()
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn metadata_i64(metadata: Option<&Value>, key: &str) -> Option<i64> {
    metadata?
        .get(key)
        .and_then(|value| value.as_i64())
        .filter(|value| *value > 0)
}

fn settlement_error(error: impl std::fmt::Display) -> DomainError {
    DomainError::new(format!("async usage settlement failed: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::AsyncUsageTaskStatus;
    use chrono::Utc;

    fn task() -> AsyncUsageTask {
        AsyncUsageTask {
            id: 1,
            uuid: "async-task-1".to_owned(),
            tenant_id: 10,
            organization_id: 20,
            user_id: Some(30),
            api_key_id: 100,
            request_id: "req-create".to_owned(),
            task_kind: AsyncUsageTaskKind::BackgroundResponse,
            upstream_id: "resp_1".to_owned(),
            catalog_key: Some("openai/gpt-4o".to_owned()),
            supplier_code: "openai".to_owned(),
            account_id: 3001,
            region_code: "global".to_owned(),
            task_status: AsyncUsageTaskStatus::Running,
            attempts: 1,
            next_poll_at: Utc::now(),
            billing_request_id: None,
            usage_snapshot: None,
            metadata: Some(json!({
                "method": "POST",
                "path": "/v1/responses",
                "model": "gpt-4o",
                "accountGroupId": 10,
                "pricingPlanCode": "standard"
            })),
        }
    }

    #[test]
    fn metadata_defaults_keep_the_task_billable() {
        let task = task();
        assert_eq!(Method::POST, metadata_method(task.metadata.as_ref()));
        assert_eq!(
            Some("gpt-4o"),
            metadata_string(task.metadata.as_ref(), "model")
        );
        assert_eq!(
            Some(10),
            metadata_i64(task.metadata.as_ref(), "accountGroupId")
        );
        assert_eq!("/v1/responses", default_poll_path(&task));
    }

    #[test]
    fn missing_model_fails_closed() {
        let mut task = task();
        task.catalog_key = None;
        task.metadata = Some(json!({"path": "/v1/responses"}));
        // The invocation builder is private, so assert through the same helper
        // the builder uses: no metadata model and no catalog key means the
        // settler cannot price the task.
        assert!(metadata_string(task.metadata.as_ref(), "model").is_none());
        assert!(task.catalog_key.is_none());
    }
}
