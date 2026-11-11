from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MinimaxVoiceModify:
    """MiniMax TTS voice effects."""
    intensity: Optional[int] = None
    pitch: Optional[int] = None
    sound_effects: Optional[str] = None
    timbre: Optional[int] = None
