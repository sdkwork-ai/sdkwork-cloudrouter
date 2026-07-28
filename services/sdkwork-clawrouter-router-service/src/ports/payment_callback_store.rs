use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type PaymentCallbackFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<PaymentCallbackOutcome>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaymentCallbackStatus {
    Success,
    Failed,
    Closed,
}

impl PaymentCallbackStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Success => "success",
            Self::Failed => "failed",
            Self::Closed => "closed",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct PaymentCallbackCommand {
    pub supplier_code: String,
    pub event_uuid: String,
    pub delivery_uuid: String,
    pub account_uuid: String,
    pub account_history_uuid: String,
    pub event_id: String,
    pub nonce: String,
    pub signature: Option<String>,
    pub request_timestamp: Option<i64>,
    pub payload_digest: String,
    pub out_trade_no: String,
    pub transaction_id: String,
    pub amount: Option<String>,
    pub status: PaymentCallbackStatus,
    pub received_at: String,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PaymentCallbackOutcome {
    pub success: bool,
    pub duplicate: bool,
    pub out_trade_no: String,
    pub transaction_id: String,
    pub status: String,
    pub message: String,
    pub credited_points: i64,
    pub balance: i64,
}

pub trait PaymentCallbackStore {
    fn process_payment_callback<'a>(
        &'a self,
        command: PaymentCallbackCommand,
    ) -> PaymentCallbackFuture<'a>;
}
