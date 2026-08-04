from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVoice:
    """OpenAI-compatible voice object."""
    id: str
    object: str
    created_at: Optional[int] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    status: Optional[str] = None
