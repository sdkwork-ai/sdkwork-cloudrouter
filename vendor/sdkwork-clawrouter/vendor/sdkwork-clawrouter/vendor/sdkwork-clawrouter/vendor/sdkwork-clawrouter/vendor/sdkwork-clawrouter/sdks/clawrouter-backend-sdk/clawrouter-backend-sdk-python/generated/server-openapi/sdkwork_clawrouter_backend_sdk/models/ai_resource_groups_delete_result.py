from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_resource_group_delete_response import AdminAiResourceGroupDeleteResponse


@dataclass
class AiResourceGroupsDeleteResult:
    """Ai resource groups delete result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminAiResourceGroupDeleteResponse] = None
    msg: Optional[str] = None
