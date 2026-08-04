from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiContainer:
    """OpenAI-compatible container object."""
    created_at: int
    id: str
    object: str
    status: str
    expires_at: Optional[int] = None
    last_active_at: Optional[int] = None
    memory_limit: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
