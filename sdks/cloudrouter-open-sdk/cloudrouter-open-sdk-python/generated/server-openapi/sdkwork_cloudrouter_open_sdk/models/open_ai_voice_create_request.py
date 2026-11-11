from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVoiceCreateRequest:
    """OpenAI-compatible request to create a voice from a prompt."""
    name: str
    prompt: str
    type: str
    model: Optional[str] = None
    script_hint: Optional[str] = None
