from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .routing_api_keys_response import RoutingApiKeysResponse


@dataclass
class RoutingApiKeysListResult:
    """Routing api keys list result schema exposed by Claw Router."""
    code: str
    data: Optional[RoutingApiKeysResponse] = None
    msg: Optional[str] = None
