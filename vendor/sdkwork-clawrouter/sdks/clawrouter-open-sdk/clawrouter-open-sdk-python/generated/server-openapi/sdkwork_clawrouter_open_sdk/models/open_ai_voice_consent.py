from __future__ import annotations
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional, List, Dict, Any


@dataclass
class OpenAiVoiceConsent:
    """OpenAI-compatible voice consent object."""
    id: str
    object: str
    consent_document: Optional[str] = None
    created_at: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None
    name: Optional[str] = None
    status: Optional[str] = None
