//! Structured diagnostics for the agent → `/v1/chat/completions` → selector
//! call chain (`OBSERVABILITY_SPEC.md` §2).
//!
//! Production `/v1/chat/completions` failures are remapped by the web framework
//! to generic `50301` ProblemDetail, so the selector reason is only recoverable
//! from these logs (correlated by `trace_id` / `request_id` / `api_key_id`).

/// Stable machine code for a route-selection failure stage.
///
/// Codes are log-field values, not HTTP wire codes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RouteSelectionFailureStage {
    SnapshotEmpty,
    NoGroupBindings,
    AccountNotCallable,
    ResourceNotEntitled,
    PricingUnavailable,
    PolicyNoCallableCandidate,
    PolicyNoMatchingRule,
    PolicyScopeRequired,
    ModelForbidden,
    RoutePlanEmpty,
    Unknown,
}

impl RouteSelectionFailureStage {
    pub fn code(self) -> &'static str {
        match self {
            Self::SnapshotEmpty => "snapshot_empty",
            Self::NoGroupBindings => "no_group_bindings",
            Self::AccountNotCallable => "account_not_callable",
            Self::ResourceNotEntitled => "resource_not_entitled",
            Self::PricingUnavailable => "pricing_unavailable",
            Self::PolicyNoCallableCandidate => "policy_no_callable_candidate",
            Self::PolicyNoMatchingRule => "policy_no_matching_rule",
            Self::PolicyScopeRequired => "policy_scope_required",
            Self::ModelForbidden => "model_forbidden",
            Self::RoutePlanEmpty => "route_plan_empty",
            Self::Unknown => "unknown",
        }
    }
}

/// Classifies a selector / OpenAI error message into a call-chain stage.
pub fn classify_route_selection_failure(message: &str) -> RouteSelectionFailureStage {
    let message = message.to_ascii_lowercase();
    if message.contains("upstream route snapshot is empty") {
        RouteSelectionFailureStage::SnapshotEmpty
    } else if message.contains("has no accounts bound") {
        RouteSelectionFailureStage::NoGroupBindings
    } else if message.contains("is forbidden")
        || message.contains("not allowed by account group")
    {
        RouteSelectionFailureStage::ModelForbidden
    } else if message.contains("pricing is not available")
        || message.contains("upstream cost price not found")
    {
        RouteSelectionFailureStage::PricingUnavailable
    } else if message.contains("no callable priced candidate")
        || message.contains("no callable upstream account route candidate")
    {
        RouteSelectionFailureStage::PolicyNoCallableCandidate
    } else if message.contains("has no routing rule") {
        RouteSelectionFailureStage::PolicyNoMatchingRule
    } else if message.contains("routing policy scope is required") {
        RouteSelectionFailureStage::PolicyScopeRequired
    } else if message.contains("route plan is empty") || message.contains("contains no routes") {
        RouteSelectionFailureStage::RoutePlanEmpty
    } else if message.contains("missing callable base url or credential")
        || message.contains("missing base url")
        || message.contains("missing secret")
        || message.contains("is not healthy")
        || message.contains("account_not_callable")
    {
        RouteSelectionFailureStage::AccountNotCallable
    } else if message.contains("no upstream account in account group")
        && message.contains("supports")
    {
        RouteSelectionFailureStage::ResourceNotEntitled
    } else {
        RouteSelectionFailureStage::Unknown
    }
}

/// One rejected account in the selected group. Logged so operators can see
/// why "the account exists in the pool" still failed routing.
pub struct RejectedGroupAccount {
    pub account_id: i64,
    pub supplier_code: String,
    pub callable: bool,
    pub healthy: bool,
    pub has_base_url: bool,
    pub has_credential: bool,
    pub allows_model: bool,
    pub account_health_status: i32,
    pub credential_health_status: i32,
    pub endpoint_health_status: i32,
}

pub fn log_openai_chat_route_selection_failed(
    request_id: &str,
    trace_id: Option<&str>,
    api_key_id: i64,
    tenant_id: i64,
    organization_id: i64,
    account_group_id: i64,
    account_group_code: &str,
    requested_model: &str,
    status: u16,
    stage: &str,
    reason: &str,
) {
    tracing::warn!(
        call_chain_stage = "openai_chat",
        operation_id = "createChatCompletion",
        route = "/v1/chat/completions",
        request_id = %request_id,
        trace_id = trace_id.unwrap_or(""),
        api_key_id,
        tenant_id,
        organization_id,
        account_group_id,
        account_group_code = %account_group_code,
        requested_model = %requested_model,
        status,
        stage = if stage.is_empty() { "unknown" } else { stage },
        reason = if reason.is_empty() { "(no selector reason on response)" } else { reason },
        "openai chat completion route selection failed"
    );
}

pub fn log_selector_route_selection_failed(
    stage: RouteSelectionFailureStage,
    api_key_id: i64,
    tenant_id: i64,
    organization_id: i64,
    account_group_id: i64,
    account_group_code: &str,
    catalog_key: &str,
    requested_model: &str,
    message: &str,
) {
    tracing::warn!(
        call_chain_stage = "route_selector",
        operation_id = "createChatCompletion",
        route = "/v1/chat/completions",
        stage = stage.code(),
        api_key_id,
        tenant_id,
        organization_id,
        account_group_id,
        account_group_code = %account_group_code,
        catalog_key = %catalog_key,
        requested_model = %requested_model,
        error = %message,
        "route selection failed"
    );
}

