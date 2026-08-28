use std::sync::Arc;

use super::{
    AccountBillingMode, BillingMode, Invocation, InvocationError, InvocationErrorKind,
    InvocationFuture, InvocationInterceptor,
};
use crate::domain::{BillingMeter, DecimalValue};
use crate::ports::{
    CustomerChargeMode, GatewayBillingAmount, GatewayBillingContext, GatewayBillingStore,
};

#[derive(Clone)]
pub struct BillingTransactionInterceptor {
    store: Arc<dyn GatewayBillingStore + Send + Sync>,
}

impl BillingTransactionInterceptor {
    pub fn new(store: Arc<dyn GatewayBillingStore + Send + Sync>) -> Self {
        Self { store }
    }
}

impl InvocationInterceptor for BillingTransactionInterceptor {
    fn name(&self) -> &str {
        "billing_transaction"
    }

    fn observe_pipeline_errors(&self) -> bool {
        true
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if invocation.billing.mode == BillingMode::Free
                || !invocation.billing.settlement_required
            {
                return Ok(());
            }
            if !single_pricing_plan(invocation) {
                return Err(billing_error(
                    "invocation pricing quotes contain multiple pricing plans",
                ));
            }
            if !single_pricing_currency(invocation) {
                return Err(billing_error(
                    "invocation pricing quotes contain multiple charge currencies",
                ));
            }
            let context = billing_context(invocation);
            invocation.charging.settlement_mode = self
                .store
                .customer_settlement_mode(context.clone())
                .await
                .map_err(billing_error)?;
            invocation.charging.charge_mode = self
                .store
                .customer_charge_mode(context.clone())
                .await
                .map_err(billing_error)?;
            // 账号级计费模式优先：prepay 账号强制预扣，postpay 账号强制后扣。
            // 未配置/未知时回退客户结算模式（默认行为保持不变）。
            if let Some(account) = invocation.account.as_ref() {
                invocation.charging.charge_mode = match account.billing_mode {
                    AccountBillingMode::Prepay => CustomerChargeMode::PrepaidAdjustment,
                    AccountBillingMode::Postpay => CustomerChargeMode::Postpaid,
                };
            }
            if invocation.charging.charge_mode != CustomerChargeMode::PrepaidAdjustment {
                tracing::debug!(
                    stage = "billing_precharge",
                    charge_mode = ?invocation.charging.charge_mode,
                    settlement_mode = ?invocation.charging.settlement_mode,
                    request_id = %invocation.request.request_id,
                    trace_id = %invocation.request.trace_id.as_deref().unwrap_or(""),
                    "billing precharge skipped (postpaid or free)"
                );
                return Ok(());
            }
            let Some(amount) = estimated_amount(invocation) else {
                return Err(billing_error(
                    "unable to establish a conservative precharge",
                ));
            };
            if amount.amount == "0" {
                return Ok(());
            }
            tracing::debug!(
                stage = "billing_precharge",
                charge_mode = ?invocation.charging.charge_mode,
                amount = %amount.amount,
                currency = %amount.currency,
                request_id = %invocation.request.request_id,
                trace_id = %invocation.request.trace_id.as_deref().unwrap_or(""),
                "billing precharge reserving"
            );
            // Concurrent invocations on the same wallet race the optimistic
            // version check; the precharge is idempotent (request-scoped
            // transaction id), so a bounded retry re-reads the fresh balance
            // and applies cleanly instead of failing the whole invocation.
            let mut precharge_attempt = 0_u32;
            loop {
                match self.store.precharge(context.clone(), amount.clone()).await {
                    Ok(()) => break,
                    Err(error) if precharge_attempt < 2 => {
                        precharge_attempt += 1;
                        tracing::debug!(
                            stage = "billing_precharge",
                            attempt = precharge_attempt,
                            %error,
                            request_id = %invocation.request.request_id,
                            trace_id = %invocation.request.trace_id.as_deref().unwrap_or(""),
                            "billing precharge conflict; retrying"
                        );
                        continue;
                    }
                    Err(error) => return Err(billing_error(error)),
                }
            }
            invocation.charging.reserved_amount = Some(amount);
            tracing::debug!(
                stage = "billing_precharge",
                request_id = %invocation.request.request_id,
                trace_id = %invocation.request.trace_id.as_deref().unwrap_or(""),
                "billing precharge reserved"
            );
            Ok(())
        })
    }

    fn after<'a>(&'a self, _invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        // Final billing is deliberately performed by
        // `BillingSettlementInterceptor`, which is placed after usage
        // recording in the pipeline. Keeping this hook empty prevents the
        // synchronous ledger write from racing the usage fact insert.
        Box::pin(async { Ok(()) })
    }

    fn on_error<'a>(
        &'a self,
        invocation: &'a mut Invocation,
        _error: &'a InvocationError,
    ) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if invocation.charging.settled
                || invocation.charging.provider_completed
                || invocation.charging.charge_mode != CustomerChargeMode::PrepaidAdjustment
            {
                return Ok(());
            }
            // A successful provider response can still reach the error path
            // when usage extraction, persistence, streaming termination, or
            // reconciliation fails. Keep the reservation in that case: the
            // upstream may already have incurred spend and refunding here
            // would turn an accounting outage into a guaranteed undercharge.
            if provider_response_succeeded(invocation) {
                invocation.charging.provider_completed = true;
                return Ok(());
            }
            if let Some(reserved) = invocation.charging.reserved_amount.clone() {
                self.store
                    .refund(billing_context(invocation), reserved)
                    .await
                    .map_err(billing_error)?;
                invocation.charging.settled = true;
            }
            Ok(())
        })
    }
}

