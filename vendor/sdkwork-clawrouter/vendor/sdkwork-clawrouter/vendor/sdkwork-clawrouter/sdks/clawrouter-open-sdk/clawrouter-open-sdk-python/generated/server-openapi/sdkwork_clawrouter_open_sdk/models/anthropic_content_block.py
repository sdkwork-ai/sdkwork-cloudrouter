from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicContentBlock:
    """Anthropic Claude anthropic content block schema exposed by Claw Router vendor routing."""
    type: str
    id: Optional[str] = None
    input: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    text: Optional[str] = None
