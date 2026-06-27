from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVoiceConsentCreateRequest:
    """OpenAI-compatible request to create a voice consent."""
    consent_document: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
