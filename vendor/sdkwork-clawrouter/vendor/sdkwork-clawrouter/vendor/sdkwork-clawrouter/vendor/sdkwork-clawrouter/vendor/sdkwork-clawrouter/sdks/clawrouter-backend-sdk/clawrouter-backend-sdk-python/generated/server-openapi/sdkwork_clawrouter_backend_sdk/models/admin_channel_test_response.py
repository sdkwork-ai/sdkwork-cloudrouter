from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_item import AdminChannelItem


@dataclass
class AdminChannelTestResponse:
    """Admin channel test response schema exposed by Claw Router."""
    channel_id: str
    item: AdminChannelItem
    latency: str
    status: str
    success: bool