/// Completes the customer charge after provider usage has been extracted and
/// the usage recorder has had a chance to persist its durable fact. The
/// interceptor's `before` hook is intentionally a no-op, so it can be placed
/// before dispatch while its `after` hook runs after usage recording.
#[derive(Clone)]
pub struct BillingSettlementInterceptor {
    store: Arc<dyn GatewayBillingStore + Send + Sync>,
}

impl BillingSettlementInterceptor {
    pub fn new(store: Arc<dyn GatewayBillingStore + Send + Sync>) -> Self {
        Self { store }
    }
}

impl InvocationInterceptor for BillingSettlementInterceptor {
    fn name(&self) -> &str {
        "billing_settlement"
    }

    fn observe_pipeline_errors(&self) -> bool {
        true
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            if invocation.charging.settled
                || invocation.billing.mode == BillingMode::Free
                || !invocation.billing.settlement_required
            {
                return Ok(());
            }
            let Some(actual) = actual_amount(invocation) else {
                tracing::warn!(
                    stage = "billing_settlement",
                    request_id = %invocation.request.request_id,
                    trace_id = %invocation.request.trace_id.as_deref().unwrap_or(""),
                    "settlement did not produce a billable amount"
                );
                return Err(billing_error(
                    "settlement did not produce a billable amount",
                ));
            };
            if !provider_response_succeeded(invocation) {
                return Err(billing_error(
                    "provider response was not successful; billable reservation will be refunded",
                ));
            }
            if invocation.usage.usage_recording_failure_count > 0 {
                // The provider has completed, but at least one usage fact was
                // neither persisted nor accepted by the durable retry queue.
                // Keep any precharge held and fail closed; refunding here
                // would create an unrecoverable undercharge.
                invocation.charging.provider_completed = true;
                return Err(billing_error(
                    "usage accounting persistence failed; settlement requires reconciliation",
                ));
            }
            invocation.charging.provider_completed = true;
            let context = billing_context(invocation);
            tracing::debug!(
                stage = "billing_settlement",
                charge_mode = ?invocation.charging.charge_mode,
                reserved = %invocation
                    .charging
                    .reserved_amount
                    .as_ref()
                    .map(|amount| amount.amount.as_str())
                    .unwrap_or("0"),
                actual = %actual.amount,
                currency = %actual.currency,
                request_id = %invocation.request.request_id,
                trace_id = %invocation.request.trace_id.as_deref().unwrap_or(""),
                "billing settlement reconciling"
            );
            match invocation.charging.charge_mode {
                CustomerChargeMode::Postpaid => {
                    if invocation.charging.settlement_mode
                        == crate::ports::GatewayBillingSettlementMode::Synchronous
                    {
                        self.store
                            .charge_postpaid(context, actual)
                            .await
                            .map_err(billing_error)?;
                    }
                }
                CustomerChargeMode::PrepaidAdjustment => {
                    let reserved = invocation.charging.reserved_amount.clone().unwrap_or(
                        GatewayBillingAmount {
                            amount: "0".to_owned(),
                            currency: actual.currency.clone(),
                        },
                    );
                    if invocation.charging.settlement_mode
                        == crate::ports::GatewayBillingSettlementMode::Synchronous
                    {
                        self.store
                            .settle(context, reserved, actual)
                            .await
                            .map_err(billing_error)?;
                    }
                }
            }
            // In asynchronous mode the usage settlement worker owns the
            // durable final debit/adjustment. Keeping this flag false lets a
            // retrying terminal path continue to release a precharge only
            // when the provider invocation itself failed.
            if invocation.charging.settlement_mode
                == crate::ports::GatewayBillingSettlementMode::Synchronous
            {
                self.store
                    .mark_usage_settled(billing_context(invocation))
                    .await
                    .map_err(billing_error)?;
                invocation.charging.settled = true;
            }
            Ok(())
        })
    }
}

