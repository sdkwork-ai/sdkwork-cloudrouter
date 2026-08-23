use std::sync::Arc;

use super::{
    BillingMode, BillingQuantitySource, DispatchMode, Invocation, InvocationBody, InvocationError,
    InvocationErrorKind, InvocationFuture, InvocationInterceptor, InvocationPricingQuote,
    InvocationUsageLine,
};
use crate::application::{
    PriceResolution, PriceResolutionStatus, PriceService, ResolvedModelPrice,
};
use crate::domain::{
    AiRouteModelRequirement, BillingMeter, DecimalValue, PricingDimensionContext,
    ResourceDefinition,
};
use crate::ports::PricingCatalog;

#[derive(Clone)]
pub struct PricingPreflightInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    catalog: Arc<C>,
}

#[derive(Clone)]
pub struct PricingFinalizationInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    catalog: Arc<C>,
}

impl<C> PricingPreflightInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    pub fn new(catalog: Arc<C>) -> Self {
        Self { catalog }
    }
}

impl<C> PricingFinalizationInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    pub fn new(catalog: Arc<C>) -> Self {
        Self { catalog }
    }
}

impl<C> InvocationInterceptor for PricingPreflightInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    fn name(&self) -> &str {
        "pricing_preflight"
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if invocation.dispatch.mode == DispatchMode::SyntheticLocalResponse {
                return Ok(());
            }
            if !invocation.billing.pricing_required || invocation.billing.mode == BillingMode::Free
            {
                return Ok(());
            }

            let price_service = PriceService::new();
            let meters = meters_for_pricing(invocation);
            for meter in meters {
                let resolution = resolve_price(
                    &price_service,
                    self.catalog.as_ref(),
                    invocation,
                    meter.clone(),
                    None,
                    None,
                )?;
                if matches!(
                    resolution.status,
                    PriceResolutionStatus::Quoted | PriceResolutionStatus::Rated
                ) {
                    invocation
                        .usage
                        .add_pricing_quote(quote_from_resolution(invocation, resolution, false));
                }
            }

            if invocation.billing.quantity_source == BillingQuantitySource::FixedRequest
                && !invocation
                    .usage
                    .lines
                    .iter()
                    .any(|line| line.meter == BillingMeter::ApiRequest)
            {
                invocation
                    .usage
                    .add_line(InvocationUsageLine::fixed_request());
            }

            Ok(())
        })
    }
}

impl<C> InvocationInterceptor for PricingFinalizationInterceptor<C>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    fn name(&self) -> &str {
        "pricing_finalization"
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if !invocation.billing.pricing_required
                || invocation.billing.mode == BillingMode::Free
                || invocation.usage.lines.is_empty()
            {
                return Ok(());
            }

            let price_service = PriceService::new();
            let line_pricing: Vec<_> = invocation
                .usage
                .lines
                .iter()
                .map(|line| {
                    let resolution = resolve_price(
                        &price_service,
                        self.catalog.as_ref(),
                        invocation,
                        line.meter.clone(),
                        line.requested_model_catalog_key.as_deref(),
                        Some(line),
                    )?;
                    let quote = matches!(
                        resolution.status,
                        PriceResolutionStatus::Quoted | PriceResolutionStatus::Rated
                    )
                    .then(|| {
                        quote_from_resolution(
                            invocation,
                            resolution.clone(),
                            line.requested_model_catalog_key.is_some(),
                        )
                    });
                    Ok::<_, InvocationError>((resolution, quote))
                })
                .collect::<Result<Vec<_>, _>>()?;
            for (line, (resolution, quote)) in invocation.usage.lines.iter_mut().zip(line_pricing) {
                line.pricing_quote = quote;
                line.pricing_resolution = Some(resolution);
            }
            let pricing_quotes = dedupe_quotes(
                invocation
                    .usage
                    .lines
                    .iter()
                    .filter_map(|line| line.pricing_quote.as_ref()),
            );
            invocation.usage.pricing_quotes = pricing_quotes;
            Ok(())
        })
    }
}

