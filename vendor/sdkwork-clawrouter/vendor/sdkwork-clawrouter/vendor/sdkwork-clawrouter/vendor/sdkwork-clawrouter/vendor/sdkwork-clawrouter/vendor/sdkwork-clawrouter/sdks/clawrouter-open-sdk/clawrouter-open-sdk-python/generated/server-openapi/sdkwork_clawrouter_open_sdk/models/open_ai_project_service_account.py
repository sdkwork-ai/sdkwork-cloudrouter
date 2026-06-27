from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_project_api_key import OpenAiProjectApiKey


@dataclass
class OpenAiProjectServiceAccount:
    """OpenAI-compatible project service account object."""
    id: str
    name: str
    object: str
    api_key: Optional[OpenAiProjectApiKey] = None
    created_at: Optional[int] = None
    role: Optional[str] = None
