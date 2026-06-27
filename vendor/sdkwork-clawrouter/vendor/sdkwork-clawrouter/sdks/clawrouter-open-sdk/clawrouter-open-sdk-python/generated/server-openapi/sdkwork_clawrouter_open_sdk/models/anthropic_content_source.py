from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicContentSource:
    """Anthropic Claude anthropic content source schema exposed by Claw Router vendor routing."""
    type: str
    data: Optional[str] = None
    file_id: Optional[str] = None
    media_type: Optional[str] = None
    url: Optional[str] = None
