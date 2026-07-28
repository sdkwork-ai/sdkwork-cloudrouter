use crate::domain::{
    AiRouteFailureStrategy, AiRouteStrategy, ProviderAuthProfile, ProviderRetryPolicy,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StickyMode {
    None,
    CreateThenSticky,
    ParentSticky,
    LookupSticky,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StickyScope {
    Object,
    Parent,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StickyRouting {
    pub mode: StickyMode,
    pub object_type: String,
    pub object_id: Option<String>,
    pub parent_object_type: Option<String>,
    pub parent_object_id: Option<String>,
    pub scope: StickyScope,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StickyRouteConstraint {
    pub supplier_code: String,
    pub account_id: i64,
    pub account_group_id: Option<i64>,
    pub vendor_code: Option<String>,
    pub api_code: Option<String>,
    pub catalog_key: Option<String>,
    pub provider_model: Option<String>,
    pub region_code: Option<String>,
    pub sticky_scope: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InvocationRouteCandidateKind {
    Model,
    UpstreamAccount,
    Sticky,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationRouteCandidate {
    pub kind: InvocationRouteCandidateKind,
    pub supplier_code: String,
    pub account_id: i64,
    pub account_group_id: Option<i64>,
    pub account_group_code: Option<String>,
    pub pricing_plan_code: Option<String>,
    pub policy_id: Option<i64>,
    pub rule_id: Option<i64>,
    pub api_code: String,
    pub catalog_key: Option<String>,
    pub requested_model: Option<String>,
    pub provider_model: Option<String>,
    pub region_code: String,
    pub credential_id: Option<i64>,
    pub credential_rotation: Option<String>,
    pub base_url: Option<String>,
    pub secret_ref: Option<String>,
    pub auth_profile: ProviderAuthProfile,
    pub timeout_ms: Option<u64>,
    pub retry_policy: Option<ProviderRetryPolicy>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationRoutePlan {
    pub candidates: Vec<InvocationRouteCandidate>,
    pub selected_index: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationRouteAttempt {
    pub supplier_code: String,
    pub account_id: i64,
    pub candidate_index: usize,
    pub status_code: Option<u16>,
    pub success: bool,
    pub retryable: bool,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub latency_ms: Option<i64>,
}

impl InvocationRoutePlan {
    pub fn new(candidates: Vec<InvocationRouteCandidate>) -> Self {
        Self {
            candidates,
            selected_index: 0,
        }
    }

    pub fn current_candidate(&self) -> Option<&InvocationRouteCandidate> {
        self.candidates.get(self.selected_index)
    }
}

impl StickyRouting {
    pub fn create(object_type: impl Into<String>) -> Self {
        Self {
            mode: StickyMode::CreateThenSticky,
            object_type: object_type.into(),
            object_id: None,
            parent_object_type: None,
            parent_object_id: None,
            scope: StickyScope::Object,
        }
    }

    pub fn lookup(object_type: impl Into<String>, object_id: impl Into<String>) -> Self {
        Self {
            mode: StickyMode::LookupSticky,
            object_type: object_type.into(),
            object_id: Some(object_id.into()),
            parent_object_type: None,
            parent_object_id: None,
            scope: StickyScope::Object,
        }
    }

    pub fn parent(object_type: impl Into<String>, parent_object_id: impl Into<String>) -> Self {
        let object_type = object_type.into();
        Self {
            mode: StickyMode::ParentSticky,
            object_type: object_type.clone(),
            object_id: None,
            parent_object_type: Some(object_type),
            parent_object_id: Some(parent_object_id.into()),
            scope: StickyScope::Parent,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InvocationRouting {
    pub strategy: AiRouteStrategy,
    pub failure_strategy: AiRouteFailureStrategy,
    pub sticky: Option<StickyRouting>,
    pub sticky_route: Option<StickyRouteConstraint>,
    pub route_plan: Option<InvocationRoutePlan>,
    pub attempted_routes: Vec<InvocationRouteAttempt>,
    pub(crate) circuit_half_open_probe_channels: Vec<i64>,
    pub(crate) circuit_breaker_finalized: bool,
    pub policy_id: Option<i64>,
    pub rule_id: Option<i64>,
}

impl InvocationRouting {
    pub fn new(strategy: AiRouteStrategy, sticky: Option<StickyRouting>) -> Self {
        Self {
            strategy,
            failure_strategy: strategy.failure_strategy(),
            sticky,
            sticky_route: None,
            route_plan: None,
            attempted_routes: Vec::new(),
            circuit_half_open_probe_channels: Vec::new(),
            circuit_breaker_finalized: false,
            policy_id: None,
            rule_id: None,
        }
    }
}
