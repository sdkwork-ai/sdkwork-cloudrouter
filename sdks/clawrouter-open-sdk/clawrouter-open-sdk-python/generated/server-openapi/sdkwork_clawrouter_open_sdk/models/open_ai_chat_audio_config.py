from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiChatAudioConfig:
    """OpenAI-compatible open ai chat audio config schema exposed by Claw Router."""
    format: Optional[str] = None
    voice: Optional[str] = None
