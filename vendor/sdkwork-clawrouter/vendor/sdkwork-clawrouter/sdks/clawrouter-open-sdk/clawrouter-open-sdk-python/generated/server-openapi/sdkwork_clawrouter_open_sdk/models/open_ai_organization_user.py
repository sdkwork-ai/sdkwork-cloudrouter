from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiOrganizationUser:
    """OpenAI-compatible organization user object."""
    email: str
    id: str
    object: str
    created_at: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
