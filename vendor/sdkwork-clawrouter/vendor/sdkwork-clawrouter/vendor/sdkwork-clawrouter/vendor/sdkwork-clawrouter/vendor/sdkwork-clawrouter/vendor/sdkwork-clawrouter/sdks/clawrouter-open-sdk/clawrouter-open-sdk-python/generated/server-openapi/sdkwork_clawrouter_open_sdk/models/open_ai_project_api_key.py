from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiProjectApiKey:
    """OpenAI-compatible project API key object."""
    id: str
    name: str
    object: str
    created_at: Optional[int] = None
    last_used_at: Optional[int] = None
    owner: Optional[str] = None
    redacted_value: Optional[str] = None
