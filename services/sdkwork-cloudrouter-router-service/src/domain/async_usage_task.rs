use chrono::{DateTime, Utc};
use serde_json::Value;

use crate::domain::{DomainError, DomainResult};

/// Kind of asynchronous upstream task whose usage must be reconciled later.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AsyncUsageTaskKind {
    OpenAiBatch,
    AnthropicBatch,
    BackgroundResponse,
    ThreadRun,
}

impl AsyncUsageTaskKind {
    pub fn code(self) -> &'static str {
        match self {
            Self::OpenAiBatch => "openai_batch",
            Self::AnthropicBatch => "anthropic_batch",
            Self::BackgroundResponse => "background_response",
            Self::ThreadRun => "thread_run",
        }
    }

    pub fn from_code(value: &str) -> DomainResult<Self> {
        match value {
            "openai_batch" => Ok(Self::OpenAiBatch),
            "anthropic_batch" => Ok(Self::AnthropicBatch),
            "background_response" => Ok(Self::BackgroundResponse),
            "thread_run" => Ok(Self::ThreadRun),
            other => Err(DomainError::new(format!(
                "unknown async usage task kind: {other}"
            ))),
        }
    }
}

impl std::fmt::Display for AsyncUsageTaskKind {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.code())
    }
}

/// Lifecycle of one reconciliation row. `settled`/`failed`/`expired` are terminal.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AsyncUsageTaskStatus {
    Pending,
    Running,
    Settled,
    Failed,
    Expired,
}

impl AsyncUsageTaskStatus {
    pub fn code(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Running => "running",
            Self::Settled => "settled",
            Self::Failed => "failed",
            Self::Expired => "expired",
        }
    }

    pub fn from_code(value: &str) -> DomainResult<Self> {
        match value {
            "pending" => Ok(Self::Pending),
            "running" => Ok(Self::Running),
            "settled" => Ok(Self::Settled),
            "failed" => Ok(Self::Failed),
            "expired" => Ok(Self::Expired),
            other => Err(DomainError::new(format!(
                "unknown async usage task status: {other}"
            ))),
        }
    }

    pub fn is_terminal(self) -> bool {
        matches!(self, Self::Settled | Self::Failed | Self::Expired)
    }
}

/// A task to enqueue after a successful create call that returns an upstream id.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewAsyncUsageTask {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: Option<i64>,
    pub api_key_id: i64,
    pub request_id: String,
    pub task_kind: AsyncUsageTaskKind,
    pub upstream_id: String,
    pub catalog_key: Option<String>,
    pub supplier_code: String,
    pub account_id: i64,
    pub region_code: String,
    /// Creation-time context needed to re-price the completed usage: the
    /// original method/path/model/account-group/plan. The pricing resolution is
    /// deliberately **not** stored (it carries non-serializable strategy
    /// types); the settler re-prices at completion, which is why this context
    /// is captured instead.
    pub metadata: Option<Value>,
}

/// The persisted task returned by a due-claim.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AsyncUsageTask {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: Option<i64>,
    pub api_key_id: i64,
    pub request_id: String,
    pub task_kind: AsyncUsageTaskKind,
    pub upstream_id: String,
    pub catalog_key: Option<String>,
    pub supplier_code: String,
    pub account_id: i64,
    pub region_code: String,
    pub task_status: AsyncUsageTaskStatus,
    pub attempts: i32,
    pub next_poll_at: DateTime<Utc>,
    pub billing_request_id: Option<String>,
    pub usage_snapshot: Option<Value>,
    pub metadata: Option<Value>,
}

impl AsyncUsageTask {
    /// Stable idempotency key for the eventual usage fact. The worker must use
    /// this key instead of the creation request id, because polling repeats.
    pub fn billing_request_id(&self) -> String {
        format!("async:{}:{}", self.task_kind.code(), self.upstream_id)
    }
}