fn billing_context(invocation: &Invocation) -> GatewayBillingContext {
    GatewayBillingContext {
        tenant_id: invocation.subject.tenant_id,
        organization_id: invocation.subject.organization_id,
        user_id: invocation.subject.user_id,
        request_id: invocation.request.request_id.clone(),
        pricing_plan_code: invocation
            .usage
            .pricing_quotes
            .first()
            .map(|quote| quote.pricing_plan_code.clone())
            .or_else(|| invocation.subject.pricing_plan_code.clone())
            .unwrap_or_default(),
    }
}

fn single_pricing_plan(invocation: &Invocation) -> bool {
    let Some(first) = invocation.usage.pricing_quotes.first() else {
        return true;
    };
    invocation
        .usage
        .pricing_quotes
        .iter()
        .all(|quote| quote.pricing_plan_code == first.pricing_plan_code)
}

fn single_pricing_currency(invocation: &Invocation) -> bool {
    let Some(first) = invocation.usage.pricing_quotes.first() else {
        return true;
    };
    invocation.usage.pricing_quotes.iter().all(|quote| {
        quote.customer_charge_unit_price.currency == first.customer_charge_unit_price.currency
    })
}

fn estimated_amount(invocation: &Invocation) -> Option<GatewayBillingAmount> {
    let first = invocation.usage.pricing_quotes.first()?;
    let currency = first.customer_charge_unit_price.currency.clone();
    let mut total = DecimalValue::ZERO;
    let input_units = conservative_input_units(invocation);
    let output_units = conservative_output_units(invocation);
    for quote in &invocation.usage.pricing_quotes {
        if quote.customer_charge_unit_price.currency != currency {
            return None;
        }
        let quantity = conservative_quantity(&quote.meter, input_units, output_units);
        let unit_price =
            DecimalValue::parse(&quote.customer_charge_unit_price.to_fixed_string(12)).ok()?;
        let unit_size = DecimalValue::parse(&quote.unit_size).ok()?;
        let unit_size = if unit_size <= DecimalValue::ZERO {
            DecimalValue::ONE
        } else {
            unit_size
        };
        let calculated = unit_price
            .multiply_i64(quantity)
            .ok()?
            .checked_divide(unit_size)
            .ok()?;
        let quoted_minimum = quote
            .billing
            .as_ref()
            .and_then(|billing| {
                DecimalValue::parse(&billing.customer_charge_amount.to_fixed_string(12)).ok()
            })
            .unwrap_or(DecimalValue::ZERO);
        total = total.checked_add(calculated.max(quoted_minimum)).ok()?;
    }
    let amount = ceil_decimal_token_units(total)?;
    Some(GatewayBillingAmount {
        amount: amount.to_string(),
        currency,
    })
}

fn actual_amount(invocation: &Invocation) -> Option<GatewayBillingAmount> {
    aggregate_token_amounts(invocation.usage.settlement_commands.iter().map(|command| {
        (
            command.currency.as_str(),
            command.customer_charge_amount.as_str(),
        )
    }))
}

