from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_project_api_key import OpenAiProjectApiKey


@dataclass
class OpenAiProjectApiKeyList:
    """OpenAI-compatible paginated list of project API keys."""
    data: List[OpenAiProjectApiKey]
    object: str
    first_id: Optional[str] = None
    has_more: Optional[bool] = None
    last_id: Optional[str] = None
