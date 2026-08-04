from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeCallActionRequest:
    """OpenAI-compatible request for a realtime call action."""
    metadata: Optional[Dict[str, str]] = None
