use std::sync::Arc;

use crate::api::base::{RequestHeaders};
use crate::api::paths::backend_path;
use crate::api::paths::append_query_string;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{CreateStorageBucketRequest, CreateStorageGarbageCollectionJobRequest, CreateStorageProviderRequest, CreateStorageQuotaPolicyRequest, CreateStorageReconciliationRunRequest, OssBucketsCreateResult, OssBucketsListResult, OssBucketsUpdateResult, OssDefaultBucketsListResult, OssDefaultBucketsUpdateResult, OssGcJobsCreateResult, OssGcJobsListResult, OssProvidersCreateResult, OssProvidersHealthChecksCreateResult, OssProvidersListResult, OssProvidersUpdateResult, OssQuotasCreateResult, OssQuotasListResult, OssReconciliationRunsCreateResult, OssReconciliationRunsListResult, OssUsageLedgerListResult, OssUsageListResult, OssUsageSnapshotsListResult, SetStorageDefaultBucketRequest, UpdateStorageBucketRequest, UpdateStorageProviderRequest};

#[derive(Clone)]
pub struct StorageApi {
    client: Arc<SdkworkHttpClient>,
}

impl StorageApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// List storage buckets
    pub async fn oss_buckets_list(&self, cursor: Option<&str>, limit: Option<&str>, status: Option<&str>) -> Result<OssBucketsListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("status", status, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/storage/buckets".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Create storage bucket
    pub async fn oss_buckets_create(&self, body: &CreateStorageBucketRequest, idempotency_key: &str) -> Result<OssBucketsCreateResult, SdkworkError> {
        let path = backend_path(&"/storage/buckets".to_string());
        let headers = build_request_headers(
            &[
                ("Idempotency-Key", HeaderParameterSpec::new(idempotency_key, "simple", false, None)),
            ],
            &[],
        );
        self.client.post(&path, Some(body), None, headers.as_ref(), Some("application/json")).await
    }

    /// Update storage bucket status
    pub async fn oss_buckets_update(&self, bucket_id: &str, body: &UpdateStorageBucketRequest) -> Result<OssBucketsUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/storage/buckets/{}", serialize_path_parameter(bucket_id, PathParameterSpec::new("bucketId", "simple", false))));
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    /// List default storage bucket routes
    pub async fn oss_default_buckets_list(&self, logical_scope: Option<&str>) -> Result<OssDefaultBucketsListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("logical_scope", logical_scope, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/storage/default_buckets".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Set default storage bucket route
    pub async fn oss_default_buckets_update(&self, logical_scope: &str, body: &SetStorageDefaultBucketRequest) -> Result<OssDefaultBucketsUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/storage/default_buckets/{}", serialize_path_parameter(logical_scope, PathParameterSpec::new("logicalScope", "simple", false))));
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    /// List storage garbage collection jobs
    pub async fn oss_gc_jobs_list(&self, cursor: Option<&str>, limit: Option<&str>, status: Option<&str>) -> Result<OssGcJobsListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("status", status, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/storage/gc_jobs".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Create storage garbage collection job
    pub async fn oss_gc_jobs_create(&self, body: &CreateStorageGarbageCollectionJobRequest, idempotency_key: &str) -> Result<OssGcJobsCreateResult, SdkworkError> {
        let path = backend_path(&"/storage/gc_jobs".to_string());
        let headers = build_request_headers(
            &[
                ("Idempotency-Key", HeaderParameterSpec::new(idempotency_key, "simple", false, None)),
            ],
            &[],
        );
        self.client.post(&path, Some(body), None, headers.as_ref(), Some("application/json")).await
    }

    /// List storage providers
    pub async fn oss_providers_list(&self) -> Result<OssProvidersListResult, SdkworkError> {
        let path = backend_path(&"/storage/providers".to_string());
        self.client.get(&path, None, None).await
    }

    /// Create storage provider
    pub async fn oss_providers_create(&self, body: &CreateStorageProviderRequest, idempotency_key: &str) -> Result<OssProvidersCreateResult, SdkworkError> {
        let path = backend_path(&"/storage/providers".to_string());
        let headers = build_request_headers(
            &[
                ("Idempotency-Key", HeaderParameterSpec::new(idempotency_key, "simple", false, None)),
            ],
            &[],
        );
        self.client.post(&path, Some(body), None, headers.as_ref(), Some("application/json")).await
    }

    /// Update storage provider status
    pub async fn oss_providers_update(&self, provider_id: &str, body: &UpdateStorageProviderRequest) -> Result<OssProvidersUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/storage/providers/{}", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.patch(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Check storage provider health
    pub async fn oss_providers_health_checks_create(&self, provider_id: &str) -> Result<OssProvidersHealthChecksCreateResult, SdkworkError> {
        let path = backend_path(&format!("/storage/providers/{}/health_check", serialize_path_parameter(provider_id, PathParameterSpec::new("providerId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// List storage quota policies
    pub async fn oss_quotas_list(&self) -> Result<OssQuotasListResult, SdkworkError> {
        let path = backend_path(&"/storage/quotas".to_string());
        self.client.get(&path, None, None).await
    }

    /// Create storage quota policy
    pub async fn oss_quotas_create(&self, body: &CreateStorageQuotaPolicyRequest, idempotency_key: &str) -> Result<OssQuotasCreateResult, SdkworkError> {
        let path = backend_path(&"/storage/quotas".to_string());
        let headers = build_request_headers(
            &[
                ("Idempotency-Key", HeaderParameterSpec::new(idempotency_key, "simple", false, None)),
            ],
            &[],
        );
        self.client.post(&path, Some(body), None, headers.as_ref(), Some("application/json")).await
    }

    /// List storage reconciliation runs
    pub async fn oss_reconciliation_runs_list(&self, cursor: Option<&str>, limit: Option<&str>, run_type: Option<&str>, status: Option<&str>) -> Result<OssReconciliationRunsListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("run_type", run_type, "form", true, false, None),
            QueryParameterSpec::new("status", status, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/storage/reconciliation_runs".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Create storage reconciliation run
    pub async fn oss_reconciliation_runs_create(&self, body: &CreateStorageReconciliationRunRequest, idempotency_key: &str) -> Result<OssReconciliationRunsCreateResult, SdkworkError> {
        let path = backend_path(&"/storage/reconciliation_runs".to_string());
        let headers = build_request_headers(
            &[
                ("Idempotency-Key", HeaderParameterSpec::new(idempotency_key, "simple", false, None)),
            ],
            &[],
        );
        self.client.post(&path, Some(body), None, headers.as_ref(), Some("application/json")).await
    }

    /// List storage usage counters
    pub async fn oss_usage_list(&self, cursor: Option<&str>, limit: Option<&str>, scope_type: Option<&str>, scope_id: Option<&str>) -> Result<OssUsageListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("scope_type", scope_type, "form", true, false, None),
            QueryParameterSpec::new("scope_id", scope_id, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/storage/usage".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// List storage usage ledger
    pub async fn oss_usage_ledger_list(&self, cursor: Option<&str>, limit: Option<&str>, scope_type: Option<&str>, scope_id: Option<&str>) -> Result<OssUsageLedgerListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("scope_type", scope_type, "form", true, false, None),
            QueryParameterSpec::new("scope_id", scope_id, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/storage/usage/ledger".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// List storage usage snapshots
    pub async fn oss_usage_snapshots_list(&self, cursor: Option<&str>, limit: Option<&str>, scope_type: Option<&str>, scope_id: Option<&str>) -> Result<OssUsageSnapshotsListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("scope_type", scope_type, "form", true, false, None),
            QueryParameterSpec::new("scope_id", scope_id, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/storage/usage/snapshots".to_string()), &query);
        self.client.get(&path, None, None).await
    }

}

struct PathParameterSpec<'a> {
    name: &'a str,
    style: &'a str,
    explode: bool,
}

impl<'a> PathParameterSpec<'a> {
    fn new(name: &'a str, style: &'a str, explode: bool) -> Self {
        Self { name, style, explode }
    }
}

fn serialize_path_parameter<T: serde::Serialize>(value: T, spec: PathParameterSpec<'_>) -> String {
    let value = serde_json::to_value(value).unwrap_or(serde_json::Value::Null);
    if value.is_null() {
        return String::new();
    }
    let style = if spec.style.is_empty() { "simple" } else { spec.style };
    match value {
        serde_json::Value::Array(values) => serialize_path_array(spec.name, &values, style, spec.explode),
        serde_json::Value::Object(values) => serialize_path_object(spec.name, &values, style, spec.explode),
        value => format!("{}{}", path_primitive_prefix(spec.name, style), percent_encode(&primitive_to_string(&value))),
    }
}

fn serialize_path_array(name: &str, values: &[serde_json::Value], style: &str, explode: bool) -> String {
    let serialized = values
        .iter()
        .filter(|value| !value.is_null())
        .map(|value| percent_encode(&primitive_to_string(value)))
        .collect::<Vec<_>>();
    if serialized.is_empty() {
        return path_prefix(name, style);
    }
    if style == "matrix" {
        if explode {
            return serialized.iter().map(|item| format!(";{}={}", name, item)).collect::<Vec<_>>().join("");
        }
        return format!(";{}={}", name, serialized.join(","));
    }
    let separator = if explode { "." } else { "," };
    format!("{}{}", path_prefix(name, style), serialized.join(separator))
}

fn serialize_path_object(
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
) -> String {
    let mut entries = Vec::new();
    let mut exploded = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        let escaped_key = percent_encode(key);
        let escaped_value = percent_encode(&primitive_to_string(value));
        if explode {
            if style == "matrix" {
                exploded.push(format!(";{}={}", escaped_key, escaped_value));
            } else {
                exploded.push(format!("{}={}", escaped_key, escaped_value));
            }
        } else {
            entries.push(escaped_key);
            entries.push(escaped_value);
        }
    }
    if style == "matrix" {
        if explode {
            return exploded.join("");
        }
        return format!(";{}={}", name, entries.join(","));
    }
    if explode {
        let separator = if style == "label" { "." } else { "," };
        return format!("{}{}", path_prefix(name, style), exploded.join(separator));
    }
    format!("{}{}", path_prefix(name, style), entries.join(","))
}

fn path_prefix(name: &str, style: &str) -> String {
    match style {
        "label" => ".".to_string(),
        "matrix" => format!(";{}", name),
        _ => String::new(),
    }
}

fn path_primitive_prefix(name: &str, style: &str) -> String {
    if style == "matrix" {
        format!(";{}=", name)
    } else {
        path_prefix(name, style)
    }
}

struct HeaderParameterSpec {
    value: serde_json::Value,
    explode: bool,
    content_type: Option<&'static str>,
}

impl HeaderParameterSpec {
    fn new<T: serde::Serialize>(
        value: T,
        _style: &'static str,
        explode: bool,
        content_type: Option<&'static str>,
    ) -> Self {
        Self {
            value: serde_json::to_value(value).unwrap_or(serde_json::Value::Null),
            explode,
            content_type,
        }
    }
}

fn build_request_headers(headers: &[(&str, HeaderParameterSpec)], cookies: &[(&str, HeaderParameterSpec)]) -> Option<RequestHeaders> {
    let mut request_headers = RequestHeaders::new();
    for (name, parameter) in headers {
        if let Some(value) = serialize_header_parameter(parameter) {
            request_headers.insert((*name).to_string(), value);
        }
    }

    let cookie_header = build_cookie_header(cookies);
    if !cookie_header.is_empty() {
        request_headers
            .entry("Cookie".to_string())
            .and_modify(|existing| {
                existing.push_str("; ");
                existing.push_str(&cookie_header);
            })
            .or_insert(cookie_header);
    }

    if request_headers.is_empty() {
        None
    } else {
        Some(request_headers)
    }
}

fn build_cookie_header(cookies: &[(&str, HeaderParameterSpec)]) -> String {
    cookies
        .iter()
        .filter_map(|(name, value)| {
            serialize_header_parameter(value)
                .map(|value| format!("{}={}", percent_encode(name), percent_encode(&value)))
        })
        .collect::<Vec<_>>()
        .join("; ")
}

fn serialize_header_parameter(parameter: &HeaderParameterSpec) -> Option<String> {
    if parameter.value.is_null() {
        return None;
    }
    if parameter.content_type.is_some() {
        return Some(parameter.value.to_string());
    }
    match &parameter.value {
        serde_json::Value::Null => None,
        serde_json::Value::String(value) => Some(value.clone()),
        serde_json::Value::Number(value) => Some(value.to_string()),
        serde_json::Value::Bool(value) => Some(value.to_string()),
        serde_json::Value::Array(values) => {
            let serialized = values
                .iter()
                .filter_map(serialize_json_value)
                .collect::<Vec<_>>();
            if serialized.is_empty() {
                None
            } else {
                Some(serialized.join(","))
            }
        }
        serde_json::Value::Object(values) => {
            let serialized = values
                .iter()
                .filter_map(|(key, value)| {
                    serialize_json_value(value).map(|serialized| {
                        if parameter.explode {
                            format!("{}={}", key, serialized)
                        } else {
                            format!("{},{}", key, serialized)
                        }
                    })
                })
                .collect::<Vec<_>>();
            if serialized.is_empty() {
                None
            } else {
                Some(serialized.join(","))
            }
        }
    }
}

fn serialize_json_value(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::Null => None,
        serde_json::Value::String(value) => Some(value.clone()),
        serde_json::Value::Number(value) => Some(value.to_string()),
        serde_json::Value::Bool(value) => Some(value.to_string()),
        other => Some(other.to_string()),
    }
}

struct QueryParameterSpec<'a> {
    name: &'a str,
    value: serde_json::Value,
    style: &'a str,
    explode: bool,
    allow_reserved: bool,
    content_type: Option<&'a str>,
}

impl<'a> QueryParameterSpec<'a> {
    fn new<T: serde::Serialize>(
        name: &'a str,
        value: T,
        style: &'a str,
        explode: bool,
        allow_reserved: bool,
        content_type: Option<&'a str>,
    ) -> Self {
        Self {
            name,
            value: serde_json::to_value(value).unwrap_or(serde_json::Value::Null),
            style,
            explode,
            allow_reserved,
            content_type,
        }
    }
}

fn build_query_string(parameters: &[QueryParameterSpec<'_>]) -> String {
    let mut pairs = Vec::new();
    for parameter in parameters {
        append_serialized_parameter(&mut pairs, parameter);
    }
    pairs.join("&")
}

fn append_serialized_parameter(pairs: &mut Vec<String>, parameter: &QueryParameterSpec<'_>) {
    if parameter.value.is_null() {
        return;
    }
    if parameter.content_type.is_some() {
        pairs.push(format!(
            "{}={}",
            percent_encode(parameter.name),
            encode_query_value(&parameter.value.to_string(), parameter.allow_reserved)
        ));
        return;
    }

    let style = if parameter.style.is_empty() { "form" } else { parameter.style };
    match &parameter.value {
        serde_json::Value::Array(values) => append_array_parameter(pairs, parameter.name, values, style, parameter.explode, parameter.allow_reserved),
        serde_json::Value::Object(values) if style == "deepObject" => append_deep_object_parameter(pairs, parameter.name, values, parameter.allow_reserved),
        serde_json::Value::Object(values) => append_object_parameter(pairs, parameter.name, values, style, parameter.explode, parameter.allow_reserved),
        value => pairs.push(format!("{}={}", percent_encode(parameter.name), encode_query_value(&primitive_to_string(value), parameter.allow_reserved))),
    }
}

fn append_array_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &[serde_json::Value],
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let serialized = values.iter().filter(|value| !value.is_null()).map(primitive_to_string).collect::<Vec<_>>();
    if serialized.is_empty() {
        return;
    }
    if style == "form" && explode {
        for item in serialized {
            pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&item, allow_reserved)));
        }
        return;
    }
    pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&serialized.join(","), allow_reserved)));
}

