from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiModel:
    """OpenAI-compatible open ai model schema exposed by Claw Router."""
    id: str
    object: str
    owned_by: str
    created: Optional[int] = None
