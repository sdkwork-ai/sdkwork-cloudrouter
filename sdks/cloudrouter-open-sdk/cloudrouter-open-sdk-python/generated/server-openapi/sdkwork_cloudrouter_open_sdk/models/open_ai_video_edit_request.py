from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVideoEditRequest:
    """OpenAI-compatible request to edit a video (`POST /v1/videos/edits`)."""
    prompt: str
    video: str
