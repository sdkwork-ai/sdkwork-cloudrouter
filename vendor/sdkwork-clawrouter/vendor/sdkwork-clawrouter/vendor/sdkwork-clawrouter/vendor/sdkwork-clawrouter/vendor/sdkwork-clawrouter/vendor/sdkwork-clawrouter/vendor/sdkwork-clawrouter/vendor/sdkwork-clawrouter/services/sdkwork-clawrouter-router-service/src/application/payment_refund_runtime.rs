use std::future::Future;
use std::pin::Pin;

use crate::application::{
    EntityUuidGenerator, PaymentAdapterOperation, PaymentCancelRefundRequest,
    PaymentCreateRefundRequest, PaymentIntentRuntimeRecord, PaymentIntentRuntimeStore,
    PaymentOperationAttemptRecord, PaymentProviderRegistry, PaymentProviderRegistryError,
};
use crate::domain::{DomainError, DomainResult};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PaymentRefundStatus {
    Pending,
    Processing,
    Succeeded,
    Failed,
    Canceled,
}

impl PaymentRefundStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Processing => "processing",
            Self::Succeeded => "succeeded",
            Self::Failed => "failed",
            Self::Canceled => "canceled",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeCreateRefundCommand {
    pub tenant_id: String,
    pub payment_intent_id: String,
    pub merchant_refund_no: String,
    pub amount: String,
    pub currency_code: String,
    pub reason: String,
    pub items: Vec<RuntimeCreateRefundItemCommand>,
    pub idempotency_key: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeCreateRefundItemCommand {
    pub order_item_id: String,
    pub quantity: i64,
    pub refund_amount: String,
    pub tax_refund_amount: String,
    pub shipping_refund_amount: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeCancelRefundCommand {
    pub tenant_id: String,
    pub refund_id: String,
    pub reason: Option<String>,
    pub idempotency_key: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentRefundRuntimeRecord {
    pub id: String,
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub payment_intent_id: String,
    pub payment_attempt_id: String,
    pub merchant_refund_no: String,
    pub amount: String,
    pub currency_code: String,
    pub provider_code: String,
    pub reason: String,
    pub status: PaymentRefundStatus,
    pub idempotency_key: String,
    pub items: Vec<PaymentRefundItemRecord>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentRefundItemRecord {
    pub id: String,
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub refund_id: String,
    pub order_item_id: String,
    pub quantity: i64,
    pub refund_amount: String,
    pub tax_refund_amount: String,
    pub shipping_refund_amount: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentRefundAttemptRecord {
    pub id: String,
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub refund_attempt_no: String,
    pub refund_id: String,
    pub provider_code: String,
    pub provider_account_id: Option<String>,
    pub out_refund_no: String,
    pub provider_refund_id: Option<String>,
    pub amount: String,
    pub currency_code: String,
    pub status: String,
    pub failure_code: Option<String>,
    pub failure_message: Option<String>,
    pub submitted_at: Option<String>,
    pub succeeded_at: Option<String>,
    pub failed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentRefundEventRecord {
    pub id: String,
    pub tenant_id: String,
    pub organization_id: Option<String>,
    pub refund_id: String,
    pub event_type: String,
    pub from_status: Option<String>,
    pub to_status: String,
    pub reason: Option<String>,
    pub created_at: String,
}

pub type PaymentRefundRuntimeStoreFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

pub trait PaymentRefundRuntimeStore: Send + Sync {
    fn load_refund_by_idempotency(
        &self,
        tenant_id: String,
        idempotency_key: String,
    ) -> PaymentRefundRuntimeStoreFuture<'_, Option<PaymentRefundRuntimeRecord>>;

    fn load_refund_by_id(
        &self,
        tenant_id: String,
        id: String,
    ) -> PaymentRefundRuntimeStoreFuture<'_, Option<PaymentRefundRuntimeRecord>>;

    fn insert_refund(
        &self,
        refund: PaymentRefundRuntimeRecord,
        attempt: PaymentRefundAttemptRecord,
        items: Vec<PaymentRefundItemRecord>,
    ) -> PaymentRefundRuntimeStoreFuture<'_, PaymentRefundRuntimeRecord>;

    fn finish_refund_attempt(
        &self,
        id: String,
        status: String,
        provider_refund_id: Option<String>,
        failure_code: Option<String>,
        failure_message: Option<String>,
        finished_at: String,
    ) -> PaymentRefundRuntimeStoreFuture<'_, PaymentRefundAttemptRecord>;

    fn finish_refund(
        &self,
        id: String,
        status: PaymentRefundStatus,
        updated_at: String,
        event: PaymentRefundEventRecord,
    ) -> PaymentRefundRuntimeStoreFuture<'_, PaymentRefundRuntimeRecord>;
}

pub trait PaymentAggregateRuntimeStore:
    PaymentIntentRuntimeStore + PaymentRefundRuntimeStore + Send + Sync
{
}

impl<T> PaymentAggregateRuntimeStore for T where
    T: PaymentIntentRuntimeStore + PaymentRefundRuntimeStore + Send + Sync
{
}

pub struct PaymentRefundRuntimeService<'a, S>
where
    S: PaymentIntentRuntimeStore + PaymentRefundRuntimeStore + ?Sized,
{
    store: &'a S,
    provider_registry: PaymentProviderRegistry,
    entity_uuid_generator: &'a (dyn EntityUuidGenerator + Send + Sync),
}

impl<'a, S> PaymentRefundRuntimeService<'a, S>
where
    S: PaymentIntentRuntimeStore + PaymentRefundRuntimeStore + ?Sized,
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

    pub async fn create_refund(
        &self,
        command: RuntimeCreateRefundCommand,
    ) -> DomainResult<PaymentRefundRuntimeRecord> {
        validate_create_refund_command(&command)?;
        if let Some(existing) = self
            .store
            .load_refund_by_idempotency(command.tenant_id.clone(), command.idempotency_key.clone())
            .await?
        {
            return Ok(existing);
        }

        let intent = self
            .store
            .load_by_id(command.tenant_id.clone(), command.payment_intent_id.clone())
            .await?
            .ok_or_else(|| DomainError::not_found("payment intent was not found"))?;
        validate_refund_against_intent(&command, &intent)?;
        let adapter = self
            .provider_registry
            .resolve(&intent.provider_code)
            .map_err(registry_error)?;

        let refund_id = self.entity_uuid_generator.generate_entity_uuid()?;
        let refund_attempt_id = self.entity_uuid_generator.generate_entity_uuid()?;
        let refund_items = self.refund_items(&command, &intent, &refund_id)?;
        let refund = PaymentRefundRuntimeRecord {
            id: refund_id.clone(),
            tenant_id: command.tenant_id.clone(),
            organization_id: intent.organization_id.clone(),
            payment_intent_id: intent.id.clone(),
            payment_attempt_id: intent.id.clone(),
            merchant_refund_no: command.merchant_refund_no.clone(),
            amount: command.amount.clone(),
            currency_code: command.currency_code.clone(),
            provider_code: intent.provider_code.clone(),
            reason: command.reason.clone(),
            status: PaymentRefundStatus::Pending,
            idempotency_key: command.idempotency_key.clone(),
            items: refund_items.clone(),
            created_at: command.requested_at.clone(),
            updated_at: command.requested_at.clone(),
        };
        let refund_attempt = PaymentRefundAttemptRecord {
            id: refund_attempt_id,
            tenant_id: command.tenant_id.clone(),
            organization_id: intent.organization_id.clone(),
            refund_attempt_no: command.merchant_refund_no.clone(),
            refund_id: refund_id.clone(),
            provider_code: intent.provider_code.clone(),
            provider_account_id: None,
            out_refund_no: command.merchant_refund_no.clone(),
            provider_refund_id: None,
            amount: command.amount.clone(),
            currency_code: command.currency_code.clone(),
            status: "RECEIVED".to_owned(),
            failure_code: None,
            failure_message: None,
            submitted_at: Some(command.requested_at.clone()),
            succeeded_at: None,
            failed_at: None,
            created_at: command.requested_at.clone(),
            updated_at: command.requested_at.clone(),
        };
        let refund = self
            .store
            .insert_refund(refund, refund_attempt, refund_items)
            .await?;
        let operation_attempt = self
            .store
            .insert_operation_attempt(self.operation_attempt(&refund, &command)?)
            .await?;

        match adapter
            .create_refund(PaymentCreateRefundRequest {
                payment_intent_id: Some(intent.id),
                refund_no: Some(command.merchant_refund_no.clone()),
                amount_minor: decimal_amount_to_minor(&command.amount),
                reason: Some(command.reason.clone()),
                metadata: serde_json::Value::Null,
            })
            .await
        {
            Ok(outcome) => {
                let _ = self
                    .store
                    .finish_operation_attempt(
                        operation_attempt.id,
                        "SUCCESS".to_owned(),
                        Some(format!("{outcome:?}")),
                        None,
                        None,
                        command.requested_at.clone(),
                    )
                    .await?;
                let _ = self
                    .store
                    .finish_refund_attempt(
                        refund.id.clone(),
                        "PROCESSING".to_owned(),
                        None,
                        None,
                        None,
                        command.requested_at.clone(),
                    )
                    .await;
                self.store
                    .finish_refund(
                        refund.id.clone(),
                        PaymentRefundStatus::Processing,
                        command.requested_at.clone(),
                        self.refund_event(
                            &refund,
                            Some(PaymentRefundStatus::Pending.as_str()),
                            PaymentRefundStatus::Processing.as_str(),
                            "refund.processing",
                            None,
                            &command.requested_at,
                        )?,
                    )
                    .await
            }
            Err(error) => {
                let message = error.to_string();
                let _ = self
                    .store
                    .finish_operation_attempt(
                        operation_attempt.id,
                        "FAILED".to_owned(),
                        None,
                        Some("unsupported_capability".to_owned()),
                        Some(message.clone()),
                        command.requested_at.clone(),
                    )
                    .await?;
                let _ = self
                    .store
                    .finish_refund_attempt(
                        refund.id.clone(),
                        "FAILED".to_owned(),
                        None,
                        Some("unsupported_capability".to_owned()),
                        Some(message.clone()),
                        command.requested_at.clone(),
                    )
                    .await?;
                let _ = self
                    .store
                    .finish_refund(
                        refund.id.clone(),
                        PaymentRefundStatus::Failed,
                        command.requested_at.clone(),
                        self.refund_event(
                            &refund,
                            Some(PaymentRefundStatus::Pending.as_str()),
                            PaymentRefundStatus::Failed.as_str(),
                            "refund.failed",
                            Some(message.clone()),
                            &command.requested_at,
                        )?,
                    )
                    .await?;
                Err(registry_error(error))
            }
        }
    }

    pub async fn cancel_refund(
        &self,
        command: RuntimeCancelRefundCommand,
    ) -> DomainResult<PaymentRefundRuntimeRecord> {
        validate_cancel_refund_command(&command)?;
        let refund = self
            .store
            .load_refund_by_id(command.tenant_id.clone(), command.refund_id.clone())
            .await?
            .ok_or_else(|| DomainError::not_found("payment refund was not found"))?;
        if matches!(
            refund.status,
            PaymentRefundStatus::Succeeded
                | PaymentRefundStatus::Failed
                | PaymentRefundStatus::Canceled
        ) {
            return Err(DomainError::conflict(
                "payment refund terminal status cannot be canceled",
            ));
        }
        let adapter = self
            .provider_registry
            .resolve(&refund.provider_code)
            .map_err(registry_error)?;
        let operation_attempt = self
            .store
            .insert_operation_attempt(self.cancel_operation_attempt(&refund, &command)?)
            .await?;

        match adapter
            .cancel_refund(PaymentCancelRefundRequest {
                refund_id: Some(refund.id.clone()),
                refund_no: Some(refund.merchant_refund_no.clone()),
                reason: command.reason.clone(),
                metadata: serde_json::Value::Null,
            })
            .await
        {
            Ok(outcome) => {
                let _ = self
                    .store
                    .finish_operation_attempt(
                        operation_attempt.id,
                        "SUCCESS".to_owned(),
                        Some(format!("{outcome:?}")),
                        None,
                        None,
                        command.requested_at.clone(),
                    )
                    .await?;
                self.store
                    .finish_refund(
                        refund.id.clone(),
                        PaymentRefundStatus::Canceled,
                        command.requested_at.clone(),
                        self.refund_event(
                            &refund,
                            Some(refund.status.as_str()),
                            PaymentRefundStatus::Canceled.as_str(),
                            "refund.canceled",
                            command.reason.clone(),
                            &command.requested_at,
                        )?,
                    )
                    .await
            }
            Err(error) => {
                let message = error.to_string();
                let _ = self
                    .store
                    .finish_operation_attempt(
                        operation_attempt.id,
                        "FAILED".to_owned(),
                        None,
                        Some("unsupported_capability".to_owned()),
                        Some(message.clone()),
                        command.requested_at.clone(),
                    )
                    .await?;
                let _ = self
                    .store
                    .finish_refund(
                        refund.id.clone(),
                        refund.status.clone(),
                        command.requested_at.clone(),
                        self.refund_event(
                            &refund,
                            Some(refund.status.as_str()),
                            refund.status.as_str(),
                            "refund.cancel_failed",
                            Some(message.clone()),
                            &command.requested_at,
                        )?,
                    )
                    .await?;
                Err(registry_error(error))
            }
        }
    }

    fn operation_attempt(
        &self,
        refund: &PaymentRefundRuntimeRecord,
        command: &RuntimeCreateRefundCommand,
    ) -> DomainResult<PaymentOperationAttemptRecord> {
        let id = self.entity_uuid_generator.generate_entity_uuid()?;
        Ok(PaymentOperationAttemptRecord {
            operation_no: id.clone(),
            id,
            tenant_id: refund.tenant_id.clone(),
            organization_id: refund.organization_id.clone(),
            provider_code: refund.provider_code.clone(),
            operation: PaymentAdapterOperation::CreateRefund,
            sdkwork_resource_type: "refund".to_owned(),
            sdkwork_resource_id: refund.id.clone(),
            idempotency_key: command.idempotency_key.clone(),
            request_digest: format!(
                "{}:{}:{}",
                refund.provider_code,
                PaymentAdapterOperation::CreateRefund.as_code(),
                command.idempotency_key
            ),
            response_digest: None,
            provider_error_code: None,
            provider_error_message: None,
            status: "RECEIVED".to_owned(),
            started_at: command.requested_at.clone(),
            completed_at: None,
        })
    }

    fn refund_items(
        &self,
        command: &RuntimeCreateRefundCommand,
        intent: &PaymentIntentRuntimeRecord,
        refund_id: &str,
    ) -> DomainResult<Vec<PaymentRefundItemRecord>> {
        command
            .items
            .iter()
            .map(|item| {
                Ok(PaymentRefundItemRecord {
                    id: self.entity_uuid_generator.generate_entity_uuid()?,
                    tenant_id: command.tenant_id.clone(),
                    organization_id: intent.organization_id.clone(),
                    refund_id: refund_id.to_owned(),
                    order_item_id: item.order_item_id.clone(),
                    quantity: item.quantity,
                    refund_amount: item.refund_amount.clone(),
                    tax_refund_amount: item.tax_refund_amount.clone(),
                    shipping_refund_amount: item.shipping_refund_amount.clone(),
                    created_at: command.requested_at.clone(),
                })
            })
            .collect()
    }

    fn cancel_operation_attempt(
        &self,
        refund: &PaymentRefundRuntimeRecord,
        command: &RuntimeCancelRefundCommand,
    ) -> DomainResult<PaymentOperationAttemptRecord> {
        let id = self.entity_uuid_generator.generate_entity_uuid()?;
        Ok(PaymentOperationAttemptRecord {
            operation_no: id.clone(),
            id,
            tenant_id: refund.tenant_id.clone(),
            organization_id: refund.organization_id.clone(),
            provider_code: refund.provider_code.clone(),
            operation: PaymentAdapterOperation::CancelRefund,
            sdkwork_resource_type: "refund".to_owned(),
            sdkwork_resource_id: refund.id.clone(),
            idempotency_key: command.idempotency_key.clone(),
            request_digest: format!(
                "{}:{}:{}",
                refund.provider_code,
                PaymentAdapterOperation::CancelRefund.as_code(),
                command.idempotency_key
            ),
            response_digest: None,
            provider_error_code: None,
            provider_error_message: None,
            status: "RECEIVED".to_owned(),
            started_at: command.requested_at.clone(),
            completed_at: None,
        })
    }

    fn refund_event(
        &self,
        refund: &PaymentRefundRuntimeRecord,
        from_status: Option<&str>,
        to_status: &str,
        event_type: &str,
        reason: Option<String>,
        created_at: &str,
    ) -> DomainResult<PaymentRefundEventRecord> {
        Ok(PaymentRefundEventRecord {
            id: self.entity_uuid_generator.generate_entity_uuid()?,
            tenant_id: refund.tenant_id.clone(),
            organization_id: refund.organization_id.clone(),
            refund_id: refund.id.clone(),
            event_type: event_type.to_owned(),
            from_status: from_status.map(str::to_owned),
            to_status: to_status.to_owned(),
            reason,
            created_at: created_at.to_owned(),
        })
    }
}

fn validate_create_refund_command(command: &RuntimeCreateRefundCommand) -> DomainResult<()> {
    require_non_empty("tenant_id", &command.tenant_id)?;
    require_non_empty("payment_intent_id", &command.payment_intent_id)?;
    require_non_empty("merchant_refund_no", &command.merchant_refund_no)?;
    require_non_empty("amount", &command.amount)?;
    require_non_empty("currency_code", &command.currency_code)?;
    require_non_empty("reason", &command.reason)?;
    require_non_empty("idempotency_key", &command.idempotency_key)?;
    require_non_empty("requested_at", &command.requested_at)?;
    let refund_amount = decimal_amount_to_minor(&command.amount)
        .ok_or_else(|| DomainError::new("payment refund amount is invalid"))?;
    if refund_amount <= 0 {
        return Err(DomainError::new("payment refund amount must be positive"));
    }
    if command.currency_code.len() != 3
        || !command
            .currency_code
            .chars()
            .all(|ch| ch.is_ascii_uppercase())
    {
        return Err(DomainError::new(
            "payment refund currency_code must be ISO 4217",
        ));
    }
    validate_refund_items(command, refund_amount)?;
    Ok(())
}

fn validate_refund_items(
    command: &RuntimeCreateRefundCommand,
    refund_amount: i64,
) -> DomainResult<()> {
    if command.items.is_empty() {
        return Ok(());
    }
    let mut allocated_amount = 0_i64;
    for item in &command.items {
        require_non_empty("item.order_item_id", &item.order_item_id)?;
        if item.quantity <= 0 {
            return Err(DomainError::new(
                "payment refund item quantity must be positive",
            ));
        }
        let item_refund_amount = decimal_amount_to_minor(&item.refund_amount)
            .ok_or_else(|| DomainError::new("payment refund item refund_amount is invalid"))?;
        let tax_refund_amount = decimal_amount_to_minor(&item.tax_refund_amount)
            .ok_or_else(|| DomainError::new("payment refund item tax_refund_amount is invalid"))?;
        let shipping_refund_amount = decimal_amount_to_minor(&item.shipping_refund_amount)
            .ok_or_else(|| {
                DomainError::new("payment refund item shipping_refund_amount is invalid")
            })?;
        if item_refund_amount < 0 || tax_refund_amount < 0 || shipping_refund_amount < 0 {
            return Err(DomainError::new(
                "payment refund item amounts must not be negative",
            ));
        }
        allocated_amount = allocated_amount
            .checked_add(item_refund_amount)
            .and_then(|amount| amount.checked_add(tax_refund_amount))
            .and_then(|amount| amount.checked_add(shipping_refund_amount))
            .ok_or_else(|| DomainError::new("payment refund item allocation is too large"))?;
    }
    if allocated_amount != refund_amount {
        return Err(DomainError::new(
            "payment refund item allocation total must equal refund amount",
        ));
    }
    Ok(())
}

fn validate_cancel_refund_command(command: &RuntimeCancelRefundCommand) -> DomainResult<()> {
    require_non_empty("tenant_id", &command.tenant_id)?;
    require_non_empty("refund_id", &command.refund_id)?;
    require_non_empty("idempotency_key", &command.idempotency_key)?;
    require_non_empty("requested_at", &command.requested_at)
}

fn validate_refund_against_intent(
    command: &RuntimeCreateRefundCommand,
    intent: &PaymentIntentRuntimeRecord,
) -> DomainResult<()> {
    if command.currency_code != intent.currency_code {
        return Err(DomainError::new(
            "payment refund currency_code must match payment intent currency",
        ));
    }
    let refund_amount = decimal_amount_to_minor(&command.amount)
        .ok_or_else(|| DomainError::new("payment refund amount is invalid"))?;
    let intent_amount = decimal_amount_to_minor(&intent.amount)
        .ok_or_else(|| DomainError::new("payment intent amount is invalid"))?;
    if refund_amount > intent_amount {
        return Err(DomainError::new(
            "payment refund amount must not exceed payment intent amount",
        ));
    }
    Ok(())
}

fn require_non_empty(field: &str, value: &str) -> DomainResult<()> {
    if value.trim().is_empty() {
        Err(DomainError::new(format!(
            "payment refund {field} must not be empty"
        )))
    } else {
        Ok(())
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
