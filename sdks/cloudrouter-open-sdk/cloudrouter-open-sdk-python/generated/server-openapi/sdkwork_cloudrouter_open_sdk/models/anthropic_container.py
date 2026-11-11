from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .anthropic_skill import AnthropicSkill


@dataclass
class AnthropicContainer:
    """Anthropic container selection and skills."""
    id: Optional[str] = None
    skills: Optional[List[AnthropicSkill]] = None
