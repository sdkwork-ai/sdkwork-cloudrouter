from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeCall:
    """OpenAI-compatible realtime call object."""
    id: str
    object: str
    status: str
    created_at: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    sdp: Optional[str] = None
    session: Optional[str] = None
