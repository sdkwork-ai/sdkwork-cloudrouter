use std::sync::Arc;

use super::usage_extraction::{
    character_count_in, integer_field, nested_media_seconds, AUDIO_SECOND_FIELDS,
    VIDEO_SECOND_FIELDS,
};
use super::{
    is_token_meter, provider_response_succeeded, AccountBillingMode, BillingMode, Invocation,
    InvocationError, InvocationErrorKind, InvocationFuture, InvocationInterceptor,
};
use crate::domain::{BillingMeter, BillingOwnerKind, DecimalValue, DomainError};
use crate::ports::{
    token_points_for_charge, CustomerChargeMode, GatewayBillingAmount, GatewayBillingContext,
    GatewayBillingStore, RechargeSettingsModel,
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
            // Resolve the configured cash→Token-Bank exchange settings once and
            // stash them on the invocation so the pricing settlement layer can
            // record a `debit_points` consistent with wallet debit (which uses
            // the same `token_points_for_charge` conversion below).
            let settings = self
                .store
                .load_cash_to_points_settings(context.clone())
                .await
                .map_err(billing_error)?;
            invocation.charging.points_settings = Some(settings.clone());
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
            let Some(amount) = estimated_amount(invocation, &settings) else {
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
                // Synchronous billing freezes the reservation into an account
                // hold (no ledger entry) so the wallet history ends up with a
                // single actual-consumption debit rather than a provisional
                // "消费" followed by a "返还" correction. Asynchronous billing
                // keeps the legacy direct precharge ledger; the usage
                // settlement worker reconciles those reservations itself.
                let outcome = if invocation.charging.settlement_mode
                    == crate::ports::GatewayBillingSettlementMode::Synchronous
                {
                    self.store
                        .precharge_hold(context.clone(), amount.clone())
                        .await
                        .map(Some)
                } else {
                    self.store
                        .precharge(context.clone(), amount.clone())
                        .await
                        .map(|()| None)
                };
                match outcome {
                    Ok(hold_id) => {
                        invocation.charging.hold_id = hold_id;
                        break;
                    }
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
                    Err(error) => return Err(billing_port_error(error)),
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
            // A waived charge never becomes billable, even if a later accounting
            // stage fails: release the reservation instead of holding it.
            if invocation.charging.waived.is_some() {
                let context = billing_context(invocation);
                return release_without_charge(self.store.as_ref(), invocation, &context).await;
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
                let context = billing_context(invocation);
                // Synchronous billing releases the frozen hold (no ledger entry),
                // so a failed invocation leaves no wallet transaction and the
                // reserved balance returns to available. Asynchronous billing
                // refunds the legacy direct precharge ledger debit in place.
                if invocation.charging.settlement_mode
                    == crate::ports::GatewayBillingSettlementMode::Synchronous
                {
                    if let Some(hold_id) = invocation.charging.hold_id.clone() {
                        self.store
                            .release_hold(context, hold_id)
                            .await
                            .map_err(billing_error)?;
                    }
                } else {
                    self.store
                        .refund(context, reserved)
                        .await
                        .map_err(billing_error)?;
                }
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
            let context = billing_context(invocation);
            // A waived charge is a *successful* provider call that produced
            // nothing the vendor bills for (DeepSeek Search with `results: []`,
            // Fetch without a body). There is no billable amount to demand, so
            // demanding one would turn a free upstream call into a gateway 502.
            // Release whatever the precharge reserved and record the zero charge.
            // Checked before loading exchange settings so a settings outage
            // cannot trap a reservation that will never be charged.
            if let Some(reason) = invocation.charging.waived.clone() {
                tracing::info!(
                    stage = "billing_settlement",
                    billing_waived = %reason,
                    request_id = %invocation.request.request_id,
                    trace_id = %invocation.request.trace_id.as_deref().unwrap_or(""),
                    "releasing the reservation without a customer charge"
                );
                return release_without_charge(self.store.as_ref(), invocation, &context).await;
            }
            // Use the exchange settings captured before dispatch, not a fresh
            // read. The precharge amount and the usage-fact `debit_points` were
            // already computed with that snapshot; re-reading here would let an
            // admin rate change mid-request debit a different number of points
            // than the usage row records (and could make a fully covered hold
            // look like an overage).
            let settings = match invocation.charging.points_settings.clone() {
                Some(settings) => settings,
                None => self
                    .store
                    .load_cash_to_points_settings(context.clone())
                    .await
                    .map_err(billing_error)?,
            };
            // The provider outcome is checked before the amount on purpose. A
            // vendor that rejected the call (401/403/4xx/5xx) produces no usage
            // and therefore no billable amount **by construction**, so asking
            // for one first reported "settlement did not produce a billable
            // amount" for every rejected call — a gateway-sounding error message
            // hiding a vendor-side rejection, which is the single most common
            // outcome while credentials are still placeholders. Reporting the
            // rejection is both accurate and actionable.
            if !provider_response_succeeded(invocation) {
                return Err(billing_error(
                    "provider response was not successful; billable reservation will be refunded",
                ));
            }
            let Some(actual) = actual_amount(invocation, &settings) else {
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
                    if invocation.charging.settlement_mode
                        == crate::ports::GatewayBillingSettlementMode::Synchronous
                    {
                        let Some(hold_id) = invocation.charging.hold_id.clone() else {
                            // A zero estimate intentionally creates no hold. If
                            // actual usage is positive anyway, charge it as a
                            // postpaid fact instead of failing settlement and
                            // giving the request away. In asynchronous mode the
                            // settlement worker owns this fact; never charge it
                            // synchronously as well.
                            if invocation.charging.settlement_mode
                                == crate::ports::GatewayBillingSettlementMode::Synchronous
                            {
                                self.store
                                    .charge_postpaid(context, actual)
                                    .await
                                    .map_err(billing_error)?;
                                self.store
                                    .mark_usage_settled(billing_context(invocation))
                                    .await
                                    .map_err(billing_error)?;
                                invocation.charging.settled = true;
                            }
                            return Ok(());
                        };
                        // The hold is a lower-bound estimate. If actual usage
                        // exceeds it, capture the full hold first and charge the
                        // overage as a separate idempotent postpaid debit. The
                        // account hold API deliberately cannot capture more than
                        // the frozen amount (the `acct_hold` amount constraint),
                        // so charging only `actual` would fail and leave the
                        // entire request uncollected.
                        match split_hold_capture(
                            &actual,
                            invocation.charging.reserved_amount.as_ref(),
                        ) {
                            Some(overage) => {
                                let reserved = invocation.charging.reserved_amount.clone().expect(
                                    "split_hold_capture only yields Some with a reservation",
                                );
                                self.store
                                    .settle_hold(context.clone(), hold_id, reserved)
                                    .await
                                    .map_err(billing_error)?;
                                self.store
                                    .charge_postpaid(context, overage)
                                    .await
                                    .map_err(billing_error)?;
                            }
                            None => {
                                self.store
                                    .settle_hold(context, hold_id, actual)
                                    .await
                                    .map_err(billing_error)?;
                            }
                        }
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
    // 计费主体：团队计费时 organization_id/billing_owner 来自计费解析；
    // 个人计费保持 key 自身上下文（既有行为）。
    let (organization_id, billing_owner) = match invocation.subject.billing_owner {
        BillingOwnerKind::Organization => (
            invocation.subject.billing_organization_id,
            BillingOwnerKind::Organization,
        ),
        BillingOwnerKind::Personal => (
            invocation.subject.organization_id,
            BillingOwnerKind::Personal,
        ),
    };
    GatewayBillingContext {
        tenant_id: invocation.subject.tenant_id,
        organization_id,
        user_id: invocation.subject.user_id,
        request_id: invocation.request.request_id.clone(),
        pricing_plan_code: invocation
            .usage
            .pricing_quotes
            .first()
            .map(|quote| quote.pricing_plan_code.clone())
            .or_else(|| invocation.subject.pricing_plan_code.clone())
            .unwrap_or_default(),
        billing_owner,
    }
}

/// Returns a reservation without charging the customer.
///
/// Used when the provider call succeeded but the vendor would not have billed it
/// (a gated web tool that produced no result). Synchronous billing releases the
/// frozen account hold — no ledger entry appears — while asynchronous billing
/// refunds the legacy direct precharge debit, mirroring `on_error`. The usage
/// facts of the request are marked settled so the asynchronous settlement worker
/// does not resurrect the charge from an earlier precharge.
async fn release_without_charge(
    store: &(dyn GatewayBillingStore + Send + Sync),
    invocation: &mut Invocation,
    context: &GatewayBillingContext,
) -> Result<(), InvocationError> {
    if invocation.charging.settlement_mode
        == crate::ports::GatewayBillingSettlementMode::Synchronous
    {
        if let Some(hold_id) = invocation.charging.hold_id.clone() {
            store
                .release_hold(context.clone(), hold_id)
                .await
                .map_err(billing_error)?;
        }
        store
            .mark_usage_settled(context.clone())
            .await
            .map_err(billing_error)?;
    } else if let Some(reserved) = invocation.charging.reserved_amount.clone() {
        store
            .refund(context.clone(), reserved)
            .await
            .map_err(billing_error)?;
    }
    invocation.charging.settled = true;
    invocation.charging.provider_completed = true;
    Ok(())
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

fn estimated_amount(
    invocation: &Invocation,
    settings: &RechargeSettingsModel,
) -> Option<GatewayBillingAmount> {
    let first = invocation.usage.pricing_quotes.first()?;
    let currency = first.customer_charge_unit_price.currency.clone();
    let mut total = DecimalValue::ZERO;
    // 输入侧同一批 prompt token 可能同时有 input / cache-read / cache-write
    // 三档报价（互斥覆盖，不是三段相加）。逐项相加会把冻结额放大到实际成本的
    // 1.8–2.35 倍，余额刚好够的用户会被误拒。这里取三档中的最高价作为输入侧
    // 上界；输出与媒体计量仍逐项相加。
    let mut input_pool_max = DecimalValue::ZERO;
    let input_units = conservative_input_units(invocation);
    let output_units = conservative_output_units(invocation);
    let request_body = request_body_json(invocation);
    for quote in &invocation.usage.pricing_quotes {
        if quote.customer_charge_unit_price.currency != currency {
            return None;
        }
        // 媒体计量的下界不是一个"单位"：预付余额只够 1 秒的用户不应该被放行
        // 去下单一条 20 秒视频。请求声明了多少就按多少预扣（token 类仍走
        // `max_tokens × n` 的上界算法）。
        let quantity = conservative_media_units(&quote.meter, request_body).or_else(|| {
            DecimalValue::parse(
                &conservative_quantity(&quote.meter, input_units, output_units).to_string(),
            )
            .ok()
        })?;
        let unit_price =
            DecimalValue::parse(&quote.customer_charge_unit_price.to_fixed_string(12)).ok()?;
        let unit_size = unit_size_or_default(&quote.meter, &quote.unit_size)?;
        let calculated = unit_price
            .checked_multiply(quantity)
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
        let amount = calculated.max(quoted_minimum);
        if matches!(
            quote.meter,
            BillingMeter::LlmInputToken
                | BillingMeter::LlmCacheReadToken
                | BillingMeter::LlmCacheWriteToken
        ) {
            if amount > input_pool_max {
                input_pool_max = amount;
            }
        } else {
            total = total.checked_add(amount).ok()?;
        }
    }
    total = total.checked_add(input_pool_max).ok()?;
    let amount = token_points_for_charge(&total.to_fixed_string(12), &currency, settings).ok()?;
    Some(GatewayBillingAmount {
        amount: amount.to_string(),
        currency,
    })
}

fn actual_amount(
    invocation: &Invocation,
    settings: &RechargeSettingsModel,
) -> Option<GatewayBillingAmount> {
    aggregate_token_amounts(
        invocation.usage.settlement_commands.iter().map(|command| {
            (
                command.currency.as_str(),
                command.customer_charge_amount.as_str(),
            )
        }),
        settings,
    )
}

fn aggregate_token_amounts<'a>(
    values: impl IntoIterator<Item = (&'a str, &'a str)>,
    settings: &RechargeSettingsModel,
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
    let amount = token_points_for_charge(&total.to_fixed_string(12), &currency, settings).ok()?;
    Some(GatewayBillingAmount {
        amount: amount.to_string(),
        currency,
    })
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

fn unit_size_or_default(meter: &BillingMeter, persisted: &str) -> Option<DecimalValue> {
    // A persisted, positive unit_size wins. A blank value, an unparsable
    // value, or an explicit zero all fall through to the meter-appropriate
    // default below.
    if let Ok(unit_size) = DecimalValue::parse(persisted) {
        if unit_size > DecimalValue::ZERO {
            return Some(unit_size);
        }
    }
    // Token-based meters are priced per million tokens. When a persisted
    // unit_size is absent (zero/blank) the estimated precharge must divide by
    // 1_000_000 instead of 1, otherwise a per-token price (unit_price ×
    // quantity) would over-reserve the wallet ~1M×.
    if is_token_meter(meter) {
        DecimalValue::parse("1000000").ok()
    } else {
        Some(DecimalValue::ONE)
    }
}

/// 请求体（仅 JSON 形态），供预扣估算读取"用户声明了多少"。
fn request_body_json(invocation: &Invocation) -> Option<&serde_json::Value> {
    match &invocation.request.body {
        super::InvocationBody::Json(value) => Some(value),
        _ => None,
    }
}

/// 媒体类计量的预扣下界：从**请求**读用户声明/将要产生的数量。
///
/// token 类可以在响应前用 `max_tokens × n` 估上界，但时长/字符/张数类不行——
/// 视频请求写 `seconds: "20"`、TTS 请求写 200 字，响应里没有任何东西能事前
/// 推出这些数。此前这类计量全部落到 [`conservative_quantity`] 的 `_ => 1`，
/// 于是"余额只够 1 秒"的账号也能下单 20 秒视频，超额消费后才在结算环节暴露。
///
/// 返回 `None` 表示请求里读不到数量，由调用方回落到 token 估算或 1 单位。
fn conservative_media_units(
    meter: &BillingMeter,
    body: Option<&serde_json::Value>,
) -> Option<DecimalValue> {
    let body = body?;
    match meter {
        BillingMeter::VideoOutputSecond | BillingMeter::VideoInputSecond => {
            seconds_units(body, VIDEO_SECOND_FIELDS)
        }
        BillingMeter::MusicOutputSecond
        | BillingMeter::AudioOutputSecond
        | BillingMeter::AudioInputSecond => seconds_units(body, AUDIO_SECOND_FIELDS),
        // 分钟档：请求里仍是秒，按 60 折算成小数分钟，避免 12 秒被向上取整
        // 成整整 1 分钟（过度冻结 5 倍余额）。
        BillingMeter::AudioOutputMinute
        | BillingMeter::AudioInputMinute
        | BillingMeter::SttAudioMinute => {
            let seconds = seconds_units(body, AUDIO_SECOND_FIELDS)?;
            seconds.checked_divide(DecimalValue::parse("60").ok()?).ok()
        }
        BillingMeter::TtsInputCharacter | BillingMeter::SpeechCharacter => {
            decimal_units(character_count_in(body)?)
        }
        // 一次请求产出 N 张图/条视频时 `n` 就是张数下界。
        BillingMeter::ImageResult
        | BillingMeter::VideoResult
        | BillingMeter::SfxResult
        | BillingMeter::ApiResult => decimal_units(integer_field(
            body,
            &["n", "count", "num_images", "num_videos", "variants"],
        )?),
        _ => None,
    }
}

/// 请求/响应里声明的秒数（含毫秒拼写与嵌套容器）。
fn seconds_units(body: &serde_json::Value, names: &[&str]) -> Option<DecimalValue> {
    let seconds = nested_media_seconds(body, names)?;
    DecimalValue::parse(seconds.trim()).ok()
}

fn decimal_units(count: i64) -> Option<DecimalValue> {
    DecimalValue::parse(&count.max(1).to_string()).ok()
}

fn conservative_quantity(meter: &BillingMeter, input: i64, output: i64) -> i64 {
    match meter {
        BillingMeter::LlmOutputToken
        | BillingMeter::LlmReasoningToken
        | BillingMeter::AudioOutputToken
        | BillingMeter::ImageOutputToken
        | BillingMeter::VideoOutputToken => output,
        BillingMeter::LlmInputToken
        | BillingMeter::LlmCacheWriteToken
        | BillingMeter::LlmCacheReadToken
        | BillingMeter::EmbeddingInputToken
        | BillingMeter::ImageInputToken
        | BillingMeter::AudioInputToken
        | BillingMeter::VideoInputToken => input,
        _ => 1,
    }
}

/// Maps a billing-store failure onto an invocation error.
///
/// The default classification is `Pricing`, because most precharge failures are
/// local pricing/configuration faults (missing price, unknown currency,
/// multiple plans). A wallet rejection is the exception: when the store reports
/// [`DomainError::is_insufficient_balance`] the caller can self-heal by funding
/// the account, so it must stay a distinct kind. Folding it into `Pricing`
/// (which the gateway stamps as `dispatch_failed`) is what previously told users
/// the upstream service was broken when in fact their balance was short.
fn billing_error(error: impl std::fmt::Display) -> InvocationError {
    InvocationError::new(InvocationErrorKind::Pricing, error.to_string())
}

/// Returns the postpaid overage when actual usage exceeds the hold estimate.
///
/// The hold can only be captured up to its frozen amount. The caller settles
/// the hold for `reserved` and charges the returned overage as a separate
/// request-scoped postpaid debit; both operations carry deterministic
/// idempotency keys, so a retry after either succeeds cannot double-charge.
fn split_hold_capture(
    actual: &GatewayBillingAmount,
    reserved: Option<&GatewayBillingAmount>,
) -> Option<GatewayBillingAmount> {
    let reserved = reserved?;
    let actual_points = actual.amount.parse::<i128>().ok()?;
    let reserved_points = reserved.amount.parse::<i128>().ok()?;
    if actual_points <= reserved_points {
        return None;
    }
    Some(GatewayBillingAmount {
        amount: (actual_points - reserved_points).to_string(),
        currency: actual.currency.clone(),
    })
}

/// Same as [`billing_error`], but preserves the insufficient-balance
/// classification carried by a [`DomainError`] coming through the billing port.
fn billing_port_error(error: DomainError) -> InvocationError {
    if error.is_insufficient_balance() {
        return InvocationError::new(InvocationErrorKind::InsufficientBalance, error.to_string());
    }
    billing_error(error)
}

#[cfg(test)]
mod tests {
    use super::aggregate_token_amounts;
    use super::{is_token_meter, split_hold_capture, unit_size_or_default};
    use crate::domain::{BillingMeter, DecimalValue};
    use crate::infrastructure::sql::admin_marketing_recharge::parse_recharge_settings_model;
    use crate::ports::RechargeSettingsModel;
    use std::collections::BTreeMap;

    fn usd_settings() -> RechargeSettingsModel {
        parse_recharge_settings_model(
            Some("10"),
            Some("CNY"),
            Some(BTreeMap::from([
                ("CNY".to_owned(), "1".to_owned()),
                ("USD".to_owned(), "7".to_owned()),
            ])),
        )
        .expect("valid settings")
    }

    #[test]
    fn split_hold_capture_charges_only_the_excess_over_the_reservation() {
        let reserved = crate::ports::GatewayBillingAmount {
            amount: "100".to_owned(),
            currency: "USD".to_owned(),
        };
        let actual = crate::ports::GatewayBillingAmount {
            amount: "130".to_owned(),
            currency: "USD".to_owned(),
        };
        let overage = split_hold_capture(&actual, Some(&reserved)).expect("overage");
        assert_eq!("30", overage.amount);
        assert_eq!("USD", overage.currency);
        assert!(split_hold_capture(&reserved, Some(&reserved)).is_none());
        assert!(split_hold_capture(&actual, None).is_none());
    }

    #[test]
    fn aggregates_decimal_lines_before_rounding_to_token_bank_units() {
        let amount = aggregate_token_amounts(
            [
                ("USD", "0.000000000001"),
                ("USD", "0.000000000001"),
                ("USD", "0.099999999998"),
            ],
            &usd_settings(),
        )
        .expect("same-currency amounts");

        // 0.1 USD × (US→CNY 7 × 10 points/CNY) = 7 points = 7_000_000 micro.
        assert_eq!("7000000", amount.amount);
        assert_eq!("USD", amount.currency);
    }

    #[test]
    fn rejects_mixed_currency_settlement() {
        assert!(
            aggregate_token_amounts([("USD", "0.1"), ("CNY", "0.1")], &usd_settings()).is_none()
        );
    }

    #[test]
    fn rounds_exact_tenths_without_an_extra_token() {
        let amount = aggregate_token_amounts([("USD", "1.200000000000")], &usd_settings())
            .expect("valid amount");
        // 1.2 USD × 70 = 84 points = 84_000_000 micro exactly.
        assert_eq!("84000000", amount.amount);
    }

    #[test]
    fn token_meter_defaults_missing_unit_size_to_per_million() {
        let million = DecimalValue::parse("1000000").expect("1M decimal");
        for persisted in ["", "0", "000000000000"] {
            let unit_size = unit_size_or_default(&BillingMeter::LlmInputToken, persisted)
                .unwrap_or_else(|| panic!("{persisted:?} unit_size resolves"));
            assert_eq!(
                million, unit_size,
                "persisted {persisted:?} defaults to per-million"
            );
        }
    }

    #[test]
    fn non_token_meter_defaults_missing_unit_size_to_one() {
        for persisted in ["", "0"] {
            let unit_size = unit_size_or_default(&BillingMeter::ApiRequest, persisted)
                .unwrap_or_else(|| panic!("{persisted:?} unit_size resolves"));
            assert_eq!(
                DecimalValue::ONE,
                unit_size,
                "persisted {persisted:?} defaults to one"
            );
        }
    }

    #[test]
    fn token_meter_preserves_a_valid_persisted_unit_size() {
        let unit_size = unit_size_or_default(&BillingMeter::LlmOutputToken, "500000")
            .expect("valid unit_size resolves");
        assert_eq!(
            DecimalValue::parse("500000").expect("valid decimal"),
            unit_size
        );
    }

    #[test]
    fn token_meter_classification_round_trips() {
        for meter in [
            BillingMeter::LlmInputToken,
            BillingMeter::LlmOutputToken,
            BillingMeter::LlmReasoningToken,
            BillingMeter::LlmCacheWriteToken,
            BillingMeter::LlmCacheReadToken,
            BillingMeter::EmbeddingInputToken,
            BillingMeter::AudioInputToken,
            BillingMeter::AudioOutputToken,
            BillingMeter::ImageInputToken,
            BillingMeter::ImageOutputToken,
            BillingMeter::VideoInputToken,
            BillingMeter::VideoOutputToken,
        ] {
            assert!(is_token_meter(&meter), "{meter:?} must be token-based");
        }
        for meter in [
            BillingMeter::ApiRequest,
            BillingMeter::ToolCall,
            BillingMeter::ImageResult,
            BillingMeter::ApiItem,
            BillingMeter::SpeechCharacter,
            BillingMeter::SttAudioMinute,
        ] {
            assert!(!is_token_meter(&meter), "{meter:?} must not be token-based");
        }
    }
}
