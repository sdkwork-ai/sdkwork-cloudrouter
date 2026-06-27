from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminRuntimeRouteExplainCandidate:
    """Admin runtime route explain candidate schema exposed by Claw Router."""
    api_code: str
    catalog_key: Optional[str]
    channel_group_code: str
    channel_group_id: str
    channel_id: str
    credential_id: Optional[str]
    credential_rotation: Optional[str]
    kind: str
    policy_id: Optional[str]
    pricing_plan_code: str
    provider_code: str
    provider_model: Optional[str]
    region_code: str
    requested_model: Optional[str]
    rule_id: Optional[str]
    timeout_ms: Optional[int]
