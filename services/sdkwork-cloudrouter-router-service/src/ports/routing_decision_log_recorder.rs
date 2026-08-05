use std::future::Future;
use std::pin::Pin;

use serde::de::IgnoredAny;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::domain::{DomainError, DomainResult};

pub type RoutingDecisionRecordFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<()>> + Send + 'a>>;

/// Persists the audit-safe route decision facts declared by PRD-UPSTREAM-SUPPLIER
/// ("API Request Lifecycle" step 8) into `ai_routing_decision_log`.
///
/// The default implementation is a no-op so relay-only / desktop runtimes and
/// unit tests that do not configure a recorder keep working. Records are
/// redacted by construction: they carry ids and codes only — never credential
/// material, bearer tokens, or provider secrets.
pub trait RoutingDecisionLogRecorder {
    fn record_routing_decision<'a>(
        &'a self,
        _command: RoutingDecisionRecordCommand,
    ) -> RoutingDecisionRecordFuture<'a> {
        Box::pin(async { Ok(()) })
    }
}

/// Bounded JSON column ceilings for the decision log (mirrors the
/// `MAX_PRICING_SNAPSHOT_BYTES` pattern in `gateway_usage_recorder.rs`). The
/// PostgreSQL baseline declares `JSONB` columns without explicit limits, so
/// the writer enforces deterministic caps before serialization.
const MAX_DECISION_JSON_BYTES: usize = 32 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RoutingDecisionRecordCommand {
    pub request_id: String,
    pub trace_id: Option<String>,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: Option<i64>,
    pub api_key_id: Option<i64>,
    pub account_group_id: Option<i64>,
    pub account_group_code: Option<String>,
    pub policy_id: Option<i64>,
    pub profile_id: Option<i64>,
    pub rule_id: Option<i64>,
    pub requested_model: Option<String>,
    pub resolved_model: Option<String>,
    pub capability: Option<i32>,
    pub decision_mode: Option<i32>,
    pub selected_supplier_id: Option<i64>,
    pub selected_account_id: Option<i64>,
    pub selected_credential_id: Option<i64>,
    /// Redacted supplier code kept for operator readability (the DDL stores
    /// the numeric `selected_supplier_id`).
    pub supplier_code: Option<String>,
    /// Why this route was chosen (or rejected): strategy, fallback mode,
    /// masked error facts. Never contains secrets.
    pub decision_reason: Option<Value>,
    /// Redacted ordered candidate list at decision time.
    pub candidate_snapshot: Option<Value>,
    /// Actual (or planned) candidate chain for failover decisions.
    pub fallback_chain: Option<Value>,
    pub decision_latency_ms: Option<i32>,
    pub status: i32,
    /// Extra non-secret identity facts (group code, pricing plan code) not
    /// covered by dedicated DDL columns.
    pub metadata: Value,
}

impl Default for RoutingDecisionRecordCommand {
    fn default() -> Self {
        Self {
            request_id: String::new(),
            trace_id: None,
            tenant_id: 0,
            organization_id: 0,
            user_id: None,
            api_key_id: None,
            account_group_id: None,
            account_group_code: None,
            policy_id: None,
            profile_id: None,
            rule_id: None,
            requested_model: None,
            resolved_model: None,
            capability: None,
            decision_mode: None,
            selected_supplier_id: None,
            selected_account_id: None,
            selected_credential_id: None,
            supplier_code: None,
            decision_reason: None,
            candidate_snapshot: None,
            fallback_chain: None,
            decision_latency_ms: None,
            status: 1,
            metadata: Value::Object(Default::default()),
        }
    }
}

impl RoutingDecisionRecordCommand {
    pub fn validate(&self) -> DomainResult<()> {
        positive_i64("tenant_id", self.tenant_id)?;
        non_negative_i64("organization_id", self.organization_id)?;
        required_text("request_id", &self.request_id, 128)?;
        validate_optional_text_width("trace_id", self.trace_id.as_deref(), 128)?;
        validate_optional_text_width(
            "account_group_code",
            self.account_group_code.as_deref(),
            128,
        )?;
        validate_optional_text_width("supplier_code", self.supplier_code.as_deref(), 128)?;
        validate_optional_text_width("requested_model", self.requested_model.as_deref(), 256)?;
        validate_optional_text_width("resolved_model", self.resolved_model.as_deref(), 256)?;
        validate_optional_non_negative_i32("decision_latency_ms", self.decision_latency_ms)?;
        if self.status != 1 {
            return Err(DomainError::new(
                "routing decision status must be 1 (active record)",
            ));
        }
        if !self.metadata.is_object() {
            return Err(DomainError::new(
                "routing decision metadata must be a JSON object",
            ));
        }
        for (field, value) in [
            ("decision_reason", self.decision_reason.as_ref()),
            ("candidate_snapshot", self.candidate_snapshot.as_ref()),
            ("fallback_chain", self.fallback_chain.as_ref()),
        ] {
            validate_json_value(field, value, MAX_DECISION_JSON_BYTES)?;
        }
        Ok(())
    }
}

