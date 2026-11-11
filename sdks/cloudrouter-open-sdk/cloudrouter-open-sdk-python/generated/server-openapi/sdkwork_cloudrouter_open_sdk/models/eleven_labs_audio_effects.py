from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ElevenLabsAudioEffects:
    """ElevenLabs audio effects applied to generated speech."""
    background_noise_id: Optional[str] = None
    distance: Optional[float] = None
    environment_id: Optional[str] = None
    filter_preset_id: Optional[str] = None
    pan: Optional[float] = None
    send_level: Optional[float] = None
