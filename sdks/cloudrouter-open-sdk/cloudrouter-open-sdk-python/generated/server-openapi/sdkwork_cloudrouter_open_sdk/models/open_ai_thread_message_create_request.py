from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiThreadMessageCreateRequest:
    """OpenAI-compatible request to create a thread message."""
    content: str
    role: str
    attachments: Optional[List[str]] = None
    metadata: Optional[Dict[str, str]] = None
