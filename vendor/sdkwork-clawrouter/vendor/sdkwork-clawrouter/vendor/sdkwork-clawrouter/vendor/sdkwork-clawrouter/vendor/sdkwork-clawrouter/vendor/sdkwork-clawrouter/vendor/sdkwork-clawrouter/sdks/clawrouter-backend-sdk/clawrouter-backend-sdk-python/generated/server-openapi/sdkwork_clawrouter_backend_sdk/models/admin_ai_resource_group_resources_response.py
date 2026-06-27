from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_resource_group_resource_item import AdminAiResourceGroupResourceItem


@dataclass
class AdminAiResourceGroupResourcesResponse:
    """Admin ai resource group resources response schema exposed by Claw Router."""
    items: List[AdminAiResourceGroupResourceItem]
