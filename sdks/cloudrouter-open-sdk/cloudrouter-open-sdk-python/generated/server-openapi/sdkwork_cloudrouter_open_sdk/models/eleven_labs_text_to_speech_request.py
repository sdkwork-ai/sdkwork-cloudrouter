from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ElevenLabsTextToSpeechRequest:
    """Eleven labs text to speech request schema exposed by Cloud Router."""
    model_id: str
    text: str
    voice_settings: Optional[Dict[str, Any]] = None
