use std::fmt::{Debug, Formatter};
use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::Arc;

use axum::http::{HeaderMap, Method};
use tokio::sync::Notify;

use super::{
    InvocationAccount, InvocationBilling, InvocationBody, InvocationDispatch, InvocationResource,
    InvocationRouting, InvocationSubject, InvocationTelemetry, InvocationUsage, StickyRouting,
};
use crate::domain::AiRouteStrategy;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationId(pub String);

const INVOCATION_ACTIVE: u8 = 0;
const INVOCATION_TENANT_LEASE_LOST: u8 = 1;

/// Server-owned cancellation signal shared by the invocation pipeline and
/// streaming transport. The state is monotonic so a confirmed lease loss can
/// never be cleared by a transient recovery or a stale task.
#[derive(Clone, Default)]
pub struct InvocationCancellationSignal {
    inner: Arc<InvocationCancellationState>,
}

#[derive(Default)]
struct InvocationCancellationState {
    state: AtomicU8,
    changed: Notify,
}

impl InvocationCancellationSignal {
    pub fn is_tenant_lease_lost(&self) -> bool {
        self.inner.state.load(Ordering::Acquire) == INVOCATION_TENANT_LEASE_LOST
    }

    pub async fn wait_for_tenant_lease_loss(&self) {
        loop {
            if self.is_tenant_lease_lost() {
                return;
            }
            let changed = self.inner.changed.notified();
            tokio::pin!(changed);
            changed.as_mut().enable();
            if self.is_tenant_lease_lost() {
                return;
            }
            changed.await;
        }
    }

    pub(crate) fn mark_tenant_lease_lost(&self) -> bool {
        if self
            .inner
            .state
            .compare_exchange(
                INVOCATION_ACTIVE,
                INVOCATION_TENANT_LEASE_LOST,
                Ordering::AcqRel,
                Ordering::Acquire,
            )
            .is_ok()
        {
            self.inner.changed.notify_waiters();
            true
        } else {
            false
        }
    }
}

impl Debug for InvocationCancellationSignal {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("InvocationCancellationSignal")
            .field("tenant_lease_lost", &self.is_tenant_lease_lost())
            .finish()
    }
}

impl PartialEq for InvocationCancellationSignal {
    fn eq(&self, other: &Self) -> bool {
        self.is_tenant_lease_lost() == other.is_tenant_lease_lost()
    }
}

impl Eq for InvocationCancellationSignal {}

#[derive(Debug, Clone, PartialEq)]
pub struct InvocationRequest {
    pub method: Method,
    pub path: String,
    pub query: Option<String>,
    pub headers: HeaderMap,
    pub body: InvocationBody,
    pub content_type: Option<String>,
    pub user_agent: Option<String>,
    pub request_id: String,
    pub trace_id: Option<String>,
    pub idempotency_key: Option<String>,
    /// Ephemeral server-owned token used to conditionally complete or release
    /// the idempotency lease acquired for this invocation. It is never
    /// serialized to clients or emitted in logs.
    pub(crate) idempotency_owner_token: Option<String>,
    /// Ephemeral server-owned token for the tenant in-flight lease. Keeping
    /// ownership on the invocation avoids request-id collisions between
    /// concurrent callers and makes terminal release exactly-once.
    pub(crate) tenant_inflight_owner_token: Option<String>,
    cancellation_signal: InvocationCancellationSignal,
    pub client_ip: Option<String>,
}

impl InvocationRequest {
    pub fn new(method: Method, path: impl Into<String>) -> Self {
        let (path, query) = split_path_query(&path.into());
        Self {
            method,
            path,
            query,
            headers: HeaderMap::new(),
            body: InvocationBody::Empty,
            content_type: None,
            user_agent: None,
            request_id: String::new(),
            trace_id: None,
            idempotency_key: None,
            idempotency_owner_token: None,
            tenant_inflight_owner_token: None,
            cancellation_signal: InvocationCancellationSignal::default(),
            client_ip: None,
        }
    }

    pub fn with_request_id(mut self, request_id: impl Into<String>) -> Self {
        self.request_id = request_id.into();
        self
    }

    pub fn with_body(mut self, body: InvocationBody) -> Self {
        self.body = body;
        self
    }

