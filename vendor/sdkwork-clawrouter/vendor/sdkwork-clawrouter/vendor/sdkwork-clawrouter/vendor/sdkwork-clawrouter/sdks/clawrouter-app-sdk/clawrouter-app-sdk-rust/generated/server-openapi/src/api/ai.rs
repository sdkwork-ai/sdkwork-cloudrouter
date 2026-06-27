use std::sync::Arc;

use crate::api::paths::app_path;
use crate::api::paths::append_query_string;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{ChannelGroupsListResult, DashboardOverviewRetrieveResult, GatewayTracesListResult, ModelRankingsListResult, ModelVendorsListResult, ModelsListResult, RoutingApiKeysListResult, RoutingChannelsListResult, RoutingRequestTracesListResult, RoutingUsageListResult, UsageLogsListResult};

#[derive(Clone)]
pub struct AiApi {
    client: Arc<SdkworkHttpClient>,
}

impl AiApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// List groups
    pub async fn channel_groups_list(&self) -> Result<ChannelGroupsListResult, SdkworkError> {
        let path = app_path(&"/ai/channel_groups".to_string());
        self.client.get(&path, None, None).await
    }

    /// List dashboard overview
    pub async fn dashboard_overview_retrieve(&self, time_range: Option<&str>, start_time: Option<&str>, end_time: Option<&str>) -> Result<DashboardOverviewRetrieveResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("time_range", time_range, "form", true, false, None),
            QueryParameterSpec::new("start_time", start_time, "form", true, false, None),
            QueryParameterSpec::new("end_time", end_time, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/ai/dashboard/overview".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// List traces
    pub async fn gateway_traces_list(&self) -> Result<GatewayTracesListResult, SdkworkError> {
        let path = app_path(&"/ai/gateway/traces".to_string());
        self.client.get(&path, None, None).await
    }

    /// List model rankings
    pub async fn model_rankings_list(&self, rank_scope: Option<&str>, vendor_code: Option<&str>, modality: Option<&str>, q: Option<&str>, limit: Option<&str>) -> Result<ModelRankingsListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("rank_scope", rank_scope, "form", true, false, None),
            QueryParameterSpec::new("vendor_code", vendor_code, "form", true, false, None),
            QueryParameterSpec::new("modality", modality, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/ai/model_rankings".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// List ranking vendor filters
    pub async fn model_vendors_list(&self) -> Result<ModelVendorsListResult, SdkworkError> {
        let path = app_path(&"/ai/model_vendors".to_string());
        self.client.get(&path, None, None).await
    }

    /// List model catalog for Playground
    pub async fn models_list(&self, billing_meter: Option<&str>, vendor_code: Option<&str>, vendor_codes: Option<&[String]>, modalities: Option<&[String]>, capabilities: Option<&[String]>, categories: Option<&[String]>, groups: Option<&[String]>, q: Option<&str>, limit: Option<&str>, offset: Option<&str>) -> Result<ModelsListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("billing_meter", billing_meter, "form", true, false, None),
            QueryParameterSpec::new("vendor_code", vendor_code, "form", true, false, None),
            QueryParameterSpec::new("vendor_codes", vendor_codes, "form", false, false, None),
            QueryParameterSpec::new("modalities", modalities, "form", false, false, None),
            QueryParameterSpec::new("capabilities", capabilities, "form", false, false, None),
            QueryParameterSpec::new("categories", categories, "form", false, false, None),
            QueryParameterSpec::new("groups", groups, "form", false, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
            QueryParameterSpec::new("limit", limit, "form", true, false, None),
            QueryParameterSpec::new("offset", offset, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/ai/models".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// List routing API keys
    pub async fn routing_api_keys_list(&self) -> Result<RoutingApiKeysListResult, SdkworkError> {
        let path = app_path(&"/ai/routing/api_keys".to_string());
        self.client.get(&path, None, None).await
    }

    /// List routing channels
    pub async fn routing_channels_list(&self) -> Result<RoutingChannelsListResult, SdkworkError> {
        let path = app_path(&"/ai/routing/channels".to_string());
        self.client.get(&path, None, None).await
    }

    /// List routing request traces
    pub async fn routing_request_traces_list(&self) -> Result<RoutingRequestTracesListResult, SdkworkError> {
        let path = app_path(&"/ai/routing/request_traces".to_string());
        self.client.get(&path, None, None).await
    }

    /// List routing usage
    pub async fn routing_usage_list(&self) -> Result<RoutingUsageListResult, SdkworkError> {
        let path = app_path(&"/ai/routing/usage".to_string());
        self.client.get(&path, None, None).await
    }

    /// List logs
    pub async fn usage_logs_list(&self, page: Option<&str>, page_size: Option<&str>, q: Option<&str>, status: Option<&str>, start_time: Option<&str>, end_time: Option<&str>) -> Result<UsageLogsListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page", page, "form", true, false, None),
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("q", q, "form", true, false, None),
            QueryParameterSpec::new("status", status, "form", true, false, None),
            QueryParameterSpec::new("start_time", start_time, "form", true, false, None),
            QueryParameterSpec::new("end_time", end_time, "form", true, false, None),
        ]);
        let path = append_query_string(app_path(&"/ai/usage/logs".to_string()), &query);
        self.client.get(&path, None, None).await
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
