from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_resource_mutation_response import AdminAiResourceMutationResponse


@dataclass
class AiResourcesUpdateResult:
    """Ai resources update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminAiResourceMutationResponse] = None
    msg: Optional[str] = None
