from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVoiceCreateMultipartRequest:
    """OpenAI-compatible multipart request to create a voice."""
    file: Optional[bytes] = None
    model: Optional[str] = None
    name: Optional[str] = None
    prompt: Optional[str] = None
    script_hint: Optional[str] = None
    type: Optional[str] = None
