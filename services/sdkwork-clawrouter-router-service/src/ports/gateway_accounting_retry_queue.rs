use std::future::Future;
use std::pin::Pin;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::domain::DomainResult;

use super::{
    GatewayAccountingRecordContext, GatewayRequestTraceCommand, GatewayTraceAttribution,
    GatewayUsageRecordCommand,
};

pub const GATEWAY_ACCOUNTING_RETRY_SCHEMA_VERSION: u16 = 1;

pub type GatewayAccountingRetryQueueFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", content = "command", rename_all = "snake_case")]
pub enum GatewayAccountingRetryPayload {
    Trace(GatewayRequestTraceCommand),
    Usage(GatewayUsageRecordCommand),
}

impl GatewayAccountingRetryPayload {
    pub fn record_type(&self) -> &'static str {
        match self {
            Self::Trace(_) => "trace",
            Self::Usage(_) => "usage",
        }
    }

    pub fn validate(&self) -> DomainResult<()> {
        match self {
            Self::Trace(command) => command.validate(),
            Self::Usage(command) => command.validate(),
        }
    }
}

/// A durable, replayable accounting command.  The envelope deliberately
/// stores only sanitized command snapshots; the raw user-agent is replaced by
/// the hash in `context`, while already-masked error text and audit snapshots
/// are preserved so replay cannot corrupt accounting evidence.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GatewayAccountingRetryEnvelope {
    pub schema_version: u16,
    pub event_id: String,
    pub attempt: u32,
    pub available_at_epoch_millis: u64,
    pub context: GatewayAccountingRecordContext,
    pub payload: GatewayAccountingRetryPayload,
}

impl GatewayAccountingRetryEnvelope {
    pub fn from_trace(command: GatewayRequestTraceCommand) -> DomainResult<Self> {
        let context = GatewayAccountingRecordContext::from_trace(
            &command,
            GatewayTraceAttribution::default(),
            current_epoch_millis_i64(),
        )?;
        Self::from_trace_with_context(command, context)
    }

    pub fn from_trace_with_context(
        command: GatewayRequestTraceCommand,
        context: GatewayAccountingRecordContext,
    ) -> DomainResult<Self> {
        let mut command = command;
        scrub_trace_command(&mut command);
        Self::from_payload(GatewayAccountingRetryPayload::Trace(command), context)
    }

    pub fn from_usage(command: GatewayUsageRecordCommand) -> DomainResult<Self> {
        let context = GatewayAccountingRecordContext::from_usage(
            &command,
            GatewayTraceAttribution::default(),
            current_epoch_millis_i64(),
        )?;
        Self::from_usage_with_context(command, context)
    }

    pub fn from_usage_with_context(
        command: GatewayUsageRecordCommand,
        context: GatewayAccountingRecordContext,
    ) -> DomainResult<Self> {
        let mut command = command;
        scrub_usage_command(&mut command);
        Self::from_payload(GatewayAccountingRetryPayload::Usage(command), context)
    }

    pub fn next_attempt(&self, now_epoch_millis: u64, delay: Duration) -> DomainResult<Self> {
        let mut next = self.clone();
        next.attempt = next
            .attempt
            .checked_add(1)
            .ok_or_else(|| crate::domain::DomainError::new("retry attempt overflow"))?;
        next.available_at_epoch_millis =
            now_epoch_millis.saturating_add(u64::try_from(delay.as_millis()).unwrap_or(u64::MAX));
        next.validate()?;
        Ok(next)
    }

    pub fn is_due(&self, now_epoch_millis: u64) -> bool {
        self.available_at_epoch_millis <= now_epoch_millis
    }

    pub fn delivery_id(&self) -> String {
        format!("{}:a{}", self.event_id, self.attempt)
    }

