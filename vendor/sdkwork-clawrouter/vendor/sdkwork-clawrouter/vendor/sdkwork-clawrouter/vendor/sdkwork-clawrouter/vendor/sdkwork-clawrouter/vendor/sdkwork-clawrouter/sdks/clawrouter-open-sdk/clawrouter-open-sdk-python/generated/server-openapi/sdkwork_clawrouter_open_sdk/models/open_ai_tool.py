from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_function_definition import OpenAiFunctionDefinition


@dataclass
class OpenAiTool:
    """OpenAI-compatible open ai tool schema exposed by Claw Router."""
    type: str
    function: Optional[OpenAiFunctionDefinition] = None
