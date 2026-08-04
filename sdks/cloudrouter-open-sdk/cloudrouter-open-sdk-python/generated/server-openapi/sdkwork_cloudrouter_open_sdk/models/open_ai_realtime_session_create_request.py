from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiRealtimeSessionCreateRequest:
    """OpenAI-compatible request to create a realtime session."""
    instructions: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    modalities: Optional[List[str]] = None
    model: Optional[str] = None
    voice: Optional[str] = None
