from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .routing_request_traces_response import RoutingRequestTracesResponse


@dataclass
class RoutingRequestTracesListResult:
    """Routing request traces list result schema exposed by Claw Router."""
    code: str
    data: Optional[RoutingRequestTracesResponse] = None
    msg: Optional[str] = None
