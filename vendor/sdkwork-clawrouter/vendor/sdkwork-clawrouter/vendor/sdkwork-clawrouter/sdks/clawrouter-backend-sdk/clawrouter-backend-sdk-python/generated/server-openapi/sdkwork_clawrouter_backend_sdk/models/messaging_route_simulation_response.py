from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MessagingRouteSimulationResponse:
    """Messaging route simulation response schema exposed by Claw Router."""
    matched: bool
    targets: List[Dict[str, str]]
    route_rule_id: Optional[str] = None
