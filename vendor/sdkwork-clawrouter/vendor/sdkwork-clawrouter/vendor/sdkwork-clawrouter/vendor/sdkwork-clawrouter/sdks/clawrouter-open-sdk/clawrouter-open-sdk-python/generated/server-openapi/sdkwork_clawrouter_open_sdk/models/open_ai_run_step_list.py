from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_run_step import OpenAiRunStep


@dataclass
class OpenAiRunStepList:
    """OpenAI-compatible paginated list of run steps."""
    data: List[OpenAiRunStep]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
