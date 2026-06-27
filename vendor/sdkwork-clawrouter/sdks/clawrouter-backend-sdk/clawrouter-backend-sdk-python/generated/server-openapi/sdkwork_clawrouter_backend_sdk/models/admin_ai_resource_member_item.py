from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAiResourceMemberItem:
    """Admin ai resource member item schema exposed by Claw Router."""
    member_resource_code: str
    member_role: str
    parent_resource_code: str
    required: bool
    sort_order: Optional[str] = None
