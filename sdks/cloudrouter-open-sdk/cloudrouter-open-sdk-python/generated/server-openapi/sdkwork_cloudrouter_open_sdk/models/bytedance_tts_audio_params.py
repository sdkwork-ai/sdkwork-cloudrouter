from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class BytedanceTtsAudioParams:
    """ByteDance TTS output audio parameters."""
    format: str
    sample_rate: int
    loudness_rate: Optional[int] = None
    speech_rate: Optional[int] = None
