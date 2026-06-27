from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class SunoMusicTrack:
    """Suno-compatible suno music track schema exposed by Claw Router vendor routing."""
    audio_url: Optional[str] = None
    duration: Optional[float] = None
    id: Optional[str] = None
    image_url: Optional[str] = None
    lyrics: Optional[str] = None
    title: Optional[str] = None
    video_url: Optional[str] = None
