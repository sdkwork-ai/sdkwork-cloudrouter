from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_model_mutation_response import AdminAiModelMutationResponse


@dataclass
class ModelsUpdateResult:
    """Models update result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminAiModelMutationResponse] = None
    msg: Optional[str] = None
