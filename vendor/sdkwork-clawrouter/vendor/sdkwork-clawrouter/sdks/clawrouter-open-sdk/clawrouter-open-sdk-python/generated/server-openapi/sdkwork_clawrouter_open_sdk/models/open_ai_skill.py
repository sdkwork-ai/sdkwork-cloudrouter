from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_skill_version import OpenAiSkillVersion


@dataclass
class OpenAiSkill:
    """OpenAI-compatible skill object exposed by Claw Router."""
    created_at: int
    id: str
    name: str
    object: str
    description: Optional[str] = None
    latest_version: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    status: Optional[str] = None
    updated_at: Optional[int] = None
    versions: Optional[List[OpenAiSkillVersion]] = None
