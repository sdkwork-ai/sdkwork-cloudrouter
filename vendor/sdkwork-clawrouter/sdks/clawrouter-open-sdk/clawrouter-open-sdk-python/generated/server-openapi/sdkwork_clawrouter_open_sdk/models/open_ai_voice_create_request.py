from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVoiceCreateRequest:
    """OpenAI-compatible request to create a voice."""
    description: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
