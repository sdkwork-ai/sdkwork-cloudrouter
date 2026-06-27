from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAiResourceGroupMemberInput:
    """Admin ai resource group member input schema exposed by Claw Router."""
    resource_code: str
    item_role: Optional[str] = None
    sort_order: Optional[str] = None
