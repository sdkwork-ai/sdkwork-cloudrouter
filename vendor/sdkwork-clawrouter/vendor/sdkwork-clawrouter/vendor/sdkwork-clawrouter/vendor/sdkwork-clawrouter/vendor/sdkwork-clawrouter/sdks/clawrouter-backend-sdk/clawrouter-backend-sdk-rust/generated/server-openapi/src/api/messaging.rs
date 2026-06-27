use std::sync::Arc;

use crate::api::base::{RequestHeaders};
use crate::api::paths::backend_path;
use crate::api::paths::append_query_string;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{DiagnosticsRouteSimulationCreateResult, DiagnosticsTestSendsCreateResult, MessagingProviderAccountCreateRequest, MessagingRouteRuleCreateRequest, MessagingRouteSimulationRequest, MessagingSenderIdentityCreateRequest, MessagingSuppressionCreateRequest, MessagingTemplateCreateRequest, MessagingTemplateSendRequest, MessagingTestSendRequest, ProviderAccountsCreateResult, ProviderAccountsListResult, RateLimitBucketsListResult, RouteRulesCreateResult, RouteRulesListResult, SendRequestsListResult, SenderIdentitiesCreateResult, SenderIdentitiesListResult, SuppressionsCreateResult, SuppressionsListResult, TemplateSendsCreateResult, TemplatesCreateResult, TemplatesListResult, TemplatesVersionsPublishResult, VerificationPoliciesListResult, VerificationPoliciesUpdateResult, VerificationPolicyUpdateRequest};

#[derive(Clone)]
pub struct MessagingApi {
    client: Arc<SdkworkHttpClient>,
}

