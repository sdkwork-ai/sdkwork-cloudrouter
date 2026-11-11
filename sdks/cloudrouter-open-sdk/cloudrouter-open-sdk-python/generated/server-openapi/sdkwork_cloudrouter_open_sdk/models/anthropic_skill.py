from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AnthropicSkill:
    """One skill loaded into an Anthropic container."""
    skill_id: str
    type: str
    version: Optional[str] = None
