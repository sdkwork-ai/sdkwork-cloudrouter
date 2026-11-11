from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class AlibabaSpeechInput:
    """DashScope TTS input envelope."""
    text: str
    voice: str
    instructions: Optional[str] = None
    language_type: Optional[str] = None
    optimize_instructions: Optional[bool] = None
