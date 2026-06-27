from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_eval import OpenAiEval


@dataclass
class OpenAiEvalList:
    """OpenAI-compatible paginated list of evals."""
    data: List[OpenAiEval]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
