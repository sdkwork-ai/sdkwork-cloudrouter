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
        poll_query: Option<&str>,
    ) -> DomainResult<()> {
        let task = new_task_from_invocation(invocation, kind, upstream_id, poll_path, poll_query)?;
        self.store.enqueue(task).await
    }
}

fn new_task_from_invocation(
    invocation: &Invocation,
    kind: AsyncUsageTaskKind,
    upstream_id: &str,
    poll_path: Option<&str>,
    poll_query: Option<&str>,
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
            "pollQuery": poll_query,
            // The ordered media length, captured at create: some vendors' task
            // read carries no duration at all (Runway answers `output[]` URLs),
            // so completion settlement can only scale the requested length.
            "durationSeconds": media_duration_seconds(invocation, kind),
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
                    task.poll_query.as_deref(),
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
    /// Task parameter for vendors whose read is `GET <collection>?<param>=<id>`.
    poll_query: Option<String>,
}

/// Vector-store id from `POST /v1/vector_stores/{store}/file_batches`.
fn vector_store_file_batch_id(path: &str) -> Option<&str> {
    path.strip_prefix("/v1/vector_stores/")?
        .strip_suffix("/file_batches")
        .map(str::trim)
        .filter(|store_id| !store_id.is_empty())
}

/// Identifies a successful asynchronous create and its pollable read path.
///
/// `Ok(None)` means "not an asynchronous creation route" and is the common
/// case; `Err` means the route is asynchronous but the upstream response cannot
/// be reconciled (missing id / thread id), which must fail closed.
fn pending_async_task(
    invocation: &Invocation,
) -> Result<Option<PendingAsyncTask>, InvocationError> {
    if invocation.request.method != Method::POST {
        return Ok(None);
    }
    // No `settlement_required` gate here: a deferred create is deliberately
    // Free at creation (the charge happens at completion), so requiring a
    // settlement flag would skip registration and silently leave the call
    // unbilled. The match below is the only allow-list.
    let path = invocation.request.path.as_str();
    let api_code = invocation.resource.api_code.as_str();
    let kind = match (api_code, path) {
        ("openai.batches", "/v1/batches") => AsyncUsageTaskKind::OpenAiBatch,
        // `invocation.request.path` is the vendor-namespace-stripped standard
        // path (`/anthropic/v1/messages/batches` arrives as
        // `/v1/messages/batches`). Matching the published path here made the
        // Anthropic batch arm unreachable: creation was neither refused (the
        // pricing guard was fixed separately) nor registered, so a batch that
        // the gateway accepted was never reconciled and ran unbilled.
        ("anthropic.batches", "/v1/messages/batches") => AsyncUsageTaskKind::AnthropicBatch,
        ("openai.vector_stores", path) if vector_store_file_batch_id(path).is_some() => {
            // File-batch ingestion has no byte count in its create response; the
            // completion carries per-file usage_bytes, so it reconciles as an
            // OpenAiBatch-shaped task over the vector-store file objects.
            AsyncUsageTaskKind::OpenAiBatch
        }
        ("openai.responses", "/v1/responses") if background_requested(invocation) => {
            AsyncUsageTaskKind::BackgroundResponse
        }
        ("openai.threads", "/v1/threads/runs") => AsyncUsageTaskKind::ThreadRun,
        ("openai.threads", path) if path.starts_with("/v1/threads/") && path.ends_with("/runs") => {
            AsyncUsageTaskKind::ThreadRun
        }
        // Media generation: the create response carries only a task id; the
        // produced seconds/artifacts are known when the task completes. Kling
        // publishes the poll as `<create path>/{task_id}`.
        ("kling.text_to_video", "/v1/videos/generations")
        | ("kling.avatar", "/v1/videos/avatar")
        | ("kling.motion_control", "/v1/videos/motion-control") => AsyncUsageTaskKind::MediaTask,
        // Vidu answers `{task_id}` and publishes one task poll for every video
        // face (`/ent/v2/tasks/{id}/creations`), which carries the produced
        // `creations[].duration`.
        (
            "vidu.text_to_video"
            | "vidu.image_to_video"
            | "vidu.start_end_to_video"
            | "vidu.reference_to_video"
            | "vidu.motion_sync",
            "/ent/v2/text2video"
            | "/ent/v2/img2video"
            | "/ent/v2/start-end2video"
            | "/ent/v2/reference2video"
            | "/ent/v2/template",
        ) => AsyncUsageTaskKind::MediaTask,
        // Runway answers `{id, estimatedCost}` and publishes one task read for
        // every generation face (`/v1/tasks/{task_id}`).
        ("runway.text_to_video", "/v1/text_to_video")
        | ("runway.image_to_video", "/v1/image_to_video") => AsyncUsageTaskKind::MediaTask,
        // Luma answers `{id, state}` and polls the same path with the id.
        ("luma_ai.video_generation", "/dream-machine/v1/generations") => {
            AsyncUsageTaskKind::MediaTask
        }
        // PixVerse answers `{ErrCode, Resp:{video_id}}` and polls the dedicated
        // result read.
        ("pixverse.video_generation", "/openapi/v2/video/text/generate") => {
            AsyncUsageTaskKind::MediaTask
        }
        // MiniMax answers `{task_id, base_resp}` and reads the task from a
        // collection endpoint with the id as a query parameter.
        ("minimax.video_generation", "/v1/video_generation") => AsyncUsageTaskKind::MediaTask,
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
    let upstream_id = upstream_task_id(&body, kind).ok_or_else(|| {
        registration_error(format!("{api_code} create response carried no upstream id"))
    })?;

    let poll_path = match kind {
        AsyncUsageTaskKind::OpenAiBatch => match vector_store_file_batch_id(path) {
            Some(store_id) => format!("/v1/vector_stores/{store_id}/file_batches/{upstream_id}"),
            None => format!("/v1/batches/{upstream_id}"),
        },
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
        // The vendor publishes the poll as the create path plus the task id,
        // except for the vendors whose task read is a separate collection.
        AsyncUsageTaskKind::MediaTask => media_poll_path(path, &upstream_id),
    };
    Ok(Some(PendingAsyncTask {
        kind,
        poll_path: poll_path.clone(),
        poll_query: media_poll_query(&poll_path, &upstream_id),
        upstream_id,
    }))
}

/// Task parameter for vendors whose read is a collection plus a query parameter.
///
/// MiniMax exposes `GET /v1/query/video_generation?task_id=<id>`; a path-segment
/// poll would 404 and the task would expire uncharged. Every other media vendor
/// polls a path, so this stays `None` for them.
fn media_poll_query(poll_path: &str, upstream_id: &str) -> Option<String> {
    if poll_path == "/v1/query/video_generation" {
        return Some(format!("task_id={}", urlencode_query_value(upstream_id)));
    }
    None
}

fn urlencode_query_value(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    encoded
}

/// Ordered media length stated by the create request, for media tasks only.
fn media_duration_seconds(invocation: &Invocation, kind: AsyncUsageTaskKind) -> Option<String> {
    if kind != AsyncUsageTaskKind::MediaTask {
        return None;
    }
    match &invocation.request.body {
        crate::application::InvocationBody::Json(body) => {
            crate::application::invocation::requested_media_seconds(body)
        }
        _ => None,
    }
}

/// Poll path for a media task, per vendor layout.
///
/// Kling publishes `<create path>/{task_id}`; Vidu publishes one task read for
/// every video face (`/ent/v2/tasks/{task_id}/creations`). A vendor missing here
/// must not be registered at all — polling the wrong path would either 404 the
/// task or reconcile against another task's body.
fn media_poll_path(create_path: &str, upstream_id: &str) -> String {
    if create_path.starts_with("/ent/v2/") {
        return format!("/ent/v2/tasks/{upstream_id}/creations");
    }
    // MiniMax reads the task from a collection endpoint; the id travels in the
    // query string (see `media_poll_query`).
    if create_path == "/v1/video_generation" {
        return "/v1/query/video_generation".to_owned();
    }
    // Runway publishes one task read for every generation face.
    if create_path == "/v1/text_to_video" || create_path == "/v1/image_to_video" {
        return format!("/v1/tasks/{upstream_id}");
    }
    // PixVerse polls a dedicated result read keyed by the created video id.
    if create_path == "/openapi/v2/video/text/generate" {
        return format!("/openapi/v2/video/result/{upstream_id}");
    }
    format!("{create_path}/{upstream_id}")
}

/// Upstream task id of a create response.
///
/// OpenAI/Anthropic answer a top-level `id`; Kling nests it under `data` as
/// `task_id`. Reading only the top-level field left the Kling create
/// unregisterable — it then billed a single unit at create with no completion
/// reconciliation.
fn upstream_task_id(body: &Value, kind: AsyncUsageTaskKind) -> Option<String> {
    let pointers: &[&str] = if kind == AsyncUsageTaskKind::MediaTask {
        // PixVerse nests the task id in its response envelope; Luma/others use
        // the top-level spellings.
        &[
            "/data/task_id",
            "/data/id",
            "/task_id",
            "/Resp/video_id",
            "/id",
        ]
    } else {
        &["/id"]
    };
    pointers.iter().find_map(|pointer| {
        let value = body.pointer(pointer)?;
        // PixVerse answers a numeric `video_id`; every other create response
        // spells the id as a string.
        let id = value
            .as_str()
            .map(str::to_owned)
            .or_else(|| value.as_i64().map(|id| id.to_string()))?;
        let id = id.trim();
        (!id.is_empty()).then(|| id.to_owned())
    })
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
                None,
            )
            .await
            .expect("register");
        registrar
            .register(
                &invocation,
                AsyncUsageTaskKind::OpenAiBatch,
                "batch-1",
                Some("/v1/batches/batch-1"),
                None,
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
    async fn a_file_batch_create_registers_with_a_file_batch_poll_path() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let mut invocation = async_creation(
            "/v1/vector_stores/vs_1/file_batches",
            "openai.vector_stores",
            serde_json::json!({"file_ids": ["file_1"]}),
        );
        invocation.dispatch =
            InvocationDispatch::json_response(200, serde_json::json!({"id": "fb_1"}));

        AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
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
        assert_eq!("fb_1", claimed[0].upstream_id);
        assert_eq!(
            Some("/v1/vector_stores/vs_1/file_batches/fb_1"),
            claimed[0]
                .metadata
                .as_ref()
                .and_then(|metadata| metadata.get("pollPath"))
                .and_then(|value| value.as_str()),
            "the poll path must target the file-batch status route"
        );
        assert_eq!(
            Some("/v1/vector_stores/vs_1/file_batches"),
            claimed[0]
                .metadata
                .as_ref()
                .and_then(|metadata| metadata.get("path"))
                .and_then(|value| value.as_str())
        );
    }

    #[tokio::test]
    async fn registration_rejects_a_missing_upstream_id() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let registrar = AsyncUsageRegistrar::new(store);
        let error = registrar
            .register(
                &invocation(),
                AsyncUsageTaskKind::OpenAiBatch,
                "",
                None,
                None,
            )
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

    /// Anthropic batch creation must register against the namespace-stripped path
    /// the runtime actually stores on the invocation.
    ///
    /// Matching the published `/anthropic/v1/messages/batches` never fired in
    /// production, so an accepted batch was never reconciled — the submission was
    /// billed as nothing at all once asynchronous settlement was enabled.
    #[tokio::test]
    async fn registers_a_namespace_stripped_anthropic_batch_creation() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let mut invocation = async_creation(
            "/v1/messages/batches",
            "anthropic.batches",
            serde_json::json!({"requests": []}),
        );
        invocation.dispatch =
            InvocationDispatch::json_response(200, serde_json::json!({"id": "msgbatch_1"}));

        AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
            .await
            .expect("register");

        let task = registered_task(&store).await;
        assert_eq!(AsyncUsageTaskKind::AnthropicBatch, task.task_kind);
        assert_eq!("msgbatch_1", task.upstream_id);
    }

    /// A Kling media create carries its task id under `data` and is polled at
    /// `<create path>/{task_id}`; both are needed for completion reconciliation.
    #[tokio::test]
    async fn registers_a_kling_media_task_with_a_completion_poll_path() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let mut invocation = async_creation(
            "/v1/videos/generations",
            "kling.text_to_video",
            serde_json::json!({"model": "kling-v2", "prompt": "a cat", "duration": "5"}),
        );
        invocation.dispatch = InvocationDispatch::json_response(
            200,
            serde_json::json!({"code": 0, "data": {"task_id": "task_1"}}),
        );

        AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
            .await
            .expect("register");

        let task = registered_task(&store).await;
        assert_eq!(AsyncUsageTaskKind::MediaTask, task.task_kind);
        assert_eq!("task_1", task.upstream_id);
        assert_eq!(
            Some("/v1/videos/generations/task_1"),
            task.metadata
                .as_ref()
                .and_then(|metadata| metadata.get("pollPath"))
                .and_then(|value| value.as_str())
        );
    }

    /// Vidu publishes one task read for every video face, so the poll path is
    /// not the create path plus the id.
    #[tokio::test]
    async fn registers_a_vidu_media_task_with_the_shared_task_poll() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let mut invocation = async_creation(
            "/ent/v2/text2video",
            "vidu.text_to_video",
            serde_json::json!({"model": "viduq3", "prompt": "a cat", "duration": 5}),
        );
        invocation.dispatch =
            InvocationDispatch::json_response(200, serde_json::json!({"task_id": "task_9"}));

        AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
            .await
            .expect("register");

        let task = registered_task(&store).await;
        assert_eq!(AsyncUsageTaskKind::MediaTask, task.task_kind);
        assert_eq!("task_9", task.upstream_id);
        assert_eq!(
            Some("/ent/v2/tasks/task_9/creations"),
            task.metadata
                .as_ref()
                .and_then(|metadata| metadata.get("pollPath"))
                .and_then(|value| value.as_str())
        );
    }

    /// Runway's task read carries no duration, so registration must capture the
    /// ordered length from the create body.
    #[tokio::test]
    async fn registers_a_runway_media_task_with_the_ordered_duration() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let mut invocation = async_creation(
            "/v1/text_to_video",
            "runway.text_to_video",
            serde_json::json!({"model": "gen4.5", "promptText": "a cat", "duration": 10}),
        );
        invocation.dispatch = InvocationDispatch::json_response(
            200,
            serde_json::json!({"id": "task_11", "estimatedCost": 50}),
        );

        AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
            .await
            .expect("register");

        let task = registered_task(&store).await;
        assert_eq!(AsyncUsageTaskKind::MediaTask, task.task_kind);
        assert_eq!("task_11", task.upstream_id);
        let metadata = task.metadata.as_ref().expect("metadata");
        assert_eq!(
            Some("/v1/tasks/task_11"),
            metadata.get("pollPath").and_then(|value| value.as_str())
        );
        assert_eq!(
            Some("10"),
            metadata
                .get("durationSeconds")
                .and_then(|value| value.as_str())
        );
    }

    /// Luma polls the create path with the generation id.
    #[tokio::test]
    async fn registers_a_luma_media_task_polled_on_the_create_path() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let mut invocation = async_creation(
            "/dream-machine/v1/generations",
            "luma_ai.video_generation",
            serde_json::json!({"model": "ray-2", "prompt": "a cat", "duration": "5s"}),
        );
        invocation.dispatch =
            InvocationDispatch::json_response(200, serde_json::json!({"id": "gen_3"}));

        AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
            .await
            .expect("register");

        let task = registered_task(&store).await;
        assert_eq!(AsyncUsageTaskKind::MediaTask, task.task_kind);
        assert_eq!("gen_3", task.upstream_id);
        let metadata = task.metadata.as_ref().expect("metadata");
        assert_eq!(
            Some("/dream-machine/v1/generations/gen_3"),
            metadata.get("pollPath").and_then(|value| value.as_str())
        );
        // `"5s"` must be captured as a bare number for the completion charge.
        assert_eq!(
            Some("5"),
            metadata
                .get("durationSeconds")
                .and_then(|value| value.as_str())
        );
    }

    /// PixVerse nests the created video id in its response envelope.
    #[tokio::test]
    async fn registers_a_pixverse_media_task_from_the_envelope() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let mut invocation = async_creation(
            "/openapi/v2/video/text/generate",
            "pixverse.video_generation",
            serde_json::json!({"model": "v4", "prompt": "a cat", "duration": 5}),
        );
        invocation.dispatch = InvocationDispatch::json_response(
            200,
            serde_json::json!({"ErrCode": 0, "Resp": {"video_id": 7788}}),
        );

        AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
            .await
            .expect("register");

        let task = registered_task(&store).await;
        assert_eq!(AsyncUsageTaskKind::MediaTask, task.task_kind);
        assert_eq!("7788", task.upstream_id);
        assert_eq!(
            Some("/openapi/v2/video/result/7788"),
            task.metadata
                .as_ref()
                .and_then(|metadata| metadata.get("pollPath"))
                .and_then(|value| value.as_str())
        );
    }

    /// MiniMax reads the task from a collection endpoint with the id in the
    /// query string.
    #[tokio::test]
    async fn registers_a_minimax_media_task_with_a_query_poll() {
        let store = Arc::new(InMemoryAsyncUsageTaskStore::new());
        let mut invocation = async_creation(
            "/v1/video_generation",
            "minimax.video_generation",
            serde_json::json!({"model": "MiniMax-Hailuo-2.3", "prompt": "a cat", "duration": 6}),
        );
        invocation.dispatch = InvocationDispatch::json_response(
            200,
            serde_json::json!({"task_id": "task_42", "base_resp": {"status_code": 0}}),
        );

        AsyncUsageRegistrationInterceptor::new(store.clone())
            .after(&mut invocation)
            .await
            .expect("register");

        let task = registered_task(&store).await;
        assert_eq!(AsyncUsageTaskKind::MediaTask, task.task_kind);
        assert_eq!("task_42", task.upstream_id);
        let metadata = task.metadata.as_ref().expect("metadata");
        assert_eq!(
            Some("/v1/query/video_generation"),
            metadata.get("pollPath").and_then(|value| value.as_str())
        );
        assert_eq!(
            Some("task_id=task_42"),
            metadata.get("pollQuery").and_then(|value| value.as_str())
        );
        assert_eq!(
            Some("6"),
            metadata
                .get("durationSeconds")
                .and_then(|value| value.as_str())
        );
    }
}
