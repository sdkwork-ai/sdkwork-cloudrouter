from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class KlingAvatarCreateRequest:
    """Kling-compatible kling avatar create request schema exposed by Cloud Router vendor routing."""
    human_image: str
    audio_url: Optional[str] = None
    callback_url: Optional[str] = None
    model_name: Optional[str] = None
    prompt: Optional[str] = None
    text: Optional[str] = None
    voice_id: Optional[str] = None
    voice_language: Optional[str] = None
    voice_mode: Optional[str] = None
