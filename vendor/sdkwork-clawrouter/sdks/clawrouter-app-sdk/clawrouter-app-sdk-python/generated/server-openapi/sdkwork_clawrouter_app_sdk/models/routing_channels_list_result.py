from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .routing_channels_response import RoutingChannelsResponse


@dataclass
class RoutingChannelsListResult:
    """Routing channels list result schema exposed by Claw Router."""
    code: str
    data: Optional[RoutingChannelsResponse] = None
    msg: Optional[str] = None
