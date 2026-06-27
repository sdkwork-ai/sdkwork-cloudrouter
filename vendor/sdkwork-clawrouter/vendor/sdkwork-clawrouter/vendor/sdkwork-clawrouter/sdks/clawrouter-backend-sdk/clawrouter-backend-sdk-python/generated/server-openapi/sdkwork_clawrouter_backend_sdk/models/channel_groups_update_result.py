from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_group_mutation_response import AdminChannelGroupMutationResponse


@dataclass
class ChannelGroupsUpdateResult:
    """Channel groups update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminChannelGroupMutationResponse] = None
    msg: Optional[str] = None
