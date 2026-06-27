from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_organization_user import OpenAiOrganizationUser


@dataclass
class OpenAiOrganizationUserList:
    """OpenAI-compatible paginated list of organization users."""
    data: List[OpenAiOrganizationUser]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
