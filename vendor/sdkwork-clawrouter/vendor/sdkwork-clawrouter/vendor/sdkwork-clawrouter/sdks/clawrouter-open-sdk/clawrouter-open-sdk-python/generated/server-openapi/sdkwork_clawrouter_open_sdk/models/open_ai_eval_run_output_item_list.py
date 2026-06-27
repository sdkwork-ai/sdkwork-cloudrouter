from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_eval_run_output_item import OpenAiEvalRunOutputItem


@dataclass
class OpenAiEvalRunOutputItemList:
    """OpenAI-compatible paginated list of eval run output items."""
    data: List[OpenAiEvalRunOutputItem]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
