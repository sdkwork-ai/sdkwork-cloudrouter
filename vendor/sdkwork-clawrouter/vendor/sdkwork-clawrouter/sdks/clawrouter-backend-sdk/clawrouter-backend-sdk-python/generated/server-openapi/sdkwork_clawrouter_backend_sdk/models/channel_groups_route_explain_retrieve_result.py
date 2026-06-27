from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_group_route_explain_response import AdminChannelGroupRouteExplainResponse


@dataclass
class ChannelGroupsRouteExplainRetrieveResult:
    """Channel groups route explain retrieve result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminChannelGroupRouteExplainResponse] = None
    msg: Optional[str] = None
