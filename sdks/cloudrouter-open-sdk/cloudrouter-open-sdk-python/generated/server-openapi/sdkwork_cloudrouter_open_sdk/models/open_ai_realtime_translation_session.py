from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_realtime_client_secret_value import OpenAiRealtimeClientSecretValue


@dataclass
class OpenAiRealtimeTranslationSession:
    """OpenAI-compatible realtime translation session object."""
    id: str
    object: str
    client_secret: Optional[OpenAiRealtimeClientSecretValue] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
