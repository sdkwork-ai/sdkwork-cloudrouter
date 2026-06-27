from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_incomplete_details import OpenAiIncompleteDetails
    from .open_ai_response_error import OpenAiResponseError
    from .open_ai_response_output_item import OpenAiResponseOutputItem
    from .open_ai_response_usage import OpenAiResponseUsage


@dataclass
class OpenAiResponse:
    """OpenAI-compatible open ai response schema exposed by Claw Router."""
    id: str
    model: str
    object: str
    output: List[OpenAiResponseOutputItem]
    created_at: Optional[int] = None
    error: Optional[OpenAiResponseError] = None
    incomplete_details: Optional[OpenAiIncompleteDetails] = None
    output_text: Optional[str] = None
    status: Optional[str] = None
    usage: Optional[OpenAiResponseUsage] = None
