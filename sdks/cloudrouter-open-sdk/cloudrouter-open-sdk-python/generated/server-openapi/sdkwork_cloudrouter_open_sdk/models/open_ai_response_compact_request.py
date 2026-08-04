from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiResponseCompactRequest:
    """OpenAI-compatible request to compact response or conversation state."""
    input: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    previous_response_id: Optional[str] = None
