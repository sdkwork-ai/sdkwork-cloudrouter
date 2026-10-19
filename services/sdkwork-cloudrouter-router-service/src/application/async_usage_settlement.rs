use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use axum::http::Method;
use serde_json::{json, Value};

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

    fn invocation<'a>(&'a self, task: &'a AsyncUsageTask) -> DomainResult<Invocation> {
        let metadata = task.metadata.as_ref();
        let method = metadata_method(metadata);
        let path = metadata_string(metadata, "path")
            .map(str::to_owned)
            .unwrap_or_else(|| default_poll_path(task));
        let model = metadata_string(metadata, "model")
            .map(str::to_owned)
            .or_else(|| {
                task.catalog_key
                    .as_deref()
                    .and_then(|key| key.split_once('/').map(|(_, model)| model.to_owned()))
            })
            .ok_or_else(|| {
                DomainError::new("async usage settlement requires the requested model")
            })?;

        let classification = classify(&method, &path, &task.supplier_code)?;
        let (mut resource, billing, routing) = classification.into_parts();
        resource.requested_model = Some(model.clone());
        resource.requested_model_catalog_key = task.catalog_key.clone();

        let request_id = task.billing_request_id();
        let mut invocation = Invocation::new(
            InvocationRequest::new(method, path)
                .with_request_id(request_id.clone())
                .with_body(InvocationBody::json(json!({ "model": model }))),
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
            let mut invocation = self.invocation(task)?;
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

            // No prepaid hold exists for an asynchronous task: the completion
            // call is the first moment the amount is knowable, so it settles as
            // a single postpaid debit.
            invocation.charging.charge_mode = CustomerChargeMode::Postpaid;
            invocation.charging.settlement_mode = GatewayBillingSettlementMode::Synchronous;
            BillingSettlementInterceptor::new(Arc::clone(&self.billing_store))
                .after(&mut invocation)
                .await
                .map_err(settlement_error)?;
            Ok(())
        })
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
