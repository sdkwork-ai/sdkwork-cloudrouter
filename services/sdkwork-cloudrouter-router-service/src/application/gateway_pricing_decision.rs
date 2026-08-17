use serde_json::json;

use crate::application::{
    BillingStructure, PriceResolution, PriceResolutionStatus, ResourceBillability,
};
use crate::domain::{DomainError, DomainResult, PriceSide};
use crate::ports::{
    GatewayOfficialRateReference, GatewayPricingFormula, GatewayPricingFormulaTerm,
    GatewayPricingRateCondition, GatewayPricingRateTier, GatewayRatingRecordIdentity,
};

const AMOUNT_DECIMAL_DIGITS: u32 = 12;
const UNIT_PRICE_DECIMAL_DIGITS: u32 = 12;

/// Persistence-safe projection of the immutable result returned by PriceService.
/// Recorders may validate referenced identities, but must not recalculate it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayPricingDecision {
    pub decision_status: String,
    pub billability: String,
    pub reason_code: String,
    pub strategy_code: Option<String>,
    pub unit_size: String,
    pub rated_quantity: String,
    pub base_unit_price: String,
    pub rate_multiplier: String,
    pub reference_multiplier: String,
    pub official_reference_amount: String,
    pub customer_charge_amount: String,
    pub upstream_cost_amount: String,
    pub currency: String,
    pub pricing_plan_code: String,
    pub group_code: String,
    pub billing_components: String,
    pub official_rate: Option<GatewayOfficialRateReference>,
}

impl GatewayPricingDecision {
    pub fn from_resolution(resolution: &PriceResolution) -> DomainResult<Self> {
        if resolution.status == PriceResolutionStatus::Quoted {
            return Err(DomainError::new(
                "quoted pricing resolution cannot be persisted before rating",
            ));
        }
        let resolved = resolution.resolved_price.as_ref();
        let billing = resolution.billing.as_ref();
        if resolution.status == PriceResolutionStatus::Rated && billing.is_none() {
            return Err(DomainError::new(
                "rated pricing resolution does not contain a billing structure",
            ));
        }

        Ok(Self {
            decision_status: resolution.status.code().to_owned(),
            billability: resolution.billability.code().to_owned(),
            reason_code: decision_reason_code(resolution),
            strategy_code: billing.map(|billing| billing.strategy.code().to_owned()),
            unit_size: billing
                .map(|billing| billing.unit_size.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS))
                .or_else(|| {
                    resolved.map(|resolved| {
                        resolved
                            .official_reference
                            .unit_size
                            .to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS)
                    })
                })
                .unwrap_or_else(|| "1.000000000000".to_owned()),
            rated_quantity: billing
                .map(|billing| {
                    billing
                        .rated_quantity
                        .to_fixed_string(AMOUNT_DECIMAL_DIGITS)
                })
                .unwrap_or_else(zero_amount),
            base_unit_price: resolved
                .map(|resolved| {
                    resolved
                        .customer_charge_before_sale_multiplier
                        .unit_price
                        .to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS)
                })
                .unwrap_or_else(zero_amount),
            rate_multiplier: resolved
                .map(|resolved| resolved.sale_multiplier.to_fixed_string(6))
                .unwrap_or_else(|| "1.000000".to_owned()),
            reference_multiplier: resolved
                .map(|resolved| resolved.reference_multiplier.to_fixed_string(6))
                .unwrap_or_else(|| "1.000000".to_owned()),
            official_reference_amount: billing
                .map(|billing| {
                    billing
                        .official_reference_amount
                        .to_fixed_string(AMOUNT_DECIMAL_DIGITS)
                })
                .unwrap_or_else(zero_amount),
            customer_charge_amount: billing
                .map(|billing| {
                    billing
                        .customer_charge_amount
                        .to_fixed_string(AMOUNT_DECIMAL_DIGITS)
                })
                .unwrap_or_else(zero_amount),
            upstream_cost_amount: billing
                .and_then(|billing| billing.procurement_cost_amount.as_ref())
                .map(|amount| amount.to_fixed_string(AMOUNT_DECIMAL_DIGITS))
                .unwrap_or_else(zero_amount),
            currency: resolved
                .map(|resolved| resolved.customer_charge.currency.clone())
                .unwrap_or_default(),
            pricing_plan_code: resolved
                .map(|resolved| resolved.pricing_plan_code.clone())
                .unwrap_or_default(),
            group_code: resolved
                .map(|resolved| resolved.group_code.clone())
                .unwrap_or_default(),
            billing_components: billing_components_snapshot(billing),
            official_rate: official_rate_reference(resolution),
        })
    }

    pub fn is_charge_line_eligible(&self) -> DomainResult<bool> {
        Ok(self.decision_status == PriceResolutionStatus::Rated.code()
            && self.billability == ResourceBillability::Chargeable.code()
            && crate::domain::DecimalValue::parse(&self.customer_charge_amount)?
                > crate::domain::DecimalValue::ZERO)
    }
}

fn decision_reason_code(resolution: &PriceResolution) -> String {
    if let Some(failure) = resolution.failure.as_ref() {
        return failure.code.code().to_owned();
    }
    match resolution.status {
        PriceResolutionStatus::Rated => "price_service_rated",
        PriceResolutionStatus::NonChargeable => "price_service_non_chargeable",
        PriceResolutionStatus::Unrated => "price_service_unrated",
        PriceResolutionStatus::Quoted => "price_service_quoted",
    }
    .to_owned()
}

