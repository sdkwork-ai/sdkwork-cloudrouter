from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicDeleteResponse:
    """Anthropic Claude anthropic delete response schema exposed by Claw Router vendor routing."""
    deleted: Optional[bool] = None
    id: Optional[str] = None
    type: Optional[str] = None
