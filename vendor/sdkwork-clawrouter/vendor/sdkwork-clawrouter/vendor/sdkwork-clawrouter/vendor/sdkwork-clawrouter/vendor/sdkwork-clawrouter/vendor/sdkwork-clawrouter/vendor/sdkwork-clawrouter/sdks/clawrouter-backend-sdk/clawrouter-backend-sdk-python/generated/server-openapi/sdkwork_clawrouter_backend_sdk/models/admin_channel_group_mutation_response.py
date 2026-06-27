from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_channel_group_item import AdminChannelGroupItem


@dataclass
class AdminChannelGroupMutationResponse:
    """Admin channel group mutation response schema exposed by Claw Router."""
    item: AdminChannelGroupItem
