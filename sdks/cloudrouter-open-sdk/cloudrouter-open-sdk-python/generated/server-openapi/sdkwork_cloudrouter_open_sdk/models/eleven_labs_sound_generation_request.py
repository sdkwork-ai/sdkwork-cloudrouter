from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class ElevenLabsSoundGenerationRequest:
    """Eleven labs sound generation request schema exposed by Cloud Router."""
    model_id: str
    text: str
    duration_seconds: Optional[float] = None
    loop: Optional[bool] = None
    prompt_influence: Optional[float] = None
