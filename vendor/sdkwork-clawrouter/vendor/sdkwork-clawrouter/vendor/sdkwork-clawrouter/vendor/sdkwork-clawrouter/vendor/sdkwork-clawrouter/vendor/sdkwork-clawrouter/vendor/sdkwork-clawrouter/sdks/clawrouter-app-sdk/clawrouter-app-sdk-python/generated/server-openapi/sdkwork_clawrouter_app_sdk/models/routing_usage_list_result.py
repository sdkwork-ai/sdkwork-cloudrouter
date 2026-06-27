from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .routing_usage_snapshot import RoutingUsageSnapshot


@dataclass
class RoutingUsageListResult:
    """Routing usage list result schema exposed by Claw Router."""
    code: str
    data: Optional[RoutingUsageSnapshot] = None
    msg: Optional[str] = None
