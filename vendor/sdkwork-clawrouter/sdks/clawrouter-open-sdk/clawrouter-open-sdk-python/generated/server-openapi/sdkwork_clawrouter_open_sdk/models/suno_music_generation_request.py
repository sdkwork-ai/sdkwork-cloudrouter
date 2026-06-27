from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class SunoMusicGenerationRequest:
    """Suno-compatible suno music generation request schema exposed by Claw Router vendor routing."""
    prompt: str
    callback_url: Optional[str] = None
    duration: Optional[float] = None
    model: Optional[str] = None
    negative_tags: Optional[str] = None
    tags: Optional[str] = None
    title: Optional[str] = None
