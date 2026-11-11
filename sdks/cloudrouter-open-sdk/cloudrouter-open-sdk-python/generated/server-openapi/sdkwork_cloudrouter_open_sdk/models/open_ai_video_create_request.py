from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVideoCreateRequest:
    """OpenAI-compatible request to create a video (`POST /v1/videos`)."""
    prompt: str
    input_reference: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    seconds: Optional[str] = None
    size: Optional[str] = None
