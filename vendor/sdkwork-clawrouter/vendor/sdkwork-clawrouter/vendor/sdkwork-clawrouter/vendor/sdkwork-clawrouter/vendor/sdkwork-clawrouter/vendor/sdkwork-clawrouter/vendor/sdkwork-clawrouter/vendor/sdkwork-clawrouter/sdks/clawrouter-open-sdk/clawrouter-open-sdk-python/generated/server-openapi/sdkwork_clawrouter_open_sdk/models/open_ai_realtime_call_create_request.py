from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeCallCreateRequest:
    """OpenAI-compatible request to create or start a realtime call."""
    metadata: Optional[Dict[str, str]] = None
    sdp: Optional[str] = None
    session: Optional[str] = None
