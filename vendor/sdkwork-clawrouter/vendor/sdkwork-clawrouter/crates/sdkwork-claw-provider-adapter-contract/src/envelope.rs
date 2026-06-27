use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::endpoint::AdapterInvocationShape;
use crate::usage::{AdapterUsage, AdapterUsageLine};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AdapterInvocationMetadata {
    pub id: String,
    pub endpoint_key: String,
    pub method: String,
    pub standard_path: String,
    pub shape: AdapterInvocationShape,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trace_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AdapterSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub api_key_id: i64,
    pub group_id: i64,
    pub group_code: String,
    pub pricing_plan_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdapterProviderContext {
    pub provider_code: String,
    pub channel_id: i64,
    pub region_code: String,
    pub provider_model: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    pub auth_profile: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", content = "value", rename_all = "snake_case")]
pub enum AdapterSecret {
    GatewayResolved(Value),
    AdapterResolved { secret_ref: String },
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdapterInvocationRequest {
    pub invocation: AdapterInvocationMetadata,
    pub subject: AdapterSubject,
    pub provider: AdapterProviderContext,
    pub secret: AdapterSecret,
    pub body: Value,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AdapterResponseProvider {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AdapterInvocationResponse {
    pub status_code: u16,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub headers: BTreeMap<String, String>,
    pub body: Value,
    #[serde(default, skip_serializing_if = "is_default_provider")]
    pub provider: AdapterResponseProvider,
    #[serde(default, skip_serializing_if = "AdapterUsage::is_empty")]
    pub usage: AdapterUsage,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub artifacts: Vec<Value>,
}

impl AdapterInvocationResponse {
    pub fn json(status_code: u16, body: Value) -> Self {
        let mut headers = BTreeMap::new();
        headers.insert("content-type".to_owned(), "application/json".to_owned());
        Self {
            status_code,
            headers,
            body,
            provider: AdapterResponseProvider::default(),
            usage: AdapterUsage::default(),
            artifacts: Vec::new(),
        }
    }

    pub fn json_task(status_code: u16, body: Value) -> Self {
        Self::json(status_code, body)
    }

    pub fn with_provider_request_id(mut self, request_id: impl Into<String>) -> Self {
        self.provider.request_id = Some(request_id.into());
        self
    }

    pub fn with_provider_response_id(mut self, response_id: impl Into<String>) -> Self {
        self.provider.response_id = Some(response_id.into());
        self
    }

    pub fn with_provider_task_id(mut self, task_id: impl Into<String>) -> Self {
        self.provider.task_id = Some(task_id.into());
        self
    }

    pub fn with_billing_units(mut self, billing_units: i64) -> Self {
        self.usage.billing_units = Some(billing_units);
        self
    }

    pub fn with_usage_line(mut self, usage_line: AdapterUsageLine) -> Self {
        self.usage.usage_lines.push(usage_line);
        self
    }
}

fn is_default_provider(provider: &AdapterResponseProvider) -> bool {
    provider == &AdapterResponseProvider::default()
}
