use serde::{Deserialize, Serialize};

/// Admin record log item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct AdminRecordLogItem {
    /// Base input price field on admin record log item.
    #[serde(rename = "baseInputPrice")]
    pub base_input_price: String,

    /// Base output price field on admin record log item.
    #[serde(rename = "baseOutputPrice")]
    pub base_output_price: String,

    /// Cache read price field on admin record log item.
    #[serde(rename = "cacheReadPrice")]
    pub cache_read_price: String,

    /// Cache read tokens field on admin record log item.
    #[serde(rename = "cacheReadTokens")]
    pub cache_read_tokens: String,

    /// Cost field on admin record log item.
    pub cost: String,

    /// Error code field on admin record log item.
    #[serde(rename = "errorCode")]
    pub error_code: String,

    /// Error message field on admin record log item.
    #[serde(rename = "errorMessage")]
    pub error_message: String,

    /// Error type field on admin record log item.
    #[serde(rename = "errorType")]
    pub error_type: String,

    /// Group field on admin record log item.
    pub group: String,

    /// Http method field on admin record log item.
    #[serde(rename = "httpMethod")]
    pub http_method: String,

    /// Http status field on admin record log item.
    #[serde(rename = "httpStatus")]
    pub http_status: String,

    /// Id field on admin record log item.
    pub id: String,

    /// Input tokens field on admin record log item.
    #[serde(rename = "inputTokens")]
    pub input_tokens: String,

    /// Ip field on admin record log item.
    pub ip: String,

    /// Is stream field on admin record log item.
    #[serde(rename = "isStream")]
    pub is_stream: bool,

    /// Model field on admin record log item.
    pub model: String,

    /// Multiplier field on admin record log item.
    pub multiplier: String,

    /// Output tokens field on admin record log item.
    #[serde(rename = "outputTokens")]
    pub output_tokens: String,

    /// Path field on admin record log item.
    pub path: String,

    /// Provider native model field on admin record log item.
    #[serde(rename = "providerNativeModel")]
    pub provider_native_model: String,

    /// Reasoning effort field on admin record log item.
    #[serde(rename = "reasoningEffort")]
    pub reasoning_effort: String,

    /// Deployment region used by the selected endpoint and pricing resolver. This is not part of the model catalog identity.
    #[serde(rename = "regionCode")]
    pub region_code: String,

    /// Request id field on admin record log item.
    #[serde(rename = "requestId")]
    pub request_id: String,

    /// Requested model catalog key field on admin record log item.
    #[serde(rename = "requestedModelCatalogKey")]
    pub requested_model_catalog_key: String,

    /// Status field on admin record log item.
    pub status: String,

    /// Time field on admin record log item.
    pub time: String,

    /// Token name field on admin record log item.
    #[serde(rename = "tokenName")]
    pub token_name: String,

    /// Total time field on admin record log item.
    #[serde(rename = "totalTime")]
    pub total_time: String,

    /// Ttft field on admin record log item.
    pub ttft: String,

    /// Type field on admin record log item.
    pub r#type: String,

    /// User field on admin record log item.
    pub user: String,

    /// Full HTTP User-Agent header captured from the gateway request. Empty when the client omitted the header.
    #[serde(rename = "userAgent")]
    pub user_agent: String,
}
