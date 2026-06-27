from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MessagingRouteRuleCreateRequest:
    """Messaging route rule create request schema exposed by Claw Router."""
    channel: str
    delivery_purpose: str
    rule_code: str
    scene_code: str
    targets: List[Dict[str, Any]]
    country_code: Optional[str] = None
    failover_policy: Optional[Dict[str, str]] = None
    locale: Optional[str] = None
    priority: Optional[int] = None
    user_segment: Optional[str] = None
