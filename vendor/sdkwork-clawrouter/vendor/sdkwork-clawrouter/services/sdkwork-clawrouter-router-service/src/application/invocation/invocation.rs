use axum::http::{HeaderMap, Method};

use super::{
    InvocationAccount, InvocationBilling, InvocationBody, InvocationDispatch, InvocationResource,
    InvocationRouting, InvocationSubject, InvocationTelemetry, InvocationUsage, StickyRouting,
};
use crate::domain::AiRouteStrategy;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationId(pub String);

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
            InvocationRouting::new(AiRouteStrategy::PrimaryChannel, None)
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
