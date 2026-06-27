from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_models_response import AdminAiModelsResponse


@dataclass
class ModelsListResult:
    """Models list result schema exposed by Claw Router."""
    code: str
    data: Optional[AdminAiModelsResponse] = None
    msg: Optional[str] = None
