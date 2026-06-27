from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiSkillUpdateRequest:
    """OpenAI-compatible request to update a skill."""
    description: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
