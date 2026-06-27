from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_site_channel_item import AdminSiteChannelItem


@dataclass
class AdminSiteChannelsResponse:
    """Admin site channels response schema exposed by Claw Router."""
    items: List[AdminSiteChannelItem]