fn positive_i64(field: &str, value: i64) -> DomainResult<()> {
    if value <= 0 {
        return Err(DomainError::new(format!("{field} must be positive")));
    }
    Ok(())
}

fn non_negative_i64(field: &str, value: i64) -> DomainResult<()> {
    if value < 0 {
        return Err(DomainError::new(format!("{field} must be non-negative")));
    }
    Ok(())
}

fn non_negative_i32(field: &str, value: i64) -> DomainResult<()> {
    non_negative_i64(field, value)?;
    if value > i64::from(i32::MAX) {
        return Err(DomainError::new(format!(
            "{field} must not exceed {}",
            i32::MAX
        )));
    }
    Ok(())
}

fn validate_optional_non_negative_i32(field: &str, value: Option<i32>) -> DomainResult<()> {
    if let Some(value) = value {
        non_negative_i32(field, i64::from(value))?;
    }
    Ok(())
}

fn required_text(field: &str, value: &str, max_characters: usize) -> DomainResult<()> {
    if value.is_empty() || value.trim() != value {
        return Err(DomainError::new(format!(
            "{field} must be non-empty and must not contain surrounding whitespace"
        )));
    }
    validate_text_width(field, value, max_characters)
}

fn validate_text_width(field: &str, value: &str, max_characters: usize) -> DomainResult<()> {
    if value.chars().nth(max_characters).is_some() {
        return Err(DomainError::new(format!(
            "{field} must not exceed {max_characters} characters"
        )));
    }
    Ok(())
}

fn validate_optional_text_width(
    field: &str,
    value: Option<&str>,
    max_characters: usize,
) -> DomainResult<()> {
    if let Some(value) = value {
        validate_text_width(field, value, max_characters)?;
    }
    Ok(())
}

fn validate_json_value(field: &str, value: Option<&Value>, max_bytes: usize) -> DomainResult<()> {
    let Some(value) = value else {
        return Ok(());
    };
    let serialized = serde_json::to_string(value)
        .map_err(|error| DomainError::new(format!("{field} must be serializable: {error}")))?;
    if serialized.len() > max_bytes {
        return Err(DomainError::new(format!(
            "{field} must not exceed {max_bytes} bytes"
        )));
    }
    let mut deserializer = serde_json::Deserializer::from_str(&serialized);
    IgnoredAny::deserialize(&mut deserializer)
        .and_then(|_| deserializer.end())
        .map_err(|_| DomainError::new(format!("{field} must be valid JSON")))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_accepts_minimal_decision_record() {
        let command = RoutingDecisionRecordCommand {
            request_id: "request-1".to_owned(),
            tenant_id: 100001,
            ..RoutingDecisionRecordCommand::default()
        };
        command.validate().expect("minimal record must pass");
    }

    #[test]
    fn validate_rejects_invalid_identity_and_status() {
        let command = RoutingDecisionRecordCommand {
            tenant_id: 0,
            ..RoutingDecisionRecordCommand::default()
        };
        assert!(command.validate().is_err());

        let command = RoutingDecisionRecordCommand {
            request_id: "request-1".to_owned(),
            tenant_id: 100001,
            status: 0,
            ..RoutingDecisionRecordCommand::default()
        };
        assert!(command.validate().is_err());
    }

    #[test]
    fn validate_rejects_oversized_candidate_snapshot_before_storage() {
        let oversized = serde_json::json!({
            "candidates": [{
                "code": "x".repeat(MAX_DECISION_JSON_BYTES),
            }],
        });
        let command = RoutingDecisionRecordCommand {
            request_id: "request-1".to_owned(),
            tenant_id: 100001,
            candidate_snapshot: Some(oversized),
            ..RoutingDecisionRecordCommand::default()
        };
        let error = command
            .validate()
            .expect_err("oversized snapshot must fail");
        assert!(error.to_string().contains("must not exceed"));
    }
}
