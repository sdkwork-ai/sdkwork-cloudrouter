from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .messaging_route_simulation_response import MessagingRouteSimulationResponse


@dataclass
class DiagnosticsRouteSimulationCreateResult:
    """Diagnostics route simulation create result schema exposed by Claw Router."""
    code: str
    data: Optional[MessagingRouteSimulationResponse] = None
    msg: Optional[str] = None
