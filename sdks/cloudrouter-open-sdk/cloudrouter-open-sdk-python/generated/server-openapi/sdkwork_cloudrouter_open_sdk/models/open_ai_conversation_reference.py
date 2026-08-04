from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiConversationReference:
    """OpenAI-compatible open ai conversation reference schema exposed by Cloud Router."""
    id: Optional[str] = None
