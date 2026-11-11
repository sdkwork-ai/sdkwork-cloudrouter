from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MurekaMusicGenerationRequest:
    """Mureka song generation request."""
    model: str
    callback_url: Optional[str] = None
    duration: Optional[int] = None
    lyrics: Optional[str] = None
    prompt: Optional[str] = None
    reference_audio_url: Optional[str] = None
    tags: Optional[List[str]] = None
    title: Optional[str] = None
