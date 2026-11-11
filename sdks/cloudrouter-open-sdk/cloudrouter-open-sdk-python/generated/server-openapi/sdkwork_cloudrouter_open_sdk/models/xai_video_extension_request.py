from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any

if TYPE_CHECKING:
    from .xai_video_input import XaiVideoInput


@dataclass
class XaiVideoExtensionRequest:
    """xAI video extension request (ExtendVideoRequest)."""
    prompt: str
    video: XaiVideoInput
    duration: Optional[int] = None
    model: Optional[str] = None
    output: Optional[Dict[str, str]] = None
    storage_options: Optional[Dict[str, str]] = None
