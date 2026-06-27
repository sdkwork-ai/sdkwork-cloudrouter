from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channels_response import AdminChannelsResponse


@dataclass
class ChannelsListResult:
    """Channels list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminChannelsResponse] = None
    msg: Optional[str] = None
