from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiProject:
    """OpenAI-compatible organization project object."""
    id: str
    name: str
    object: str
    archived_at: Optional[int] = None
    created_at: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    status: Optional[str] = None
