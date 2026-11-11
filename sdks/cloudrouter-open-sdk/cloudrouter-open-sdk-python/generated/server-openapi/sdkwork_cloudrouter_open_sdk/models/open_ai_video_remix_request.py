from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVideoRemixRequest:
    """OpenAI-compatible request to remix a video (`POST /v1/videos/{video_id}/remix`)."""
    prompt: str
