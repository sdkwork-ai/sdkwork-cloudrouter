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

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationBilling {
    pub mode: BillingMode,
    pub meter: Option<BillingMeter>,
    pub quantity_source: BillingQuantitySource,
    pub pricing_required: bool,
    pub settlement_required: bool,
    pub prepaid_required: bool,
}

impl InvocationBilling {
    pub fn free() -> Self {
        Self {
            mode: BillingMode::Free,
            meter: None,
            quantity_source: BillingQuantitySource::None,
            pricing_required: false,
            settlement_required: false,
            prepaid_required: false,
        }
    }

    pub fn api_request(meter: BillingMeter) -> Self {
        Self {
            mode: BillingMode::ApiRequest,
            meter: Some(meter),
            quantity_source: BillingQuantitySource::FixedRequest,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        }
    }

    pub fn composite(meter: BillingMeter) -> Self {
        Self {
            mode: BillingMode::Composite,
            meter: Some(meter),
            quantity_source: BillingQuantitySource::Composite,
            pricing_required: true,
            settlement_required: true,
            prepaid_required: false,
        }
    }
}
