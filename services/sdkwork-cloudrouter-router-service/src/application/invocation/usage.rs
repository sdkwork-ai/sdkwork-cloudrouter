use crate::application::{BillingStructure, PriceResolution, PricingAuditSnapshot};
use crate::domain::{BillingMeter, Money, PricingRateMetadata};
use crate::ports::{GatewayUsageQuantity, GatewayUsageRecordCommand};

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct InvocationUsage {
    pub request_count: i64,
    pub lines: Vec<InvocationUsageLine>,
    pub pricing_quotes: Vec<InvocationPricingQuote>,
    /// Full price resolutions captured once by the pricing preflight, keyed by
    /// meter. Usage recording and settlement must consume these resolutions —
    /// the single price object that flows through the whole pipeline — instead
    /// of re-reading prices independently.
    pub preflight_resolutions: Vec<InvocationPreflightResolution>,
    pub settlement_commands: Vec<GatewayUsageRecordCommand>,
    pub trace_recorded: bool,
    pub recording_failure_count: usize,
    /// Usage facts that could not be persisted or durably queued. Billing
    /// must not mark such a request settled because doing so would lose the
    /// provider charge permanently.
    pub usage_recording_failure_count: usize,
}

impl InvocationUsage {
    pub fn add_line(&mut self, line: InvocationUsageLine) {
        self.lines.push(line);
    }

    pub fn add_pricing_quote(&mut self, quote: InvocationPricingQuote) {
        if self.pricing_quotes.iter().any(|existing| {
            existing.meter == quote.meter
                && existing.catalog_key == quote.catalog_key
                && existing.supplier_code == quote.supplier_code
                && existing.account_id == quote.account_id
                && existing.region_code == quote.region_code
                && quote_rate_hash(existing) == quote_rate_hash(&quote)
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

    /// Retains the preflight price resolution for a meter, replacing any
    /// earlier resolution for the same meter.
    pub fn add_preflight_resolution(&mut self, resolution: InvocationPreflightResolution) {
        if let Some(existing) = self
            .preflight_resolutions
            .iter_mut()
            .find(|existing| existing.meter == resolution.meter)
        {
            *existing = resolution;
            return;
        }
        self.preflight_resolutions.push(resolution);
    }

    pub fn preflight_resolution_for_meter(&self, meter: &BillingMeter) -> Option<&PriceResolution> {
        self.preflight_resolutions
            .iter()
            .find(|existing| &existing.meter == meter)
            .map(|existing| &existing.resolution)
    }
}

/// One meter's price resolution captured by the pricing preflight. This is
/// the authoritative price object for the invocation: precharge estimation
/// and settlement both derive from it, and finalization verifies its usage
/// lines against it instead of re-reading prices from scratch.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationPreflightResolution {
    pub meter: BillingMeter,
    pub resolution: PriceResolution,
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
    pub pricing_resolution: Option<PriceResolution>,
}

impl InvocationUsageLine {
    pub fn new(meter: BillingMeter, quantity: GatewayUsageQuantity) -> Self {
        Self {
            role: usage_line_role_for_meter(&meter),
            meter,
            quantity,
            requested_model_catalog_key: None,
            pricing_quote: None,
            pricing_resolution: None,
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
    pub supplier_code: Option<String>,
    pub account_id: Option<i64>,
    pub region_code: String,
    pub meter: BillingMeter,
    pub unit_size: String,
    pub official_reference_unit_price: Money,
    pub raw_upstream_cost_unit_price: Option<Money>,
    pub procurement_cost_unit_price: Option<Money>,
    pub account_contract_cost_multiplier: Option<String>,
    pub account_group_cost_multiplier: Option<String>,
    pub procurement_cost_multiplier: Option<String>,
    pub customer_charge_before_sale_multiplier: Money,
    pub customer_charge_unit_price: Money,
    pub sale_multiplier: String,
    pub reference_multiplier: String,
    pub pricing_plan_code: String,
    pub group_code: String,
    pub rate_metadata: Option<PricingRateMetadata>,
    pub billing: Option<BillingStructure>,
    pub pricing_audit_snapshot: PricingAuditSnapshot,
}

fn quote_rate_hash(quote: &InvocationPricingQuote) -> Option<&str> {
    quote
        .rate_metadata
        .as_ref()
        .map(|metadata| metadata.rate_hash.as_str())
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
