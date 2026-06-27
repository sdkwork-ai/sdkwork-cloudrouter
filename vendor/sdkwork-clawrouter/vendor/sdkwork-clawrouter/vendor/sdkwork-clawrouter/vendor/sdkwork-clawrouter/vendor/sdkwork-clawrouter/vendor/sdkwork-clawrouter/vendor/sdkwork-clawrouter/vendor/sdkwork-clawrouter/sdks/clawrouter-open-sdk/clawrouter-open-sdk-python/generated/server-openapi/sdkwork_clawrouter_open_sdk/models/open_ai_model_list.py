from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_model import OpenAiModel


@dataclass
class OpenAiModelList:
    """OpenAI-compatible open ai model list schema exposed by Claw Router."""
    data: List[OpenAiModel]
    object: str
