from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ElevenLabsVoiceSettings:
    """ElevenLabs per-request voice settings."""
    clone_strength: Optional[float] = None
    similarity_boost: Optional[float] = None
    speed: Optional[float] = None
    stability: Optional[float] = None
    style: Optional[float] = None
    use_speaker_boost: Optional[bool] = None
