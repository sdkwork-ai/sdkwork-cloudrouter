from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiOrganizationGroup:
    """OpenAI-compatible organization group object."""
    id: str
    name: str
    object: str
    created_at: Optional[int] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
