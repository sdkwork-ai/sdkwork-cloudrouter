from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_response_input_item import OpenAiResponseInputItem


@dataclass
class OpenAiResponseInputTokenCountRequest:
    """OpenAI-compatible request to count tokens for a Responses API input (`POST /v1/responses/input_tokens`). Supply `input` or `previous_response_id`."""
    conversation: Optional[str] = None
    input: Optional[str] = None
    instructions: Optional[str] = None
    model: Optional[str] = None
    parallel_tool_calls: Optional[bool] = None
    personality: Optional[str] = None
    previous_response_id: Optional[str] = None
    reasoning: Optional[str] = None
    text: Optional[str] = None
    tool_choice: Optional[str] = None
    tools: Optional[List[str]] = None
    truncation: Optional[str] = None
