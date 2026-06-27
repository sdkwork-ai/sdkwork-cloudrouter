from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicToolChoice:
    """Anthropic Claude anthropic tool choice schema exposed by Claw Router vendor routing."""
    type: str
    name: Optional[str] = None
