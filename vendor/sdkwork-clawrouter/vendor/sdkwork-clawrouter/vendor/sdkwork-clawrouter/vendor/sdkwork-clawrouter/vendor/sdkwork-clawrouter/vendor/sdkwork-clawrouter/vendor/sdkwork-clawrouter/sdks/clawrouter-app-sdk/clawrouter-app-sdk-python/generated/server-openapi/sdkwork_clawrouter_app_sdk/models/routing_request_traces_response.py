from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .routing_request_trace_item import RoutingRequestTraceItem


@dataclass
class RoutingRequestTracesResponse:
    """Routing request traces response schema exposed by Claw Router."""
    items: List[RoutingRequestTraceItem]
