use std::sync::Arc;

use super::{
    BillingMode, BillingQuantitySource, DispatchMode, Invocation, InvocationAccount,
    InvocationError, InvocationErrorKind, InvocationFuture, InvocationInterceptor,
    InvocationPricingQuote, InvocationUsageLine,
};
use crate::application::{PricingResolver, ResolveModelPriceQuery, ResolvedModelPrice};
use crate::domain::{AiRouteModelRequirement, BillingMeter};
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

            let meters = meters_for_pricing(invocation);
            for meter in meters {
                match resolve_quote(self.catalog.as_ref(), invocation, meter.clone(), None) {
                    Ok(quote) => invocation.usage.add_pricing_quote(quote),
                    Err(error) if optional_meter(&meter, invocation.billing.mode.clone()) => {
                        if is_missing_official_price(&error) {
                            continue;
                        }
                        return Err(error);
                    }
                    Err(error) => return Err(error),
                }
            }

            if invocation.billing.quantity_source == BillingQuantitySource::FixedRequest
                && !invocation.usage.pricing_quotes.is_empty()
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

            let line_quotes: Vec<_> = invocation
                .usage
                .lines
                .iter()
                .map(|line| {
                    if let Some(quote) = preflight_quote_for_line(
                        &invocation.usage.pricing_quotes,
                        invocation.account.as_ref(),
                        invocation.resource.requested_model.as_deref(),
                        line,
                    ) {
                        return Ok(Some(quote));
                    }
                    match resolve_quote(
                        self.catalog.as_ref(),
                        invocation,
                        line.meter.clone(),
                        line.requested_model_catalog_key.as_deref(),
                    ) {
                        Ok(quote) => Ok(Some(quote)),
                        Err(error)
                            if optional_meter(&line.meter, invocation.billing.mode.clone())
                                && is_missing_official_price(&error) =>
                        {
                            Ok(None)
                        }
                        Err(error) => Err(error),
                    }
                })
                .collect::<Result<Vec<_>, _>>()?;
            for (line, quote) in invocation.usage.lines.iter_mut().zip(line_quotes) {
                line.pricing_quote = quote;
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

/// Reuses a preflight pricing quote for a usage line when the line carries no
/// catalog-key override, a quote for the same meter already exists, and the
/// pricing context is unchanged since preflight.
///
/// The finalization resolution for such a line derives the model from the same
/// invocation context as the preflight step, so it produces the identical
/// quote; skipping it removes three `PricingResolver` passes from the chat hot
/// path. The account identity and requested model are compared so a mid-flight
/// context change (for example a dispatch failover to a different upstream
/// account with its own procurement cost) still requotes. Lines with an
/// explicit `requested_model_catalog_key` keep resolving so their
/// `requested_model` semantics stay exact.
fn preflight_quote_for_line(
    pricing_quotes: &[InvocationPricingQuote],
    account: Option<&InvocationAccount>,
    requested_model: Option<&str>,
    line: &InvocationUsageLine,
) -> Option<InvocationPricingQuote> {
    if line.requested_model_catalog_key.is_some() {
        return None;
    }
    let account = account?;
    let expected_model = requested_model
        .map(str::trim)
        .filter(|value| !value.is_empty());
    pricing_quotes
        .iter()
        .find(|quote| {
            quote.meter == line.meter
                && quote.supplier_code.as_deref() == Some(account.supplier_code.as_str())
                && quote.account_id == Some(account.account_id)
                && quote.region_code == account.region_code
                && (expected_model.is_none()
                    || quote.requested_model == expected_model.unwrap_or_default())
        })
        .cloned()
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
        }) {
            continue;
        }
        deduped.push(quote.clone());
    }
    deduped
}

fn optional_meter(meter: &BillingMeter, mode: BillingMode) -> bool {
    mode == BillingMode::ExternalUsageLine
        || (mode == BillingMode::Composite && *meter == BillingMeter::LlmCacheReadToken)
}

