from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiSpeechCreateRequest:
    """OpenAI-compatible request to synthesize speech audio."""
    input: str
    model: str
    voice: str
    instructions: Optional[str] = None
    response_format: Optional[str] = None
    speed: Optional[float] = None
    stream_format: Optional[str] = None