    pub fn validate(&self) -> DomainResult<()> {
        if self.schema_version != GATEWAY_ACCOUNTING_RETRY_SCHEMA_VERSION {
            return Err(crate::domain::DomainError::new(format!(
                "unsupported gateway accounting retry schema version {}",
                self.schema_version
            )));
        }
        if self.event_id.is_empty() || self.event_id.len() > 128 {
            return Err(crate::domain::DomainError::new(
                "gateway accounting retry event_id must contain 1 to 128 characters",
            ));
        }
        if self.attempt > 64 {
            return Err(crate::domain::DomainError::new(
                "gateway accounting retry attempt exceeds the safety bound",
            ));
        }
        self.context.validate()?;
        self.payload.validate()?;
        match &self.payload {
            GatewayAccountingRetryPayload::Trace(command) => {
                if command.user_agent.is_some() {
                    return Err(crate::domain::DomainError::new(
                        "gateway accounting retry trace contains a raw user agent",
                    ));
                }
            }
            GatewayAccountingRetryPayload::Usage(command) => {
                if command.user_agent.is_some() {
                    return Err(crate::domain::DomainError::new(
                        "gateway accounting retry usage contains a raw user agent",
                    ));
                }
            }
        }
        let expected_event_id = event_id_for_payload(&self.payload)?;
        if self.event_id != expected_event_id {
            return Err(crate::domain::DomainError::new(
                "gateway accounting retry event_id does not match the payload",
            ));
        }
        Ok(())
    }

    fn from_payload(
        payload: GatewayAccountingRetryPayload,
        context: GatewayAccountingRecordContext,
    ) -> DomainResult<Self> {
        payload.validate()?;
        context.validate()?;
        let event_id = event_id_for_payload(&payload)?;
        let envelope = Self {
            schema_version: GATEWAY_ACCOUNTING_RETRY_SCHEMA_VERSION,
            event_id,
            attempt: 0,
            available_at_epoch_millis: now_epoch_millis(),
            context,
            payload,
        };
        envelope.validate()?;
        Ok(envelope)
    }
}

fn event_id_for_payload(payload: &GatewayAccountingRetryPayload) -> DomainResult<String> {
    let bytes = serde_json::to_vec(payload).map_err(|error| {
        crate::domain::DomainError::new(format!(
            "gateway accounting retry payload serialization failed: {error}"
        ))
    })?;
    let mut hasher = Sha256::new();
    hasher.update(b"gateway-accounting-retry:v1:");
    hasher.update(bytes);
    Ok(format!("acct:v1:{}", hex::encode(hasher.finalize())))
}

fn scrub_trace_command(command: &mut GatewayRequestTraceCommand) {
    command.user_agent = None;
}

fn scrub_usage_command(command: &mut GatewayUsageRecordCommand) {
    command.user_agent = None;
}

pub fn now_epoch_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .try_into()
        .unwrap_or(u64::MAX)
}

fn current_epoch_millis_i64() -> i64 {
    i64::try_from(now_epoch_millis()).unwrap_or(i64::MAX)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayAccountingRetryDelivery {
    pub delivery_id: String,
    pub envelope: GatewayAccountingRetryEnvelope,
}

pub trait GatewayAccountingRetryQueue: Send + Sync {
    fn enqueue<'a>(
        &'a self,
        envelope: GatewayAccountingRetryEnvelope,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()>;

    fn claim<'a>(
        &'a self,
        consumer_id: &'a str,
        batch_size: usize,
        reclaim_idle: Duration,
        wait_timeout: Duration,
    ) -> GatewayAccountingRetryQueueFuture<'a, Vec<GatewayAccountingRetryDelivery>>;

    fn acknowledge<'a>(&'a self, delivery_id: &'a str)
        -> GatewayAccountingRetryQueueFuture<'a, ()>;

    fn reschedule<'a>(
        &'a self,
        delivery_id: &'a str,
        envelope: GatewayAccountingRetryEnvelope,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()>;

    fn dead_letter<'a>(
        &'a self,
        delivery_id: &'a str,
        envelope: GatewayAccountingRetryEnvelope,
        failure_code: &'a str,
    ) -> GatewayAccountingRetryQueueFuture<'a, ()>;

    fn dead_letter_depth<'a>(&'a self) -> GatewayAccountingRetryQueueFuture<'a, u64> {
        Box::pin(async { Ok(0) })
    }
}
