use crate::domain::{BillingMeter, Money};
use crate::ports::{GatewayUsageQuantity, GatewayUsageRecordCommand};

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct InvocationUsage {
    pub request_count: i64,
    pub lines: Vec<InvocationUsageLine>,
    pub pricing_quotes: Vec<InvocationPricingQuote>,
    pub settlement_commands: Vec<GatewayUsageRecordCommand>,
    pub trace_recorded: bool,
    pub recording_failure_count: usize,
}

impl InvocationUsage {
    pub fn add_line(&mut self, line: InvocationUsageLine) {
        self.lines.push(line);
    }

    pub fn add_pricing_quote(&mut self, quote: InvocationPricingQuote) {
        if self.pricing_quotes.iter().any(|existing| {
            existing.meter == quote.meter
                && existing.catalog_key == quote.catalog_key
                && existing.provider_code == quote.provider_code
                && existing.channel_id == quote.channel_id
                && existing.region_code == quote.region_code
        }) {
            return;
        }
        self.pricing_quotes.push(quote);
    }

    pub fn quote_for_meter(&self, meter: &BillingMeter) -> Option<&InvocationPricingQuote> {
        self.pricing_quotes
            .iter()
            .find(|quote| &quote.meter == meter)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InvocationUsageLineRole {
    Request,
    Input,
    Output,
    CacheRead,
    CacheWrite,
    Result,
    Adapter,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationUsageLine {
    pub meter: BillingMeter,
    pub quantity: GatewayUsageQuantity,
    pub role: InvocationUsageLineRole,
    pub requested_model_catalog_key: Option<String>,
    pub pricing_quote: Option<InvocationPricingQuote>,
}

impl InvocationUsageLine {
    pub fn new(meter: BillingMeter, quantity: GatewayUsageQuantity) -> Self {
        Self {
            role: usage_line_role_for_meter(&meter),
            meter,
            quantity,
            requested_model_catalog_key: None,
            pricing_quote: None,
        }
    }

    pub fn fixed_request() -> Self {
        Self::new(
            BillingMeter::ApiRequest,
            GatewayUsageQuantity::single_request(),
        )
    }

    pub fn with_pricing_quote(mut self, quote: InvocationPricingQuote) -> Self {
        self.pricing_quote = Some(quote);
        self
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationPricingQuote {
    pub catalog_key: String,
    pub requested_model: String,
    pub provider_code: Option<String>,
    pub channel_id: Option<i64>,
    pub region_code: String,
    pub meter: BillingMeter,
    pub official_reference_unit_price: Money,
    pub upstream_cost_unit_price: Option<Money>,
    pub customer_charge_before_rate: Money,
    pub customer_charge_unit_price: Money,
    pub rate_multiplier: String,
    pub reference_multiplier: String,
    pub pricing_plan_code: String,
    pub group_code: String,
}

fn usage_line_role_for_meter(meter: &BillingMeter) -> InvocationUsageLineRole {
    match meter {
        BillingMeter::ApiRequest
        | BillingMeter::ToolCall
        | BillingMeter::WebSearchCall
        | BillingMeter::FileSearchCall
        | BillingMeter::CodeInterpreterSession
        | BillingMeter::ContainerSession => InvocationUsageLineRole::Request,
        BillingMeter::LlmOutputToken
        | BillingMeter::AudioOutputToken
        | BillingMeter::ImageOutputToken
        | BillingMeter::VideoOutputToken => InvocationUsageLineRole::Output,
        BillingMeter::LlmCacheReadToken => InvocationUsageLineRole::CacheRead,
        BillingMeter::LlmCacheWriteToken => InvocationUsageLineRole::CacheWrite,
        BillingMeter::ImageResult | BillingMeter::VideoResult | BillingMeter::SfxResult => {
            InvocationUsageLineRole::Result
        }
        BillingMeter::AudioInputSecond
        | BillingMeter::AudioOutputSecond
        | BillingMeter::AudioInputMinute
        | BillingMeter::AudioOutputMinute
        | BillingMeter::MusicOutputSecond
        | BillingMeter::VideoInputSecond
        | BillingMeter::VideoOutputSecond => InvocationUsageLineRole::Result,
        BillingMeter::ApiResult | BillingMeter::ApiItem => InvocationUsageLineRole::Adapter,
        _ => InvocationUsageLineRole::Input,
    }
}
