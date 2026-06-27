use serde::{Deserialize, Serialize};

/// Usage log item schema exposed by Claw Router.
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct UsageLogItem {
    /// Base input price field on usage log item.
    #[serde(rename = "baseInputPrice")]
    pub base_input_price: String,

    /// Base output price field on usage log item.
    #[serde(rename = "baseOutputPrice")]
    pub base_output_price: String,

    /// Cache read price field on usage log item.
    #[serde(rename = "cacheReadPrice")]
    pub cache_read_price: String,

    /// Cache read tokens field on usage log item.
    #[serde(rename = "cacheReadTokens")]
    pub cache_read_tokens: String,

    /// Customer-facing spend amount for the request, normalized to 9 decimal places for console display. Uses customer_charge_amount from the usage ledger and never exposes upstream cost fields.
    pub cost: String,

    /// Error code field on usage log item.
    #[serde(rename = "errorCode")]
    pub error_code: String,

    /// Error message field on usage log item.
    #[serde(rename = "errorMessage")]
    pub error_message: String,

    /// Error type field on usage log item.
    #[serde(rename = "errorType")]
    pub error_type: String,

    /// Maintained channel group display name. Falls back to the recorded group snapshot when the group has been removed or renamed outside the read model.
    pub group: String,

    /// Http status field on usage log item.
    #[serde(rename = "httpStatus")]
    pub http_status: String,

    /// Id field on usage log item.
    pub id: String,

    /// Input tokens field on usage log item.
    #[serde(rename = "inputTokens")]
    pub input_tokens: String,

    /// Ip field on usage log item.
    pub ip: String,

    /// Is stream field on usage log item.
    #[serde(rename = "isStream")]
    pub is_stream: bool,

    /// Provider native model id used in the upstream provider request, kept as the visible model value for usage tables.
    pub model: String,

    /// Multiplier field on usage log item.
    pub multiplier: String,

    /// Output tokens field on usage log item.
    #[serde(rename = "outputTokens")]
    pub output_tokens: String,

    /// Path field on usage log item.
    pub path: String,

    /// Provider native model id, for example gpt-5.5.
    #[serde(rename = "providerNativeModel")]
    pub provider_native_model: String,

    /// Reasoning effort field on usage log item.
    #[serde(rename = "reasoningEffort")]
    pub reasoning_effort: String,

    /// Deployment region used by the selected endpoint and pricing resolver. This is not part of the model catalog identity.
    #[serde(rename = "regionCode")]
    pub region_code: String,

    /// Request id field on usage log item.
    #[serde(rename = "requestId")]
    pub request_id: String,

    /// Routed base catalog model identity in vendor/model form, for example openai/gpt-5.5. Region-specific pricing or ranking keys are stored separately from the routed model identity.
    #[serde(rename = "requestedModelCatalogKey")]
    pub requested_model_catalog_key: String,

    /// Status field on usage log item.
    pub status: String,

    /// Time field on usage log item.
    pub time: String,

    /// Token name field on usage log item.
    #[serde(rename = "tokenName")]
    pub token_name: String,

    /// Total time field on usage log item.
    #[serde(rename = "totalTime")]
    pub total_time: String,

    /// Ttft field on usage log item.
    pub ttft: String,

    /// Type field on usage log item.
    pub r#type: String,

    /// Full HTTP User-Agent header captured from the gateway request. Empty when the client omitted the header.
    #[serde(rename = "userAgent")]
    pub user_agent: String,
}
