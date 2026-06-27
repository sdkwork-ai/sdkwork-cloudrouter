from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_file_reference_input import OpenAiFileReferenceInput


@dataclass
class OpenAiAudioTranslationRequest:
    """OpenAI-compatible open ai audio translation request schema exposed by Claw Router."""
    file: OpenAiFileReferenceInput
    model: str
    prompt: Optional[str] = None
    response_format: Optional[str] = None