    pub fn with_query(mut self, query: impl Into<String>) -> Self {
        let query = query.into();
        self.query = (!query.trim().is_empty()).then_some(query);
        self
    }

    pub fn cancellation_signal(&self) -> InvocationCancellationSignal {
        self.cancellation_signal.clone()
    }
}

#[cfg(test)]
mod cancellation_tests {
    use super::*;

    #[tokio::test]
    async fn cancellation_signal_is_monotonic_and_wakes_waiters() {
        let signal = InvocationCancellationSignal::default();
        let waiter = signal.clone();
        let task = tokio::spawn(async move { waiter.wait_for_tenant_lease_loss().await });

        assert!(signal.mark_tenant_lease_lost());
        assert!(!signal.mark_tenant_lease_lost());
        task.await.expect("lease-loss waiter must wake");
        assert!(signal.is_tenant_lease_lost());
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct Invocation {
    pub id: InvocationId,
    pub request: InvocationRequest,
    pub subject: InvocationSubject,
    pub resource: InvocationResource,
    pub billing: InvocationBilling,
    pub routing: InvocationRouting,
    pub account: Option<InvocationAccount>,
    pub dispatch: InvocationDispatch,
    pub usage: InvocationUsage,
    pub telemetry: InvocationTelemetry,
}

fn split_path_query(value: &str) -> (String, Option<String>) {
    let (path, query) = value
        .split_once('?')
        .map(|(path, query)| (path, Some(query.to_owned())))
        .unwrap_or((value, None));
    (
        normalize_path(path),
        query.filter(|query| !query.trim().is_empty()),
    )
}

fn normalize_path(value: &str) -> String {
    let value = value.trim();
    if value.is_empty() || value == "/" {
        return "/".to_owned();
    }
    format!("/{}", value.trim_matches('/'))
}

impl Invocation {
    pub fn new(
        request: InvocationRequest,
        subject: InvocationSubject,
        resource: InvocationResource,
        billing: InvocationBilling,
    ) -> Self {
        let routing = routing_from_resource(&resource);
        let id = InvocationId(request.request_id.clone());
        let trace_id = request.trace_id.clone();
        Self {
            id,
            request,
            subject,
            resource,
            billing,
            routing,
            account: None,
            dispatch: InvocationDispatch::pending(),
            usage: InvocationUsage::default(),
            telemetry: InvocationTelemetry {
                trace_id,
                ..InvocationTelemetry::default()
            },
        }
    }
}

fn routing_from_resource(resource: &InvocationResource) -> InvocationRouting {
    match (
        resource.route_key.as_str(),
        resource.resource_id.as_deref(),
        resource.resource_type_label(),
    ) {
        (_, Some(object_id), Some(object_type)) => InvocationRouting::new(
            AiRouteStrategy::LookupSticky,
            Some(StickyRouting::lookup(object_type, object_id)),
        ),
        (_, None, Some(object_type)) if resource.route_key.contains("/management/") => {
            InvocationRouting::new(
                AiRouteStrategy::CreateThenSticky,
                Some(StickyRouting::create(object_type)),
            )
        }
        ("openai/management/models", _, _) => {
            InvocationRouting::new(AiRouteStrategy::PrimaryAccount, None)
        }
        _ => InvocationRouting::new(AiRouteStrategy::StatelessFailover, None),
    }
}

trait InvocationResourceExt {
    fn resource_type_label(&self) -> Option<&'static str>;
}

impl InvocationResourceExt for InvocationResource {
    fn resource_type_label(&self) -> Option<&'static str> {
        match self.resource_type {
            super::ResourceType::File => Some("file"),
            super::ResourceType::Upload => Some("upload"),
            super::ResourceType::Thread => Some("thread"),
            super::ResourceType::Assistant => Some("assistant"),
            super::ResourceType::VectorStore => Some("vector_store"),
            super::ResourceType::Batch => Some("batch"),
            super::ResourceType::FineTuningJob => Some("fine_tuning_job"),
            super::ResourceType::Conversation => Some("conversation"),
            super::ResourceType::Container => Some("container"),
            super::ResourceType::Response => Some("response"),
            super::ResourceType::Video => Some("video"),
            super::ResourceType::RealtimeSession => Some("realtime_session"),
            _ => None,
        }
    }
}
