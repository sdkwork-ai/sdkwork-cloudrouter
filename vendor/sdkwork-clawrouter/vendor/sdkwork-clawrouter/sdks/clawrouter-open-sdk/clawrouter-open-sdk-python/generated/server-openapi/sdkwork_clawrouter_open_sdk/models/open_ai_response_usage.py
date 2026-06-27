from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_response_input_tokens_details import OpenAiResponseInputTokensDetails
    from .open_ai_response_output_tokens_details import OpenAiResponseOutputTokensDetails


@dataclass
class OpenAiResponseUsage:
    """OpenAI-compatible open ai response usage schema exposed by Claw Router."""
    input_tokens: int
    output_tokens: int
    total_tokens: int
    input_tokens_details: Optional[OpenAiResponseInputTokensDetails] = None
    output_tokens_details: Optional[OpenAiResponseOutputTokensDetails] = None
