from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_resource_group_member_input import AdminAiResourceGroupMemberInput


@dataclass
class AdminAiResourceGroupCreateRequest:
    """Admin ai resource group create request schema exposed by Claw Router."""
    group_code: str
    group_name: str
    description: Optional[str] = None
    group_type: Optional[str] = None
    members: Optional[List[AdminAiResourceGroupMemberInput]] = None
    selection_mode: Optional[str] = None
    sort_order: Optional[str] = None
    status: Optional[str] = None
