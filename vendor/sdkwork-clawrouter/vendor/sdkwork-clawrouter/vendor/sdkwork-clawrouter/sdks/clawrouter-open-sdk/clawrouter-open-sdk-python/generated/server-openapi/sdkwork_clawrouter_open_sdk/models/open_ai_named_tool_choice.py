from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_named_tool_choice_function import OpenAiNamedToolChoiceFunction


@dataclass
class OpenAiNamedToolChoice:
    """OpenAI-compatible open ai named tool choice schema exposed by Claw Router."""
    function: OpenAiNamedToolChoiceFunction
    type: str
