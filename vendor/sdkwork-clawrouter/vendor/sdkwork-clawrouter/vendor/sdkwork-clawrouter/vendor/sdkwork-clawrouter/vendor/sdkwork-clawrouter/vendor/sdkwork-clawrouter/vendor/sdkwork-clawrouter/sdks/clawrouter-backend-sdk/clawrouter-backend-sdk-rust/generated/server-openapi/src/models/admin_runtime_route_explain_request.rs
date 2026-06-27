use serde::{Deserialize, Serialize};

/// Admin runtime route explain request schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminRuntimeRouteExplainRequest {
    /// API endpoint code used for route and channel scope matching.
    #[serde(rename = "apiCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_code: Option<String>,

    /// API key id whose owner scope and route group are used by the runtime selector.
    #[serde(rename = "apiKeyId")]
    pub api_key_id: String,

    /// Billing meter used by pricing readiness checks.
    #[serde(rename = "billingMeter")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub billing_meter: Option<String>,

    /// Runtime routing capability to evaluate. Defaults to chat.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capability: Option<String>,

    /// Optional model catalog key. When present the runtime selector explains model route planning.
    #[serde(rename = "catalogKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub catalog_key: Option<String>,

    /// Optional channel group id. Defaults to the API key's bound group.
    #[serde(rename = "channelGroupId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub channel_group_id: Option<String>,

    /// Requested model or provider-native model identifier.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,

    /// Requested resource code, such as api.openai.chat_completions.
    #[serde(rename = "resourceCode")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub resource_code: Option<String>,

    /// Non-model route key used when catalogKey is absent.
    #[serde(rename = "routeKey")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub route_key: Option<String>,
}
