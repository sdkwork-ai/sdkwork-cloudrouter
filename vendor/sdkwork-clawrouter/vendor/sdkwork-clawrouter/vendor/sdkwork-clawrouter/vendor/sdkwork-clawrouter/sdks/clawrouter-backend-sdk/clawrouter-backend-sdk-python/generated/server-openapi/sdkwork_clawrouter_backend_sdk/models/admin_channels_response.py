from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_item import AdminChannelItem


@dataclass
class AdminChannelsResponse:
    """Admin channels response schema exposed by Claw Router."""
    items: List[AdminChannelItem]
