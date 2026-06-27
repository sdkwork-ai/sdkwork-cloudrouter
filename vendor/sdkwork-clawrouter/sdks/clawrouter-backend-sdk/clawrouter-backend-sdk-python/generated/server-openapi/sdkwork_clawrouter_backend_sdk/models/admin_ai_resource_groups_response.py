from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_resource_group_item import AdminAiResourceGroupItem


@dataclass
class AdminAiResourceGroupsResponse:
    """Admin ai resource groups response schema exposed by Claw Router."""
    items: List[AdminAiResourceGroupItem]