fn resolve_quote<C>(
    catalog: &C,
    invocation: &Invocation,
    meter: BillingMeter,
    catalog_key_override: Option<&str>,
) -> Result<InvocationPricingQuote, InvocationError>
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
    let model = priced_catalog_key(invocation, catalog_key_override)?;
    let resolved = PricingResolver::new(catalog)
        .resolve(ResolveModelPriceQuery {
            api_key_id,
            account_group_id: account
                .account_group_id
                .or(invocation.subject.account_group_id),
            model,
            billing_meter: meter,
            supplier_code: Some(account.supplier_code.clone()),
            account_id: Some(account.account_id),
            region_code: Some(account.region_code.clone()),
        })
        .map_err(|error| pricing_error(error.to_string()))?;
    Ok(quote_from_resolved(
        invocation,
        &resolved,
        catalog_key_override.is_some(),
    ))
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

fn quote_from_resolved(
    invocation: &Invocation,
    resolved: &ResolvedModelPrice,
    catalog_key_override: bool,
) -> InvocationPricingQuote {
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
    }
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

/// Returns true when pricing resolution failed because no price data exists for the model,
/// allowing optional meters (e.g. ExternalUsageLine) to be skipped gracefully.
fn is_missing_official_price(error: &InvocationError) -> bool {
    error.message.contains("official reference price not found")
        || error.message.contains("model not found")
        || error.message.contains("model is not available")
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
    use crate::domain::Money;
    use crate::ports::GatewayUsageQuantity;

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

    #[test]
    fn preflight_quote_reuse_skips_finalization_resolution_when_keys_match() {
        use crate::domain::ProviderAuthProfile;

        let account = InvocationAccount {
            supplier_code: "openrouter".to_owned(),
            account_id: 3001,
            account_group_id: None,
            account_group_code: None,
            pricing_plan_code: None,
            region_code: "global".to_owned(),
            credential_id: None,
            credential_rotation: None,
            base_url: None,
            secret_ref: None,
            auth_profile: ProviderAuthProfile::default(),
            timeout_ms: None,
            retry_policy: None,
            provider_model: None,
        };

        let input_quote = quote(BillingMeter::LlmInputToken, "gpt-4o", "standard-plan");
        let output_quote = quote(BillingMeter::LlmOutputToken, "gpt-4o", "standard-plan");
        let quotes = vec![input_quote.clone(), output_quote.clone()];

        // A line without a catalog-key override reuses the preflight quote
        // when the account and requested model are unchanged.
        let input_line = InvocationUsageLine::new(
            BillingMeter::LlmInputToken,
            GatewayUsageQuantity::tokens(100).expect("valid token quantity"),
        );
        assert_eq!(
            Some(input_quote.clone()),
            preflight_quote_for_line(&quotes, Some(&account), Some("gpt-4o"), &input_line)
        );
        let output_line = InvocationUsageLine::new(
            BillingMeter::LlmOutputToken,
            GatewayUsageQuantity::tokens(50).expect("valid token quantity"),
        );
        assert_eq!(
            Some(output_quote.clone()),
            preflight_quote_for_line(&quotes, Some(&account), Some("gpt-4o"), &output_line)
        );

        // A meter without a preflight quote is not reused.
        let cache_line = InvocationUsageLine::new(
            BillingMeter::LlmCacheReadToken,
            GatewayUsageQuantity::tokens(10).expect("valid token quantity"),
        );
        assert_eq!(
            None,
            preflight_quote_for_line(&quotes, Some(&account), Some("gpt-4o"), &cache_line)
        );

        // A line with an explicit catalog-key override keeps resolving.
        let override_line = InvocationUsageLine {
            requested_model_catalog_key: Some("openai/gpt-4o".to_owned()),
            ..InvocationUsageLine::new(
                BillingMeter::LlmInputToken,
                GatewayUsageQuantity::tokens(10).expect("valid token quantity"),
            )
        };
        assert_eq!(
            None,
            preflight_quote_for_line(&quotes, Some(&account), Some("gpt-4o"), &override_line)
        );

        // A changed account (dispatch failover) or requested model must
        // requote instead of reusing the preflight quote.
        let failover_account = InvocationAccount {
            supplier_code: "fallback".to_owned(),
            account_id: 3002,
            ..account.clone()
        };
        assert_eq!(
            None,
            preflight_quote_for_line(
                &quotes,
                Some(&failover_account),
                Some("gpt-4o"),
                &input_line
            )
        );
        assert_eq!(
            None,
            preflight_quote_for_line(&quotes, Some(&account), Some("gpt-4o-turbo"), &input_line)
        );
        assert_eq!(
            None,
            preflight_quote_for_line(&quotes, None, Some("gpt-4o"), &input_line)
        );
    }
}
