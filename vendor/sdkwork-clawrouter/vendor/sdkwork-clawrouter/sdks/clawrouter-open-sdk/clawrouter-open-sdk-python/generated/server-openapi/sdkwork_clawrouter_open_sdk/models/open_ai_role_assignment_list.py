from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_role_assignment import OpenAiRoleAssignment


@dataclass
class OpenAiRoleAssignmentList:
    """OpenAI-compatible paginated list of role assignments."""
    data: List[OpenAiRoleAssignment]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
