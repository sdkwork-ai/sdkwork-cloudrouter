from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_project_service_account import OpenAiProjectServiceAccount


@dataclass
class OpenAiProjectServiceAccountList:
    """OpenAI-compatible paginated list of project service accounts."""
    data: List[OpenAiProjectServiceAccount]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
