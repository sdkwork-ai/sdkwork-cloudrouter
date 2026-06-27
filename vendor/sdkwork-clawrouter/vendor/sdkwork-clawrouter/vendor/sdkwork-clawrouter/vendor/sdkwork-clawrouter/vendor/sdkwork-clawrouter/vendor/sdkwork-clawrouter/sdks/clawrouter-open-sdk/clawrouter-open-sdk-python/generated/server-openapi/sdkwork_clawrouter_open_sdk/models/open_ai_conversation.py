from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiConversation:
    """OpenAI-compatible open ai conversation schema exposed by Claw Router."""
    created_at: int
    id: str
    object: str
    metadata: Optional[Dict[str, str]] = None
