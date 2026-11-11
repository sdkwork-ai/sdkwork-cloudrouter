from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicMetadata:
    """Anthropic request metadata."""
    user_id: Optional[str] = None