pub fn log_rejected_group_account(
    api_key_id: i64,
    tenant_id: i64,
    account_group_id: i64,
    account_group_code: &str,
    catalog_key: &str,
    requested_model: &str,
    api_code: &str,
    rejected: &RejectedGroupAccount,
) {
    let reject_reason = if !rejected.healthy {
        "unhealthy"
    } else if !rejected.has_base_url {
        "missing_base_url"
    } else if !rejected.has_credential {
        "missing_credential"
    } else if !rejected.callable {
        "not_callable"
    } else if !rejected.allows_model {
        "resource_entitlement_mismatch"
    } else {
        "unknown"
    };
    tracing::warn!(
        call_chain_stage = "route_selector",
        stage = "account_rejected",
        reject_reason,
        api_key_id,
        tenant_id,
        account_group_id,
        account_group_code = %account_group_code,
        catalog_key = %catalog_key,
        requested_model = %requested_model,
        api_code = %api_code,
        account_id = rejected.account_id,
        supplier_code = %rejected.supplier_code,
        callable = rejected.callable,
        healthy = rejected.healthy,
        has_base_url = rejected.has_base_url,
        has_credential = rejected.has_credential,
        allows_model = rejected.allows_model,
        account_health_status = rejected.account_health_status,
        credential_health_status = rejected.credential_health_status,
        endpoint_health_status = rejected.endpoint_health_status,
        "upstream account in selected group was not selected for the model request"
    );
}

/// Parses captured tracing text and returns the most specific selector stage.
pub fn diagnose_call_chain_from_logs(logs: &str) -> Option<RouteSelectionFailureStage> {
    const CODES: &[(&str, RouteSelectionFailureStage)] = &[
        (
            "snapshot_empty",
            RouteSelectionFailureStage::SnapshotEmpty,
        ),
        (
            "no_group_bindings",
            RouteSelectionFailureStage::NoGroupBindings,
        ),
        (
            "account_not_callable",
            RouteSelectionFailureStage::AccountNotCallable,
        ),
        (
            "resource_not_entitled",
            RouteSelectionFailureStage::ResourceNotEntitled,
        ),
        (
            "pricing_unavailable",
            RouteSelectionFailureStage::PricingUnavailable,
        ),
        (
            "policy_no_callable_candidate",
            RouteSelectionFailureStage::PolicyNoCallableCandidate,
        ),
        (
            "policy_no_matching_rule",
            RouteSelectionFailureStage::PolicyNoMatchingRule,
        ),
        (
            "policy_scope_required",
            RouteSelectionFailureStage::PolicyScopeRequired,
        ),
        (
            "model_forbidden",
            RouteSelectionFailureStage::ModelForbidden,
        ),
        (
            "route_plan_empty",
            RouteSelectionFailureStage::RoutePlanEmpty,
        ),
    ];
    for (code, stage) in CODES {
        if logs.contains(&format!("stage={code}")) || logs.contains(&format!("stage=\"{code}\""))
        {
            return Some(*stage);
        }
    }
    if logs.contains("reject_reason=unhealthy")
        || logs.contains("reject_reason=\"unhealthy\"")
        || logs.contains("reject_reason=missing_base_url")
        || logs.contains("reject_reason=\"missing_base_url\"")
        || logs.contains("reject_reason=missing_credential")
        || logs.contains("reject_reason=\"missing_credential\"")
        || logs.contains("reject_reason=not_callable")
        || logs.contains("reject_reason=\"not_callable\"")
    {
        return Some(RouteSelectionFailureStage::AccountNotCallable);
    }
    if logs.contains("reject_reason=resource_entitlement_mismatch")
        || logs.contains("reject_reason=\"resource_entitlement_mismatch\"")
    {
        return Some(RouteSelectionFailureStage::ResourceNotEntitled);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_snapshot_empty_and_group_binding_miss() {
        assert_eq!(
            RouteSelectionFailureStage::SnapshotEmpty,
            classify_route_selection_failure(
                "upstream route snapshot is empty for model: openai/gpt-4o-mini"
            )
        );
        assert_eq!(
            RouteSelectionFailureStage::NoGroupBindings,
            classify_route_selection_failure(
                "upstream route is not available for model: openai/gpt-4o-mini \
                 (account group 'default' [id=1] has no accounts bound for api='openai.chat_completions'"
            )
        );
    }

    #[test]
    fn classifies_supporting_account_and_pricing_failures() {
        assert_eq!(
            RouteSelectionFailureStage::ResourceNotEntitled,
            classify_route_selection_failure(
                "no upstream account in account group default supports model openai/gpt-4o-mini for api openai.chat_completions"
            )
        );
        assert_eq!(
            RouteSelectionFailureStage::PricingUnavailable,
            classify_route_selection_failure(
                "pricing is not available for group-bound upstream account route for model openai/gpt-4o-mini"
            )
        );
    }

    #[test]
    fn diagnose_prefers_explicit_stage_field() {
        let logs = r#"WARN route selection failed stage="account_not_callable" error="missing credential""#;
        assert_eq!(
            Some(RouteSelectionFailureStage::AccountNotCallable),
            diagnose_call_chain_from_logs(logs)
        );
    }
}
