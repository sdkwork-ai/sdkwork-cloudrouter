from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .routing_channel_item import RoutingChannelItem


@dataclass
class RoutingChannelsResponse:
    """Routing channels response schema exposed by Claw Router."""
    items: List[RoutingChannelItem]
