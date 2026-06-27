from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AdminAiResourceMemberInput:
    """Admin ai resource member input schema exposed by Claw Router."""
    member_resource_code: str
    member_role: Optional[str] = None
    required: Optional[bool] = None
    sort_order: Optional[str] = None
