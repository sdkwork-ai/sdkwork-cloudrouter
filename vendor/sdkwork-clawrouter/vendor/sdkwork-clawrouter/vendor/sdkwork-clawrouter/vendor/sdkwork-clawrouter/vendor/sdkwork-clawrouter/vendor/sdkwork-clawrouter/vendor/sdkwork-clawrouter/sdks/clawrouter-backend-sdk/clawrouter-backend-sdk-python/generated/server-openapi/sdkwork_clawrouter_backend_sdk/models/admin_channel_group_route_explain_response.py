from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_group_route_explain_issue import AdminChannelGroupRouteExplainIssue


@dataclass
class AdminChannelGroupRouteExplainResponse:
    """Admin channel group route explain response schema exposed by Claw Router."""
    active_healthy_binding_count: int
    api_scope: List[str]
    capabilities: List[str]
    configured_resource_access_count: int
    configured_resource_group_access_count: int
    effective_resource_codes: List[str]
    issue_codes: List[str]
    issues: List[AdminChannelGroupRouteExplainIssue]
    ready: bool
    resource_codes: List[str]
    resource_group_codes: List[str]
    routable_binding_count: int
    source: str
