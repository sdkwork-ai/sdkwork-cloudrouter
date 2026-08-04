from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_realtime_client_secret_value import OpenAiRealtimeClientSecretValue


@dataclass
class OpenAiRealtimeSession:
    """OpenAI-compatible realtime session object."""
    id: str
    object: str
    client_secret: Optional[OpenAiRealtimeClientSecretValue] = None
    instructions: Optional[str] = None
    modalities: Optional[List[str]] = None
    model: Optional[str] = None
    voice: Optional[str] = None
