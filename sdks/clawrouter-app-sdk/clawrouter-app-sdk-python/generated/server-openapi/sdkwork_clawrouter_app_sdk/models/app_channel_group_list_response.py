from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .app_channel_group import AppChannelGroup


@dataclass
class AppChannelGroupListResponse:
    """App channel group list response schema exposed by Claw Router."""
    items: List[AppChannelGroup]
