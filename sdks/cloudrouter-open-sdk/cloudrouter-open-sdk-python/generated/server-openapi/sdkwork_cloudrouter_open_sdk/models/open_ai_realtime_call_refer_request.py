from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeCallReferRequest:
    """OpenAI-compatible request to refer or transfer a realtime call."""
    target_uri: str
