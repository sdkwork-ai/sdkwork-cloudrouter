from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiAudioTranslation:
    """OpenAI-compatible audio translation response."""
    text: str
    duration: Optional[float] = None
    segments: Optional[List[str]] = None