/// Returns billing meters that require pricing resolution based on the billing mode.
fn meters_for_pricing(invocation: &Invocation) -> Vec<BillingMeter> {
    let mut meters = Vec::new();
    match invocation.billing.mode {
        BillingMode::Free => {}
        BillingMode::Composite => {
            if let Some(meter) = invocation.billing.meter.clone() {
                meters.push(meter);
            }
            meters.push(BillingMeter::LlmOutputToken);
            meters.push(BillingMeter::LlmCacheReadToken);
        }
        BillingMode::ExternalUsageLine => match invocation.billing.quantity_source {
            BillingQuantitySource::FixedRequest => {
                meters.push(BillingMeter::ApiRequest);
            }
            BillingQuantitySource::AdapterUsageLines => {
                meters.push(BillingMeter::ApiResult);
                meters.push(BillingMeter::ApiItem);
                meters.push(BillingMeter::ApiRequest);
            }
            _ => {
                if let Some(meter) = invocation.billing.meter.clone() {
                    meters.push(meter);
                }
                meters.push(BillingMeter::ApiResult);
                meters.push(BillingMeter::ApiItem);
                meters.push(BillingMeter::ApiRequest);
            }
        },
        _ => {
            if let Some(meter) = invocation.billing.meter.clone() {
                meters.push(meter);
            }
        }
    }
    dedupe_meters(meters)
}

fn dedupe_meters(meters: Vec<BillingMeter>) -> Vec<BillingMeter> {
    let mut deduped = Vec::new();
    for meter in meters {
        if !deduped.contains(&meter) {
            deduped.push(meter);
        }
    }
    deduped
}

fn dedupe_quotes<'a>(
    quotes: impl IntoIterator<Item = &'a InvocationPricingQuote>,
) -> Vec<InvocationPricingQuote> {
    let mut deduped = Vec::new();
    for quote in quotes {
        if deduped.iter().any(|existing: &InvocationPricingQuote| {
            existing.meter == quote.meter
                && existing.catalog_key == quote.catalog_key
                && existing.supplier_code == quote.supplier_code
                && existing.account_id == quote.account_id
                && existing.region_code == quote.region_code
                && quote_rate_hash(existing) == quote_rate_hash(quote)
        }) {
            continue;
        }
        deduped.push(quote.clone());
    }
    deduped
}

fn resolve_price<C>(
    price_service: &PriceService,
    catalog: &C,
    invocation: &Invocation,
    meter: BillingMeter,
    catalog_key_override: Option<&str>,
    usage_line: Option<&InvocationUsageLine>,
) -> Result<PriceResolution, InvocationError>
where
    C: PricingCatalog + Send + Sync + 'static,
{
    let account = invocation
        .account
        .as_ref()
        .ok_or_else(|| pricing_error("pricing requires resolved invocation account"))?;
    let api_key_id = invocation
        .subject
        .api_key_id
        .ok_or_else(|| pricing_error("pricing requires api key context"))?;
    let catalog_key = priced_catalog_key(invocation, catalog_key_override)?;
    let dimensions = pricing_dimensions(invocation, &meter, usage_line);
    let mut resource = ResourceDefinition::new(catalog_key.clone(), meter, invocation.occurred_at)
        .with_pricing_subject(
            api_key_id,
            account
                .account_group_id
                .or(invocation.subject.account_group_id),
        )
        .with_vendor_code(catalog_vendor_code(&catalog_key))
        .with_provider(account.supplier_code.clone(), Some(account.account_id))
        .with_region_code(account.region_code.clone())
        .with_api_code(invocation.resource.api_code.clone())
        // product/operation code 不在此处推断填充：条件定价（rate_metadata）
        // 的 product_code/operation_code 以定价目录为准，若用模型名/api_code
        // 强塞会导致 resource_mismatch 将合法条件价格误判为不匹配。
        // 与 openai_usage.rs 的 resource 构造保持一致（字段保持 None）。
        .with_dimensions(dimensions);
    if let Some(model) = invocation.resource.requested_model.as_deref() {
        resource = resource.with_model(model);
    }
    if let Some(line) = usage_line {
        resource = resource.with_measured_quantity(
            DecimalValue::parse(&line.quantity.billable_quantity)
                .map_err(|error| pricing_error(error.to_string()))?,
        );
    } else if invocation.billing.quantity_source == BillingQuantitySource::FixedRequest {
        resource = resource.with_measured_quantity(DecimalValue::ONE);
    }
    price_service
        .resolve(catalog, resource)
        .map_err(|error| pricing_error(error.to_string()))
}

