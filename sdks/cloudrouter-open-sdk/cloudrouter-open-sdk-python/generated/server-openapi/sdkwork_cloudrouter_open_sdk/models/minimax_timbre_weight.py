from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class MinimaxTimbreWeight:
    """One voice in a mixed-voice TTS request."""
    voice_id: str
    weight: int
