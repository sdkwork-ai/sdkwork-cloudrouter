from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .app_channel_group_list_response import AppChannelGroupListResponse


@dataclass
class ChannelGroupsListResult:
    """Channel groups list result schema exposed by Claw Router."""
    code: str
    data: Optional[AppChannelGroupListResponse] = None
    msg: Optional[str] = None
