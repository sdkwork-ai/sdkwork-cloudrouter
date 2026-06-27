from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVoiceCreateMultipartRequest:
    """OpenAI-compatible multipart request to create a voice."""
    description: Optional[str] = None
    file: Optional[str] = None
    metadata: Optional[str] = None
    name: Optional[str] = None
