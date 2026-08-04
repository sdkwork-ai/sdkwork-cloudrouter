from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiThread:
    """OpenAI-compatible thread object."""
    created_at: int
    id: str
    object: str
    metadata: Optional[Dict[str, str]] = None
    tool_resources: Optional[str] = None
