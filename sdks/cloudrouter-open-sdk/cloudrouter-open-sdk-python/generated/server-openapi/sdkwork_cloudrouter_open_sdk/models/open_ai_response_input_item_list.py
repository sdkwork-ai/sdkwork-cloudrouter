from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_response_input_item import OpenAiResponseInputItem


@dataclass
class OpenAiResponseInputItemList:
    """OpenAI-compatible paginated list of response input items."""
    data: List[OpenAiResponseInputItem]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
