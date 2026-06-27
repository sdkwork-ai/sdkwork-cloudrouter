from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiAudioTranscriptionMultipartRequest:
    """OpenAI-compatible open ai audio transcription multipart request schema exposed by Claw Router."""
    file: str
    model: str
    language: Optional[str] = None
    prompt: Optional[str] = None
    response_format: Optional[str] = None
