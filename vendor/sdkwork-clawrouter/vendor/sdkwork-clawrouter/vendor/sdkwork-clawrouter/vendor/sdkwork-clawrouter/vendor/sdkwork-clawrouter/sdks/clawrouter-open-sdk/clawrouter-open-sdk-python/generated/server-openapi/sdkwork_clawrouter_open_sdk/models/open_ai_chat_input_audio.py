from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiChatInputAudio:
    """OpenAI-compatible open ai chat input audio schema exposed by Claw Router."""
    data: str
    format: str
