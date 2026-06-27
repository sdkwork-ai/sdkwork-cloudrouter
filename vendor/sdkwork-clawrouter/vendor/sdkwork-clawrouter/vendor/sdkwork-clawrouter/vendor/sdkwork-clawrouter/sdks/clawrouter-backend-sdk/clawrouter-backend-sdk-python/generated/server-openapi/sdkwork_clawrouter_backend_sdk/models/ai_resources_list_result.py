from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_resources_response import AdminAiResourcesResponse


@dataclass
class AiResourcesListResult:
    """Ai resources list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminAiResourcesResponse] = None
    msg: Optional[str] = None
