from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .gateway_trace import GatewayTrace


@dataclass
class GatewayTracesResponse:
    """Gateway traces response schema exposed by Claw Router."""
    items: List[GatewayTrace]