fn priced_catalog_key(
    invocation: &Invocation,
    catalog_key_override: Option<&str>,
) -> Result<String, InvocationError> {
    if let Some(catalog_key) = catalog_key_override
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return Ok(catalog_key.to_owned());
    }
    if should_price_by_route_key_only(invocation) {
        return route_key_catalog_key(invocation);
    }

    [
        invocation.resource.requested_model_catalog_key.as_deref(),
        invocation.resource.requested_model.as_deref(),
        Some(invocation.resource.route_key.as_str()),
        Some(invocation.resource.api_code.as_str()),
    ]
    .into_iter()
    .flatten()
    .map(str::trim)
    .find(|value| !value.is_empty())
    .map(str::to_owned)
    .ok_or_else(|| pricing_error("pricing requires a resource catalog key"))
}

pub(super) fn quote_from_resolution(
    invocation: &Invocation,
    resolution: PriceResolution,
    catalog_key_override: bool,
) -> InvocationPricingQuote {
    let resolved = resolution
        .resolved_price
        .as_ref()
        .expect("quoted and rated resolutions contain a resolved price");
    InvocationPricingQuote {
        catalog_key: resolved.official_reference.catalog_key.clone(),
        requested_model: priced_requested_model(invocation, resolved, catalog_key_override),
        supplier_code: resolved.supplier_code.clone(),
        account_id: invocation
            .account
            .as_ref()
            .map(|account| account.account_id),
        region_code: resolved.official_reference.region_code.clone(),
        meter: resolved.billing_meter.clone(),
        unit_size: resolved.official_reference.unit_size.to_fixed_string(0),
        official_reference_unit_price: resolved.official_reference.unit_price.clone(),
        raw_upstream_cost_unit_price: resolved
            .raw_upstream_cost
            .as_ref()
            .map(|price| price.unit_price.clone()),
        procurement_cost_unit_price: resolved.procurement_cost.clone(),
        account_contract_cost_multiplier: resolved
            .account_contract_cost_multiplier
            .map(|value| value.to_fixed_string(6)),
        account_group_cost_multiplier: resolved
            .account_group_cost_multiplier
            .map(|value| value.to_fixed_string(6)),
        procurement_cost_multiplier: resolved
            .procurement_cost_multiplier
            .map(|value| value.to_fixed_string(6)),
        customer_charge_before_sale_multiplier: resolved
            .customer_charge_before_sale_multiplier
            .clone(),
        customer_charge_unit_price: resolved.customer_charge.clone(),
        sale_multiplier: resolved.sale_multiplier.to_fixed_string(6),
        reference_multiplier: resolved.reference_multiplier.to_fixed_string(6),
        pricing_plan_code: resolved.pricing_plan_code.clone(),
        group_code: resolved.group_code.clone(),
        rate_metadata: resolved.official_reference.rate_metadata.clone(),
        billing: resolution.billing,
        pricing_audit_snapshot: resolution.audit_snapshot,
    }
}

fn catalog_vendor_code(catalog_key: &str) -> &str {
    catalog_key
        .split_once('/')
        .map(|(vendor_code, _)| vendor_code)
        .unwrap_or("")
}

