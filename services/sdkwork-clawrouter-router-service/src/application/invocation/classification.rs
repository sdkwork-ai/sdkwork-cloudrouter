use axum::http::Method;

use super::{InvocationBilling, InvocationError, InvocationResource, InvocationRouting};
use crate::domain::RoutingCapability;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationClassificationRequest {
    pub method: Method,
    pub path: String,
    pub query: Option<String>,
    pub provider_family: Option<String>,
    pub supplier_code: Option<String>,
    pub endpoint_key: Option<String>,
    pub operation_id: Option<String>,
    pub capability: Option<RoutingCapability>,
}

impl InvocationClassificationRequest {
    pub fn new(method: Method, path: impl Into<String>) -> Self {
        let path = path.into();
        let (path, query) = split_path_query(&path);
        Self {
            method,
            path,
            query,
            provider_family: None,
            supplier_code: None,
            endpoint_key: None,
            operation_id: None,
            capability: None,
        }
    }

    pub fn with_provider_family(mut self, provider_family: impl Into<String>) -> Self {
        self.provider_family = Some(provider_family.into());
        self
    }

    pub fn with_supplier_code(mut self, supplier_code: impl Into<String>) -> Self {
        self.supplier_code = Some(supplier_code.into());
        self
    }

    pub fn with_endpoint_key(mut self, endpoint_key: impl Into<String>) -> Self {
        self.endpoint_key = Some(endpoint_key.into());
        self
    }

    pub fn with_operation_id(mut self, operation_id: impl Into<String>) -> Self {
        self.operation_id = Some(operation_id.into());
        self
    }

    pub fn with_capability(mut self, capability: RoutingCapability) -> Self {
        self.capability = Some(capability);
        self
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct InvocationClassification {
    pub resource: InvocationResource,
    pub billing: InvocationBilling,
    pub routing: InvocationRouting,
}

impl InvocationClassification {
    pub fn new(
        resource: InvocationResource,
        billing: InvocationBilling,
        routing: InvocationRouting,
    ) -> Self {
        Self {
            resource,
            billing,
            routing,
        }
    }

    pub fn into_parts(self) -> (InvocationResource, InvocationBilling, InvocationRouting) {
        (self.resource, self.billing, self.routing)
    }
}

pub trait InvocationResourceClassifier: Send + Sync {
    fn classify(
        &self,
        request: &InvocationClassificationRequest,
    ) -> Result<InvocationClassification, InvocationError>;
}

pub(crate) fn split_path_query(value: &str) -> (String, Option<String>) {
    let value = value.trim();
    let (path, query) = value
        .split_once('?')
        .map(|(path, query)| (path, Some(query.to_owned())))
        .unwrap_or((value, None));
    let normalized_path = normalize_path(path);
    (
        normalized_path,
        query.filter(|query| !query.trim().is_empty()),
    )
}

pub(crate) fn normalize_path(value: &str) -> String {
    let value = value.trim();
    if value.is_empty() || value == "/" {
        return "/".to_owned();
    }
    format!("/{}", value.trim_matches('/'))
}

pub(crate) fn normalize_key(value: &str) -> String {
    value
        .trim()
        .trim_matches('/')
        .to_ascii_lowercase()
        .replace(['/', ':', '-'], ".")
        .trim_matches('.')
        .to_owned()
}
