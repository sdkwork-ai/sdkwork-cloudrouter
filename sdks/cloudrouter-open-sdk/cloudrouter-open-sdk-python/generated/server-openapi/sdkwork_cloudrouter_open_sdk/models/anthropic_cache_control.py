from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicCacheControl:
    """Anthropic prompt-cache breakpoint."""
    type: str
    ttl: Optional[str] = None
