from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFineTuningJobEvent:
    """OpenAI-compatible fine-tuning job event object."""
    created_at: int
    id: str
    message: str
    object: str
    data: Optional[str] = None
    level: Optional[str] = None
    type: Optional[str] = None
