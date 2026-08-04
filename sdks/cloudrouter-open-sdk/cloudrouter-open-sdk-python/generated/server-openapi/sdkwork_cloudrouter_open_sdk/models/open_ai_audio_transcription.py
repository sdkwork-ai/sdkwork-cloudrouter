from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiAudioTranscription:
    """OpenAI-compatible audio transcription response."""
    text: str
    duration: Optional[float] = None
    language: Optional[str] = None
    segments: Optional[List[str]] = None
    words: Optional[List[str]] = None
