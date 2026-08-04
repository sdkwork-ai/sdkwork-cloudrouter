from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiChatCompletionUpdateRequest:
    """OpenAI-compatible request to update stored chat completion metadata."""
    metadata: Optional[Dict[str, str]] = None
