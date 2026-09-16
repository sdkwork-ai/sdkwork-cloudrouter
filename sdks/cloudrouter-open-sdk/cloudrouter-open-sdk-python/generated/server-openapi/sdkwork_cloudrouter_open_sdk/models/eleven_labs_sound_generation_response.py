from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ElevenLabsSoundGenerationResponse:
    """Eleven labs sound generation response schema exposed by Cloud Router."""
    audio: Optional[Dict[str, Any]] = None
    audio_url: Optional[str] = None
    id: Optional[str] = None
    status: Optional[str] = None
    url: Optional[str] = None
