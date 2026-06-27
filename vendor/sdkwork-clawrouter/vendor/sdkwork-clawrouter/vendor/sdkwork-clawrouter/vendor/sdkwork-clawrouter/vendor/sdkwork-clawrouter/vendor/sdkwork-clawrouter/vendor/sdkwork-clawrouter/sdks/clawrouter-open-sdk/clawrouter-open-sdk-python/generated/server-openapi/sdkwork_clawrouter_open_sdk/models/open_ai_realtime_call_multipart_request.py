from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeCallMultipartRequest:
    """OpenAI-compatible open ai realtime call multipart request schema exposed by Claw Router."""
    sdp: str
    session: Optional[str] = None
