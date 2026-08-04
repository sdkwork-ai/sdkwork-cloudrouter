from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeTranslationSessionCreateRequest:
    """OpenAI-compatible request to create a realtime translation session."""
    metadata: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