fn append_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let mut serialized = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        if style == "form" && explode {
            pairs.push(format!("{}={}", percent_encode(key), encode_query_value(&primitive_to_string(value), allow_reserved)));
        } else {
            serialized.push(key.clone());
            serialized.push(primitive_to_string(value));
        }
    }
    if !serialized.is_empty() {
        pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&serialized.join(","), allow_reserved)));
    }
}

fn append_deep_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    allow_reserved: bool,
) {
    for (key, value) in values {
        if !value.is_null() {
            pairs.push(format!("{}={}", percent_encode(&format!("{}[{}]", name, key)), encode_query_value(&primitive_to_string(value), allow_reserved)));
        }
    }
}

fn encode_query_value(value: &str, allow_reserved: bool) -> String {
    let mut encoded = percent_encode(value);
    if !allow_reserved {
        return encoded;
    }
    for (escaped, reserved) in [
        ("%3A", ":"), ("%2F", "/"), ("%3F", "?"), ("%23", "#"),
        ("%5B", "["), ("%5D", "]"), ("%40", "@"), ("%21", "!"),
        ("%24", "$"), ("%26", "&"), ("%27", "'"), ("%28", "("),
        ("%29", ")"), ("%2A", "*"), ("%2B", "+"), ("%2C", ","),
        ("%3B", ";"), ("%3D", "="),
    ] {
        encoded = encoded.replace(escaped, reserved);
    }
    encoded
}

fn primitive_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(value) => value.clone(),
        serde_json::Value::Number(value) => value.to_string(),
        serde_json::Value::Bool(value) => value.to_string(),
        other => other.to_string(),
    }
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                vec![byte as char]
            }
            _ => format!("%{:02X}", byte).chars().collect(),
        })
        .collect()
}
