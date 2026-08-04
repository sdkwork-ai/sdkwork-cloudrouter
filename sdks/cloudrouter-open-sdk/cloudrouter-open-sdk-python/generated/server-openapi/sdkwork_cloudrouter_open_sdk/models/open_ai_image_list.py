from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .open_ai_image import OpenAiImage
    from .open_ai_token_usage import OpenAiTokenUsage


@dataclass
class OpenAiImageList:
    """OpenAI-compatible image generation response."""
    created: int
    data: List[OpenAiImage]
    usage: Optional[OpenAiTokenUsage] = None
