from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .admin_ai_model_item import AdminAiModelItem


@dataclass
class AdminAiModelsResponse:
    """Admin ai models response schema exposed by Claw Router."""
    items: List[AdminAiModelItem]
