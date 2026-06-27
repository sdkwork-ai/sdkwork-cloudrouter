from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiOrganizationInvite:
    """OpenAI-compatible organization invite object."""
    email: str
    id: str
    object: str
    created_at: Optional[int] = None
    expires_at: Optional[int] = None
    projects: Optional[List[str]] = None
    role: Optional[str] = None
    status: Optional[str] = None