fn aggregate_token_amounts<'a>(
    values: impl IntoIterator<Item = (&'a str, &'a str)>,
) -> Option<GatewayBillingAmount> {
    let mut values = values.into_iter();
    let (first_currency, first_amount) = values.next()?;
    let currency = first_currency.to_owned();
    let mut total = DecimalValue::ZERO;
    total = total
        .checked_add(DecimalValue::parse(first_amount).ok()?)
        .ok()?;
    for (item_currency, amount) in values {
        if item_currency != currency {
            return None;
        }
        total = total.checked_add(DecimalValue::parse(amount).ok()?).ok()?;
    }
    Some(GatewayBillingAmount {
        amount: ceil_decimal_token_units(total)?.to_string(),
        currency,
    })
}

fn ceil_decimal_token_units(value: DecimalValue) -> Option<i128> {
    const DECIMAL_SCALE: i128 = 1_000_000_000_000;
    if value < DecimalValue::ZERO {
        return None;
    }
    let fixed = value.to_fixed_string(12);
    let (whole, fraction) = fixed.split_once('.')?;
    let whole = whole.parse::<i128>().ok()?;
    let fraction = fraction.parse::<i128>().ok()?;
    let scaled = whole.checked_mul(10)?;
    let fractional_tokens =
        fraction.checked_mul(10)?.checked_add(DECIMAL_SCALE - 1)? / DECIMAL_SCALE;
    scaled.checked_add(fractional_tokens)
}

fn conservative_input_units(invocation: &Invocation) -> i64 {
    let bytes = match &invocation.request.body {
        super::InvocationBody::Json(value) => value.to_string().len(),
        super::InvocationBody::Bytes(value) => value.len(),
        super::InvocationBody::Empty => 0,
    } as i64;
    (bytes / 4).saturating_add(1).clamp(1, 1_000_000)
}

fn conservative_output_units(invocation: &Invocation) -> i64 {
    let requested = match &invocation.request.body {
        super::InvocationBody::Json(value) => value
            .get("max_completion_tokens")
            .or_else(|| value.get("max_tokens"))
            .and_then(|value| value.as_i64()),
        _ => None,
    }
    .unwrap_or(4096)
    .max(1);
    let n = match &invocation.request.body {
        super::InvocationBody::Json(value) => value.get("n").and_then(|value| value.as_i64()),
        _ => None,
    }
    .unwrap_or(1)
    .clamp(1, 32);
    requested.saturating_mul(n).clamp(1, 1_000_000)
}

fn conservative_quantity(meter: &BillingMeter, input: i64, output: i64) -> i64 {
    match meter {
        BillingMeter::LlmOutputToken
        | BillingMeter::AudioOutputToken
        | BillingMeter::ImageOutputToken
        | BillingMeter::VideoOutputToken => output,
        BillingMeter::LlmInputToken
        | BillingMeter::LlmReasoningToken
        | BillingMeter::LlmCacheWriteToken
        | BillingMeter::LlmCacheReadToken
        | BillingMeter::EmbeddingInputToken
        | BillingMeter::ImageInputToken
        | BillingMeter::AudioInputToken
        | BillingMeter::VideoInputToken => input,
        _ => 1,
    }
}

fn billing_error(error: impl std::fmt::Display) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Pricing, error.to_string())
}

fn provider_response_succeeded(invocation: &Invocation) -> bool {
    invocation
        .telemetry
        .normalized_response
        .as_ref()
        .map(|response| (200..300).contains(&response.status_code))
        .or_else(|| {
            invocation
                .dispatch
                .response
                .as_ref()
                .map(|response| (200..300).contains(&response.status_code))
        })
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::aggregate_token_amounts;

    #[test]
    fn aggregates_decimal_lines_before_rounding_to_token_bank_units() {
        let amount = aggregate_token_amounts([
            ("USD", "0.000000000001"),
            ("USD", "0.000000000001"),
            ("USD", "0.099999999998"),
        ])
        .expect("same-currency amounts");

        assert_eq!("1", amount.amount);
        assert_eq!("USD", amount.currency);
    }

    #[test]
    fn rejects_mixed_currency_settlement() {
        assert!(aggregate_token_amounts([("USD", "0.1"), ("CNY", "0.1")]).is_none());
    }

    #[test]
    fn rounds_exact_tenths_without_an_extra_token() {
        let amount = aggregate_token_amounts([("USD", "1.200000000000")]).expect("valid amount");
        assert_eq!("12", amount.amount);
    }
}