fn pricing_dimensions(
    invocation: &Invocation,
    meter: &BillingMeter,
    usage_line: Option<&InvocationUsageLine>,
) -> PricingDimensionContext {
    let mut dimensions = PricingDimensionContext::new()
        .with_value(
            "api_code",
            serde_json::json!(invocation.resource.api_code.as_str()),
        )
        .with_value(
            "operation_id",
            serde_json::json!(invocation.resource.operation_id.as_deref()),
        );
    if let InvocationBody::Json(body) = &invocation.request.body {
        for (dimension_code, pointers) in [
            ("tier_code", &["/tier_code", "/service_tier", "/tier"][..]),
            ("quality", &["/quality", "/output/quality"][..]),
            ("resolution", &["/resolution", "/size", "/output/size"][..]),
            (
                "duration_seconds",
                &["/duration_seconds", "/duration", "/seconds"][..],
            ),
            ("result_count", &["/result_count", "/n"][..]),
            ("media_type", &["/media_type"][..]),
            ("input_type", &["/input_type"][..]),
            ("output_type", &["/output_type"][..]),
            ("context_tokens", &["/context_tokens"][..]),
        ] {
            if let Some(value) = pointers.iter().find_map(|pointer| body.pointer(pointer)) {
                dimensions.insert(dimension_code, value.clone());
            }
        }
    }
    add_meter_dimensions(&mut dimensions, meter, usage_line);
    if dimensions.get("context_tokens").is_none() {
        let context_tokens = invocation
            .usage
            .lines
            .iter()
            .filter(|line| {
                matches!(
                    line.meter,
                    BillingMeter::LlmInputToken
                        | BillingMeter::LlmCacheReadToken
                        | BillingMeter::LlmCacheWriteToken
                )
            })
            .filter_map(|line| line.quantity.billable_quantity.parse::<i64>().ok())
            .fold(0_i64, i64::saturating_add);
        if context_tokens > 0 {
            dimensions.insert("context_tokens", serde_json::json!(context_tokens));
        }
    }
    dimensions
}

fn add_meter_dimensions(
    dimensions: &mut PricingDimensionContext,
    meter: &BillingMeter,
    usage_line: Option<&InvocationUsageLine>,
) {
    let media_type = match meter {
        BillingMeter::ImageInputToken
        | BillingMeter::ImageOutputToken
        | BillingMeter::ImageResult
        | BillingMeter::ImagePixel
        | BillingMeter::ImageMegapixel
        | BillingMeter::EmbeddingImage => Some("image"),
        BillingMeter::AudioInputToken
        | BillingMeter::AudioOutputToken
        | BillingMeter::AudioInputSecond
        | BillingMeter::AudioOutputSecond
        | BillingMeter::AudioInputMinute
        | BillingMeter::AudioOutputMinute
        | BillingMeter::SttAudioMinute
        | BillingMeter::MusicOutputSecond
        | BillingMeter::SfxResult => Some("audio"),
        BillingMeter::VideoInputToken
        | BillingMeter::VideoOutputToken
        | BillingMeter::VideoInputSecond
        | BillingMeter::VideoOutputSecond
        | BillingMeter::VideoResult => Some("video"),
        _ => None,
    };
    if let Some(media_type) = media_type {
        dimensions.insert("media_type", serde_json::json!(media_type));
    }
    let Some(line) = usage_line else {
        return;
    };
    if line.quantity.result_count > 0 {
        dimensions.insert(
            "result_count",
            serde_json::json!(line.quantity.result_count),
        );
    }
    if line.quantity.image_count > 0 {
        dimensions.insert("image_count", serde_json::json!(line.quantity.image_count));
    }
    if let Some(duration) = line
        .quantity
        .video_seconds
        .as_deref()
        .or(line.quantity.audio_seconds.as_deref())
    {
        dimensions.insert("duration_seconds", serde_json::json!(duration));
    }
    match meter {
        BillingMeter::ImageInputToken
        | BillingMeter::AudioInputToken
        | BillingMeter::AudioInputSecond
        | BillingMeter::AudioInputMinute
        | BillingMeter::VideoInputToken
        | BillingMeter::VideoInputSecond => {
            if let Some(media_type) = media_type {
                dimensions.insert("input_type", serde_json::json!(media_type));
            }
        }
        BillingMeter::ImageOutputToken
        | BillingMeter::ImageResult
        | BillingMeter::AudioOutputToken
        | BillingMeter::AudioOutputSecond
        | BillingMeter::AudioOutputMinute
        | BillingMeter::MusicOutputSecond
        | BillingMeter::SfxResult
        | BillingMeter::VideoOutputToken
        | BillingMeter::VideoOutputSecond
        | BillingMeter::VideoResult => {
            if let Some(media_type) = media_type {
                dimensions.insert("output_type", serde_json::json!(media_type));
            }
        }
        _ => {}
    }
}

