from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeCallRejectRequest:
    """OpenAI-compatible request to reject an inbound realtime call."""
    status_code: Optional[int] = None
