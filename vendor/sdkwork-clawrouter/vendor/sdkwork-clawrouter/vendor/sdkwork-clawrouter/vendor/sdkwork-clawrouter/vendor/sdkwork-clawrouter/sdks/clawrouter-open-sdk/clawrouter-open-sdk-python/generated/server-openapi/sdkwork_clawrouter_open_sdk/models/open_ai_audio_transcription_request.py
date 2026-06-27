from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_file_reference_input import OpenAiFileReferenceInput


@dataclass
class OpenAiAudioTranscriptionRequest:
    """OpenAI-compatible open ai audio transcription request schema exposed by Claw Router."""
    file: OpenAiFileReferenceInput
    model: str
    language: Optional[str] = None
    prompt: Optional[str] = None
    response_format: Optional[str] = None
