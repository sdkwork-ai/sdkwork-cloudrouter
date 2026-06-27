from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiConversationUpdateRequest:
    """OpenAI-compatible open ai conversation update request schema exposed by Claw Router."""
    metadata: Optional[Dict[str, str]] = None
