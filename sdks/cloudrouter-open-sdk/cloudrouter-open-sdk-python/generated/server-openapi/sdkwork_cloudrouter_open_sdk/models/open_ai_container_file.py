from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiContainerFile:
    """OpenAI-compatible container file object."""
    created_at: int
    id: str
    object: str
    bytes: Optional[int] = None
    container_id: Optional[str] = None
    filename: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    path: Optional[str] = None
    purpose: Optional[str] = None
