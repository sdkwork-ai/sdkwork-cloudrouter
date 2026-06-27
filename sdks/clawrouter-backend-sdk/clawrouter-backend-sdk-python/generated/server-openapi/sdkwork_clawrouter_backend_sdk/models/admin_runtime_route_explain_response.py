from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_runtime_route_explain_candidate import AdminRuntimeRouteExplainCandidate
    from .admin_runtime_route_explain_issue import AdminRuntimeRouteExplainIssue


@dataclass
class AdminRuntimeRouteExplainResponse:
    """Admin runtime route explain response schema exposed by Claw Router."""
    api_code: str
    api_key_id: str
    billing_meter: str
    blocked_reasons: List[AdminRuntimeRouteExplainIssue]
    candidate_count: int
    capability: str
    catalog_key: Optional[str]
    channel_group_id: str
    group_code: str
    model: Optional[str]
    policy_id: Optional[str]
    policy_snapshot_version: str
    pricing_plan_code: str
    ready: bool
    resource_code: str
    rule_id: Optional[str]
    selected_candidates: List[AdminRuntimeRouteExplainCandidate]
    source: str
    warnings: List[AdminRuntimeRouteExplainIssue]
