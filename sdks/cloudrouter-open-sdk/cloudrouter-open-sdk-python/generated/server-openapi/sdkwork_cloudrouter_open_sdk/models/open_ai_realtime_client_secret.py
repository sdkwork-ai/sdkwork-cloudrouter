from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_realtime_client_secret_value import OpenAiRealtimeClientSecretValue


@dataclass
class OpenAiRealtimeClientSecret:
    """OpenAI-compatible realtime client secret bootstrap response."""
    client_secret: OpenAiRealtimeClientSecretValue
    session: Optional[str] = None
