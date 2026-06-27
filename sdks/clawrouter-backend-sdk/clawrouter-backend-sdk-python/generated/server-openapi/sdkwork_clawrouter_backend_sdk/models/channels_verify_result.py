from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_test_response import AdminChannelTestResponse


@dataclass
class ChannelsVerifyResult:
    """Channels verify result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminChannelTestResponse] = None
    msg: Optional[str] = None
