use std::future::Future;
use std::pin::Pin;

use serde_json::Value;

use super::PaymentProviderRegistryError;

pub type PaymentAdapterFuture<'a, T> =
    Pin<Box<dyn Future<Output = Result<T, PaymentProviderRegistryError>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum PaymentAdapterOperation {
    Capabilities,
    CreatePaymentIntent,
    ConfirmPaymentIntent,
    CapturePaymentIntent,
    CancelPaymentIntent,
    CreateRefund,
    QueryRefund,
    CancelRefund,
    VerifyWebhook,
    NormalizeWebhook,
    DownloadStatement,
    ParseStatement,
    InvokeNativeOperation,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentProviderCapabilities {
    pub supplier_code: &'static str,
    pub operations: &'static [PaymentAdapterOperation],
    pub sandbox_only: bool,
}

pub trait PaymentProviderAdapter: Send + Sync {
    fn capabilities(&self) -> &'static PaymentProviderCapabilities;

    fn create_payment_intent<'a>(
        &'a self,
        request: PaymentCreateIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome>;

    fn confirm_payment_intent<'a>(
        &'a self,
        request: PaymentConfirmPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome>;

    fn capture_payment_intent<'a>(
        &'a self,
        request: PaymentCapturePaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome>;

    fn cancel_payment_intent<'a>(
        &'a self,
        request: PaymentCancelPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome>;

    fn create_refund<'a>(
        &'a self,
        request: PaymentCreateRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome>;

    fn query_refund<'a>(
        &'a self,
        request: PaymentQueryRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome>;

    fn cancel_refund<'a>(
        &'a self,
        request: PaymentCancelRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome>;

    fn verify_webhook<'a>(
        &'a self,
        request: PaymentVerifyWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentWebhookVerificationOutcome>;

    fn normalize_webhook<'a>(
        &'a self,
        request: PaymentNormalizeWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNormalizedWebhookEvent>;

    fn download_statement<'a>(
        &'a self,
        request: PaymentDownloadStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementDownloadOutcome>;

    fn parse_statement<'a>(
        &'a self,
        request: PaymentParseStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementParseOutcome>;

    fn invoke_native_operation<'a>(
        &'a self,
        request: PaymentNativeOperationRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNativeOperationOutcome>;
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentCreateIntentRequest {
    pub tenant_id: Option<i64>,
    pub merchant_order_no: Option<String>,
    pub amount_minor: Option<i64>,
    pub currency: Option<String>,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentConfirmPaymentIntentRequest {
    pub payment_intent_id: Option<String>,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentCapturePaymentIntentRequest {
    pub payment_intent_id: Option<String>,
    pub amount_minor: Option<i64>,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentCancelPaymentIntentRequest {
    pub payment_intent_id: Option<String>,
    pub reason: Option<String>,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentCreateRefundRequest {
    pub payment_intent_id: Option<String>,
    pub refund_no: Option<String>,
    pub amount_minor: Option<i64>,
    pub reason: Option<String>,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentQueryRefundRequest {
    pub refund_id: Option<String>,
    pub refund_no: Option<String>,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentCancelRefundRequest {
    pub refund_id: Option<String>,
    pub refund_no: Option<String>,
    pub reason: Option<String>,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentVerifyWebhookRequest {
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentNormalizeWebhookRequest {
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentDownloadStatementRequest {
    pub statement_date: Option<String>,
    pub statement_type: Option<String>,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentParseStatementRequest {
    pub statement_id: Option<String>,
    pub content: Vec<u8>,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentNativeOperationRequest {
    pub operation: Option<String>,
    pub payload: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentProviderOperationOutcome {
    pub supplier_code: String,
    pub native_id: Option<String>,
    pub raw_status: Option<String>,
    pub payload: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentWebhookVerificationOutcome {
    pub verified: bool,
    pub provider_event_id: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentNormalizedWebhookEvent {
    pub supplier_code: String,
    pub event_type: Option<String>,
    pub provider_event_id: Option<String>,
    pub payload: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentStatementDownloadOutcome {
    pub statement_id: Option<String>,
    pub content: Vec<u8>,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentStatementParseOutcome {
    pub statement_id: Option<String>,
    pub item_count: usize,
    pub metadata: Value,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct PaymentNativeOperationOutcome {
    pub operation: Option<String>,
    pub payload: Value,
}

pub(crate) const STANDARD_PAYMENT_ADAPTER_OPERATIONS: &[PaymentAdapterOperation] = &[
    PaymentAdapterOperation::Capabilities,
    PaymentAdapterOperation::CreatePaymentIntent,
    PaymentAdapterOperation::ConfirmPaymentIntent,
    PaymentAdapterOperation::CapturePaymentIntent,
    PaymentAdapterOperation::CancelPaymentIntent,
    PaymentAdapterOperation::CreateRefund,
    PaymentAdapterOperation::QueryRefund,
    PaymentAdapterOperation::CancelRefund,
    PaymentAdapterOperation::VerifyWebhook,
    PaymentAdapterOperation::NormalizeWebhook,
    PaymentAdapterOperation::DownloadStatement,
    PaymentAdapterOperation::ParseStatement,
    PaymentAdapterOperation::InvokeNativeOperation,
];

pub(crate) struct SandboxPaymentProviderAdapter {
    capabilities: &'static PaymentProviderCapabilities,
}

impl SandboxPaymentProviderAdapter {
    pub(crate) const fn new(capabilities: &'static PaymentProviderCapabilities) -> Self {
        Self { capabilities }
    }

    fn unsupported<T>(&self, operation: PaymentAdapterOperation) -> PaymentAdapterFuture<'_, T> {
        let supplier_code = self.capabilities.supplier_code.to_owned();
        Box::pin(async move {
            Err(PaymentProviderRegistryError::UnsupportedCapability {
                supplier_code,
                operation,
            })
        })
    }
}

impl PaymentProviderAdapter for SandboxPaymentProviderAdapter {
    fn capabilities(&self) -> &'static PaymentProviderCapabilities {
        self.capabilities
    }

    fn create_payment_intent<'a>(
        &'a self,
        _request: PaymentCreateIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        self.unsupported(PaymentAdapterOperation::CreatePaymentIntent)
    }

    fn confirm_payment_intent<'a>(
        &'a self,
        _request: PaymentConfirmPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        self.unsupported(PaymentAdapterOperation::ConfirmPaymentIntent)
    }

    fn capture_payment_intent<'a>(
        &'a self,
        _request: PaymentCapturePaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        self.unsupported(PaymentAdapterOperation::CapturePaymentIntent)
    }

    fn cancel_payment_intent<'a>(
        &'a self,
        _request: PaymentCancelPaymentIntentRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        self.unsupported(PaymentAdapterOperation::CancelPaymentIntent)
    }

    fn create_refund<'a>(
        &'a self,
        _request: PaymentCreateRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        self.unsupported(PaymentAdapterOperation::CreateRefund)
    }

    fn query_refund<'a>(
        &'a self,
        _request: PaymentQueryRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        self.unsupported(PaymentAdapterOperation::QueryRefund)
    }

    fn cancel_refund<'a>(
        &'a self,
        _request: PaymentCancelRefundRequest,
    ) -> PaymentAdapterFuture<'a, PaymentProviderOperationOutcome> {
        self.unsupported(PaymentAdapterOperation::CancelRefund)
    }

    fn verify_webhook<'a>(
        &'a self,
        _request: PaymentVerifyWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentWebhookVerificationOutcome> {
        self.unsupported(PaymentAdapterOperation::VerifyWebhook)
    }

    fn normalize_webhook<'a>(
        &'a self,
        _request: PaymentNormalizeWebhookRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNormalizedWebhookEvent> {
        self.unsupported(PaymentAdapterOperation::NormalizeWebhook)
    }

    fn download_statement<'a>(
        &'a self,
        _request: PaymentDownloadStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementDownloadOutcome> {
        self.unsupported(PaymentAdapterOperation::DownloadStatement)
    }

    fn parse_statement<'a>(
        &'a self,
        _request: PaymentParseStatementRequest,
    ) -> PaymentAdapterFuture<'a, PaymentStatementParseOutcome> {
        self.unsupported(PaymentAdapterOperation::ParseStatement)
    }

    fn invoke_native_operation<'a>(
        &'a self,
        _request: PaymentNativeOperationRequest,
    ) -> PaymentAdapterFuture<'a, PaymentNativeOperationOutcome> {
        self.unsupported(PaymentAdapterOperation::InvokeNativeOperation)
    }
}
