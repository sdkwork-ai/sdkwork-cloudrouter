from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiCertificate:
    """OpenAI-compatible certificate object."""
    id: str
    object: str
    active: Optional[bool] = None
    content: Optional[str] = None
    created_at: Optional[int] = None
    expires_at: Optional[int] = None
    name: Optional[str] = None
