from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVideoExtendRequest:
    """OpenAI-compatible request to extend a video (`POST /v1/videos/extensions`)."""
    prompt: str
    seconds: str
    video: str
