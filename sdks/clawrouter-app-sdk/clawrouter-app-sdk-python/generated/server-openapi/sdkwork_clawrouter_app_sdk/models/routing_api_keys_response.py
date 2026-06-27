from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .routing_api_key_item import RoutingApiKeyItem


@dataclass
class RoutingApiKeysResponse:
    """Routing api keys response schema exposed by Claw Router."""
    items: List[RoutingApiKeyItem]
