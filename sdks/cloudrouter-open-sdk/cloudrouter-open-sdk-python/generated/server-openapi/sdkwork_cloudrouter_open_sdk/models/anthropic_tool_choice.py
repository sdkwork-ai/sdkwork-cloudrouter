from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicToolChoice:
    """Anthropic Claude anthropic tool choice schema exposed by Cloud Router vendor routing."""
    type: str
    disable_parallel_tool_use: Optional[bool] = None
    name: Optional[str] = None
