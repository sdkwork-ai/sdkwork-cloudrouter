from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiSkillVersion:
    """OpenAI-compatible skill version object exposed by Claw Router."""
    id: str
    object: str
    version: str
    created_at: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    package_sha256: Optional[str] = None
    skill_id: Optional[str] = None
    status: Optional[str] = None
