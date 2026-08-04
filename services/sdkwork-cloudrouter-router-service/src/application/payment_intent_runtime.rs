use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex};

use crate::application::{
    EntityUuidGenerator, PaymentAdapterOperation, PaymentCancelPaymentIntentRequest,
    PaymentCapturePaymentIntentRequest, PaymentConfirmPaymentIntentRequest,
    PaymentProviderRegistry, PaymentProviderRegistryError, PaymentRefundAttemptRecord,
    PaymentRefundEventRecord, PaymentRefundItemRecord, PaymentRefundRuntimeRecord,
    PaymentRefundRuntimeStore, PaymentRefundRuntimeStoreFuture, PaymentRefundStatus,
};
use crate::domain::{DomainError, DomainResult};

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
    pub supplier_code: String,
    pub payment_method: String,
    pub scene: String,
    pub status: PaymentIntentStatus,
    pub idempotency_key: String,
    pub created_at: String,
    pub updated_at: String,
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
    ) -> DomainResult<PaymentIntentRuntimeRecord> {
        validate_create_command(&command)?;
        let adapter = self
            .provider_registry
            .resolve(&command.supplier_code)
            .map_err(registry_error)?;
        let supplier_code = adapter.capabilities().supplier_code.to_owned();

        if let Some(existing) = self
            .store
            .load_by_idempotency(command.tenant_id.clone(), command.idempotency_key.clone())
            .await?
        {
            return Ok(existing);
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
            tenant_id: command.tenant_id,
            organization_id: command.organization_id,
            payment_intent_id: intent_id,
            payment_attempt_id,
            account_id: format!("{supplier_code}:{payment_method}:{scene}"),
            supplier_code,
            provider_account_id: None,
            method_code: payment_method,
            scene_code: scene,
            currency_code: command.currency_code,
            amount: command.amount,
            decision_reason: "standard_provider_requested".to_owned(),
            created_at: command.requested_at,
        };
        self.store
            .insert_payment_intent(intent, route_decision)
            .await
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

#[derive(Default, Clone)]
pub struct InMemoryPaymentIntentRuntimeStore {
    state: Arc<Mutex<InMemoryPaymentIntentRuntimeState>>,
}

#[derive(Default)]
struct InMemoryPaymentIntentRuntimeState {
    payment_intents: Vec<PaymentIntentRuntimeRecord>,
    route_decisions: Vec<PaymentRouteDecisionRecord>,
    operation_attempts: Vec<PaymentOperationAttemptRecord>,
    refunds: Vec<PaymentRefundRuntimeRecord>,
    refund_items: Vec<PaymentRefundItemRecord>,
    refund_attempts: Vec<PaymentRefundAttemptRecord>,
    refund_events: Vec<PaymentRefundEventRecord>,
}

impl InMemoryPaymentIntentRuntimeStore {
    pub fn payment_intents(&self) -> Vec<PaymentIntentRuntimeRecord> {
        self.state.lock().unwrap().payment_intents.clone()
    }

    pub fn route_decisions(&self) -> Vec<PaymentRouteDecisionRecord> {
        self.state.lock().unwrap().route_decisions.clone()
    }

    pub fn operation_attempts(&self) -> Vec<PaymentOperationAttemptRecord> {
        self.state.lock().unwrap().operation_attempts.clone()
    }

    pub fn refunds(&self) -> Vec<PaymentRefundRuntimeRecord> {
        self.state.lock().unwrap().refunds.clone()
    }

    pub fn refund_items(&self) -> Vec<PaymentRefundItemRecord> {
        self.state.lock().unwrap().refund_items.clone()
    }

    pub fn refund_attempts(&self) -> Vec<PaymentRefundAttemptRecord> {
        self.state.lock().unwrap().refund_attempts.clone()
    }

    pub fn refund_events(&self) -> Vec<PaymentRefundEventRecord> {
        self.state.lock().unwrap().refund_events.clone()
    }
}

impl PaymentIntentRuntimeStore for InMemoryPaymentIntentRuntimeStore {
    fn load_by_idempotency(
        &self,
        tenant_id: String,
        idempotency_key: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, Option<PaymentIntentRuntimeRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            Ok(state
                .lock()
                .unwrap()
                .payment_intents
                .iter()
                .find(|intent| {
                    intent.tenant_id == tenant_id && intent.idempotency_key == idempotency_key
                })
                .cloned())
        })
    }

    fn load_by_id(
        &self,
        tenant_id: String,
        id: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, Option<PaymentIntentRuntimeRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            Ok(state
                .lock()
                .unwrap()
                .payment_intents
                .iter()
                .find(|intent| intent.tenant_id == tenant_id && intent.id == id)
                .cloned())
        })
    }

    fn insert_payment_intent(
        &self,
        intent: PaymentIntentRuntimeRecord,
        route_decision: PaymentRouteDecisionRecord,
    ) -> PaymentIntentRuntimeStoreFuture<'_, PaymentIntentRuntimeRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state.lock().unwrap();
            state.route_decisions.push(route_decision);
            state.payment_intents.push(intent.clone());
            Ok(intent)
        })
    }

    fn insert_operation_attempt(
        &self,
        attempt: PaymentOperationAttemptRecord,
    ) -> PaymentIntentRuntimeStoreFuture<'_, PaymentOperationAttemptRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            state
                .lock()
                .unwrap()
                .operation_attempts
                .push(attempt.clone());
            Ok(attempt)
        })
    }

    fn finish_operation_attempt(
        &self,
        id: String,
        status: String,
        response_digest: Option<String>,
        provider_error_code: Option<String>,
        provider_error_message: Option<String>,
        completed_at: String,
    ) -> PaymentIntentRuntimeStoreFuture<'_, PaymentOperationAttemptRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state.lock().unwrap();
            let attempt = state
                .operation_attempts
                .iter_mut()
                .find(|attempt| attempt.id == id)
                .ok_or_else(|| DomainError::not_found("payment operation attempt was not found"))?;
            attempt.status = status;
            attempt.response_digest = response_digest;
            attempt.provider_error_code = provider_error_code;
            attempt.provider_error_message = provider_error_message;
            attempt.completed_at = Some(completed_at);
            Ok(attempt.clone())
        })
    }
}