fn official_rate_reference(resolution: &PriceResolution) -> Option<GatewayOfficialRateReference> {
    let resolved = resolution.resolved_price.as_ref()?;
    let metadata = resolved.official_reference.rate_metadata.as_ref()?;
    let billing = resolution.billing.as_ref();
    Some(GatewayOfficialRateReference {
        record_identity: pricing_record_identity(resolved),
        price_book_code: metadata.price_book_code.clone(),
        rate_hash: metadata.rate_hash.clone(),
        product_code: metadata.product_code.clone(),
        operation_code: metadata.operation_code.clone(),
        billability: metadata.billability.clone(),
        charge_timing: metadata.charge_timing.clone(),
        calculation_mode: metadata.calculation_mode.clone(),
        quantity_aggregation: metadata.quantity_aggregation.clone(),
        unit_size: resolved
            .official_reference
            .unit_size
            .to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
        unit_price: resolved
            .official_reference
            .unit_price
            .unit_price
            .to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
        plan_unit_price: resolved
            .customer_charge_before_sale_multiplier
            .unit_price
            .to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
        rated_reference_unit_price: billing
            .map(|billing| {
                billing
                    .official_reference_unit_price
                    .to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS)
            })
            .unwrap_or_else(zero_amount),
        rated_unit_price: billing
            .map(|billing| {
                billing
                    .customer_charge_unit_price
                    .to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS)
            })
            .unwrap_or_else(zero_amount),
        rated_procurement_unit_price: billing.and_then(|billing| {
            billing
                .procurement_cost_unit_price
                .as_ref()
                .map(|amount| amount.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS))
        }),
        minimum_quantity: metadata
            .minimum_quantity
            .to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
        quantity_step: metadata
            .quantity_step
            .map(|value| value.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS)),
        conditions: metadata
            .conditions
            .iter()
            .map(|condition| GatewayPricingRateCondition {
                dimension_code: condition.dimension_code.clone(),
                operator_code: condition.operator_code.clone(),
                value: condition.value.clone(),
            })
            .collect(),
        tiers: metadata
            .tiers
            .iter()
            .map(|tier| GatewayPricingRateTier {
                tier_code: tier.tier_code.clone(),
                lower_bound: tier.lower_bound.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
                upper_bound: tier
                    .upper_bound
                    .map(|value| value.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS)),
                unit_size: tier.unit_size.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
                unit_price: tier.unit_price.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
                flat_amount: tier.flat_amount.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
                currency_code: tier.unit_price.currency.clone(),
            })
            .collect(),
        formula: metadata
            .formula
            .as_ref()
            .map(|formula| GatewayPricingFormula {
                formula_code: formula.formula_code.clone(),
                formula_version: formula.formula_version.clone(),
                constant_units: formula
                    .constant_units
                    .to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
                quantity_coefficient: formula
                    .quantity_coefficient
                    .to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
                minimum_units: formula
                    .minimum_units
                    .map(|value| value.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS)),
                maximum_units: formula
                    .maximum_units
                    .map(|value| value.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS)),
                terms: formula
                    .terms
                    .iter()
                    .map(|term| GatewayPricingFormulaTerm {
                        term_code: term.term_code.clone(),
                        dimension_code: term.dimension_code.clone(),
                        coefficient: term.coefficient.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
                    })
                    .collect(),
            }),
    })
}

fn pricing_record_identity(resolved: &crate::application::ResolvedModelPrice) -> Option<GatewayRatingRecordIdentity> {
    let rate = resolved
        .official_reference
        .rate_metadata
        .as_ref()?
        .record_identity?;
    let rate_card = resolved.pricing_record_identity.account_rate_card?;
    let plan = resolved.pricing_record_identity.pricing_plan?;
    let rule = resolved.pricing_record_identity.pricing_rule?;
    Some(GatewayRatingRecordIdentity {
        price_book_tenant_id: rate.price_book_tenant_id,
        price_book_organization_id: rate.price_book_organization_id,
        price_book_id: rate.price_book_id,
        rate_id: rate.rate_id,
        account_rate_card_tenant_id: rate_card.tenant_id,
        account_rate_card_organization_id: rate_card.organization_id,
        account_rate_card_id: rate_card.id,
        pricing_plan_tenant_id: plan.tenant_id,
        pricing_plan_organization_id: plan.organization_id,
        pricing_plan_id: plan.id,
        pricing_rule_tenant_id: rule.tenant_id,
        pricing_rule_organization_id: rule.organization_id,
        pricing_rule_id: rule.id,
    })
}

fn billing_components_snapshot(billing: Option<&BillingStructure>) -> String {
    let components = billing
        .into_iter()
        .flat_map(|billing| billing.components.iter())
        .map(|component| {
            json!({
                "componentCode": component.component_code.as_str(),
                "priceSide": price_side_code(component.price_side),
                "strategyCode": component.strategy.code(),
                "ratedQuantity": component.rated_quantity.to_fixed_string(AMOUNT_DECIMAL_DIGITS),
                "unitSize": component.unit_size.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
                "unitPrice": component.unit_price.unit_price.to_fixed_string(UNIT_PRICE_DECIMAL_DIGITS),
                "flatAmount": component.flat_amount.unit_price.to_fixed_string(AMOUNT_DECIMAL_DIGITS),
                "amount": component.amount.unit_price.to_fixed_string(AMOUNT_DECIMAL_DIGITS),
                "currencyCode": component.amount.currency.as_str(),
            })
        })
        .collect();
    serde_json::Value::Array(components).to_string()
}

fn price_side_code(side: PriceSide) -> &'static str {
    match side {
        PriceSide::OfficialReference => "official_reference",
        PriceSide::UpstreamCost => "upstream_cost",
        PriceSide::CustomerCharge => "customer_charge",
        PriceSide::InternalTransfer => "internal_transfer",
    }
}

fn zero_amount() -> String {
    "0.000000000000".to_owned()
}