impl MessagingApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Messaging route simulation
    pub async fn diagnostics_route_simulation_create(&self, body: &MessagingRouteSimulationRequest) -> Result<DiagnosticsRouteSimulationCreateResult, SdkworkError> {
        let path = backend_path(&"/messaging/diagnostics/route_simulation".to_string());
        self.client.post(&path, Some(body), None, None, Some("application/json")).await
    }

    /// Messaging test send
    pub async fn diagnostics_test_sends_create(&self, body: &MessagingTestSendRequest, idempotency_key: &str) -> Result<DiagnosticsTestSendsCreateResult, SdkworkError> {
        let path = backend_path(&"/messaging/diagnostics/test_sends".to_string());
        let headers = build_request_headers(
            &[
                ("Idempotency-Key", HeaderParameterSpec::new(idempotency_key, "simple", false, None)),
            ],
            &[],
        );
        self.client.post(&path, Some(body), None, headers.as_ref(), Some("application/json")).await
    }

    /// Messaging provider accounts list
    pub async fn provider_accounts_list(&self, page: Option<&str>, page_size: Option<&str>, q: Option<&str>, status: Option<&str>, channel: Option<&str>, provider_code: Option<&str>) -> Result<ProviderAccountsListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
            QueryParameterSpec::new("status", status, "form", true, false, None),
            QueryParameterSpec::new("channel", channel, "form", true, false, None),
            QueryParameterSpec::new("provider_code", provider_code, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/messaging/provider_accounts".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Messaging provider account create
    pub async fn provider_accounts_create(&self, body: &MessagingProviderAccountCreateRequest, idempotency_key: &str) -> Result<ProviderAccountsCreateResult, SdkworkError> {
        let path = backend_path(&"/messaging/provider_accounts".to_string());
        let headers = build_request_headers(
            &[
                ("Idempotency-Key", HeaderParameterSpec::new(idempotency_key, "simple", false, None)),
            ],
            &[],
        );
        self.client.post(&path, Some(body), None, headers.as_ref(), Some("application/json")).await
    }

    /// Messaging rate limit buckets list
    pub async fn rate_limit_buckets_list(&self, page: Option<&str>, page_size: Option<&str>, scene_code: Option<&str>, channel: Option<&str>, target_hash: Option<&str>, ip_hash: Option<&str>, device_hash: Option<&str>) -> Result<RateLimitBucketsListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("scene_code", scene_code, "form", true, false, None),
            QueryParameterSpec::new("channel", channel, "form", true, false, None),
            QueryParameterSpec::new("target_hash", target_hash, "form", true, false, None),
            QueryParameterSpec::new("ip_hash", ip_hash, "form", true, false, None),
            QueryParameterSpec::new("device_hash", device_hash, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/messaging/rate_limit_buckets".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Messaging route rules list
    pub async fn route_rules_list(&self, page: Option<&str>, page_size: Option<&str>, q: Option<&str>, status: Option<&str>, channel: Option<&str>, provider_code: Option<&str>) -> Result<RouteRulesListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
            QueryParameterSpec::new("status", status, "form", true, false, None),
            QueryParameterSpec::new("channel", channel, "form", true, false, None),
            QueryParameterSpec::new("provider_code", provider_code, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/messaging/route_rules".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Messaging route rule create
    pub async fn route_rules_create(&self, body: &MessagingRouteRuleCreateRequest, idempotency_key: &str) -> Result<RouteRulesCreateResult, SdkworkError> {
        let path = backend_path(&"/messaging/route_rules".to_string());
        let headers = build_request_headers(
            &[
                ("Idempotency-Key", HeaderParameterSpec::new(idempotency_key, "simple", false, None)),
            ],
            &[],
        );
        self.client.post(&path, Some(body), None, headers.as_ref(), Some("application/json")).await
    }

    /// Messaging send requests list
    pub async fn send_requests_list(&self, page: Option<&str>, page_size: Option<&str>, status: Option<&str>, channel: Option<&str>, scene_code: Option<&str>, provider_code: Option<&str>, target_hash: Option<&str>) -> Result<SendRequestsListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("status", status, "form", true, false, None),
            QueryParameterSpec::new("channel", channel, "form", true, false, None),
            QueryParameterSpec::new("scene_code", scene_code, "form", true, false, None),
            QueryParameterSpec::new("provider_code", provider_code, "form", true, false, None),
            QueryParameterSpec::new("target_hash", target_hash, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/messaging/send_requests".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Messaging sender identities list
    pub async fn sender_identities_list(&self, page: Option<&str>, page_size: Option<&str>, q: Option<&str>, status: Option<&str>, channel: Option<&str>, provider_code: Option<&str>) -> Result<SenderIdentitiesListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
            QueryParameterSpec::new("status", status, "form", true, false, None),
            QueryParameterSpec::new("channel", channel, "form", true, false, None),
            QueryParameterSpec::new("provider_code", provider_code, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/messaging/sender_identities".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Messaging sender identity create
    pub async fn sender_identities_create(&self, body: &MessagingSenderIdentityCreateRequest, idempotency_key: &str) -> Result<SenderIdentitiesCreateResult, SdkworkError> {
        let path = backend_path(&"/messaging/sender_identities".to_string());
        let headers = build_request_headers(
            &[
                ("Idempotency-Key", HeaderParameterSpec::new(idempotency_key, "simple", false, None)),
            ],
            &[],
        );
        self.client.post(&path, Some(body), None, headers.as_ref(), Some("application/json")).await
    }

    /// Messaging suppressions list
    pub async fn suppressions_list(&self, page: Option<&str>, page_size: Option<&str>, status: Option<&str>, channel: Option<&str>, target_hash: Option<&str>, reason_code: Option<&str>) -> Result<SuppressionsListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("status", status, "form", true, false, None),
            QueryParameterSpec::new("channel", channel, "form", true, false, None),
            QueryParameterSpec::new("target_hash", target_hash, "form", true, false, None),
            QueryParameterSpec::new("reason_code", reason_code, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/messaging/suppressions".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Messaging suppression create
    pub async fn suppressions_create(&self, body: &MessagingSuppressionCreateRequest, idempotency_key: &str) -> Result<SuppressionsCreateResult, SdkworkError> {
        let path = backend_path(&"/messaging/suppressions".to_string());
        let headers = build_request_headers(
            &[
                ("Idempotency-Key", HeaderParameterSpec::new(idempotency_key, "simple", false, None)),
            ],
            &[],
        );
        self.client.post(&path, Some(body), None, headers.as_ref(), Some("application/json")).await
    }

    /// Messaging template send
    pub async fn template_sends_create(&self, body: &MessagingTemplateSendRequest, idempotency_key: &str) -> Result<TemplateSendsCreateResult, SdkworkError> {
        let path = backend_path(&"/messaging/template_sends".to_string());
        let headers = build_request_headers(
            &[
                ("Idempotency-Key", HeaderParameterSpec::new(idempotency_key, "simple", false, None)),
            ],
            &[],
        );
        self.client.post(&path, Some(body), None, headers.as_ref(), Some("application/json")).await
    }

    /// Messaging templates list
    pub async fn templates_list(&self, page: Option<&str>, page_size: Option<&str>, q: Option<&str>, status: Option<&str>, channel: Option<&str>, provider_code: Option<&str>) -> Result<TemplatesListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
            QueryParameterSpec::new("status", status, "form", true, false, None),
            QueryParameterSpec::new("channel", channel, "form", true, false, None),
            QueryParameterSpec::new("provider_code", provider_code, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/messaging/templates".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Messaging template create
    pub async fn templates_create(&self, body: &MessagingTemplateCreateRequest, idempotency_key: &str) -> Result<TemplatesCreateResult, SdkworkError> {
        let path = backend_path(&"/messaging/templates".to_string());
        let headers = build_request_headers(
            &[
                ("Idempotency-Key", HeaderParameterSpec::new(idempotency_key, "simple", false, None)),
            ],
            &[],
        );
        self.client.post(&path, Some(body), None, headers.as_ref(), Some("application/json")).await
    }

    /// Messaging template version publish
    pub async fn templates_versions_publish(&self, template_id: &str, version_id: &str) -> Result<TemplatesVersionsPublishResult, SdkworkError> {
        let path = backend_path(&format!("/messaging/templates/{}/versions/{}/publish", serialize_path_parameter(template_id, PathParameterSpec::new("templateId", "simple", false)), serialize_path_parameter(version_id, PathParameterSpec::new("versionId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Verification policies list
    pub async fn verification_policies_list(&self, page: Option<&str>, page_size: Option<&str>, q: Option<&str>, status: Option<&str>, channel: Option<&str>, provider_code: Option<&str>) -> Result<VerificationPoliciesListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
            QueryParameterSpec::new("status", status, "form", true, false, None),
            QueryParameterSpec::new("channel", channel, "form", true, false, None),
            QueryParameterSpec::new("provider_code", provider_code, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/messaging/verification_policies".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Verification policy update
    pub async fn verification_policies_update(&self, policy_id: &str, body: &VerificationPolicyUpdateRequest) -> Result<VerificationPoliciesUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/messaging/verification_policies/{}", serialize_path_parameter(policy_id, PathParameterSpec::new("policyId", "simple", false))));
        self.client.put(&path, Some(body), None, None, Some("application/json")).await
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
