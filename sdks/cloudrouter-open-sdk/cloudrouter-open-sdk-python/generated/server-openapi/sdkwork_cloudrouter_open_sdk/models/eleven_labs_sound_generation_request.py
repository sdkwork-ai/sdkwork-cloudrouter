from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ElevenLabsSoundGenerationRequest:
    """ElevenLabs sound-effect generation request (`POST /v1/sound-generation`)."""
    text: str
    duration_seconds: Optional[float] = None
    loop: Optional[bool] = None
    model_id: Optional[str] = None
    prompt_influence: Optional[float] = None
