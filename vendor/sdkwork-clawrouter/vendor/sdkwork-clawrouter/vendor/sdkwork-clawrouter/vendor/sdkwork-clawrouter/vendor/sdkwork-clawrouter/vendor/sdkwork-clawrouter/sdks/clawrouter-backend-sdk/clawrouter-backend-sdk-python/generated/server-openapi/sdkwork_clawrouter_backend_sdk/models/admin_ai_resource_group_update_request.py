from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_resource_group_member_input import AdminAiResourceGroupMemberInput


@dataclass
class AdminAiResourceGroupUpdateRequest:
    """Admin ai resource group update request schema exposed by Claw Router."""
    description: Optional[str] = None
    group_code: Optional[str] = None
    group_name: Optional[str] = None
    group_type: Optional[str] = None
    members: Optional[List[AdminAiResourceGroupMemberInput]] = None
    selection_mode: Optional[str] = None
    sort_order: Optional[str] = None
    status: Optional[str] = None
