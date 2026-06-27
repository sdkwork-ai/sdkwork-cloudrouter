from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_group_channel_bindings_response import AdminChannelGroupChannelBindingsResponse


@dataclass
class ChannelGroupsChannelBindingsListResult:
    """Channel groups channel bindings list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminChannelGroupChannelBindingsResponse] = None
    msg: Optional[str] = None
