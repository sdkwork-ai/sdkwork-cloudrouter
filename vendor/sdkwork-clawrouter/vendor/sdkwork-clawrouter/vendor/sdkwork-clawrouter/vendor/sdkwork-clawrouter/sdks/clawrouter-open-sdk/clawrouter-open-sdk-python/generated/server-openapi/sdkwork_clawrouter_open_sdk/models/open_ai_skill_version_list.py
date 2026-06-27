from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_skill_version import OpenAiSkillVersion


@dataclass
class OpenAiSkillVersionList:
    """OpenAI-compatible paginated list of skill versions."""
    data: List[OpenAiSkillVersion]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
