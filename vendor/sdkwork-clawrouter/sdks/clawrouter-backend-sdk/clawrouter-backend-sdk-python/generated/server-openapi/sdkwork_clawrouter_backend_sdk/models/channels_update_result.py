from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_mutation_response import AdminChannelMutationResponse


@dataclass
class ChannelsUpdateResult:
    """Channels update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminChannelMutationResponse] = None
    msg: Optional[str] = None
