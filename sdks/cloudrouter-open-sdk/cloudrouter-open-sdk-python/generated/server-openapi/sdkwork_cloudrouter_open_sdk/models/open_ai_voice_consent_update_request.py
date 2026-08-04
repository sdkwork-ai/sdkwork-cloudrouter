from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVoiceConsentUpdateRequest:
    """OpenAI-compatible request to update a voice consent."""
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
