from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRole:
    """OpenAI-compatible role object."""
    id: str
    name: str
    object: str
    created_at: Optional[int] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
