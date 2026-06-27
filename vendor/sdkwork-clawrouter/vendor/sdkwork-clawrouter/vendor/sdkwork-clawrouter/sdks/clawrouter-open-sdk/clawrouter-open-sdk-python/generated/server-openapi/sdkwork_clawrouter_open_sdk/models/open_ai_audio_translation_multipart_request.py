from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiAudioTranslationMultipartRequest:
    """OpenAI-compatible open ai audio translation multipart request schema exposed by Claw Router."""
    file: str
    model: str
    prompt: Optional[str] = None
    response_format: Optional[str] = None
