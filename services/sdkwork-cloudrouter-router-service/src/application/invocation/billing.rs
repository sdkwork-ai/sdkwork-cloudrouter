use crate::domain::BillingMeter;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BillingMode {
    Free,
    ApiRequest,
    Token,
    ResultCount,
    ItemCount,
    Character,
    AudioSecond,
    VideoSecond,
    Storage,
    Bandwidth,
    Composite,
    ExternalUsageLine,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BillingQuantitySource {
    None,
    FixedRequest,
    RequestBody,
    ResponseBody,
    ResponseHeaders,
    AdapterUsageLines,
    StreamingAccumulator,
    Composite,
}

/// What the provider response must contain for a fixed-request charge to apply.
///
/// A per-request price assumes every 2xx call costs the upstream something. That
/// is not true for every vendor: DeepSeek bills its standalone web tools "per
/// successful request", and defines success as *producing a result* — Search must
/// return a non-empty `results` array and Fetch must return a non-empty Markdown
/// body. An empty 200 is free upstream, so charging the customer for it would
/// make the relay collect for a call it never paid for. The gate keeps that
/// decision on the billing record itself instead of special-casing api codes
/// inside the settlement interceptors.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum BillingResultGate {
    /// Any 2xx response is billable (the default for every other request-billed route).
    #[default]
    Any,
    /// Bill only when the response carries a non-empty `results` array.
    NonEmptyResults,
    /// Bill only when the response carries a non-empty `content` string.
    NonEmptyContent,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationBilling {
    pub mode: BillingMode,
    pub meter: Option<BillingMeter>,
    pub quantity_source: BillingQuantitySource,
    pub pricing_required: bool,
    /// Whether the invocation must produce a settlement after dispatch.
    ///
    /// 这里**没有**"是否需要预扣"的开关：预扣由账号的
    /// `AccountBillingMode`（Prepay / Postpay）决定，见
    /// `BillingTransactionInterceptor::before`。端点层面无权关掉预扣。
    pub settlement_required: bool,
    /// Provider-result precondition for a fixed-request charge. `Any` keeps the
    /// historical "every successful call is billable" behavior.
    pub result_gate: BillingResultGate,
}

impl InvocationBilling {
    pub fn free() -> Self {
        Self {
            mode: BillingMode::Free,
            meter: None,
            quantity_source: BillingQuantitySource::None,
            pricing_required: false,
            settlement_required: false,
            result_gate: BillingResultGate::Any,
        }
    }

    pub fn api_request(meter: BillingMeter) -> Self {
        Self {
            mode: BillingMode::ApiRequest,
            meter: Some(meter),
            quantity_source: BillingQuantitySource::FixedRequest,
            pricing_required: true,
            settlement_required: true,
            result_gate: BillingResultGate::Any,
        }
    }

    pub fn composite(meter: BillingMeter) -> Self {
        Self {
            mode: BillingMode::Composite,
            meter: Some(meter),
            quantity_source: BillingQuantitySource::Composite,
            pricing_required: true,
            settlement_required: true,
            result_gate: BillingResultGate::Any,
        }
    }
}