fn quote_rate_hash(quote: &InvocationPricingQuote) -> Option<&str> {
    quote
        .rate_metadata
        .as_ref()
        .map(|metadata| metadata.rate_hash.as_str())
}

fn priced_requested_model(
    invocation: &Invocation,
    resolved: &ResolvedModelPrice,
    catalog_key_override: bool,
) -> String {
    if should_price_by_route_key_only(invocation) || catalog_key_override {
        return resolved.model.clone();
    }
    invocation
        .resource
        .requested_model
        .clone()
        .unwrap_or_else(|| resolved.model.clone())
}

fn pricing_error(message: impl Into<String>) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Pricing, message)
}

fn should_price_by_route_key_only(invocation: &Invocation) -> bool {
    if invocation.resource.model_requirement == AiRouteModelRequirement::Ignored {
        return true;
    }
    invocation.resource.model_requirement == AiRouteModelRequirement::Optional
        && invocation
            .resource
            .requested_model
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .is_none()
}

fn route_key_catalog_key(invocation: &Invocation) -> Result<String, InvocationError> {
    [
        Some(invocation.resource.route_key.as_str()),
        Some(invocation.resource.api_code.as_str()),
    ]
    .into_iter()
    .flatten()
    .map(str::trim)
    .find(|value| !value.is_empty())
    .map(str::to_owned)
    .ok_or_else(|| pricing_error("pricing requires a resource catalog key"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::{PriceResolutionStatus, PricingAuditSnapshot, ResourceBillability};
    use crate::domain::Money;

    fn quote(
        meter: BillingMeter,
        requested_model: &str,
        pricing_plan_code: &str,
    ) -> InvocationPricingQuote {
        let price = Money::usd("0.100000").expect("valid test price");
        InvocationPricingQuote {
            catalog_key: "openai/gpt-4o-mini".to_owned(),
            requested_model: requested_model.to_owned(),
            supplier_code: Some("openrouter".to_owned()),
            account_id: Some(3001),
            region_code: "global".to_owned(),
            meter,
            unit_size: "1".to_owned(),
            official_reference_unit_price: price.clone(),
            raw_upstream_cost_unit_price: Some(price.clone()),
            procurement_cost_unit_price: Some(price.clone()),
            account_contract_cost_multiplier: Some("1.000000".to_owned()),
            account_group_cost_multiplier: Some("1.000000".to_owned()),
            procurement_cost_multiplier: Some("1.000000".to_owned()),
            customer_charge_before_sale_multiplier: price.clone(),
            customer_charge_unit_price: price,
            sale_multiplier: "1.000000".to_owned(),
            reference_multiplier: "1.000000".to_owned(),
            pricing_plan_code: pricing_plan_code.to_owned(),
            group_code: "standard-group".to_owned(),
            rate_metadata: None,
            billing: None,
            pricing_audit_snapshot: PricingAuditSnapshot {
                resource: ResourceDefinition::new(
                    "openai/gpt-4o-mini",
                    BillingMeter::LlmInputToken,
                    chrono::Utc::now(),
                ),
                status: PriceResolutionStatus::Quoted,
                billability: ResourceBillability::Chargeable,
                rate_identity: None,
                strategy: None,
                failure: None,
            },
        }
    }

    #[test]
    fn dedupe_quotes_keeps_the_first_matching_quote_and_input_order() {
        let first = quote(BillingMeter::LlmInputToken, "first-model", "first-plan");
        let duplicate = quote(BillingMeter::LlmInputToken, "later-model", "later-plan");
        let next = quote(BillingMeter::LlmOutputToken, "output-model", "output-plan");

        let deduped = dedupe_quotes([&first, &duplicate, &next]);

        assert_eq!(2, deduped.len());
        assert_eq!(BillingMeter::LlmInputToken, deduped[0].meter);
        assert_eq!("first-model", deduped[0].requested_model);
        assert_eq!("first-plan", deduped[0].pricing_plan_code);
        assert_eq!(BillingMeter::LlmOutputToken, deduped[1].meter);
        assert_eq!("output-model", deduped[1].requested_model);
    }
}
