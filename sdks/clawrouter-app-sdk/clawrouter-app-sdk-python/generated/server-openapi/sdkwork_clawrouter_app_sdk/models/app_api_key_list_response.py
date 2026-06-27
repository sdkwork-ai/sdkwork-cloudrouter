from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .app_api_key_item import AppApiKeyItem
    from .app_channel_group import AppChannelGroup


@dataclass
class AppApiKeyListResponse:
    """App api key list response schema exposed by Claw Router."""
    groups: List[AppChannelGroup]
    items: List[AppApiKeyItem]