impl PaymentRefundRuntimeStore for InMemoryPaymentIntentRuntimeStore {
    fn load_refund_by_idempotency(
        &self,
        tenant_id: String,
        idempotency_key: String,
    ) -> PaymentRefundRuntimeStoreFuture<'_, Option<PaymentRefundRuntimeRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            Ok(state
                .lock()
                .unwrap()
                .refunds
                .iter()
                .find(|refund| {
                    refund.tenant_id == tenant_id && refund.idempotency_key == idempotency_key
                })
                .cloned())
        })
    }

    fn load_refund_by_id(
        &self,
        tenant_id: String,
        id: String,
    ) -> PaymentRefundRuntimeStoreFuture<'_, Option<PaymentRefundRuntimeRecord>> {
        let state = self.state.clone();
        Box::pin(async move {
            Ok(state
                .lock()
                .unwrap()
                .refunds
                .iter()
                .find(|refund| refund.tenant_id == tenant_id && refund.id == id)
                .cloned())
        })
    }

    fn insert_refund(
        &self,
        refund: PaymentRefundRuntimeRecord,
        attempt: PaymentRefundAttemptRecord,
        items: Vec<PaymentRefundItemRecord>,
    ) -> PaymentRefundRuntimeStoreFuture<'_, PaymentRefundRuntimeRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state.lock().unwrap();
            state.refund_attempts.push(attempt);
            state.refund_items.extend(items);
            state.refunds.push(refund.clone());
            Ok(refund)
        })
    }

    fn finish_refund_attempt(
        &self,
        id: String,
        status: String,
        provider_refund_id: Option<String>,
        failure_code: Option<String>,
        failure_message: Option<String>,
        finished_at: String,
    ) -> PaymentRefundRuntimeStoreFuture<'_, PaymentRefundAttemptRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state.lock().unwrap();
            let attempt = state
                .refund_attempts
                .iter_mut()
                .find(|attempt| attempt.id == id || attempt.refund_id == id)
                .ok_or_else(|| DomainError::not_found("payment refund attempt was not found"))?;
            attempt.status = status;
            attempt.provider_refund_id = provider_refund_id;
            attempt.failure_code = failure_code;
            attempt.failure_message = failure_message;
            match attempt.status.as_str() {
                "SUCCEEDED" => attempt.succeeded_at = Some(finished_at.clone()),
                "FAILED" => attempt.failed_at = Some(finished_at.clone()),
                _ => {}
            }
            attempt.updated_at = finished_at;
            Ok(attempt.clone())
        })
    }

    fn finish_refund(
        &self,
        id: String,
        status: PaymentRefundStatus,
        updated_at: String,
        event: PaymentRefundEventRecord,
    ) -> PaymentRefundRuntimeStoreFuture<'_, PaymentRefundRuntimeRecord> {
        let state = self.state.clone();
        Box::pin(async move {
            let mut state = state.lock().unwrap();
            let refund = state
                .refunds
                .iter_mut()
                .find(|refund| refund.id == id)
                .ok_or_else(|| DomainError::not_found("payment refund was not found"))?;
            refund.status = status;
            refund.updated_at = updated_at;
            let refund = refund.clone();
            state.refund_events.push(event);
            Ok(refund)
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
