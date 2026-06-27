from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRoleAssignment:
    """OpenAI-compatible role assignment object."""
    id: str
    object: str
    role_id: str
    created_at: Optional[int] = None
    group_id: Optional[str] = None
    project_id: Optional[str] = None
    user_id: Optional[str] = None
