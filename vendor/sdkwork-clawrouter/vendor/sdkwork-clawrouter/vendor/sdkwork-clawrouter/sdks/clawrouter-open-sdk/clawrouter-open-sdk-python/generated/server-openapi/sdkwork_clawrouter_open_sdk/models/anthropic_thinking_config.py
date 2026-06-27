from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicThinkingConfig:
    """Anthropic Claude anthropic thinking config schema exposed by Claw Router vendor routing."""
    type: str
    budget_tokens: Optional[int] = None
