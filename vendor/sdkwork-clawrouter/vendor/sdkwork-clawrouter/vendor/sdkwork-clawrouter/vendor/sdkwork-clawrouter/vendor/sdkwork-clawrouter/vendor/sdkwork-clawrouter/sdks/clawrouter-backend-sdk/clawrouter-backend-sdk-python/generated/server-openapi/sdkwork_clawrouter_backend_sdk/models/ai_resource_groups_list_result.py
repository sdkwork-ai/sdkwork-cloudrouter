from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_resource_groups_response import AdminAiResourceGroupsResponse


@dataclass
class AiResourceGroupsListResult:
    """Ai resource groups list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminAiResourceGroupsResponse] = None
    msg: Optional[str] = None
