use crate::application::{
    EntityUuidGenerator, PaymentAdapterOperation, PaymentCancelPaymentIntentRequest,
    PaymentCapturePaymentIntentRequest, PaymentConfirmPaymentIntentRequest,
    PaymentCreateIntentRequest, PaymentProviderOperationOutcome, PaymentProviderRegistry,
    PaymentProviderRegistryError,
};
use crate::domain::{DomainError, DomainResult};
use std::future::Future;
use std::pin::Pin;

/// Canonical notify business type for a plain order payment (the default
/// when no explicit business type is declared at intent creation).
pub const PAYMENT_NOTIFY_BUSINESS_ORDER: &str = "order";
/// Standard `metadata_json`/`callback_payload` JSON key carrying the business
/// type declared at payment intent creation time.
pub const PAYMENT_NOTIFY_BUSINESS_TYPE_PAYLOAD_KEY: &str = "businessType";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PaymentIntentStatus {
    RequiresConfirmation,
    RequiresAction,
    Processing,
    Succeeded,
    Failed,
    Canceled,
}

impl PaymentIntentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::RequiresConfirmation => "requires_confirmation",
            Self::RequiresAction => "requires_action",
            Self::Processing => "processing",
            Self::Succeeded => "succeeded",
            Self::Failed => "failed",
            Self::Canceled => "canceled",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeCreatePaymentIntentCommand {
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub owner_user_id: String,
    pub merchant_order_no: String,
    pub amount: String,
    pub currency_code: String,
    pub subject: String,
    /// Canonical notify business type (defaults to `order`). The value is
    /// persisted on the payment attempt so the notify pipeline dispatches the
    /// callback to the matching business handler.
    pub business_type: Option<String>,
    /// Explicit notify URL override. When absent, the deployment standard
    /// notify URL (or the provider account metadata) is used.
    pub notify_url: Option<String>,
    /// Optional synchronous return URL override (Alipay page pay).
    pub return_url: Option<String>,
    pub supplier_code: String,
    pub payment_method: Option<String>,
    pub scene: Option<String>,
    pub idempotency_key: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeConfirmPaymentIntentCommand {
    pub tenant_id: String,
    pub payment_intent_id: String,
    pub idempotency_key: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeCapturePaymentIntentCommand {
    pub tenant_id: String,
    pub payment_intent_id: String,
    pub amount: Option<String>,
    pub final_capture: bool,
    pub idempotency_key: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeCancelPaymentIntentCommand {
    pub tenant_id: String,
    pub payment_intent_id: String,
    pub reason: Option<String>,
    pub idempotency_key: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentIntentRuntimeRecord {
    pub id: String,
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub owner_user_id: String,
    pub merchant_order_no: String,
    pub amount: String,
    pub currency_code: String,
    pub subject: String,
    /// Canonical notify business type. Persisted at creation for the callback
    /// dispatch; reloaded records default to the plain `order` type because
    /// operational flows never re-dispatch business fulfillment.
    pub business_type: String,
    pub supplier_code: String,
    pub payment_method: String,
    pub scene: String,
    pub status: PaymentIntentStatus,
    pub idempotency_key: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Creation outcome that carries the provider order response so the API layer
/// can render the normalized next action (e.g. WeChat native or Alipay
/// precreate scan-to-pay QR code) without re-querying the provider.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentIntentCreationResult {
    pub intent: PaymentIntentRuntimeRecord,
    pub provider_outcome: Option<PaymentProviderOperationOutcome>,
    /// Effective notify URL registered with the provider for this intent
    /// (explicit override or the deployment standard URL). Echoed so order
    /// placement observes exactly what the provider will call back on.
    pub notify_url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentRouteDecisionRecord {
    pub id: String,
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub payment_intent_id: String,
    pub payment_attempt_id: String,
    pub account_id: String,
    pub supplier_code: String,
    pub provider_account_id: Option<String>,
    pub method_code: String,
    pub scene_code: String,
    pub currency_code: String,
    pub amount: String,
    pub decision_reason: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentOperationAttemptRecord {
    pub id: String,
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub operation_no: String,
    pub supplier_code: String,
    pub operation: PaymentAdapterOperation,
    pub sdkwork_resource_type: String,
    pub sdkwork_resource_id: String,
    pub idempotency_key: String,
    pub request_digest: String,
    pub response_digest: Option<String>,
    pub provider_error_code: Option<String>,
    pub provider_error_message: Option<String>,
    pub status: String,
    pub started_at: String,
    pub completed_at: Option<String>,
}

pub type PaymentIntentRuntimeStoreFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub trait PaymentIntentRuntimeStore: Send + Sync {
    fn load_by_idempotency(
        &self,
        tenant_id: String,
        idempotency_key: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, Option<PaymentIntentRuntimeRecord>>;

    fn load_by_id(
        &self,
        tenant_id: String,
        id: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, Option<PaymentIntentRuntimeRecord>>;

    fn insert_payment_intent(
        &self,
        intent: PaymentIntentRuntimeRecord,
        route_decision: PaymentRouteDecisionRecord,
    ) -> PaymentIntentRuntimeStoreFuture<'_, PaymentIntentRuntimeRecord>;

    /// Persists the outcome of the provider dispatch that follows a durable
    /// intent insert. Success records the intent status plus the normalized
    /// next-action payload; failure records `failed` so a provider error can
    /// never leave an intent silently pending.
    fn record_intent_provider_dispatch(
        &self,
        tenant_id: String,
        intent_id: String,
        status: PaymentIntentStatus,
        next_action_json: Option<String>,
        updated_at: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, ()>;

    fn insert_operation_attempt(
        &self,
        attempt: PaymentOperationAttemptRecord,
    ) -> PaymentIntentRuntimeStoreFuture<'_, PaymentOperationAttemptRecord>;

    fn finish_operation_attempt(
        &self,
        id: String,
        status: String,
        response_digest: Option<String>,
        provider_error_code: Option<String>,
        provider_error_message: Option<String>,
        completed_at: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, PaymentOperationAttemptRecord>;
}

pub struct PaymentIntentRuntimeService<'a, S>
where
    S: PaymentIntentRuntimeStore + ?Sized,
{
    store: &'a S,
    provider_registry: PaymentProviderRegistry,
    entity_uuid_generator: &'a (dyn EntityUuidGenerator + Send + Sync),
}

impl<'a, S> PaymentIntentRuntimeService<'a, S>
where
    S: PaymentIntentRuntimeStore + ?Sized,
{
    pub fn new(
        store: &'a S,
        provider_registry: PaymentProviderRegistry,
        entity_uuid_generator: &'a (dyn EntityUuidGenerator + Send + Sync),
    ) -> Self {
        Self {
            store,
            provider_registry,
            entity_uuid_generator,
        }
    }

    pub async fn create_payment_intent(
        &self,
        command: RuntimeCreatePaymentIntentCommand,
    ) -> DomainResult<PaymentIntentCreationResult> {
        validate_create_command(&command)?;
        let business_type = validate_business_type(command.business_type.as_deref())?;
        let adapter = self
            .provider_registry
            .resolve(&command.supplier_code)
            .map_err(registry_error)?;
        let supplier_code = adapter.capabilities().supplier_code.to_owned();
        // The notify URL is resolved by the order gateway at checkout (or by
        // the client explicitly); the intent runtime only passes it through.
        let notify_url = command.notify_url.clone();

        if let Some(existing) = self
            .store
            .load_by_idempotency(command.tenant_id.clone(), command.idempotency_key.clone())
            .await?
        {
            return Ok(PaymentIntentCreationResult {
                intent: existing,
                provider_outcome: None,
                notify_url,
            });
        }

        let intent_id = self.entity_uuid_generator.generate_entity_uuid()?;
        let payment_attempt_id = self.entity_uuid_generator.generate_entity_uuid()?;
        let route_decision_id = self.entity_uuid_generator.generate_entity_uuid()?;
        let payment_method = command
            .payment_method
            .clone()
            .unwrap_or_else(|| default_payment_method(&supplier_code).to_owned());
        let scene = command.scene.clone().unwrap_or_else(|| "web".to_owned());
        let intent = PaymentIntentRuntimeRecord {
            id: intent_id.clone(),
            tenant_id: command.tenant_id.clone(),
            organization_id: command.organization_id.clone(),
            owner_user_id: command.owner_user_id.clone(),
            merchant_order_no: command.merchant_order_no.clone(),
            amount: command.amount.clone(),
            currency_code: command.currency_code.clone(),
            subject: command.subject.clone(),
            business_type: business_type.clone(),
            supplier_code: supplier_code.clone(),
            payment_method: payment_method.clone(),
            scene: scene.clone(),
            status: PaymentIntentStatus::RequiresConfirmation,
            idempotency_key: command.idempotency_key.clone(),
            created_at: command.requested_at.clone(),
            updated_at: command.requested_at.clone(),
        };
        let route_decision = PaymentRouteDecisionRecord {
            id: route_decision_id,
            tenant_id: command.tenant_id.clone(),
            organization_id: command.organization_id,
            payment_intent_id: intent_id,
            payment_attempt_id,
            account_id: format!("{supplier_code}:{payment_method}:{scene}"),
            supplier_code,
            provider_account_id: None,
            method_code: payment_method.clone(),
            scene_code: scene.clone(),
            currency_code: command.currency_code.clone(),
            amount: command.amount.clone(),
            decision_reason: "standard_provider_requested".to_owned(),
            created_at: command.requested_at.clone(),
        };

        // Real provider adapters (sandbox_only = false) place the order at
        // creation time so the response carries the normalized next action
        // (WeChat native code_url, Alipay precreate qr_code) for scan-to-pay.
        // Sandbox registry entries never place a provider order.
        //
        // The intent row is durably inserted BEFORE the provider call: a
        // crash or provider error then leaves an auditable local fact (and a
        // compensating `failed` status) instead of a live provider order with
        // no local record. A lost insert race surfaces as a typed conflict,
        // in which case the concurrent winner's record is replayed and no
        // second provider order is placed.
        let intent = match self.store.insert_payment_intent(intent, route_decision).await {
            Ok(intent) => intent,
            Err(error) if error.is_conflict() => {
                let existing = self
                    .store
                    .load_by_idempotency(command.tenant_id.clone(), command.idempotency_key.clone())
                    .await?
                    .ok_or(error)?;
                return Ok(PaymentIntentCreationResult {
                    intent: existing,
                    provider_outcome: None,
                    notify_url,
                });
            }
            Err(error) => return Err(error),
        };

        let provider_outcome = if adapter.capabilities().sandbox_only {
            None
        } else {
            let attempt = self
                .store
                .insert_operation_attempt(self.operation_attempt(
                    &intent,
                    PaymentAdapterOperation::CreatePaymentIntent,
                    &command.idempotency_key,
                    &command.requested_at,
                )?)
                .await?;
            match adapter
                .create_payment_intent(PaymentCreateIntentRequest {
                    tenant_id: command.tenant_id.parse::<i64>().ok(),
                    merchant_order_no: Some(command.merchant_order_no.clone()),
                    amount_minor: decimal_amount_to_minor(&command.amount),
                    currency: Some(command.currency_code.clone()),
                    notify_url: notify_url.clone(),
                    return_url: command.return_url.clone(),
                    metadata: serde_json::json!({
                        "description": command.subject.clone(),
                        "subject": command.subject.clone(),
                        "payment_method": payment_method.clone(),
                        "scene": scene.clone(),
                    }),
                })
                .await
            {
                Ok(outcome) => {
                    let _ = self
                        .store
                        .finish_operation_attempt(
                            attempt.id.clone(),
                            "SUCCESS".to_owned(),
                            Some(format!("{outcome:?}")),
                            None,
                            None,
                            command.requested_at.clone(),
                        )
                        .await?;
                    // The provider order is live and waits for the payer's
                    // action: record it durably instead of keeping the
                    // outcome in-process only.
                    self.store
                        .record_intent_provider_dispatch(
                            intent.tenant_id.clone(),
                            intent.id.clone(),
                            PaymentIntentStatus::RequiresAction,
                            Some(outcome.payload.to_string()),
                            command.requested_at.clone(),
                        )
                        .await?;
                    Some(outcome)
                }
                Err(error) => {
                    let _ = self
                        .store
                        .finish_operation_attempt(
                            attempt.id.clone(),
                            "FAILED".to_owned(),
                            None,
                            Some("provider_request_failed".to_owned()),
                            Some(error.to_string()),
                            command.requested_at.clone(),
                        )
                        .await?;
                    self.store
                        .record_intent_provider_dispatch(
                            intent.tenant_id.clone(),
                            intent.id.clone(),
                            PaymentIntentStatus::Failed,
                            None,
                            command.requested_at.clone(),
                        )
                        .await?;
                    return Err(registry_error(error));
                }
            }
        };

        Ok(PaymentIntentCreationResult {
            intent,
            provider_outcome,
            notify_url,
        })
    }

    pub async fn confirm_payment_intent(
        &self,
        command: RuntimeConfirmPaymentIntentCommand,
    ) -> DomainResult<PaymentIntentRuntimeRecord> {
        validate_confirm_command(&command)?;
        let intent = self
            .store
            .load_by_id(command.tenant_id.clone(), command.payment_intent_id.clone())
            .await?
            .ok_or_else(|| DomainError::not_found("payment intent was not found"))?;
        let adapter = self
            .provider_registry
            .resolve(&intent.supplier_code)
            .map_err(registry_error)?;
        let attempt = self
            .store
            .insert_operation_attempt(self.operation_attempt(
                &intent,
                PaymentAdapterOperation::ConfirmPaymentIntent,
                &command.idempotency_key,
                &command.requested_at,
            )?)
            .await?;

        match adapter
            .confirm_payment_intent(PaymentConfirmPaymentIntentRequest {
                payment_intent_id: Some(intent.id.clone()),
                metadata: serde_json::Value::Null,
            })
            .await
        {
            Ok(outcome) => {
                let _ = self
                    .store
                    .finish_operation_attempt(
                        attempt.id.clone(),
                        "SUCCESS".to_owned(),
                        Some(format!("{outcome:?}")),
                        None,
                        None,
                        command.requested_at.clone(),
                    )
                    .await?;
                Ok(intent)
            }
            Err(error) => {
                let _ = self
                    .store
                    .finish_operation_attempt(
                        attempt.id.clone(),
                        "FAILED".to_owned(),
                        None,
                        Some("unsupported_capability".to_owned()),
                        Some(error.to_string()),
                        command.requested_at.clone(),
                    )
                    .await?;
                Err(registry_error(error))
            }
        }
    }

    pub async fn capture_payment_intent(
        &self,
        command: RuntimeCapturePaymentIntentCommand,
    ) -> DomainResult<PaymentIntentRuntimeRecord> {
        validate_capture_command(&command)?;
        let intent = self
            .store
            .load_by_id(command.tenant_id.clone(), command.payment_intent_id.clone())
            .await?
            .ok_or_else(|| DomainError::not_found("payment intent was not found"))?;
        let adapter = self
            .provider_registry
            .resolve(&intent.supplier_code)
            .map_err(registry_error)?;
        let attempt = self
            .store
            .insert_operation_attempt(self.operation_attempt(
                &intent,
                PaymentAdapterOperation::CapturePaymentIntent,
                &command.idempotency_key,
                &command.requested_at,
            )?)
            .await?;

        match adapter
            .capture_payment_intent(PaymentCapturePaymentIntentRequest {
                payment_intent_id: Some(intent.id.clone()),
                amount_minor: command.amount.as_deref().and_then(decimal_amount_to_minor),
                metadata: serde_json::Value::Null,
            })
            .await
        {
            Ok(outcome) => {
                let _ = self
                    .store
                    .finish_operation_attempt(
                        attempt.id.clone(),
                        "SUCCESS".to_owned(),
                        Some(format!("{outcome:?}")),
                        None,
                        None,
                        command.requested_at.clone(),
                    )
                    .await?;
                Ok(intent)
            }
            Err(error) => {
                let _ = self
                    .store
                    .finish_operation_attempt(
                        attempt.id.clone(),
                        "FAILED".to_owned(),
                        None,
                        Some("unsupported_capability".to_owned()),
                        Some(error.to_string()),
                        command.requested_at.clone(),
                    )
                    .await?;
                Err(registry_error(error))
            }
        }
    }

    pub async fn cancel_payment_intent(
        &self,
        command: RuntimeCancelPaymentIntentCommand,
    ) -> DomainResult<PaymentIntentRuntimeRecord> {
        validate_cancel_command(&command)?;
        let intent = self
            .store
            .load_by_id(command.tenant_id.clone(), command.payment_intent_id.clone())
            .await?
            .ok_or_else(|| DomainError::not_found("payment intent was not found"))?;
        let adapter = self
            .provider_registry
            .resolve(&intent.supplier_code)
            .map_err(registry_error)?;
        let attempt = self
            .store
            .insert_operation_attempt(self.operation_attempt(
                &intent,
                PaymentAdapterOperation::CancelPaymentIntent,
                &command.idempotency_key,
                &command.requested_at,
            )?)
            .await?;

        match adapter
            .cancel_payment_intent(PaymentCancelPaymentIntentRequest {
                payment_intent_id: Some(intent.id.clone()),
                reason: command.reason.clone(),
                metadata: serde_json::Value::Null,
            })
            .await
        {
            Ok(outcome) => {
                let _ = self
                    .store
                    .finish_operation_attempt(
                        attempt.id.clone(),
                        "SUCCESS".to_owned(),
                        Some(format!("{outcome:?}")),
                        None,
                        None,
                        command.requested_at.clone(),
                    )
                    .await?;
                Ok(intent)
            }
            Err(error) => {
                let _ = self
                    .store
                    .finish_operation_attempt(
                        attempt.id.clone(),
                        "FAILED".to_owned(),
                        None,
                        Some("unsupported_capability".to_owned()),
                        Some(error.to_string()),
                        command.requested_at.clone(),
                    )
                    .await?;
                Err(registry_error(error))
            }
        }
    }

    fn operation_attempt(
        &self,
        intent: &PaymentIntentRuntimeRecord,
        operation: PaymentAdapterOperation,
        idempotency_key: &str,
        requested_at: &str,
    ) -> DomainResult<PaymentOperationAttemptRecord> {
        let id = self.entity_uuid_generator.generate_entity_uuid()?;
        Ok(PaymentOperationAttemptRecord {
            operation_no: id.clone(),
            id,
            tenant_id: intent.tenant_id.clone(),
            organization_id: intent.organization_id.clone(),
            supplier_code: intent.supplier_code.clone(),
            operation,
            sdkwork_resource_type: "payment_intent".to_owned(),
            sdkwork_resource_id: intent.id.clone(),
            idempotency_key: idempotency_key.to_owned(),
            request_digest: format!(
                "{}:{}:{}",
                intent.supplier_code,
                operation.as_code(),
                idempotency_key
            ),
            response_digest: None,
            provider_error_code: None,
            provider_error_message: None,
            status: "RECEIVED".to_owned(),
            started_at: requested_at.to_owned(),
            completed_at: None,
        })
    }
}

impl PaymentAdapterOperation {
    pub fn as_code(self) -> &'static str {
        match self {
            Self::Capabilities => "capabilities",
            Self::CreatePaymentIntent => "create_payment_intent",
            Self::ConfirmPaymentIntent => "confirm_payment_intent",
            Self::CapturePaymentIntent => "capture_payment_intent",
            Self::CancelPaymentIntent => "cancel_payment_intent",
            Self::CreateRefund => "create_refund",
            Self::QueryRefund => "query_refund",
            Self::CancelRefund => "cancel_refund",
            Self::VerifyWebhook => "verify_webhook",
            Self::NormalizeWebhook => "normalize_webhook",
            Self::DownloadStatement => "download_statement",
            Self::ParseStatement => "parse_statement",
            Self::InvokeNativeOperation => "invoke_native_operation",
        }
    }
}

/// Resolves the canonical notify business type from the create command.
/// Business types must be lowercase snake-case tokens (`^[a-z][a-z0-9_]{0,63}$`)
/// so they stay safe as JSON keys, URL segments, and registry keys. Absent
/// values default to the plain `order` business; invalid values are rejected
/// so business fulfillment can never be silently mis-routed.
fn validate_business_type(business_type: Option<&str>) -> DomainResult<String> {
    let Some(business_type) = business_type
        .map(str::trim)
        .filter(|value| !value.is_empty())
    else {
        return Ok(PAYMENT_NOTIFY_BUSINESS_ORDER.to_owned());
    };
    let valid = business_type.len() <= 64
        && business_type
            .chars()
            .next()
            .is_some_and(|character| character.is_ascii_lowercase())
        && business_type.chars().all(|character| {
            character.is_ascii_lowercase() || character.is_ascii_digit() || character == '_'
        });
    if valid {
        Ok(business_type.to_owned())
    } else {
        Err(DomainError::new(
            "payment business_type must match ^[a-z][a-z0-9_]{0,63}$",
        ))
    }
}

fn validate_create_command(command: &RuntimeCreatePaymentIntentCommand) -> DomainResult<()> {
    require_non_empty("tenant_id", &command.tenant_id)?;
    require_non_empty("owner_user_id", &command.owner_user_id)?;
    require_non_empty("merchant_order_no", &command.merchant_order_no)?;
    require_non_empty("amount", &command.amount)?;
    require_non_empty("currency_code", &command.currency_code)?;
    require_non_empty("subject", &command.subject)?;
    require_non_empty("supplier_code", &command.supplier_code)?;
    require_non_empty("idempotency_key", &command.idempotency_key)?;
    require_non_empty("requested_at", &command.requested_at)?;
    if command.currency_code.len() != 3
        || !command
            .currency_code
            .chars()
            .all(|ch| ch.is_ascii_uppercase())
    {
        return Err(DomainError::new("payment currency_code must be ISO 4217"));
    }
    Ok(())
}

fn validate_confirm_command(command: &RuntimeConfirmPaymentIntentCommand) -> DomainResult<()> {
    require_non_empty("tenant_id", &command.tenant_id)?;
    require_non_empty("payment_intent_id", &command.payment_intent_id)?;
    require_non_empty("idempotency_key", &command.idempotency_key)?;
    require_non_empty("requested_at", &command.requested_at)
}

fn validate_capture_command(command: &RuntimeCapturePaymentIntentCommand) -> DomainResult<()> {
    require_non_empty("tenant_id", &command.tenant_id)?;
    require_non_empty("payment_intent_id", &command.payment_intent_id)?;
    require_non_empty("idempotency_key", &command.idempotency_key)?;
    require_non_empty("requested_at", &command.requested_at)
}

fn validate_cancel_command(command: &RuntimeCancelPaymentIntentCommand) -> DomainResult<()> {
    require_non_empty("tenant_id", &command.tenant_id)?;
    require_non_empty("payment_intent_id", &command.payment_intent_id)?;
    require_non_empty("idempotency_key", &command.idempotency_key)?;
    require_non_empty("requested_at", &command.requested_at)
}

fn require_non_empty(field: &str, value: &str) -> DomainResult<()> {
    if value.trim().is_empty() {
        Err(DomainError::new(format!(
            "payment {field} must not be empty"
        )))
    } else {
        Ok(())
    }
}

fn default_payment_method(supplier_code: &str) -> &'static str {
    match supplier_code {
        "wechat_pay" => "wechat_jsapi",
        "alipay" => "alipay_page",
        "paypal" => "paypal_checkout",
        "apple_pay" => "apple_pay",
        "google_pay" => "google_pay",
        _ => "card",
    }
}

fn decimal_amount_to_minor(amount: &str) -> Option<i64> {
    let (units, fraction) = amount.split_once('.').unwrap_or((amount, "0"));
    let units = units.parse::<i64>().ok()?;
    let cents = format!("{fraction:0<2}");
    let cents = cents.get(..2)?.parse::<i64>().ok()?;
    units.checked_mul(100)?.checked_add(cents)
}

fn registry_error(error: PaymentProviderRegistryError) -> DomainError {
    DomainError::new(error.to_string())
}
