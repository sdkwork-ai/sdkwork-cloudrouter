from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .gateway_traces_response import GatewayTracesResponse


@dataclass
class GatewayTracesListResult:
    """Gateway traces list result schema exposed by Claw Router."""
    code: str
    data: Optional[GatewayTracesResponse] = None
    msg: Optional[str] = None
