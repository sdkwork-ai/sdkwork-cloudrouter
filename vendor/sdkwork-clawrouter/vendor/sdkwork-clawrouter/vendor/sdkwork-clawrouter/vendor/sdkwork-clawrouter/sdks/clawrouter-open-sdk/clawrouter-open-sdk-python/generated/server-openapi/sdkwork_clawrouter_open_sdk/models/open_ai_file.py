from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiFile:
    """OpenAI-compatible file object."""
    bytes: int
    created_at: int
    filename: str
    id: str
    object: str
    purpose: str
    status: Optional[str] = None
    status_details: Optional[str] = None
