from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_response_input_tokens_details import OpenAiResponseInputTokensDetails


@dataclass
class OpenAiResponseInputTokenCount:
    """OpenAI-compatible response input token count result."""
    input_tokens: int
    input_tokens_details: Optional[OpenAiResponseInputTokensDetails] = None
    model: Optional[str] = None
    object: Optional[str] = None
