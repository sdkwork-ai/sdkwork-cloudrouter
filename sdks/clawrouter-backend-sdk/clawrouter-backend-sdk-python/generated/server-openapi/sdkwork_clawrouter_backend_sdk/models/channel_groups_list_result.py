from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_groups_response import AdminChannelGroupsResponse


@dataclass
class ChannelGroupsListResult:
    """Channel groups list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminChannelGroupsResponse] = None
    msg: Optional[str] = None
