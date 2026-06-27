from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_resource_group_resources_response import AdminAiResourceGroupResourcesResponse


@dataclass
class AiResourceGroupsResourcesListResult:
    """Ai resource groups resources list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminAiResourceGroupResourcesResponse] = None
    msg: Optional[str] = None
